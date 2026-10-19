<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Pembayaran;
use App\Models\PembayaranBooking;
use App\Services\BranchContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PembayaranController extends Controller
{
    /**
     * Get monthly billings and payments.
     */
    public function index(Request $request): JsonResponse
    {
        $branchId = BranchContext::getEffectiveBranchId($request);
        $status = $request->query('status', 'all');
        $search = $request->query('search', '');
        $bulan = $request->query('bulan');
        $tahun = $request->query('tahun');

        $query = Pembayaran::with([
            'penghuni.user',
            'penghuni.kamar.gedung.cabang',
            'konfirmator',
        ]);

        if ($branchId) {
            $query->whereHas('penghuni.kamar.gedung', fn ($g) => $g->where('cabang_id', $branchId));
        }

        $counts = [
            'all' => (clone $query)->count(),
            'lunas' => (clone $query)->where('status', 'lunas')->count(),
            'belum_bayar' => (clone $query)->where('status', 'belum_bayar')->count(),
            'menunggu_konfirmasi' => (clone $query)->where('status', 'menunggu_konfirmasi')->count(),
            'telat' => (clone $query)->where('status', 'telat')->count(),
        ];

        if ($status && $status !== 'all') {
            $query->where('status', $status);
        }
        if ($bulan) {
            $query->where('periode_bulan', $bulan);
        }
        if ($tahun) {
            $query->where('periode_tahun', $tahun);
        }

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->whereHas('penghuni.user', fn ($uq) => $uq->where('nama', 'like', "%{$search}%"))
                    ->orWhereHas('penghuni.kamar', fn ($kq) => $kq->where('nomor_kamar', 'like', "%{$search}%"));
            });
        }

        $pembayaran = $query->orderBy('created_at', 'desc')->get();

        return response()->json([
            'status' => 'success',
            'counts' => $counts,
            'data' => $pembayaran,
        ]);
    }

    /**
     * Store manual payment.
     */
    public function storeManual(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'penghuni_id' => 'required|exists:penghuni,id',
            'periode_bulan' => 'required|integer|between:1,12',
            'periode_tahun' => 'required|integer|min:2020|max:2035',
            'jumlah_tagihan' => 'required|numeric|min:0',
            'metode_pembayaran' => 'required|string|max:50',
            'status' => 'required|in:belum_bayar,lunas,menunggu_konfirmasi,telat',
            'tanggal_jatuh_tempo' => 'required|date',
            'tanggal_bayar' => 'nullable|date',
        ]);

        if ($validated['status'] === 'lunas' && empty($validated['tanggal_bayar'])) {
            $validated['tanggal_bayar'] = now();
            $validated['dikonfirmasi_oleh'] = auth()->id();
            $validated['tanggal_konfirmasi'] = now();
        }

        $pembayaran = Pembayaran::create($validated);

        return response()->json([
            'status' => 'success',
            'message' => 'Pembayaran berhasil dicatat.',
            'data' => $pembayaran->load(['penghuni.user', 'penghuni.kamar']),
        ], 201);
    }

    /**
     * Update payment status (e.g., mark as lunas).
     */
    public function updateStatus(Request $request, int $id): JsonResponse
    {
        $pembayaran = Pembayaran::findOrFail($id);

        $validated = $request->validate([
            'status' => 'required|in:belum_bayar,lunas,menunggu_konfirmasi,telat',
        ]);

        $pembayaran->status = $validated['status'];
        if ($validated['status'] === 'lunas') {
            $pembayaran->tanggal_bayar = $pembayaran->tanggal_bayar ?? now();
            $pembayaran->dikonfirmasi_oleh = auth()->id();
            $pembayaran->tanggal_konfirmasi = now();
        }
        $pembayaran->save();

        return response()->json([
            'status' => 'success',
            'message' => 'Status pembayaran berhasil diperbarui.',
            'data' => $pembayaran->load(['penghuni.user', 'penghuni.kamar']),
        ]);
    }

    /**
     * Get booking payments for verification.
     */
    public function bookingPayments(Request $request): JsonResponse
    {
        $branchId = BranchContext::getEffectiveBranchId($request);
        $status = $request->query('status', 'all');

        $query = PembayaranBooking::with([
            'booking.user',
            'booking.kamar.gedung.cabang',
            'konfirmator',
        ]);

        if ($branchId) {
            $query->whereHas('booking.kamar.gedung', fn ($g) => $g->where('cabang_id', $branchId));
        }

        if ($status && $status !== 'all') {
            $query->where('status', $status);
        }

        $bookingPayments = $query->orderBy('created_at', 'desc')->get();

        return response()->json([
            'status' => 'success',
            'data' => $bookingPayments,
        ]);
    }

    /**
     * Verify booking payment proof.
     */
    public function verifyBookingPayment(Request $request, int $id): JsonResponse
    {
        $request->validate([
            'status' => 'required|in:dikonfirmasi,ditolak',
        ]);

        $payment = PembayaranBooking::with('booking')->findOrFail($id);
        $payment->status = $request->status;
        $payment->dikonfirmasi_oleh = auth()->id();
        $payment->tanggal_konfirmasi = now();
        $payment->save();

        return response()->json([
            'status' => 'success',
            'message' => "Pembayaran booking telah {$request->status}.",
            'data' => $payment,
        ]);
    }
}
