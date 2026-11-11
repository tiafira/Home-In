<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class AccountManagementController extends Controller
{
    /**
     * Get list of accounts with category filtering and statistics.
     */
    public function index(Request $request): JsonResponse
    {
        $kategori = $request->query('kategori', 'all'); // all | user | penghuni | karyawan | nonaktif
        $search = $request->query('search', '');

        $query = User::with(['penghuni.kamar.gedung', 'pegawai'])->latest();

        // Calculate counts
        $counts = [
            'all' => User::count(),
            'user' => User::where('role', 'calon_penghuni')->count(),
            'penghuni' => User::where('role', 'penghuni')->count(),
            'karyawan' => User::whereIn('role', ['admin', 'penjaga', 'pemilik'])->count(),
            'nonaktif' => User::where('status_aktif', 0)->count(),
        ];

        // Apply category filter
        if ($kategori === 'user') {
            $query->where('role', 'calon_penghuni');
        } elseif ($kategori === 'penghuni') {
            $query->where('role', 'penghuni');
        } elseif ($kategori === 'karyawan') {
            $query->whereIn('role', ['admin', 'penjaga', 'pemilik']);
        } elseif ($kategori === 'nonaktif') {
            $query->where('status_aktif', 0);
        }

        // Apply search filter
        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('nama', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('no_hp', 'like', "%{$search}%");
            });
        }

        $users = $query->paginate(25);

        return response()->json([
            'status' => 'success',
            'counts' => $counts,
            'data' => $users->items(),
            'meta' => [
                'current_page' => $users->currentPage(),
                'last_page' => $users->lastPage(),
                'per_page' => $users->perPage(),
                'total' => $users->total(),
            ],
        ]);
    }

    /**
     * Create new user account.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'email' => 'required|email|max:100|unique:users,email',
            'password' => 'required|string|min:6',
            'no_hp' => 'required|string|max:20',
            'role' => 'required|in:calon_penghuni,penghuni,penjaga,admin',
            'status_aktif' => 'nullable|boolean',
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'nama' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'no_hp' => $validated['no_hp'],
            'role' => $validated['role'],
            'status_aktif' => $validated['status_aktif'] ?? 1,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Akun pengguna berhasil dibuat.',
            'data' => $user,
        ], 201);
    }

    /**
     * Update user account.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $user = User::findOrFail($id);

        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'email' => ['required', 'email', 'max:100', Rule::unique('users')->ignore($user->id)],
            'no_hp' => 'required|string|max:20',
            'role' => 'required|in:calon_penghuni,penghuni,penjaga,admin,pemilik',
            'status_aktif' => 'nullable|boolean',
        ]);

        $user->update([
            'name' => $validated['name'],
            'nama' => $validated['name'],
            'email' => $validated['email'],
            'no_hp' => $validated['no_hp'],
            'role' => $validated['role'],
            'status_aktif' => $validated['status_aktif'] ?? $user->status_aktif,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Data akun berhasil diperbarui.',
            'data' => $user,
        ]);
    }

    /**
     * Toggle status aktif account.
     */
    public function toggleStatus(int $id): JsonResponse
    {
        $user = User::findOrFail($id);

        // Prevent deactivating own account
        if (auth()->id() === $user->id) {
            return response()->json([
                'status' => 'error',
                'message' => 'Anda tidak dapat menonaktifkan akun Anda sendiri yang sedang aktif digunakan.',
            ], 422);
        }

        $user->status_aktif = $user->status_aktif ? 0 : 1;
        $user->save();

        $statusText = $user->status_aktif ? 'diaktifkan' : 'dinonaktifkan';

        return response()->json([
            'status' => 'success',
            'message' => "Akun {$user->name} berhasil {$statusText}.",
            'data' => $user,
        ]);
    }

    /**
     * Reset user password.
     */
    public function resetPassword(Request $request, int $id): JsonResponse
    {
        $user = User::findOrFail($id);

        $validated = $request->validate([
            'password' => 'required|string|min:6',
        ]);

        $user->password = Hash::make($validated['password']);
        $user->save();

        return response()->json([
            'status' => 'success',
            'message' => "Password untuk akun {$user->name} berhasil direset.",
        ]);
    }

    /**
     * Soft delete user account.
     */
    public function destroy(int $id): JsonResponse
    {
        $user = User::findOrFail($id);

        if (auth()->id() === $user->id) {
            return response()->json([
                'status' => 'error',
                'message' => 'Anda tidak dapat menghapus akun Anda sendiri.',
            ], 422);
        }

        $user->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Akun berhasil dipindahkan ke menu "Baru Saja Dihapus".',
        ]);
    }
}
