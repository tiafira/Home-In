<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Booking;
use App\Models\Cabang;
use App\Models\Kamar;
use App\Models\PembayaranBooking;
use App\Models\Pengaturan;
use App\Models\Penghuni;
use App\Services\BookingAvailabilityService;
use App\Services\BranchContext;
use App\Services\NotificationService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class BookingController extends Controller
{
    public function __construct(
        protected BookingAvailabilityService $availabilityService,
        protected NotificationService $notificationService
    ) {}

    /**
     * Get booking list with tab filtering, search, and branch scoping (Admin = all, Penjaga = own branch).
     */
    public function index(Request $request): JsonResponse
    {
        $branchId = BranchContext::getEffectiveBranchId($request);
        $tab = $request->query('tab', 'request_baru');
        $search = $request->query('search', '');

        $baseQuery = Booking::with([
            'user',
            'kamar.gedung.cabang',
            'kamarFasilitas.fasilitas',
            'kamarAlternatif.gedung.cabang',
            'diprosesOleh',
            'dikonfirmasiKeluarOleh',
            'pembayaranBooking.penerima',
            'statusHistories.user',
        ]);

        if ($branchId) {
            $baseQuery->whereHas('kamar.gedung', function ($q) use ($branchId) {
                $q->where('cabang_id', $branchId);
            });
        }

        // Calculate counts for badges
        $counts = [
            'request_baru' => (clone $baseQuery)->whereIn('status', [Booking::STATUS_MENUNGGU_KONFIRMASI, 'menunggu_persetujuan'])->count(),
            'menunggu_pembayaran' => (clone $baseQuery)->whereIn('status', [Booking::STATUS_MENUNGGU_PEMBAYARAN, Booking::STATUS_MENUNGGU_VERIFIKASI])->count(),
            'ditawarkan_alternatif' => (clone $baseQuery)->whereIn('status', [Booking::STATUS_MENUNGGU_RESPON_CUSTOMER, 'ditawarkan_alternatif'])->count(),
            'terjadwal' => (clone $baseQuery)->whereIn('status', [Booking::STATUS_TERJADWAL, 'dikonfirmasi'])->count(),
            'dikonfirmasi' => (clone $baseQuery)->whereIn('status', [Booking::STATUS_TERJADWAL, 'dikonfirmasi'])->count(),
            'aktif' => (clone $baseQuery)->where('status', Booking::STATUS_AKTIF)->count(),
            'selesai' => (clone $baseQuery)->where('status', Booking::STATUS_SELESAI)->count(),
            'ditolak' => (clone $baseQuery)->whereIn('status', [Booking::STATUS_DITOLAK, Booking::STATUS_DIBATALKAN, Booking::STATUS_KEDALUWARSA])->count(),
            'batal_tolak' => (clone $baseQuery)->whereIn('status', [Booking::STATUS_DITOLAK, Booking::STATUS_DIBATALKAN, Booking::STATUS_KEDALUWARSA])->count(),
            'all' => (clone $baseQuery)->count(),
        ];

        // Apply tab filter
        $query = clone $baseQuery;
        match ($tab) {
            'request_baru' => $query->whereIn('status', [Booking::STATUS_MENUNGGU_KONFIRMASI, 'menunggu_persetujuan']),
            'menunggu_pembayaran' => $query->whereIn('status', [Booking::STATUS_MENUNGGU_PEMBAYARAN, Booking::STATUS_MENUNGGU_VERIFIKASI]),
            'ditawarkan_alternatif' => $query->whereIn('status', [Booking::STATUS_MENUNGGU_RESPON_CUSTOMER, 'ditawarkan_alternatif']),
            'dikonfirmasi', 'terjadwal' => $query->whereIn('status', [Booking::STATUS_TERJADWAL, 'dikonfirmasi']),
            'aktif' => $query->where('status', Booking::STATUS_AKTIF),
            'selesai' => $query->where('status', Booking::STATUS_SELESAI),
            'ditolak', 'batal_tolak' => $query->whereIn('status', [Booking::STATUS_DITOLAK, Booking::STATUS_DIBATALKAN, Booking::STATUS_KEDALUWARSA]),
            default => null,
        };

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->whereHas('user', function ($uq) use ($search) {
                    $uq->where('name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%")
                        ->orWhere('no_hp', 'like', "%{$search}%");
                })->orWhereHas('kamar', function ($kq) use ($search) {
                    $kq->where('nomor_kamar', 'like', "%{$search}%");
                });
            });
        }

        $bookings = $query->orderBy('tanggal_booking', 'desc')
            ->orderBy('id', 'desc')
            ->get();

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
            'kamarFasilitas.fasilitas',
            'kamarAlternatif.gedung.cabang',
            'diprosesOleh',
            'dikonfirmasiKeluarOleh',
            'pembayaranBooking.penerima',
            'statusHistories.user',
        ])->findOrFail($id);

        $this->ensureBranchAccess($booking);

        $qrisGopayImage = Pengaturan::get('qris_gopay_image');

        return response()->json([
            'status' => 'success',
            'data' => $booking,
            'qris_gopay_image' => $qrisGopayImage,
        ]);
    }

    /**
     * Approve booking request (Tahap 3).
     * Moves to Menunggu Pembayaran, generates Month-1 bill draft with unique code.
     */
    public function setujui(Request $request, int $id): JsonResponse
    {
        $booking = Booking::with(['kamar.gedung.cabang', 'user', 'pembayaranBooking'])->findOrFail($id);
        $this->ensureBranchAccess($booking);

        $user = auth()->user();

        return DB::transaction(function () use ($booking, $user) {
            // Re-verify room availability with lock
            $startDate = $booking->tanggal_mulai ?? $booking->rencana_checkin ?? Carbon::today()->toDateString();
            $durasiBulan = (int) ($booking->durasi_bulan ?? 1);

            $this->availabilityService->lockAndVerifyKamar(
                kamarId: $booking->kamar_id,
                tanggalMulai: $startDate,
                durasiBulan: $durasiBulan,
                excludeBookingId: $booking->id
            );

            $batasBayarJam = (int) Pengaturan::get('durasi_batas_bayar_transfer', 24);
            $batasBayar = now()->addHours($batasBayarJam);

            $booking->status = Booking::STATUS_MENUNGGU_PEMBAYARAN;
            $booking->diproses_oleh = $user->id;
            $booking->diproses_pada = now();
            $booking->batas_bayar = $batasBayar;
            $booking->save();

            if ($booking->kamar && $booking->kamar->status === 'kosong') {
                $booking->kamar->status = 'dibooking';
                $booking->kamar->save();
            }

            // Create or update Month 1 bill (Kamar + Fasilitas Per Bulan + Fasilitas Sekali Bayar)
            $kodeUnik = mt_rand(100, 999);
            $nominal = $booking->hitungBiayaBulanPertama();

            $pembayaran = PembayaranBooking::firstOrCreate(
                ['booking_id' => $booking->id, 'periode_bulan_ke' => 1],
                [
                    'nominal' => $nominal,
                    'jumlah' => $nominal,
                    'kode_unik' => $kodeUnik,
                    'metode' => 'transfer_qris',
                    'status' => PembayaranBooking::STATUS_MENUNGGU_PEMBAYARAN,
                    'batas_bayar' => $batasBayar,
                ]
            );

            if (! $pembayaran->wasRecentlyCreated && $pembayaran->status === PembayaranBooking::STATUS_MENUNGGU_PEMBAYARAN) {
                $pembayaran->update([
                    'nominal' => $nominal,
                    'jumlah' => $nominal,
                ]);
            }

            // Log status history
            $booking->logStatusChange(
                toStatus: Booking::STATUS_MENUNGGU_PEMBAYARAN,
                changedBy: $user->id,
                alasan: 'Permohonan booking disetujui admin/penjaga. Menunggu pembayaran bulan pertama.'
            );

            // Log Activity
            $peran = $this->determineUserRole($user);
            ActivityLog::catat(
                userId: $user->id,
                cabangId: $booking->kamar?->gedung?->cabang_id,
                peran: $peran,
                jenisAksi: 'setujui_booking',
                objekTerkait: "Booking #{$booking->id}",
                detail: "Admin menyetujui booking kamar {$booking->kamar?->nomor_kamar} untuk {$booking->user?->nama}."
            );

            // Notification to customer
            $totalBayar = number_format($nominal + $pembayaran->kode_unik, 0, ',', '.');
            $this->notificationService->notifyUser(
                user: $booking->user,
                judul: 'Booking Disetujui! Segera Lakukan Pembayaran',
                isi: "Permohonan booking kamar {$booking->kamar?->nomor_kamar} disetujui! Silakan transfer sebesar Rp{$totalBayar} (termasuk kode unik) dalam {$batasBayarJam} jam.",
                tipe: 'sukses',
                redirectUrl: '/booking-saya'
            );

            return response()->json([
                'status' => 'success',
                'message' => 'Booking berhasil disetujui. Menunggu pembayaran dari customer.',
                'data' => $booking->fresh(['user', 'kamar.gedung.cabang', 'diprosesOleh', 'pembayaranBooking', 'statusHistories']),
            ]);
        });
    }

    /**
     * Reject booking request with mandatory reason (Tahap 3).
     */
    public function tolak(Request $request, int $id): JsonResponse
    {
        $request->validate([
            'alasan_penolakan' => 'nullable|string|min:10',
            'alasan_tolak' => 'nullable|string|min:10',
        ], [
            'alasan_penolakan.min' => 'Alasan penolakan minimal 10 karakter.',
            'alasan_tolak.min' => 'Alasan penolakan minimal 10 karakter.',
        ]);

        $alasan = $request->input('alasan_penolakan') ?? $request->input('alasan_tolak');
        if (! $alasan || strlen(trim($alasan)) < 10) {
            return response()->json([
                'status' => 'error',
                'message' => 'Alasan penolakan wajib diisi minimal 10 karakter.',
            ], 422);
        }

        $booking = Booking::with(['kamar.gedung', 'user'])->findOrFail($id);
        $this->ensureBranchAccess($booking);

        $user = auth()->user();

        return DB::transaction(function () use ($booking, $alasan, $user) {
            $booking->status = Booking::STATUS_DITOLAK;
            $booking->alasan_tolak = $alasan;
            $booking->alasan_penolakan = $alasan;
            $booking->diproses_oleh = $user->id;
            $booking->diproses_pada = now();
            $booking->save();

            // Release room
            if ($booking->kamar && $booking->kamar->status === 'dibooking') {
                $hasOther = Booking::where('kamar_id', $booking->kamar_id)
                    ->where('id', '!=', $booking->id)
                    ->whereIn('status', Booking::STATUSES_HOLDING_ROOM)
                    ->exists();

                if (! $hasOther) {
                    $booking->kamar->status = 'kosong';
                    $booking->kamar->save();
                }
            }

            // Log status history
            $booking->logStatusChange(
                toStatus: Booking::STATUS_DITOLAK,
                changedBy: $user->id,
                alasan: $alasan
            );

            // Activity Log
            $peran = $this->determineUserRole($user);
            ActivityLog::catat(
                userId: $user->id,
                cabangId: $booking->kamar?->gedung?->cabang_id,
                peran: $peran,
                jenisAksi: 'tolak_booking',
                objekTerkait: "Booking #{$booking->id}",
                detail: "Admin menolak booking kamar {$booking->kamar?->nomor_kamar} ({$booking->user?->nama}). Alasan: {$alasan}"
            );

            // Notification
            $this->notificationService->notifyUser(
                user: $booking->user,
                judul: 'Booking Tidak Dapat Diterima',
                isi: "Mohon maaf, permohonan booking kamar {$booking->kamar?->nomor_kamar} ditolak: {$alasan}",
                tipe: 'peringatan',
                redirectUrl: '/booking-saya'
            );

            return response()->json([
                'status' => 'success',
                'message' => 'Booking berhasil ditolak.',
                'data' => $booking->fresh(['user', 'kamar.gedung.cabang', 'diprosesOleh', 'statusHistories']),
            ]);
        });
    }

    /**
     * Offer alternative room (Tahap 3).
     * Can offer another room in the same building or across branches.
     */
    public function tawarkanAlternatif(Request $request, int $id): JsonResponse
    {
        $request->validate([
            'kamar_alternatif_id' => 'required|exists:kamar,id',
            'kadaluarsa_jam' => 'nullable|integer|min:1|max:72',
        ], [
            'kamar_alternatif_id.required' => 'Kamar alternatif harus dipilih.',
        ]);

        $booking = Booking::with(['kamar.gedung.cabang', 'user'])->findOrFail($id);
        $this->ensureBranchAccess($booking);

        $altKamar = Kamar::with('gedung.cabang')->findOrFail($request->kamar_alternatif_id);
        $user = auth()->user();

        // Verify alternative room availability
        $startDate = $booking->tanggal_mulai ?? $booking->rencana_checkin ?? Carbon::today()->toDateString();
        $durasiBulan = (int) ($booking->durasi_bulan ?? 1);

        $availableInfo = $this->availabilityService->calculateAvailableDurations(
            kamarId: $altKamar->id,
            tanggalMulai: $startDate
        );

        $allowable = $availableInfo['durasi_pilihan'] ?? $availableInfo['durasi_tersedia'] ?? [];

        if (! in_array($durasiBulan, $allowable)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Kamar alternatif yang dipilih tidak memiliki ketersediaan yang cocok untuk durasi ini.',
            ], 422);
        }

        $hours = (int) $request->input('kadaluarsa_jam', 48);

        return DB::transaction(function () use ($booking, $altKamar, $hours, $user) {
            $booking->status = Booking::STATUS_MENUNGGU_RESPON_CUSTOMER;
            $booking->kamar_alternatif_id = $altKamar->id;
            $booking->tawaran_kadaluarsa_pada = now()->addHours($hours);
            $booking->diproses_oleh = $user->id;
            $booking->diproses_pada = now();
            $booking->save();

            // Log status history
            $booking->logStatusChange(
                toStatus: Booking::STATUS_MENUNGGU_RESPON_CUSTOMER,
                changedBy: $user->id,
                alasan: "Menawarkan kamar alternatif {$altKamar->nomor_kamar} di {$altKamar->gedung?->cabang?->nama_cabang}."
            );

            // Activity Log
            $peran = $this->determineUserRole($user);
            ActivityLog::catat(
                userId: $user->id,
                cabangId: $booking->kamar?->gedung?->cabang_id,
                peran: $peran,
                jenisAksi: 'tawarkan_alternatif',
                objekTerkait: "Booking #{$booking->id}",
                detail: "Admin menawarkan kamar alternatif {$altKamar->nomor_kamar} ({$altKamar->gedung?->cabang?->nama_cabang}) ke calon penghuni {$booking->user?->nama}."
            );

            // Notification
            $this->notificationService->notifyUser(
                user: $booking->user,
                judul: 'Tawaran Kamar Alternatif',
                isi: "Kamar pilihan Anda penuh. Kami menawarkan kamar alternatif {$altKamar->nomor_kamar} ({$altKamar->gedung?->cabang?->nama_cabang}). Silakan konfirmasi dalam {$hours} jam.",
                tipe: 'info',
                redirectUrl: '/booking-saya'
            );

            return response()->json([
                'status' => 'success',
                'message' => 'Tawaran kamar alternatif berhasil dikirim ke calon penghuni.',
                'data' => $booking->fresh(['kamar.gedung.cabang', 'kamarAlternatif.gedung.cabang', 'diprosesOleh', 'statusHistories']),
            ]);
        });
    }

    /**
     * Mark cash payment as paid (Bayar Tunai / Langsung) - Tahap 4.
     * Records receiver (penerima_id) and issues a numbered receipt.
     */
    public function bayarTunai(Request $request, int $id): JsonResponse
    {
        $booking = Booking::with(['kamar.gedung.cabang', 'user', 'pembayaranBooking'])->findOrFail($id);
        $this->ensureBranchAccess($booking);

        $user = auth()->user();

        return DB::transaction(function () use ($booking, $user) {
            $kwitansiNomor = 'KWT-'.date('Ymd').'-'.str_pad($booking->id, 5, '0', STR_PAD_LEFT);

            // Find or create month 1 payment
            $pembayaran = $booking->pembayaranBooking()
                ->where('periode_bulan_ke', 1)
                ->first();

            if (! $pembayaran) {
                $pembayaran = PembayaranBooking::create([
                    'booking_id' => $booking->id,
                    'periode_bulan_ke' => 1,
                    'nominal' => $booking->kamar?->harga_bulanan ?? 0,
                    'kode_unik' => 0,
                    'metode' => 'tunai',
                    'status' => PembayaranBooking::STATUS_LUNAS,
                    'penerima_id' => $user->id,
                    'waktu_lunas' => now(),
                    'kwitansi_nomor' => $kwitansiNomor,
                ]);
            } else {
                $pembayaran->metode = 'tunai';
                $pembayaran->status = PembayaranBooking::STATUS_LUNAS;
                $pembayaran->penerima_id = $user->id;
                $pembayaran->waktu_lunas = now();
                $pembayaran->kwitansi_nomor = $kwitansiNomor;
                $pembayaran->save();
            }

            // Determine if booking becomes Aktif or Terjadwal
            $today = Carbon::today();
            $startDate = Carbon::parse($booking->tanggal_mulai ?? $booking->rencana_checkin ?? $today);

            if ($startDate->lessThanOrEqualTo($today)) {
                $nextStatus = Booking::STATUS_AKTIF;
                $booking->status = Booking::STATUS_AKTIF;

                // Create or activate Penghuni
                Penghuni::updateOrCreate(
                    ['user_id' => $booking->user_id],
                    [
                        'kamar_id' => $booking->kamar_id,
                        'tanggal_masuk' => $startDate,
                        'masa_tinggal_sampai' => $booking->tanggal_selesai,
                        'status' => 'aktif',
                    ]
                );

                if ($booking->user) {
                    $booking->user->role = 'penghuni';
                    $booking->user->save();
                }

                if ($booking->kamar) {
                    $booking->kamar->status = 'terisi';
                    $booking->kamar->save();
                }
            } else {
                $nextStatus = Booking::STATUS_TERJADWAL;
                $booking->status = Booking::STATUS_TERJADWAL;

                if ($booking->kamar) {
                    $booking->kamar->status = 'dibooking';
                    $booking->kamar->save();
                }
            }

            $booking->save();

            // Status history
            $booking->logStatusChange(
                toStatus: $nextStatus,
                changedBy: $user->id,
                alasan: "Pembayaran tunai diterima oleh {$user->nama} (Kwitansi: {$kwitansiNomor}). Status booking menjadi {$nextStatus}."
            );

            // Activity Log
            $peran = $this->determineUserRole($user);
            ActivityLog::catat(
                userId: $user->id,
                cabangId: $booking->kamar?->gedung?->cabang_id,
                peran: $peran,
                jenisAksi: 'bayar_tunai_lunas',
                objekTerkait: "Booking #{$booking->id}",
                detail: "Pembayaran tunai kamar {$booking->kamar?->nomor_kamar} ditandai lunas oleh {$user->nama}. No Kwitansi: {$kwitansiNomor}."
            );

            // Notification
            $this->notificationService->notifyUser(
                user: $booking->user,
                judul: 'Pembayaran Tunai Diterima',
                isi: "Pembayaran tunai untuk kamar {$booking->kamar?->nomor_kamar} telah diterima. No Kwitansi: {$kwitansiNomor}. Status: {$nextStatus}.",
                tipe: 'sukses',
                redirectUrl: '/booking-saya'
            );

            return response()->json([
                'status' => 'success',
                'message' => 'Pembayaran tunai berhasil ditandai Lunas. Kwitansi telah diterbitkan.',
                'data' => $booking->fresh(['user', 'kamar.gedung.cabang', 'pembayaranBooking.penerima', 'statusHistories']),
                'kwitansi_nomor' => $kwitansiNomor,
            ]);
        });
    }

    /**
     * Verify uploaded payment proof (Verifikasi Transfer) - Tahap 4.
     */
    public function verifikasiPembayaran(Request $request, int $id): JsonResponse
    {
        $booking = Booking::with(['kamar.gedung.cabang', 'user', 'pembayaranBooking'])->findOrFail($id);
        $this->ensureBranchAccess($booking);

        $user = auth()->user();

        return DB::transaction(function () use ($booking, $user) {
            $kwitansiNomor = 'KWT-'.date('Ymd').'-'.str_pad($booking->id, 5, '0', STR_PAD_LEFT);

            $pembayaran = $booking->pembayaranBooking()
                ->whereIn('status', [PembayaranBooking::STATUS_MENUNGGU_VERIFIKASI, PembayaranBooking::STATUS_MENUNGGU_PEMBAYARAN])
                ->latest('id')
                ->first();

            if ($pembayaran) {
                $pembayaran->status = PembayaranBooking::STATUS_LUNAS;
                $pembayaran->penerima_id = $user->id;
                $pembayaran->waktu_lunas = now();
                $pembayaran->kwitansi_nomor = $kwitansiNomor;
                $pembayaran->save();

                // Update cumulative payment & ownership on additional facilities
                foreach ($booking->kamarFasilitas as $kf) {
                    $opsi = $kf->opsi_pembayaran ?? 'dari_kost';
                    if ($opsi === 'permanen') {
                        $kf->is_hak_milik = true;
                        $kf->total_terbayar = (float) $kf->harga_barang;
                    } else {
                        $kf->total_terbayar = (float) ($kf->total_terbayar ?? 0) + (float) ($kf->biaya_bulanan ?? 0);
                        if ($kf->harga_barang > 0 && $kf->total_terbayar >= $kf->harga_barang) {
                            $kf->is_hak_milik = true;
                        }
                    }
                    $kf->tanggal_pasang = $kf->tanggal_pasang ?? now()->toDateString();
                    $kf->status_request = 'aktif';
                    $kf->save();
                }
            }

            // Determine if booking becomes Aktif or Terjadwal
            $today = Carbon::today();
            $startDate = Carbon::parse($booking->tanggal_mulai ?? $booking->rencana_checkin ?? $today);

            if ($startDate->lessThanOrEqualTo($today)) {
                $nextStatus = Booking::STATUS_AKTIF;
                $booking->status = Booking::STATUS_AKTIF;

                Penghuni::updateOrCreate(
                    ['user_id' => $booking->user_id],
                    [
                        'kamar_id' => $booking->kamar_id,
                        'tanggal_masuk' => $startDate,
                        'masa_tinggal_sampai' => $booking->tanggal_selesai,
                        'status' => 'aktif',
                    ]
                );

                if ($booking->user) {
                    $booking->user->role = 'penghuni';
                    $booking->user->save();
                }

                if ($booking->kamar) {
                    $booking->kamar->status = 'terisi';
                    $booking->kamar->save();
                }
            } else {
                $nextStatus = Booking::STATUS_TERJADWAL;
                $booking->status = Booking::STATUS_TERJADWAL;

                if ($booking->kamar) {
                    $booking->kamar->status = 'dibooking';
                    $booking->kamar->save();
                }
            }

            $booking->save();

            // Status history
            $booking->logStatusChange(
                toStatus: $nextStatus,
                changedBy: $user->id,
                alasan: "Bukti transfer pembayaran diverifikasi oleh {$user->nama} (Kwitansi: {$kwitansiNomor})."
            );

            // Activity Log
            $peran = $this->determineUserRole($user);
            ActivityLog::catat(
                userId: $user->id,
                cabangId: $booking->kamar?->gedung?->cabang_id,
                peran: $peran,
                jenisAksi: 'verifikasi_transfer_lunas',
                objekTerkait: "Booking #{$booking->id}",
                detail: "Admin memverifikasi bukti pembayaran transfer booking kamar {$booking->kamar?->nomor_kamar} ({$booking->user?->nama}). No Kwitansi: {$kwitansiNomor}."
            );

            // Notification
            $this->notificationService->notifyUser(
                user: $booking->user,
                judul: 'Pembayaran Diverifikasi!',
                isi: "Pembayaran booking untuk kamar {$booking->kamar?->nomor_kamar} telah diverifikasi. No Kwitansi: {$kwitansiNomor}. Status booking: {$nextStatus}.",
                tipe: 'sukses',
                redirectUrl: '/booking-saya'
            );

            return response()->json([
                'status' => 'success',
                'message' => 'Bukti pembayaran berhasil diverifikasi dan ditandai Lunas.',
                'data' => $booking->fresh(['user', 'kamar.gedung.cabang', 'pembayaranBooking.penerima', 'statusHistories']),
                'kwitansi_nomor' => $kwitansiNomor,
            ]);
        });
    }

    /**
     * Reject uploaded payment proof.
     */
    public function tolakBuktiPembayaran(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'alasan' => 'required|string|min:5|max:255',
        ]);

        $booking = Booking::with(['kamar.gedung.cabang', 'user', 'pembayaranBooking'])->findOrFail($id);
        $this->ensureBranchAccess($booking);

        $user = auth()->user();

        return DB::transaction(function () use ($booking, $user, $validated) {
            $pembayaran = $booking->pembayaranBooking()
                ->whereIn('status', [PembayaranBooking::STATUS_MENUNGGU_VERIFIKASI])
                ->latest('id')
                ->first();

            if ($pembayaran) {
                $pembayaran->status = PembayaranBooking::STATUS_MENUNGGU_PEMBAYARAN;
                $pembayaran->catatan = $validated['alasan'];
                $pembayaran->save();
            }

            $booking->status = Booking::STATUS_MENUNGGU_PEMBAYARAN;
            $booking->save();

            $booking->logStatusChange(
                toStatus: Booking::STATUS_MENUNGGU_PEMBAYARAN,
                changedBy: $user->id,
                alasan: "Bukti transfer pembayaran ditolak oleh {$user->nama}. Alasan: {$validated['alasan']}."
            );

            // Activity Log
            ActivityLog::catat(
                userId: $user->id,
                cabangId: $booking->kamar?->gedung?->cabang_id,
                peran: $this->determineUserRole($user),
                jenisAksi: 'tolak_bukti_transfer',
                objekTerkait: "Booking #{$booking->id}",
                detail: "Bukti transfer pembayaran booking #{$booking->id} ditolak. Alasan: {$validated['alasan']}."
            );

            // Notification to customer
            $this->notificationService->notifyUser(
                user: $booking->user,
                judul: 'Bukti Pembayaran Ditolak',
                isi: "Bukti transfer pembayaran Anda untuk booking kamar {$booking->kamar?->nomor_kamar} ditolak dengan alasan: '{$validated['alasan']}'. Silakan upload ulang bukti transfer yang sah.",
                tipe: 'peringatan',
                redirectUrl: '/booking-saya'
            );

            return response()->json([
                'status' => 'success',
                'message' => 'Bukti pembayaran berhasil ditolak. Customer diminta mengunggah ulang bukti.',
                'data' => $booking->fresh(['user', 'kamar.gedung.cabang', 'pembayaranBooking', 'statusHistories']),
            ]);
        });
    }

    /**
     * Confirm checkout (Konfirmasi Keluar) - Tahap 5.
     * Sets booking Selesai, Penghuni Nonaktif, Kamar Kosong.
     */
    public function konfirmasiKeluar(Request $request, int $id): JsonResponse
    {
        $booking = Booking::with(['kamar.gedung.cabang', 'user'])->findOrFail($id);
        $this->ensureBranchAccess($booking);

        $user = auth()->user();

        return DB::transaction(function () use ($booking, $user, $request) {
            $alasanKeluar = $request->input('alasan_selesai', 'keluar normal');

            $booking->status = Booking::STATUS_SELESAI;
            $booking->waktu_keluar = now();
            $booking->dikonfirmasi_keluar_oleh = $user->id;
            $booking->alasan_selesai = $alasanKeluar;
            $booking->save();

            // Set Penghuni to nonaktif
            Penghuni::where('user_id', $booking->user_id)->update(['status' => 'nonaktif']);

            // Set room to kosong
            if ($booking->kamar) {
                $booking->kamar->status = 'kosong';
                $booking->kamar->save();
            }

            // Status history
            $booking->logStatusChange(
                toStatus: Booking::STATUS_SELESAI,
                changedBy: $user->id,
                alasan: "Konfirmasi checkout oleh {$user->nama}. Alasan: {$alasanKeluar}."
            );

            // Activity Log
            $peran = $this->determineUserRole($user);
            ActivityLog::catat(
                userId: $user->id,
                cabangId: $booking->kamar?->gedung?->cabang_id,
                peran: $peran,
                jenisAksi: 'konfirmasi_keluar',
                objekTerkait: "Booking #{$booking->id}",
                detail: "{$user->nama} mengonfirmasi checkout penghuni kamar {$booking->kamar?->nomor_kamar} ({$booking->user?->nama}). Kamar siap dibersihkan."
            );

            // Notification
            $this->notificationService->notifyUser(
                user: $booking->user,
                judul: 'Checkout Dikonfirmasi',
                isi: "Proses checkout dari kamar {$booking->kamar?->nomor_kamar} telah selesai dikonfirmasi. Terima kasih telah tinggal di Home-In!",
                tipe: 'info',
                redirectUrl: '/booking-saya'
            );

            return response()->json([
                'status' => 'success',
                'message' => 'Konfirmasi keluar berhasil dicatat. Status kamar telah dikosongkan.',
                'data' => $booking->fresh(['user', 'kamar.gedung.cabang', 'dikonfirmasiKeluarOleh', 'statusHistories']),
            ]);
        });
    }

    /**
     * Mark refund as completed (Tandai Refund) - Tahap 4.
     */
    public function tandaiRefund(Request $request, int $id): JsonResponse
    {
        $booking = Booking::with(['kamar.gedung.cabang', 'user', 'pembayaranBooking'])->findOrFail($id);
        $this->ensureBranchAccess($booking);

        $user = auth()->user();

        $payment = $booking->pembayaranBooking()
            ->where('status_refund', PembayaranBooking::REFUND_MENUNGGU)
            ->first();

        if (! $payment) {
            return response()->json([
                'status' => 'error',
                'message' => 'Tidak ada pembayaran yang sedang menunggu refund pada booking ini.',
            ], 422);
        }

        $payment->status_refund = PembayaranBooking::REFUND_SUDAH;
        $payment->save();

        $peran = $this->determineUserRole($user);
        ActivityLog::catat(
            userId: $user->id,
            cabangId: $booking->kamar?->gedung?->cabang_id,
            peran: $peran,
            jenisAksi: 'refund_selesai',
            objekTerkait: "Booking #{$booking->id}",
            detail: "Admin menandai pengembalian dana (refund) telah selesai diproses untuk {$booking->user?->nama}."
        );

        $this->notificationService->notifyUser(
            user: $booking->user,
            judul: 'Pengembalian Dana (Refund) Berhasil Diproses',
            isi: "Dana pembayaran booking kamar {$booking->kamar?->nomor_kamar} telah berhasil direfund oleh pengelola kost.",
            tipe: 'sukses',
            redirectUrl: '/booking-saya'
        );

        return response()->json([
            'status' => 'success',
            'message' => 'Refund berhasil ditandai selesai.',
            'data' => $booking->fresh(['pembayaranBooking']),
        ]);
    }

    /**
     * Download or view Receipt data (Kwitansi) - Tahap 4.
     */
    public function kwitansi(int $id): JsonResponse
    {
        $booking = Booking::with([
            'user',
            'kamar.gedung.cabang',
            'pembayaranBooking.penerima',
        ])->findOrFail($id);

        $this->ensureBranchAccess($booking);

        $lunasPayment = $booking->pembayaranBooking
            ->where('status', PembayaranBooking::STATUS_LUNAS)
            ->first();

        if (! $lunasPayment) {
            return response()->json([
                'status' => 'error',
                'message' => 'Booking ini belum memiliki pembayaran berstatus Lunas.',
            ], 422);
        }

        return response()->json([
            'status' => 'success',
            'data' => [
                'kwitansi_nomor' => $lunasPayment->kwitansi_nomor ?? ('KWT-'.date('Ymd').'-'.str_pad($booking->id, 5, '0', STR_PAD_LEFT)),
                'tanggal_terbit' => ($lunasPayment->waktu_lunas ?? $lunasPayment->created_at)->format('d F Y H:i'),
                'nama_penyewa' => $booking->user?->name ?? $booking->user?->nama,
                'email' => $booking->user?->email,
                'no_hp' => $booking->user?->no_hp,
                'kamar' => $booking->kamar?->nomor_kamar,
                'gedung' => $booking->kamar?->gedung?->nama_gedung,
                'cabang' => $booking->kamar?->gedung?->cabang?->nama_cabang,
                'alamat_cabang' => $booking->kamar?->gedung?->cabang?->alamat,
                'periode_mulai' => Carbon::parse($booking->tanggal_mulai)->format('d M Y'),
                'periode_selesai' => Carbon::parse($booking->tanggal_selesai)->format('d M Y'),
                'durasi_bulan' => $booking->durasi_bulan,
                'nominal' => (float) $lunasPayment->nominal,
                'kode_unik' => (int) $lunasPayment->kode_unik,
                'total_bayar' => (float) ($lunasPayment->nominal + $lunasPayment->kode_unik),
                'metode' => $lunasPayment->metode,
                'penerima' => $lunasPayment->penerima?->name ?? 'Kasir Kost Home-In',
            ],
        ]);
    }

    /**
     * Search nearest alternative branches and rooms (Haversine Formula).
     */
    public function alternatives(int $id): JsonResponse
    {
        $booking = Booking::with(['kamar.gedung.cabang'])->findOrFail($id);
        $currentCabang = $booking->kamar?->gedung?->cabang;

        if (! $currentCabang) {
            return response()->json([
                'status' => 'error',
                'message' => 'Cabang asal tidak ditemukan.',
            ], 404);
        }

        $originLat = (float) ($currentCabang->latitude ?? -6.2088);
        $originLon = (float) ($currentCabang->longitude ?? 106.8456);

        // Fetch other branches and current branch's other rooms
        $allCabangs = Cabang::with(['gedung.kamar' => function ($kq) {
            $kq->where('status', 'kosong');
        }])->get();

        $earthRadius = 6371; // km
        $alternatives = [];

        foreach ($allCabangs as $cabang) {
            $availableRooms = collect();
            foreach ($cabang->gedung as $gedung) {
                foreach ($gedung->kamar as $room) {
                    if ($room->id !== $booking->kamar_id) {
                        $availableRooms->push([
                            'id' => $room->id,
                            'nomor_kamar' => $room->nomor_kamar,
                            'lantai' => $room->lantai,
                            'harga_bulanan' => (float) $room->harga_bulanan,
                            'gedung_nama' => $gedung->nama_gedung,
                        ]);
                    }
                }
            }

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
                    'is_current_cabang' => $cabang->id === $currentCabang->id,
                    'jarak_km' => $distanceKm,
                    'kamar_kosong_count' => $availableRooms->count(),
                    'harga_termurah' => $availableRooms->min('harga_bulanan'),
                    'harga_termahal' => $availableRooms->max('harga_bulanan'),
                    'rooms' => $availableRooms->values(),
                ];
            }
        }

        // Sort: current branch first, then by distance
        usort($alternatives, function ($a, $b) {
            if ($a['is_current_cabang'] && ! $b['is_current_cabang']) {
                return -1;
            }
            if (! $a['is_current_cabang'] && $b['is_current_cabang']) {
                return 1;
            }

            return $a['jarak_km'] <=> $b['jarak_km'];
        });

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
     * Check-in penghuni (termasuk jika check-in lebih awal dari jadwal rencana).
     */
    public function checkinAwal(Request $request, int $id): JsonResponse
    {
        $booking = Booking::with(['kamar.gedung.cabang', 'user'])->findOrFail($id);
        $this->ensureBranchAccess($booking);
        $user = auth()->user();

        return DB::transaction(function () use ($booking, $user, $request) {
            $tanggalCheckin = $request->input('tanggal_checkin', now()->toDateString());
            $booking->tanggal_mulai = $tanggalCheckin;
            $booking->status = Booking::STATUS_AKTIF;
            $booking->save();

            // Create or activate Penghuni
            $penghuni = Penghuni::updateOrCreate(
                ['user_id' => $booking->user_id],
                [
                    'kamar_id' => $booking->kamar_id,
                    'tanggal_masuk' => $tanggalCheckin,
                    'masa_tinggal_sampai' => $booking->tanggal_selesai,
                    'status' => 'aktif',
                ]
            );

            if ($booking->user) {
                $booking->user->role = 'penghuni';
                $booking->user->save();
            }

            if ($booking->kamar) {
                $booking->kamar->status = 'terisi';
                $booking->kamar->save();
            }

            ActivityLog::create([
                'user_id' => $user->id,
                'aktivitas' => "Check-in lebih awal untuk {$booking->user?->nama} di Kamar {$booking->kamar?->nomor_kamar} tanggal {$tanggalCheckin}",
                'tipe' => 'booking',
                'tabel_terkait' => 'booking',
                'id_terkait' => $booking->id,
                'ip_address' => request()->ip(),
            ]);

            return response()->json([
                'status' => 'success',
                'message' => "Check-in lebih awal berhasil diproses! Penghuni aktif mulai tanggal {$tanggalCheckin}.",
                'data' => $booking->load(['kamar.gedung', 'user']),
            ]);
        });
    }

    /**
     * Ensure current user (Penjaga) is allowed to access this booking's branch.
     */
    protected function ensureBranchAccess(Booking $booking): void
    {
        $user = auth()->user();
        if ($user && $user->role === 'admin') {
            $user->loadMissing('pegawai');
            $penjagaCabangId = $user->pegawai?->cabang_id;
            $bookingCabangId = $booking->kamar?->gedung?->cabang_id;

            if ($penjagaCabangId && $bookingCabangId && $penjagaCabangId !== $bookingCabangId) {
                abort(403, 'Anda hanya dapat mengakses data booking pada cabang yang ditugaskan kepada Anda.');
            }
        }
    }

    /**
     * Determine role string for activity logging.
     */
    protected function determineUserRole($user): string
    {
        if (! $user) {
            return 'sistem';
        }
        if ($user->role === 'pemilik') {
            return 'admin';
        }
        if ($user->role === 'admin') {
            $user->loadMissing('pegawai');
            if ($user->pegawai?->jabatan && str_contains(strtolower($user->pegawai->jabatan), 'penjaga')) {
                return 'penjaga';
            }

            return 'penjaga'; // default admin assigned to single branch acts as penjaga
        }

        return $user->role ?? 'admin';
    }
}
