<?php

namespace App\Http\Controllers\Api\Public;

use App\Http\Controllers\Controller;
use App\Models\Notifikasi;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PublicNotificationController extends Controller
{
    /**
     * Get recent notifications for authenticated prospective tenant / user.
     */
    public function index(Request $request): JsonResponse
    {
        $userId = $request->user()->id;

        $notifications = Notifikasi::where('user_id', $userId)
            ->orderBy('created_at', 'desc')
            ->take(20)
            ->get();

        $unreadCount = Notifikasi::where('user_id', $userId)
            ->where('sudah_dibaca', false)
            ->count();

        return response()->json([
            'status' => 'success',
            'unread_count' => $unreadCount,
            'data' => $notifications,
        ]);
    }

    /**
     * Mark single notification as read.
     */
    public function markAsRead(Request $request, int $id): JsonResponse
    {
        $userId = $request->user()->id;

        $notification = Notifikasi::where('user_id', $userId)
            ->where('id', $id)
            ->firstOrFail();

        $notification->sudah_dibaca = true;
        $notification->save();

        return response()->json([
            'status' => 'success',
            'message' => 'Notifikasi telah ditandai dibaca.',
        ]);
    }

    /**
     * Mark all notifications as read for this user.
     */
    public function markAllAsRead(Request $request): JsonResponse
    {
        $userId = $request->user()->id;

        Notifikasi::where('user_id', $userId)
            ->where('sudah_dibaca', false)
            ->update(['sudah_dibaca' => true]);

        return response()->json([
            'status' => 'success',
            'message' => 'Semua notifikasi telah ditandai dibaca.',
        ]);
    }
}
