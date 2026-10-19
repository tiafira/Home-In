<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Cabang;
use App\Models\Kamar;
use App\Models\Notifikasi;
use App\Services\BranchContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BookingController extends Controller
{
    /**
     * Get booking list with tab filtering, search, and branch scoping.
     */
    public function index(Request $request): JsonResponse
    {
        $branchId = BranchContext::getEffectiveBranchId($request);
        $tab = $request->query('tab', 'request_baru');
        $search = $request->query('search', '');

        $baseQuery = Booking::with([
            'user',
            'kamar.gedung.cabang',
            'kamarAlternatif.gedung.cabang',
            'diprosesOleh',
            'pembayaranBooking',
        ]);

        if ($branchId) {
            $baseQuery->whereHas('kamar.gedung', function ($q) use ($branchId) {
                $q->where('cabang_id', $branchId);
            });
        }

        // Calculate counts for badges
        $counts = [
            'request_baru' => (clone $baseQuery)->whereIn('status', ['menunggu_persetujuan', 'menunggu_pembayaran'])->count(),
            'ditawarkan_alternatif' => (clone $baseQuery)->where('status', 'ditawarkan_alternatif')->count(),
            'dikonfirmasi' => (clone $baseQuery)->where('status', 'dikonfirmasi')->count(),
            'ditolak' => (clone $baseQuery)->where('status', 'ditolak')->count(),
            'selesai' => (clone $baseQuery)->whereIn('status', ['selesai', 'dibatalkan'])->count(),
            'all' => (clone $baseQuery)->count(),
        ];

        // Apply tab filter
        $query = clone $baseQuery;
        match ($tab) {
            'request_baru' => $query->whereIn('status', ['menunggu_persetujuan', 'menunggu_pembayaran']),
            'ditawarkan_alternatif' => $query->where('status', 'ditawarkan_alternatif'),
            'dikonfirmasi' => $query->where('status', 'dikonfirmasi'),
            'ditolak' => $query->where('status', 'ditolak'),
            'selesai' => $query->whereIn('status', ['selesai', 'dibatalkan']),
            default => null,
        };

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->whereHas('user', function ($uq) use ($search) {
                    $uq->where('nama', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%")
                        ->orWhere('no_hp', 'like', "%{$search}%");
                })->orWhereHas('kamar', function ($kq) use ($search) {
                    $kq->where('nomor_kamar', 'like', "%{$search}%");
                });
            });
        }

        $bookings = $query->orderBy('tanggal_booking', 'desc')->get();

        return response()->json([
            'status' => 'success',
            'counts' => $counts,
            'data' => $bookings,
        ]);
    }

    /**
     * Show single booking detail.
     */
    public function show(int $id): JsonResponse
    {
        $booking = Booking::with([
            'user',
            'kamar.gedung.cabang',
            'kamarAlternatif.gedung.cabang',
            'diprosesOleh',
            'pembayaranBooking',
        ])->findOrFail($id);

        return response()->json([
            'status' => 'success',
            'data' => $booking,
        ]);
    }

    /**
     * Accept booking request.
     */
    public function terima(int $id): JsonResponse
    {
        $booking = Booking::with(['kamar', 'user'])->findOrFail($id);

        $booking->status = 'dikonfirmasi';
        $booking->diproses_oleh = auth()->id();
        $booking->diproses_pada = now();
        $booking->save();

        if ($booking->kamar) {
            $booking->kamar->status = 'dibooking';
            $booking->kamar->save();
        }

        Notifikasi::create([
            'user_id' => $booking->user_id,
            'judul' => 'Booking Dikonfirmasi',
            'pesan' => "Selamat! Permohonan booking Anda untuk kamar {$booking->kamar->nomor_kamar} telah dikonfirmasi oleh pengelola kost.",
            'tipe' => 'info',
            'sudah_dibaca' => false,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Booking berhasil dikonfirmasi.',
            'data' => $booking->load(['user', 'kamar.gedung.cabang', 'diprosesOleh']),
        ]);
    }

    /**
     * Reject booking request with reason.
     */
    public function tolak(Request $request, int $id): JsonResponse
    {
        $request->validate([
            'alasan_penolakan' => 'required|string|min:10',
        ], [
            'alasan_penolakan.required' => 'Alasan penolakan wajib diisi.',
            'alasan_penolakan.min' => 'Alasan penolakan minimal harus 10 karakter.',
        ]);

        $booking = Booking::with(['kamar', 'user'])->findOrFail($id);

        $booking->status = 'ditolak';
        $booking->alasan_penolakan = $request->alasan_penolakan;
        $booking->diproses_oleh = auth()->id();
        $booking->diproses_pada = now();
        $booking->save();

        // If room was reserved by this booking, restore to kosong if needed
        if ($booking->kamar && $booking->kamar->status === 'dibooking') {
            $booking->kamar->status = 'kosong';
            $booking->kamar->save();
        }

        Notifikasi::create([
            'user_id' => $booking->user_id,
            'judul' => 'Booking Ditolak',
            'pesan' => "Mohon maaf, permohonan booking Anda tidak dapat diterima: {$request->alasan_penolakan}",
            'tipe' => 'peringatan',
            'sudah_dibaca' => false,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Booking telah ditolak dengan alasan yang tercatat.',
            'data' => $booking->load(['user', 'kamar.gedung.cabang', 'diprosesOleh']),
        ]);
    }

    /**
     * Search nearest alternative branches that have available rooms (Haversine Formula).
     */
    public function alternatives(int $id): JsonResponse
    {
        $booking = Booking::with(['kamar.gedung.cabang'])->findOrFail($id);
        $currentCabang = $booking->kamar->gedung->cabang;

        if (! $currentCabang) {
            return response()->json([
                'status' => 'error',
                'message' => 'Cabang asal tidak ditemukan.',
            ], 404);
        }

        $originLat = (float) ($currentCabang->latitude ?? -6.2088);
        $originLon = (float) ($currentCabang->longitude ?? 106.8456);

        // Fetch other branches
        $otherCabangs = Cabang::where('id', '!=', $currentCabang->id)
            ->with(['gedung.kamar' => function ($kq) {
                $kq->where('status', 'kosong');
            }])
            ->get();

        $earthRadius = 6371; // km
        $alternatives = [];

        foreach ($otherCabangs as $cabang) {
            $availableRooms = collect();
            foreach ($cabang->gedung as $gedung) {
                foreach ($gedung->kamar as $room) {
                    $availableRooms->push([
                        'id' => $room->id,
                        'nomor_kamar' => $room->nomor_kamar,
                        'lantai' => $room->lantai,
                        'harga_bulanan' => (float) $room->harga_bulanan,
                        'gedung_nama' => $gedung->nama_gedung,
                    ]);
                }
            }

            // Only consider branch if it has available rooms
            if ($availableRooms->count() > 0) {
                $cabangLat = (float) ($cabang->latitude ?? $originLat);
                $cabangLon = (float) ($cabang->longitude ?? $originLon);

                $dLat = deg2rad($cabangLat - $originLat);
                $dLon = deg2rad($cabangLon - $originLon);

                $a = sin($dLat / 2) * sin($dLat / 2) +
                    cos(deg2rad($originLat)) * cos(deg2rad($cabangLat)) *
                    sin($dLon / 2) * sin($dLon / 2);
                $c = 2 * atan2(sqrt($a), sqrt(1 - $a));
                $distanceKm = round($earthRadius * $c, 2);

                $alternatives[] = [
                    'cabang_id' => $cabang->id,
                    'nama_cabang' => $cabang->nama_cabang,
                    'alamat' => $cabang->alamat,
                    'jarak_km' => $distanceKm,
                    'kamar_kosong_count' => $availableRooms->count(),
                    'harga_termurah' => $availableRooms->min('harga_bulanan'),
                    'harga_termahal' => $availableRooms->max('harga_bulanan'),
                    'rooms' => $availableRooms->values(),
                ];
            }
        }

        // Sort by nearest distance
        usort($alternatives, fn ($a, $b) => $a['jarak_km'] <=> $b['jarak_km']);

        return response()->json([
            'status' => 'success',
            'current_cabang' => [
                'id' => $currentCabang->id,
                'nama' => $currentCabang->nama_cabang,
                'alamat' => $currentCabang->alamat,
            ],
            'alternatives' => $alternatives,
        ]);
    }

    /**
     * Offer alternative room to the applicant.
     */
    public function tawarkanAlternatif(Request $request, int $id): JsonResponse
    {
        $request->validate([
            'kamar_alternatif_id' => 'required|exists:kamar,id',
            'kadaluarsa_jam' => 'nullable|integer|min:1',
        ]);

        $booking = Booking::with(['kamar.gedung.cabang', 'user'])->findOrFail($id);
        $kamarAlt = Kamar::with('gedung.cabang')->findOrFail($request->kamar_alternatif_id);

        if ($kamarAlt->status !== 'kosong') {
            return response()->json([
                'status' => 'error',
                'message' => 'Kamar alternatif yang dipilih tidak sedang kosong.',
            ], 422);
        }

        $hours = (int) $request->input('kadaluarsa_jam', 24);

        $booking->status = 'ditawarkan_alternatif';
        $booking->kamar_alternatif_id = $kamarAlt->id;
        $booking->tawaran_kadaluarsa_pada = now()->addHours($hours);
        $booking->diproses_oleh = auth()->id();
        $booking->diproses_pada = now();
        $booking->save();

        Notifikasi::create([
            'user_id' => $booking->user_id,
            'judul' => 'Tawaran Kamar Alternatif',
            'pesan' => "Kamar yang Anda pilih sebelumnya penuh. Kami menawarkan kamar alternatif {$kamarAlt->nomor_kamar} di cabang {$kamarAlt->gedung->cabang->nama_cabang}. Harap berikan konfirmasi dalam waktu {$hours} jam.",
            'tipe' => 'info',
            'sudah_dibaca' => false,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Tawaran kamar alternatif berhasil dikirimkan ke calon penghuni.',
            'data' => $booking->load(['kamar.gedung.cabang', 'kamarAlternatif.gedung.cabang', 'diprosesOleh']),
        ]);
    }

    /**
     * Calon penghuni or admin accept the alternative offer.
     */
    public function terimaTawaran(int $id): JsonResponse
    {
        $booking = Booking::with(['kamarAlternatif', 'user'])->findOrFail($id);

        if ($booking->status !== 'ditawarkan_alternatif' || ! $booking->kamar_alternatif_id) {
            return response()->json([
                'status' => 'error',
                'message' => 'Status booking bukan ditawarkan alternatif.',
            ], 400);
        }

        // Switch room to alternative
        $booking->kamar_id = $booking->kamar_alternatif_id;
        $booking->kamar_alternatif_id = null;
        $booking->status = 'dikonfirmasi';
        $booking->diproses_oleh = auth()->id();
        $booking->diproses_pada = now();
        $booking->save();

        if ($booking->kamar) {
            $booking->kamar->status = 'dibooking';
            $booking->kamar->save();
        }

        Notifikasi::create([
            'user_id' => $booking->user_id,
            'judul' => 'Tawaran Diterima & Booking Dikonfirmasi',
            'pesan' => "Tawaran kamar alternatif telah disetujui. Booking Anda untuk kamar {$booking->kamar->nomor_kamar} telah resmi dikonfirmasi.",
            'tipe' => 'info',
            'sudah_dibaca' => false,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Tawaran berhasil diterima dan booking telah dikonfirmasi.',
            'data' => $booking->load(['user', 'kamar.gedung.cabang', 'diprosesOleh']),
        ]);
    }

    /**
     * Calon penghuni or admin reject the alternative offer.
     */
    public function tolakTawaran(Request $request, int $id): JsonResponse
    {
        $booking = Booking::with('user')->findOrFail($id);

        $booking->status = 'ditolak';
        $booking->alasan_penolakan = $request->input('alasan', 'Kost penuh dan tawaran alternatif tidak diterima');
        $booking->diproses_oleh = auth()->id();
        $booking->diproses_pada = now();
        $booking->save();

        Notifikasi::create([
            'user_id' => $booking->user_id,
            'judul' => 'Tawaran Ditolak / Dibatalkan',
            'pesan' => 'Tawaran kamar alternatif tidak diterima. Booking Anda telah dibatalkan.',
            'tipe' => 'peringatan',
            'sudah_dibaca' => false,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Tawaran telah ditolak.',
            'data' => $booking,
        ]);
    }
}
