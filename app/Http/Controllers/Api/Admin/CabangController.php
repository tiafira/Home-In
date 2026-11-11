<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Cabang;
use App\Services\BranchContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class CabangController extends Controller
{
    /**
     * Get branch list for header / selector dropdown.
     */
    public function list(Request $request): JsonResponse
    {
        $user = $request->user();
        $query = Cabang::query()->select(['id', 'nama_cabang', 'alamat', 'latitude', 'longitude', 'jam_malam']);

        if ($user->role === 'admin') {
            $effectiveBranch = BranchContext::getEffectiveBranchId($request);
            if ($effectiveBranch) {
                $query->where('id', $effectiveBranch);
            }
        }

        $branches = $query->orderBy('nama_cabang', 'asc')->get();

        return response()->json([
            'status' => 'success',
            'data' => $branches,
            'meta' => [
                'user_role' => $user->role,
                'can_switch_branch' => $user->role === 'pemilik',
                'current_branch_id' => BranchContext::getEffectiveBranchId($request),
            ],
        ]);
    }

    /**
     * Get branches full details for settings.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $query = Cabang::withCount(['gedung', 'faq']);

        if ($user->role === 'admin') {
            $effectiveBranch = BranchContext::getEffectiveBranchId($request);
            if ($effectiveBranch) {
                $query->where('id', $effectiveBranch);
            }
        }

        $branches = $query->orderBy('nama_cabang', 'asc')->get();

        return response()->json([
            'status' => 'success',
            'data' => $branches,
        ]);
    }

    /**
     * Show single branch details.
     */
    public function show(int $id): JsonResponse
    {
        $cabang = Cabang::with(['gedung.kamar'])->findOrFail($id);

        return response()->json([
            'status' => 'success',
            'data' => $cabang,
        ]);
    }

    /**
     * Update branch details (operational hours, curfew, coordinates, bank accounts, QRIS).
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $cabang = Cabang::findOrFail($id);

        $user = $request->user();
        if ($user->role === 'admin') {
            $effectiveBranch = BranchContext::getEffectiveBranchId($request);
            if ($effectiveBranch && $cabang->id !== $effectiveBranch) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Anda tidak memiliki hak akses untuk mengubah cabang ini.',
                ], 403);
            }
        }

        $validated = $request->validate([
            'nama_cabang' => 'required|string|max:100',
            'alamat' => 'required|string',
            'latitude' => 'nullable|numeric',
            'longitude' => 'nullable|numeric',
            'jam_operasional_mulai' => 'nullable',
            'jam_operasional_selesai' => 'nullable',
            'jam_malam' => 'nullable',
            'nama_bank' => 'nullable|string|max:100',
            'no_rekening' => 'nullable|string|max:50',
            'nama_pemilik_rekening' => 'nullable|string|max:100',
            'no_wa' => 'nullable|string|max:20',
            'email_cabang' => 'nullable|email|max:100',
        ]);

        $dataLama = $cabang->only([
            'nama_cabang', 'alamat', 'latitude', 'longitude',
            'jam_operasional_mulai', 'jam_operasional_selesai',
            'jam_malam', 'nama_bank', 'no_rekening', 'nama_pemilik_rekening',
        ]);

        $cabang->update($validated);

        ActivityLog::create([
            'user_id' => auth()->id(),
            'cabang_id' => $cabang->id,
            'aksi' => 'update_pengaturan_cabang',
            'model_type' => 'Cabang',
            'model_id' => $cabang->id,
            'data_lama' => $dataLama,
            'data_baru' => $validated,
            'keterangan' => "Admin memperbarui pengaturan cabang {$cabang->nama_cabang}.",
            'created_at' => now(),
        ]);

        return response()->json([
            'status' => 'success',
            'message' => "Pengaturan cabang {$cabang->nama_cabang} berhasil disimpan.",
            'data' => $cabang,
        ]);
    }

    /**
     * Upload QRIS image for branch payment.
     */
    public function uploadQr(Request $request, int $id): JsonResponse
    {
        $request->validate([
            'qr_file' => 'required|image|mimes:jpeg,png,jpg,webp|max:3072',
        ], [
            'qr_file.required' => 'File gambar QRIS wajib dipilih.',
            'qr_file.image' => 'File harus berupa gambar.',
            'qr_file.max' => 'Ukuran file gambar maksimal 3MB.',
        ]);

        $cabang = Cabang::findOrFail($id);

        $path = $request->file('qr_file')->store('qris', 'public');
        $url = Storage::url($path);

        $cabang->qr_pembayaran = $url;
        $cabang->save();

        ActivityLog::create([
            'user_id' => auth()->id(),
            'cabang_id' => $cabang->id,
            'aksi' => 'upload_qr_cabang',
            'model_type' => 'Cabang',
            'model_id' => $cabang->id,
            'keterangan' => "Admin mengunggah QRIS pembayaran baru untuk cabang {$cabang->nama_cabang}.",
            'created_at' => now(),
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Gambar QRIS pembayaran berhasil diunggah.',
            'data' => [
                'qr_pembayaran' => $url,
            ],
        ]);
    }
}
