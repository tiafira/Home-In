<?php

namespace App\Http\Controllers\Api\Public;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rules\Password;

class UserProfileController extends Controller
{
    /**
     * Get user profile.
     */
    public function show(Request $request): JsonResponse
    {
        return response()->json([
            'status' => 'success',
            'data' => $request->user(),
        ]);
    }

    /**
     * Update profile details.
     */
    public function update(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'nama' => 'required|string|max:100',
            'no_hp' => 'required|string|max:20',
            'foto_profil' => 'nullable|image|mimes:jpeg,png,jpg,webp|max:2048',
        ], [
            'nama.required' => 'Nama lengkap wajib diisi.',
            'no_hp.required' => 'Nomor HP/WhatsApp wajib diisi.',
            'foto_profil.image' => 'File foto profil harus berupa gambar.',
            'foto_profil.max' => 'Ukuran foto profil maksimal 2 MB.',
        ]);

        $user->nama = $validated['nama'];
        $user->name = $validated['nama'];
        $user->no_hp = $validated['no_hp'];

        if ($request->hasFile('foto_profil')) {
            $path = $request->file('foto_profil')->store('avatars', 'public');
            $user->foto_profil = Storage::url($path);
        }

        $user->save();

        return response()->json([
            'status' => 'success',
            'message' => 'Profil berhasil diperbarui.',
            'data' => $user,
        ]);
    }

    /**
     * Change user password.
     */
    public function updatePassword(Request $request): JsonResponse
    {
        $user = $request->user();

        $request->validate([
            'current_password' => 'required|string',
            'password' => ['required', 'confirmed', Password::min(8)],
        ], [
            'current_password.required' => 'Password saat ini wajib diisi.',
            'password.required' => 'Password baru wajib diisi.',
            'password.confirmed' => 'Konfirmasi password baru tidak cocok.',
            'password.min' => 'Password baru minimal 8 karakter.',
        ]);

        if (! Hash::check($request->current_password, $user->password)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Password saat ini tidak sesuai.',
            ], 422);
        }

        $user->password = Hash::make($request->password);
        $user->save();

        return response()->json([
            'status' => 'success',
            'message' => 'Password berhasil diubah. Silakan gunakan password baru untuk login berikutnya.',
        ]);
    }
}
