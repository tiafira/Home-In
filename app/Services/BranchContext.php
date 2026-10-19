<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Http\Request;

class BranchContext
{
    /**
     * Determine the effective cabang_id for the current user and request.
     *
     * @return int|null null means all branches (allowed for pemilik only)
     */
    public static function getEffectiveBranchId(Request $request): ?int
    {
        $user = $request->user();

        if (! $user) {
            return null;
        }

        // If user is admin (pegawai), strictly enforce their assigned cabang_id
        if ($user->role === 'admin') {
            $user->loadMissing('pegawai');

            return $user->pegawai?->cabang_id;
        }

        // If user is pemilik, allow filtering by requested cabang_id if present
        if ($user->role === 'pemilik') {
            $requested = $request->query('cabang_id') ?? $request->header('X-Cabang-Id');
            if ($requested && is_numeric($requested)) {
                return (int) $requested;
            }

            return null; // All branches
        }

        return null;
    }
}
