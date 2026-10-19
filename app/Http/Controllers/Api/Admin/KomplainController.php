<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Komplain;
use App\Models\Notifikasi;
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
            'penghuni.kamar.gedung.cabang',
            'penangan',
        ]);

        if ($branchId) {
            $query->whereHas('penghuni.kamar.gedung', fn ($g) => $g->where('cabang_id', $branchId));
        }

        $counts = [
            'all' => (clone $query)->count(),
            'baru' => (clone $query)->where('status', 'baru')->count(),
            'diproses' => (clone $query)->where('status', 'diproses')->count(),
            'selesai' => (clone $query)->where('status', 'selesai')->count(),
        ];

        if ($status && $status !== 'all') {
            $query->where('status', $status);
        }

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('isi', 'like', "%{$search}%")
                    ->orWhere('kategori', 'like', "%{$search}%")
                    ->orWhereHas('penghuni.user', fn ($uq) => $uq->where('nama', 'like', "%{$search}%"))
                    ->orWhereHas('penghuni.kamar', fn ($kq) => $kq->where('nomor_kamar', 'like', "%{$search}%"));
            });
        }

        $komplain = $query->orderBy('created_at', 'desc')->get();

        return response()->json([
            'status' => 'success',
            'counts' => $counts,
            'data' => $komplain,
        ]);
    }

    /**
     * Update complaint status and response note.
     */
    public function updateStatus(Request $request, int $id): JsonResponse
    {
        $komplain = Komplain::with(['penghuni.user', 'penghuni.kamar'])->findOrFail($id);

        $validated = $request->validate([
            'status' => 'required|in:baru,diproses,selesai',
            'balasan' => 'nullable|string',
        ]);

        $komplain->status = $validated['status'];
        if (! empty($validated['balasan'])) {
            $komplain->balasan = $validated['balasan'];
        }
        $komplain->ditangani_oleh = auth()->id();
        if ($validated['status'] === 'selesai') {
            $komplain->tanggal_selesai = now();
        }
        $komplain->save();

        if ($komplain->penghuni && $komplain->penghuni->user_id) {
            Notifikasi::create([
                'user_id' => $komplain->penghuni->user_id,
                'judul' => 'Status Komplain Diperbarui',
                'pesan' => "Komplain Anda terkait '{$komplain->kategori}' kini berstatus: {$validated['status']}.".($komplain->balasan ? " Tanggapan: {$komplain->balasan}" : ''),
                'tipe' => 'info',
                'sudah_dibaca' => false,
            ]);
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Status komplain berhasil diperbarui.',
            'data' => $komplain->load('penangan'),
        ]);
    }
}
