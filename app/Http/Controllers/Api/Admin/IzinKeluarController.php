<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\IzinKeluar;
use App\Models\Notifikasi;
use App\Services\BranchContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class IzinKeluarController extends Controller
{
    /**
     * Get leave permissions list.
     */
    public function index(Request $request): JsonResponse
    {
        $branchId = BranchContext::getEffectiveBranchId($request);
        $status = $request->query('status', 'all');
        $search = $request->query('search', '');

        $query = IzinKeluar::with([
            'penghuni.user',
            'penghuni.kamar.gedung.cabang',
            'penyetuju',
        ]);

        if ($branchId) {
            $query->whereHas('penghuni.kamar.gedung', fn ($g) => $g->where('cabang_id', $branchId));
        }

        $counts = [
            'all' => (clone $query)->count(),
            'menunggu' => (clone $query)->where('status', 'menunggu')->count(),
            'disetujui' => (clone $query)->where('status', 'disetujui')->count(),
            'ditolak' => (clone $query)->where('status', 'ditolak')->count(),
        ];

        if ($status && $status !== 'all') {
            $query->where('status', $status);
        }

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('alasan', 'like', "%{$search}%")
                    ->orWhereHas('penghuni.user', fn ($uq) => $uq->where('nama', 'like', "%{$search}%"))
                    ->orWhereHas('penghuni.kamar', fn ($kq) => $kq->where('nomor_kamar', 'like', "%{$search}%"));
            });
        }

        $izin = $query->orderBy('tanggal', 'desc')->orderBy('rencana_jam_keluar', 'desc')->get();

        return response()->json([
            'status' => 'success',
            'counts' => $counts,
            'data' => $izin,
        ]);
    }

    /**
     * Update approval status (disetujui or ditolak).
     */
    public function updateStatus(Request $request, int $id): JsonResponse
    {
        $request->validate([
            'status' => 'required|in:disetujui,ditolak',
        ]);

        $izin = IzinKeluar::with('penghuni.user')->findOrFail($id);
        $izin->status = $request->status;
        $izin->disetujui_oleh = auth()->id();
        $izin->save();

        if ($izin->penghuni && $izin->penghuni->user_id) {
            Notifikasi::create([
                'user_id' => $izin->penghuni->user_id,
                'judul' => "Izin Keluar {$request->status}",
                'pesan' => "Permohonan izin keluar Anda untuk tanggal {$izin->tanggal} telah {$request->status}.",
                'tipe' => $request->status === 'disetujui' ? 'info' : 'peringatan',
                'sudah_dibaca' => false,
            ]);
        }

        return response()->json([
            'status' => 'success',
            'message' => "Izin keluar telah {$request->status}.",
            'data' => $izin->load('penyetuju'),
        ]);
    }
}
