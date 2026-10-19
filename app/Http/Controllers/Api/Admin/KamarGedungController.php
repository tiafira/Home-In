<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Cabang;
use App\Models\Gedung;
use App\Models\Kamar;
use App\Services\BranchContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class KamarGedungController extends Controller
{
    /**
     * Get rooms and buildings with summary statistics.
     */
    public function index(Request $request): JsonResponse
    {
        $branchId = BranchContext::getEffectiveBranchId($request);
        $gedungId = $request->query('gedung_id');
        $lantai = $request->query('lantai');
        $status = $request->query('status');
        $search = $request->query('search');

        $cabangs = Cabang::orderBy('nama_cabang')->get();

        $gedungQuery = Gedung::with(['cabang']);
        if ($branchId) {
            $gedungQuery->where('cabang_id', $branchId);
        }
        $gedungs = $gedungQuery->orderBy('nama_gedung')->get();

        $kamarQuery = Kamar::with(['gedung.cabang', 'penghuni.user']);
        if ($branchId) {
            $kamarQuery->whereHas('gedung', fn ($g) => $g->where('cabang_id', $branchId));
        }

        // Summary counts
        $counts = [
            'total' => (clone $kamarQuery)->count(),
            'kosong' => (clone $kamarQuery)->where('status', 'kosong')->count(),
            'terisi' => (clone $kamarQuery)->where('status', 'terisi')->count(),
            'dibooking' => (clone $kamarQuery)->where('status', 'dibooking')->count(),
            'maintenance' => (clone $kamarQuery)->where('status', 'maintenance')->count(),
        ];

        if ($gedungId) {
            $kamarQuery->where('gedung_id', $gedungId);
        }
        if ($lantai) {
            $kamarQuery->where('lantai', $lantai);
        }
        if ($status && $status !== 'all') {
            $kamarQuery->where('status', $status);
        }
        if ($search) {
            $kamarQuery->where('nomor_kamar', 'like', "%{$search}%");
        }

        $kamars = $kamarQuery->orderBy('lantai')->orderBy('nomor_kamar')->get();

        return response()->json([
            'status' => 'success',
            'counts' => $counts,
            'cabangs' => $cabangs,
            'gedungs' => $gedungs,
            'data' => $kamars,
        ]);
    }

    /**
     * Create room.
     */
    public function storeKamar(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'gedung_id' => 'required|exists:gedung,id',
            'nomor_kamar' => 'required|string|max:20',
            'lantai' => 'required|integer|min:1',
            'harga_bulanan' => 'required|numeric|min:0',
            'status' => 'required|in:kosong,terisi,dibooking,maintenance',
            'deskripsi' => 'nullable|string',
        ]);

        $kamar = Kamar::create($validated);

        return response()->json([
            'status' => 'success',
            'message' => 'Kamar berhasil ditambahkan.',
            'data' => $kamar->load('gedung.cabang'),
        ], 201);
    }

    /**
     * Update room.
     */
    public function updateKamar(Request $request, int $id): JsonResponse
    {
        $kamar = Kamar::findOrFail($id);

        $validated = $request->validate([
            'gedung_id' => 'required|exists:gedung,id',
            'nomor_kamar' => 'required|string|max:20',
            'lantai' => 'required|integer|min:1',
            'harga_bulanan' => 'required|numeric|min:0',
            'status' => 'required|in:kosong,terisi,dibooking,maintenance',
            'deskripsi' => 'nullable|string',
        ]);

        $kamar->update($validated);

        return response()->json([
            'status' => 'success',
            'message' => 'Data kamar berhasil diperbarui.',
            'data' => $kamar->load('gedung.cabang'),
        ]);
    }

    /**
     * Quick status update for room.
     */
    public function updateStatusKamar(Request $request, int $id): JsonResponse
    {
        $kamar = Kamar::findOrFail($id);

        $validated = $request->validate([
            'status' => 'required|in:kosong,terisi,dibooking,maintenance',
        ]);

        $kamar->update($validated);

        return response()->json([
            'status' => 'success',
            'message' => "Status kamar diperbarui menjadi {$validated['status']}.",
            'data' => $kamar,
        ]);
    }

    /**
     * Delete room.
     */
    public function destroyKamar(int $id): JsonResponse
    {
        $kamar = Kamar::findOrFail($id);
        if ($kamar->status === 'terisi') {
            return response()->json([
                'status' => 'error',
                'message' => 'Kamar sedang terisi dan tidak dapat dihapus.',
            ], 422);
        }

        $kamar->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Kamar berhasil dihapus.',
        ]);
    }

    /**
     * Create building.
     */
    public function storeGedung(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'cabang_id' => 'nullable|exists:cabang,id',
            'nama_gedung' => 'required|string|max:100',
            'jumlah_lantai' => 'required|integer|min:1',
            'alamat' => 'required|string',
            'latitude' => 'nullable|numeric|between:-90,90',
            'longitude' => 'nullable|numeric|between:-180,180',
            'link_gmaps' => 'nullable|string|max:500',
        ]);

        $validated['cabang_id'] = $validated['cabang_id'] ?? BranchContext::getEffectiveBranchId($request) ?? 1;

        $gedung = Gedung::create($validated);

        // Also update parent cabang address/coordinates if provided so Haversine & branch info stay in sync
        if ($gedung->cabang) {
            $cabangUpdates = [];
            if (! empty($validated['alamat'])) {
                $cabangUpdates['alamat'] = $validated['alamat'];
            }
            if (isset($validated['latitude']) && $validated['latitude'] !== null) {
                $cabangUpdates['latitude'] = $validated['latitude'];
            }
            if (isset($validated['longitude']) && $validated['longitude'] !== null) {
                $cabangUpdates['longitude'] = $validated['longitude'];
            }
            if (! empty($cabangUpdates)) {
                $gedung->cabang->update($cabangUpdates);
            }
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Gedung berhasil ditambahkan beserta lokasi Google Maps.',
            'data' => $gedung->load('cabang'),
        ], 201);
    }

    /**
     * Update building.
     */
    public function updateGedung(Request $request, int $id): JsonResponse
    {
        $gedung = Gedung::findOrFail($id);

        $validated = $request->validate([
            'cabang_id' => 'nullable|exists:cabang,id',
            'nama_gedung' => 'required|string|max:100',
            'jumlah_lantai' => 'required|integer|min:1',
            'alamat' => 'required|string',
            'latitude' => 'nullable|numeric|between:-90,90',
            'longitude' => 'nullable|numeric|between:-180,180',
            'link_gmaps' => 'nullable|string|max:500',
        ]);

        $validated['cabang_id'] = $validated['cabang_id'] ?? $gedung->cabang_id ?? BranchContext::getEffectiveBranchId($request) ?? 1;

        $gedung->update($validated);

        if ($gedung->cabang) {
            $cabangUpdates = [];
            if (! empty($validated['alamat'])) {
                $cabangUpdates['alamat'] = $validated['alamat'];
            }
            if (isset($validated['latitude']) && $validated['latitude'] !== null) {
                $cabangUpdates['latitude'] = $validated['latitude'];
            }
            if (isset($validated['longitude']) && $validated['longitude'] !== null) {
                $cabangUpdates['longitude'] = $validated['longitude'];
            }
            if (! empty($cabangUpdates)) {
                $gedung->cabang->update($cabangUpdates);
            }
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Data gedung dan lokasi berhasil diperbarui.',
            'data' => $gedung->load('cabang'),
        ]);
    }

    /**
     * Delete building.
     */
    public function destroyGedung(int $id): JsonResponse
    {
        $gedung = Gedung::withCount('kamar')->findOrFail($id);
        if ($gedung->kamar_count > 0) {
            return response()->json([
                'status' => 'error',
                'message' => "Gedung ini memiliki {$gedung->kamar_count} kamar terdaftar. Hapus kamar terlebih dahulu.",
            ], 422);
        }

        $gedung->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Gedung berhasil dihapus.',
        ]);
    }
}
