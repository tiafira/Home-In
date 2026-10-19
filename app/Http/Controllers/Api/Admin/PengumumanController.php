<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Pengumuman;
use App\Services\BranchContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PengumumanController extends Controller
{
    /**
     * Get announcements list.
     */
    public function index(Request $request): JsonResponse
    {
        $branchId = BranchContext::getEffectiveBranchId($request);
        $search = $request->query('search', '');

        $query = Pengumuman::with(['cabang', 'pembuat']);

        if ($branchId) {
            $query->where(function ($q) use ($branchId) {
                $q->where('cabang_id', $branchId)->orWhereNull('cabang_id');
            });
        }

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('judul', 'like', "%{$search}%")
                    ->orWhere('isi', 'like', "%{$search}%");
            });
        }

        $pengumuman = $query->orderBy('created_at', 'desc')->get();

        return response()->json([
            'status' => 'success',
            'data' => $pengumuman,
        ]);
    }

    /**
     * Store announcement.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'judul' => 'required|string|max:150',
            'isi' => 'required|string',
            'target' => 'required|in:karyawan,penghuni,semua',
            'cabang_id' => 'nullable|exists:cabang,id',
        ]);

        $validated['dibuat_oleh'] = auth()->id();

        // If user is admin (not pemilik), enforce their branch
        $user = auth()->user();
        if ($user->role === 'admin' && $user->pegawai) {
            $validated['cabang_id'] = $user->pegawai->cabang_id;
        }

        $pengumuman = Pengumuman::create($validated);

        return response()->json([
            'status' => 'success',
            'message' => 'Pengumuman berhasil diterbitkan.',
            'data' => $pengumuman->load(['cabang', 'pembuat']),
        ], 201);
    }

    /**
     * Update announcement.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $pengumuman = Pengumuman::findOrFail($id);

        $validated = $request->validate([
            'judul' => 'required|string|max:150',
            'isi' => 'required|string',
            'target' => 'required|in:karyawan,penghuni,semua',
            'cabang_id' => 'nullable|exists:cabang,id',
        ]);

        $pengumuman->update($validated);

        return response()->json([
            'status' => 'success',
            'message' => 'Pengumuman berhasil diperbarui.',
            'data' => $pengumuman->load(['cabang', 'pembuat']),
        ]);
    }

    /**
     * Delete announcement.
     */
    public function destroy(int $id): JsonResponse
    {
        $pengumuman = Pengumuman::findOrFail($id);
        $pengumuman->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Pengumuman berhasil dihapus.',
        ]);
    }
}
