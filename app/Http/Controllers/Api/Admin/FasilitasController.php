<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Fasilitas;
use App\Models\KamarFasilitas;
use App\Services\BranchContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FasilitasController extends Controller
{
    /**
     * Get facilities and room facility requests.
     */
    public function index(Request $request): JsonResponse
    {
        $tipe = $request->query('tipe', 'all');
        $search = $request->query('search', '');

        $query = Fasilitas::query();
        if ($tipe && $tipe !== 'all') {
            $query->where('tipe', $tipe);
        }
        if ($search) {
            $query->where('nama_fasilitas', 'like', "%{$search}%");
        }
        $fasilitas = $query->orderBy('nama_fasilitas')->get();

        // Requests for additional facilities from rooms
        $branchId = BranchContext::getEffectiveBranchId($request);
        $requestQuery = KamarFasilitas::with([
            'fasilitas',
            'kamar.gedung.cabang',
            'kamar.penghuni.user',
        ]);

        if ($branchId) {
            $requestQuery->whereHas('kamar.gedung', fn ($g) => $g->where('cabang_id', $branchId));
        }

        $permintaan = $requestQuery->orderBy('created_at', 'desc')->get();

        return response()->json([
            'status' => 'success',
            'fasilitas' => $fasilitas,
            'permintaan' => $permintaan,
        ]);
    }

    /**
     * Store new facility.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'nama_fasilitas' => 'required|string|max:100',
            'deskripsi' => 'nullable|string',
            'tipe' => 'required|in:default,tambahan',
            'biaya_tambahan' => 'required|numeric|min:0',
        ]);

        $fasilitas = Fasilitas::create($validated);

        return response()->json([
            'status' => 'success',
            'message' => 'Fasilitas baru berhasil ditambahkan.',
            'data' => $fasilitas,
        ], 201);
    }

    /**
     * Update facility.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $fasilitas = Fasilitas::findOrFail($id);

        $validated = $request->validate([
            'nama_fasilitas' => 'required|string|max:100',
            'deskripsi' => 'nullable|string',
            'tipe' => 'required|in:default,tambahan',
            'biaya_tambahan' => 'required|numeric|min:0',
        ]);

        $fasilitas->update($validated);

        return response()->json([
            'status' => 'success',
            'message' => 'Fasilitas berhasil diperbarui.',
            'data' => $fasilitas,
        ]);
    }

    /**
     * Delete facility.
     */
    public function destroy(int $id): JsonResponse
    {
        $fasilitas = Fasilitas::findOrFail($id);
        $fasilitas->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Fasilitas berhasil dihapus.',
        ]);
    }

    /**
     * Approve or reject room extra facility request.
     */
    public function updatePermintaan(Request $request, int $id): JsonResponse
    {
        $request->validate([
            'status_request' => 'required|in:aktif,ditolak',
        ]);

        $kf = KamarFasilitas::with(['fasilitas', 'kamar'])->findOrFail($id);
        $kf->status_request = $request->status_request;
        if ($request->status_request === 'aktif') {
            $kf->tanggal_pasang = now()->toDateString();
        }
        $kf->save();

        return response()->json([
            'status' => 'success',
            'message' => "Permintaan fasilitas telah di-{$request->status_request}.",
            'data' => $kf,
        ]);
    }
}
