<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Komplain;
use App\Models\Notifikasi;
use App\Models\Pegawai;
use App\Services\BranchContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class KomplainController extends Controller
{
    /**
     * Get complaints list with branch scoping and status filtering.
     */
    public function index(Request $request): JsonResponse
    {
        $branchId = BranchContext::getEffectiveBranchId($request);
        $status = $request->query('status', 'all');
        $search = $request->query('search', '');

        $query = Komplain::with([
            'penghuni.user',
            'penghuni.kamar.gedung',
            'penangan',
            'karyawan.user',
        ]);

        if ($branchId) {
            $query->whereHas('penghuni.kamar.gedung', fn ($g) => $g->where('cabang_id', $branchId));
        }

        $allCount = (clone $query)->count();
        $menungguCount = (clone $query)->whereIn('status', ['menunggu', 'baru'])->count();
        $sedangDikerjakanCount = (clone $query)->whereIn('status', ['sedang_dikerjakan', 'diproses'])->count();
        $selesaiCount = (clone $query)->where('status', 'selesai')->count();
        $ditolakCount = (clone $query)->where('status', 'ditolak')->count();

        $counts = [
            'all' => $allCount,
            'menunggu' => $menungguCount,
            'sedang_dikerjakan' => $sedangDikerjakanCount,
            'selesai' => $selesaiCount,
            'ditolak' => $ditolakCount,
        ];

        if ($status && $status !== 'all') {
            if ($status === 'menunggu') {
                $query->whereIn('status', ['menunggu', 'baru']);
            } elseif ($status === 'sedang_dikerjakan') {
                $query->whereIn('status', ['sedang_dikerjakan', 'diproses']);
            } else {
                $query->where('status', $status);
            }
        }

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('isi', 'like', "%{$search}%")
                    ->orWhere('kategori', 'like', "%{$search}%")
                    ->orWhere('catatan_progres', 'like', "%{$search}%")
                    ->orWhereHas('penghuni.user', fn ($uq) => $uq->where('nama', 'like', "%{$search}%")->orWhere('name', 'like', "%{$search}%"))
                    ->orWhereHas('penghuni.kamar', fn ($kq) => $kq->where('nomor_kamar', 'like', "%{$search}%"))
                    ->orWhereHas('karyawan.user', fn ($kq) => $kq->where('name', 'like', "%{$search}%"));
            });
        }

        $komplain = $query->orderBy('created_at', 'desc')->get();

        // Get list of active staff / employees for assignment
        $staffList = Pegawai::with('user')->get();

        return response()->json([
            'status' => 'success',
            'counts' => $counts,
            'staff_list' => $staffList,
            'data' => $komplain,
        ]);
    }

    /**
     * Assign employee to complaint and set progress.
     */
    public function assign(Request $request, int $id): JsonResponse
    {
        $komplain = Komplain::with(['penghuni.user', 'penghuni.kamar'])->findOrFail($id);

        $validated = $request->validate([
            'karyawan_id' => 'required|exists:pegawai,id',
            'catatan_progres' => 'nullable|string|max:500',
            'estimasi_selesai' => 'nullable|date|after_or_equal:today',
        ]);

        $pegawai = Pegawai::with('user')->findOrFail($validated['karyawan_id']);

        $komplain->karyawan_id = $pegawai->id;
        $komplain->status = 'sedang_dikerjakan';
        if (! empty($validated['catatan_progres'])) {
            $komplain->catatan_progres = $validated['catatan_progres'];
        }
        if (! empty($validated['estimasi_selesai'])) {
            $komplain->estimasi_selesai = $validated['estimasi_selesai'];
        }
        $komplain->ditangani_oleh = auth()->id();
        $komplain->save();

        if ($komplain->penghuni && $komplain->penghuni->user_id) {
            $petugasNama = $pegawai->user?->name ?? 'Staf Operasional';
            Notifikasi::create([
                'user_id' => $komplain->penghuni->user_id,
                'judul' => 'Komplain Sedang Ditangani',
                'pesan' => "Komplain Anda terkait '{$komplain->kategori}' telah ditugaskan kepada {$petugasNama}. Status kini: Sedang Dikerjakan.",
                'tipe' => 'info',
                'sudah_dibaca' => false,
            ]);
        }

        return response()->json([
            'status' => 'success',
            'message' => "Komplain berhasil ditugaskan kepada {$pegawai->user?->name}.",
            'data' => $komplain->load(['penangan', 'karyawan.user']),
        ]);
    }

    /**
     * Update complaint status and progress note.
     */
    public function updateStatus(Request $request, int $id): JsonResponse
    {
        $komplain = Komplain::with(['penghuni.user', 'penghuni.kamar', 'karyawan.user'])->findOrFail($id);

        $validated = $request->validate([
            'status' => 'required|in:menunggu,sedang_dikerjakan,selesai,ditolak,baru,diproses',
            'balasan' => 'nullable|string',
            'catatan_progres' => 'nullable|string',
            'karyawan_id' => 'nullable|exists:pegawai,id',
            'estimasi_selesai' => 'nullable|date',
        ]);

        // Normalize status
        $status = $validated['status'];
        if ($status === 'baru') {
            $status = 'menunggu';
        }
        if ($status === 'diproses') {
            $status = 'sedang_dikerjakan';
        }

        $komplain->status = $status;
        if (isset($validated['balasan'])) {
            $komplain->balasan = $validated['balasan'];
        }
        if (isset($validated['catatan_progres'])) {
            $komplain->catatan_progres = $validated['catatan_progres'];
        }
        if (isset($validated['karyawan_id'])) {
            $komplain->karyawan_id = $validated['karyawan_id'];
        }
        if (isset($validated['estimasi_selesai'])) {
            $komplain->estimasi_selesai = $validated['estimasi_selesai'];
        }

        $komplain->ditangani_oleh = auth()->id();
        if ($status === 'selesai') {
            $komplain->tanggal_selesai = now();
        }
        $komplain->save();

        if ($komplain->penghuni && $komplain->penghuni->user_id) {
            $statusLabels = [
                'menunggu' => 'Menunggu',
                'sedang_dikerjakan' => 'Sedang Dikerjakan',
                'selesai' => 'Selesai',
                'ditolak' => 'Ditolak',
            ];
            $label = $statusLabels[$status] ?? $status;

            Notifikasi::create([
                'user_id' => $komplain->penghuni->user_id,
                'judul' => 'Status Komplain Diperbarui',
                'pesan' => "Komplain Anda terkait '{$komplain->kategori}' kini berstatus: {$label}.".($komplain->balasan ? " Tanggapan: {$komplain->balasan}" : ''),
                'tipe' => $status === 'selesai' ? 'info' : ($status === 'ditolak' ? 'peringatan' : 'info'),
                'sudah_dibaca' => false,
            ]);
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Status dan progres komplain berhasil diperbarui.',
            'data' => $komplain->load(['penangan', 'karyawan.user']),
        ]);
    }

    /**
     * Soft delete complaint.
     */
    public function destroy(int $id): JsonResponse
    {
        $komplain = Komplain::findOrFail($id);
        $komplain->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Data komplain berhasil dipindahkan ke menu "Baru Saja Dihapus".',
        ]);
    }
}
