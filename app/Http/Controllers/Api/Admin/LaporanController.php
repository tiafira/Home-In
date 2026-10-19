<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\LaporanPulang;
use App\Models\LaporanTamu;
use App\Services\BranchContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LaporanController extends Controller
{
    /**
     * Get guest reports (Laporan Tamu).
     */
    public function tamu(Request $request): JsonResponse
    {
        $branchId = BranchContext::getEffectiveBranchId($request);
        $search = $request->query('search', '');
        $tanggalMulai = $request->query('tanggal_mulai');
        $tanggalSelesai = $request->query('tanggal_selesai');

        $query = LaporanTamu::with([
            'penghuni.user',
            'penghuni.kamar.gedung.cabang',
        ]);

        if ($branchId) {
            $query->whereHas('penghuni.kamar.gedung', fn ($g) => $g->where('cabang_id', $branchId));
        }

        if ($tanggalMulai) {
            $query->where('tanggal', '>=', $tanggalMulai);
        }
        if ($tanggalSelesai) {
            $query->where('tanggal', '<=', $tanggalSelesai);
        }

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('nama_tamu', 'like', "%{$search}%")
                    ->orWhere('keperluan', 'like', "%{$search}%")
                    ->orWhereHas('penghuni.user', fn ($uq) => $uq->where('nama', 'like', "%{$search}%"));
            });
        }

        $data = $query->orderBy('tanggal', 'desc')->orderBy('jam_masuk', 'desc')->get();

        return response()->json([
            'status' => 'success',
            'data' => $data,
        ]);
    }

    /**
     * Store guest report.
     */
    public function storeTamu(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'penghuni_id' => 'required|exists:penghuni,id',
            'nama_tamu' => 'required|string|max:100',
            'keperluan' => 'nullable|string|max:150',
            'tanggal' => 'required|date',
            'jam_masuk' => 'required',
            'jam_keluar' => 'nullable',
        ]);

        $tamu = LaporanTamu::create($validated);

        return response()->json([
            'status' => 'success',
            'message' => 'Laporan kunjungan tamu berhasil dicatat.',
            'data' => $tamu->load(['penghuni.user', 'penghuni.kamar']),
        ], 201);
    }

    /**
     * Update guest checkout time.
     */
    public function checkoutTamu(Request $request, int $id): JsonResponse
    {
        $tamu = LaporanTamu::findOrFail($id);
        $tamu->jam_keluar = now()->format('H:i:s');
        $tamu->save();

        return response()->json([
            'status' => 'success',
            'message' => 'Waktu kepulangan tamu telah dicatat.',
            'data' => $tamu,
        ]);
    }

    /**
     * Get departure/leave-out reports (Laporan Pulang).
     */
    public function pulang(Request $request): JsonResponse
    {
        $branchId = BranchContext::getEffectiveBranchId($request);
        $search = $request->query('search', '');
        $jenis = $request->query('jenis', 'all');

        $query = LaporanPulang::with([
            'penghuni.user',
            'penghuni.kamar.gedung.cabang',
        ]);

        if ($branchId) {
            $query->whereHas('penghuni.kamar.gedung', fn ($g) => $g->where('cabang_id', $branchId));
        }

        if ($jenis && $jenis !== 'all') {
            $query->where('jenis', $jenis);
        }

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('keterangan', 'like', "%{$search}%")
                    ->orWhereHas('penghuni.user', fn ($uq) => $uq->where('nama', 'like', "%{$search}%"));
            });
        }

        $data = $query->orderBy('tanggal_mulai', 'desc')->get();

        return response()->json([
            'status' => 'success',
            'data' => $data,
        ]);
    }

    /**
     * Store departure report.
     */
    public function storePulang(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'penghuni_id' => 'required|exists:penghuni,id',
            'jenis' => 'required|in:pulang_kampung,nginap_di_luar',
            'tanggal_mulai' => 'required|date',
            'tanggal_selesai' => 'required|date|after_or_equal:tanggal_mulai',
            'keterangan' => 'nullable|string',
        ]);

        $pulang = LaporanPulang::create($validated);

        return response()->json([
            'status' => 'success',
            'message' => 'Laporan pulang/menginap berhasil disimpan.',
            'data' => $pulang->load(['penghuni.user', 'penghuni.kamar']),
        ], 201);
    }
}
