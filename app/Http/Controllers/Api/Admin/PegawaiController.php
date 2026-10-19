<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Pegawai;
use App\Models\User;
use App\Services\BranchContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class PegawaiController extends Controller
{
    /**
     * Get employees list.
     */
    public function index(Request $request): JsonResponse
    {
        $branchId = BranchContext::getEffectiveBranchId($request);
        $search = $request->query('search', '');

        $query = Pegawai::with(['user', 'cabang']);

        if ($branchId) {
            $query->where('cabang_id', $branchId);
        }

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('jabatan', 'like', "%{$search}%")
                    ->orWhere('no_ktp', 'like', "%{$search}%")
                    ->orWhereHas('user', fn ($uq) => $uq->where('nama', 'like', "%{$search}%")->orWhere('email', 'like', "%{$search}%"));
            });
        }

        $pegawai = $query->orderBy('created_at', 'desc')->get();

        return response()->json([
            'status' => 'success',
            'data' => $pegawai,
        ]);
    }

    /**
     * Store new employee.
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'name' => 'required|string|max:100',
            'email' => 'required|email|max:100|unique:users,email',
            'no_hp' => 'required|string|max:20',
            'cabang_id' => 'required|exists:cabang,id',
            'jabatan' => 'required|in:admin,penjaga',
            'no_ktp' => 'nullable|string|max:20',
            'alamat' => 'nullable|string',
            'tanggal_masuk_kerja' => 'required|date',
            'password' => 'nullable|string|min:6',
        ]);

        return DB::transaction(function () use ($request) {
            $user = User::create([
                'name' => $request->name,
                'email' => $request->email,
                'password' => Hash::make($request->password ?? 'password123'),
                'role' => $request->jabatan === 'admin' ? 'admin' : 'penjaga',
                'no_hp' => $request->no_hp,
            ]);

            $pegawai = Pegawai::create([
                'user_id' => $user->id,
                'cabang_id' => $request->cabang_id,
                'jabatan' => $request->jabatan,
                'no_ktp' => $request->no_ktp,
                'alamat' => $request->alamat,
                'tanggal_masuk_kerja' => $request->tanggal_masuk_kerja,
            ]);

            return response()->json([
                'status' => 'success',
                'message' => 'Pegawai baru berhasil ditambahkan.',
                'data' => $pegawai->load(['user', 'cabang']),
            ], 201);
        });
    }

    /**
     * Update employee data.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $pegawai = Pegawai::with('user')->findOrFail($id);

        $request->validate([
            'name' => 'required|string|max:100',
            'email' => 'required|email|max:100|unique:users,email,'.$pegawai->user_id,
            'no_hp' => 'required|string|max:20',
            'cabang_id' => 'required|exists:cabang,id',
            'jabatan' => 'required|in:admin,penjaga',
            'no_ktp' => 'nullable|string|max:20',
            'alamat' => 'nullable|string',
            'tanggal_masuk_kerja' => 'required|date',
        ]);

        return DB::transaction(function () use ($request, $pegawai) {
            $pegawai->user->update([
                'name' => $request->name,
                'email' => $request->email,
                'role' => $request->jabatan === 'admin' ? 'admin' : 'penjaga',
                'no_hp' => $request->no_hp,
            ]);

            $pegawai->update([
                'cabang_id' => $request->cabang_id,
                'jabatan' => $request->jabatan,
                'no_ktp' => $request->no_ktp,
                'alamat' => $request->alamat,
                'tanggal_masuk_kerja' => $request->tanggal_masuk_kerja,
            ]);

            return response()->json([
                'status' => 'success',
                'message' => 'Data pegawai berhasil diperbarui.',
                'data' => $pegawai->load(['user', 'cabang']),
            ]);
        });
    }

    /**
     * Delete employee.
     */
    public function destroy(int $id): JsonResponse
    {
        $pegawai = Pegawai::findOrFail($id);
        $user = $pegawai->user;

        $pegawai->delete();
        if ($user && $user->role !== 'pemilik') {
            $user->delete();
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Pegawai berhasil dihapus.',
        ]);
    }
}
