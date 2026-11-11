<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Services\BranchContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ActivityLogController extends Controller
{
    /**
     * Display activity log history for admin and guard with filters and unread count.
     */
    public function index(Request $request): JsonResponse
    {
        $query = ActivityLog::with(['user:id,nama,email,role', 'cabang:id,nama_cabang'])
            ->orderBy('id', 'desc');

        $effectiveBranchId = BranchContext::getEffectiveBranchId($request);
        if ($effectiveBranchId) {
            $query->where(function ($q) use ($effectiveBranchId) {
                $q->where('cabang_id', $effectiveBranchId)
                    ->orWhereNull('cabang_id');
            });
        } elseif ($request->filled('cabang_id')) {
            $query->where('cabang_id', $request->input('cabang_id'));
        }

        // Filter per peran (admin, penjaga, customer, sistem)
        if ($request->filled('peran')) {
            $query->where('peran', $request->input('peran'));
        }

        // Filter belum dibaca
        if ($request->boolean('belum_dibaca')) {
            $query->where('dibaca', false);
        }

        // Filter rentang tanggal
        if ($request->filled('tanggal_mulai')) {
            $query->whereDate('created_at', '>=', $request->input('tanggal_mulai'));
        }
        if ($request->filled('tanggal_selesai')) {
            $query->whereDate('created_at', '<=', $request->input('tanggal_selesai'));
        }

        // Legacy / exact aksi filter
        if ($request->filled('aksi')) {
            $query->where(function ($q) use ($request) {
                $q->where('aksi', $request->input('aksi'))
                    ->orWhere('jenis_aksi', $request->input('aksi'));
            });
        }

        // Search text
        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('keterangan', 'like', "%{$search}%")
                    ->orWhere('detail', 'like', "%{$search}%")
                    ->orWhere('objek_terkait', 'like', "%{$search}%")
                    ->orWhere('aksi', 'like', "%{$search}%")
                    ->orWhere('jenis_aksi', 'like', "%{$search}%")
                    ->orWhereHas('user', function ($uq) use ($search) {
                        $uq->where('nama', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%");
                    });
            });
        }

        // Hitung unread count sebelum pagination
        $unreadCountQuery = ActivityLog::where('dibaca', false);
        if ($effectiveBranchId) {
            $unreadCountQuery->where(function ($q) use ($effectiveBranchId) {
                $q->where('cabang_id', $effectiveBranchId)->orWhereNull('cabang_id');
            });
        }
        $unreadCount = $unreadCountQuery->count();

        $perPage = min((int) $request->input('per_page', 20), 100);
        $logs = $query->paginate($perPage);

        return response()->json([
            'status' => 'success',
            'unread_count' => $unreadCount,
            'data' => $logs->items(),
            'pagination' => [
                'current_page' => $logs->currentPage(),
                'last_page' => $logs->lastPage(),
                'per_page' => $logs->perPage(),
                'total' => $logs->total(),
            ],
        ]);
    }

    /**
     * Mark single activity log as read.
     */
    public function markAsRead(int $id): JsonResponse
    {
        $log = ActivityLog::findOrFail($id);
        $log->dibaca = true;
        $log->save();

        return response()->json([
            'status' => 'success',
            'message' => 'Aktivitas berhasil ditandai sudah dibaca.',
            'data' => $log,
        ]);
    }

    /**
     * Mark all activity logs as read for the current branch/role context.
     */
    public function markAllAsRead(Request $request): JsonResponse
    {
        $query = ActivityLog::where('dibaca', false);

        $effectiveBranchId = BranchContext::getEffectiveBranchId($request);
        if ($effectiveBranchId) {
            $query->where('cabang_id', $effectiveBranchId);
        }

        $affected = $query->update(['dibaca' => true]);

        return response()->json([
            'status' => 'success',
            'message' => "{$affected} aktivitas berhasil ditandai sudah dibaca.",
        ]);
    }
}
