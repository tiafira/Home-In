<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Notifikasi;
use App\Models\Pegawai;
use App\Models\Penghuni;
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

        // Send notifications to target recipients
        $targetBranchId = $pengumuman->cabang_id;
        $recipientUserIds = collect();

        if (in_array($pengumuman->target, ['penghuni', 'semua'])) {
            $tenants = Penghuni::where('status', 'aktif')
                ->when($targetBranchId, fn ($q) => $q->whereHas('kamar.gedung', fn ($g) => $g->where('cabang_id', $targetBranchId)))
                ->pluck('user_id');
            $recipientUserIds = $recipientUserIds->merge($tenants);
        }

        if (in_array($pengumuman->target, ['karyawan', 'semua'])) {
            $staff = Pegawai::when($targetBranchId, fn ($q) => $q->where('cabang_id', $targetBranchId))
                ->pluck('user_id');
            $recipientUserIds = $recipientUserIds->merge($staff);
        }

        foreach ($recipientUserIds->unique() as $uid) {
            if ($uid && $uid !== auth()->id()) {
                Notifikasi::create([
                    'user_id' => $uid,
                    'judul' => "Pengumuman: {$pengumuman->judul}",
                    'isi' => substr($pengumuman->isi, 0, 150).(strlen($pengumuman->isi) > 150 ? '...' : ''),
                    'tipe' => 'info',
                    'redirect_url' => '/mobile-app',
                    'referensi_tabel' => 'pengumuman',
                    'referensi_id' => $pengumuman->id,
                    'sudah_dibaca' => false,
                ]);
            }
        }

        ActivityLog::create([
            'user_id' => auth()->id(),
            'cabang_id' => $pengumuman->cabang_id,
            'aksi' => 'create_pengumuman',
            'model_type' => 'Pengumuman',
            'model_id' => $pengumuman->id,
            'keterangan' => "Admin menerbitkan pengumuman \"{$pengumuman->judul}\" untuk target {$pengumuman->target}.",
            'created_at' => now(),
        ]);

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

        ActivityLog::create([
            'user_id' => auth()->id(),
            'cabang_id' => $pengumuman->cabang_id,
            'aksi' => 'update_pengumuman',
            'model_type' => 'Pengumuman',
            'model_id' => $pengumuman->id,
            'keterangan' => "Admin memperbarui pengumuman #{$pengumuman->id}.",
            'created_at' => now(),
        ]);

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
        $judul = $pengumuman->judul;
        $cabangId = $pengumuman->cabang_id;
        $pengumuman->delete();

        ActivityLog::create([
            'user_id' => auth()->id(),
            'cabang_id' => $cabangId,
            'aksi' => 'delete_pengumuman',
            'model_type' => 'Pengumuman',
            'model_id' => $id,
            'keterangan' => "Admin menghapus pengumuman \"{$judul}\".",
            'created_at' => now(),
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Pengumuman berhasil dihapus.',
        ]);
    }
}
