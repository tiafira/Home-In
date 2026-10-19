<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Cabang;
use App\Services\BranchContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CabangController extends Controller
{
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
}
