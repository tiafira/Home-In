<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Kamar;
use App\Models\Penghuni;
use App\Services\BranchContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GlobalSearchController extends Controller
{
    /**
     * Global Search across Penghuni, Kamar, and Booking for Admin Header.
     */
    public function search(Request $request): JsonResponse
    {
        $q = trim((string) $request->input('q', ''));
        if (strlen($q) < 2) {
            return response()->json([
                'status' => 'success',
                'data' => [
                    'penghuni' => [],
                    'kamar' => [],
                    'booking' => [],
                    'total' => 0,
                ],
            ]);
        }

        $effectiveBranchId = BranchContext::getEffectiveBranchId($request);

        // 1. Search Penghuni
        $penghuniQuery = Penghuni::with(['user:id,name,email,no_hp', 'kamar.gedung.cabang'])
            ->whereHas('user', function ($uq) use ($q) {
                $uq->where('name', 'like', "%{$q}%")
                    ->orWhere('email', 'like', "%{$q}%")
                    ->orWhere('no_hp', 'like', "%{$q}%");
            })
            ->orWhereHas('kamar', function ($kq) use ($q) {
                $kq->where('nomor_kamar', 'like', "%{$q}%");
            });

        if ($effectiveBranchId) {
            $penghuniQuery->whereHas('kamar.gedung', function ($gq) use ($effectiveBranchId) {
                $gq->where('cabang_id', $effectiveBranchId);
            });
        }

        $penghunis = $penghuniQuery->limit(5)->get()->map(function ($p) {
            return [
                'id' => $p->id,
                'name' => $p->user?->name ?? 'Penghuni',
                'email' => $p->user?->email,
                'no_hp' => $p->user?->no_hp,
                'nomor_kamar' => $p->kamar?->nomor_kamar ?? '-',
                'cabang' => $p->kamar?->gedung?->cabang?->nama_cabang ?? '-',
                'status' => $p->status,
                'type' => 'penghuni',
                'url' => '/admin/penghuni',
            ];
        });

        // 2. Search Kamar
        $kamarQuery = Kamar::with(['gedung.cabang'])
            ->where(function ($query) use ($q) {
                $query->where('nomor_kamar', 'like', "%{$q}%")
                    ->orWhereHas('gedung', function ($gq) use ($q) {
                        $gq->where('nama_gedung', 'like', "%{$q}%")
                            ->orWhereHas('cabang', function ($cq) use ($q) {
                                $cq->where('nama_cabang', 'like', "%{$q}%");
                            });
                    });
            });

        if ($effectiveBranchId) {
            $kamarQuery->whereHas('gedung', function ($gq) use ($effectiveBranchId) {
                $gq->where('cabang_id', $effectiveBranchId);
            });
        }

        $kamars = $kamarQuery->limit(5)->get()->map(function ($k) {
            return [
                'id' => $k->id,
                'nomor_kamar' => $k->nomor_kamar,
                'gedung' => $k->gedung?->nama_gedung ?? '-',
                'cabang' => $k->gedung?->cabang?->nama_cabang ?? '-',
                'status' => $k->status,
                'harga_bulanan' => $k->harga_bulanan,
                'type' => 'kamar',
                'url' => '/admin/kamar',
            ];
        });

        // 3. Search Booking
        $bookingQuery = Booking::with(['user:id,name,email,no_hp', 'kamar.gedung.cabang'])
            ->where(function ($query) use ($q) {
                $query->where('kode_booking', 'like', "%{$q}%")
                    ->orWhereHas('user', function ($uq) use ($q) {
                        $uq->where('name', 'like', "%{$q}%")
                            ->orWhere('email', 'like', "%{$q}%")
                            ->orWhere('no_hp', 'like', "%{$q}%");
                    })
                    ->orWhereHas('kamar', function ($kq) use ($q) {
                        $kq->where('nomor_kamar', 'like', "%{$q}%");
                    });
            });

        if ($effectiveBranchId) {
            $bookingQuery->where('cabang_id', $effectiveBranchId);
        }

        $bookings = $bookingQuery->limit(5)->get()->map(function ($b) {
            return [
                'id' => $b->id,
                'kode_booking' => $b->kode_booking,
                'pemesan' => $b->user?->name ?? 'Pemesan',
                'nomor_kamar' => $b->kamar?->nomor_kamar ?? '-',
                'cabang' => $b->cabang?->nama_cabang ?? $b->kamar?->gedung?->cabang?->nama_cabang ?? '-',
                'status' => $b->status,
                'type' => 'booking',
                'url' => '/admin/booking',
            ];
        });

        $total = $penghunis->count() + $kamars->count() + $bookings->count();

        return response()->json([
            'status' => 'success',
            'data' => [
                'penghuni' => $penghunis,
                'kamar' => $kamars,
                'booking' => $bookings,
                'total' => $total,
            ],
        ]);
    }
}
