<?php

namespace App\Http\Controllers\Api\Public;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Booking;
use App\Models\Fasilitas;
use App\Models\Kamar;
use App\Models\KamarFasilitas;
use App\Models\PembayaranBooking;
use App\Models\Pengaturan;
use App\Services\BookingAvailabilityService;
use App\Services\NotificationService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class BookingFlowController extends Controller
{
    public function __construct(
        protected BookingAvailabilityService $availabilityService,
        protected NotificationService $notificationService
    ) {}

    /**
     * Store new booking request by prospective tenant (calon_penghuni).
     * Validates availability with 14-day gap, active tenant exclusion, and row lock.
     */
    public function store(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'kamar_id' => 'required|exists:kamar,id',
            'tanggal_mulai' => 'nullable|date|after_or_equal:today',
            'rencana_checkin' => 'nullable|date|after_or_equal:today',
            'durasi_bulan' => 'nullable|integer|min:1|max:36',
            'fasilitas_ids' => 'nullable|array',
            'fasilitas_ids.*' => 'exists:fasilitas,id',
            'fasilitas_pilihan' => 'nullable|array',
            'fasilitas_pilihan.*.id' => 'required_with:fasilitas_pilihan|exists:fasilitas,id',
            'fasilitas_pilihan.*.opsi' => 'nullable|in:permanen,dari_kost',
            'catatan' => 'nullable|string|max:1000',
            'setuju_aturan' => 'required|accepted',
            'setuju_tidak_bisa_perpanjang' => 'nullable|boolean',
        ], [
            'kamar_id.required' => 'Kamar harus dipilih.',
            'setuju_aturan.accepted' => 'Anda harus menyetujui syarat & aturan kost sebelum memesan.',
        ]);

        $tanggalMulaiInput = $validated['tanggal_mulai'] ?? $validated['rencana_checkin'] ?? Carbon::today()->toDateString();
        $durasiBulan = (int) ($validated['durasi_bulan'] ?? 1);

        // 1. Limit active bookings per prospective tenant account (max 2 active)
        $activeBookingsCount = Booking::where('user_id', $user->id)
            ->whereIn('status', [
                Booking::STATUS_MENUNGGU_KONFIRMASI,
                Booking::STATUS_MENUNGGU_RESPON_CUSTOMER,
                Booking::STATUS_MENUNGGU_PEMBAYARAN,
                Booking::STATUS_MENUNGGU_VERIFIKASI,
                'menunggu_persetujuan',
                'ditawarkan_alternatif',
            ])
            ->count();

        if ($activeBookingsCount >= 2) {
            return response()->json([
                'status' => 'error',
                'message' => 'Anda sudah memiliki 2 permohonan booking yang sedang aktif berjalan. Harap selesaikan atau batalkan booking sebelumnya sebelum membuat booking baru.',
            ], 422);
        }

        // 2. Validate availability and lock room in a transaction
        try {
            $booking = DB::transaction(function () use ($user, $validated, $tanggalMulaiInput, $durasiBulan) {
                // Lock room and verify availability
                $lockResult = $this->availabilityService->lockAndVerifyKamar(
                    kamarId: (int) $validated['kamar_id'],
                    tanggalMulai: $tanggalMulaiInput,
                    durasiBulan: $durasiBulan
                );
                $kamar = $lockResult['kamar'];

                // Check subsequent booking notice
                $availableDurations = $this->availabilityService->calculateAvailableDurations(
                    kamarId: $kamar->id,
                    tanggalMulai: $tanggalMulaiInput
                );

                if (! empty($availableDurations['ada_booking_berikutnya'])) {
                    if (empty($validated['setuju_tidak_bisa_perpanjang'])) {
                        throw new \Exception('Ada booking berikutnya di kamar ini sehingga sewa tidak dapat diperpanjang. Harap centang persetujuan bahwa Anda memahami hal ini sebelum memesan.');
                    }
                }

                // Compile notes with extra facilities
                // Compile notes & options with extra facilities
                $pilihanMap = [];
                if (! empty($validated['fasilitas_pilihan'])) {
                    foreach ($validated['fasilitas_pilihan'] as $fp) {
                        $pilihanMap[(int) $fp['id']] = $fp['opsi'] ?? 'dari_kost';
                    }
                }

                $fasilitasIds = ! empty($pilihanMap)
                    ? array_keys($pilihanMap)
                    : ($validated['fasilitas_ids'] ?? []);

                $fasilitasTambahan = collect();
                if (! empty($fasilitasIds)) {
                    $fasilitasTambahan = Fasilitas::whereIn('id', $fasilitasIds)->get();
                }

                $catatanLengkap = $validated['catatan'] ?? '';
                if ($fasilitasTambahan->count() > 0) {
                    $daftarReq = $fasilitasTambahan->map(function ($f) use ($pilihanMap) {
                        $opsi = $pilihanMap[$f->id] ?? ($f->kategori_biaya === 'sekali_bayar' ? 'permanen' : 'dari_kost');
                        if ($opsi === 'permanen') {
                            $harga = $f->harga_barang > 0 ? $f->harga_barang : $f->biaya_tambahan;

                            return "{$f->nama_fasilitas} (Beli Hak Milik: Rp".number_format($harga, 0, ',', '.').')';
                        } else {
                            $harga = $f->biaya_tambahan;

                            return "{$f->nama_fasilitas} (Sewa Kost: +Rp".number_format($harga, 0, ',', '.').'/bln)';
                        }
                    })->join(', ');
                    $catatanLengkap = ($catatanLengkap ? $catatanLengkap."\n" : '')."[Request Fasilitas: {$daftarReq}]";
                }

                // Create booking record (holding room)
                $newBooking = Booking::create([
                    'user_id' => $user->id,
                    'kamar_id' => $kamar->id,
                    'tanggal_booking' => now(),
                    'tanggal_mulai' => $tanggalMulaiInput,
                    'rencana_checkin' => $tanggalMulaiInput,
                    'durasi_bulan' => $durasiBulan,
                    'status' => Booking::STATUS_MENUNGGU_KONFIRMASI,
                    'catatan' => $catatanLengkap,
                ]);

                // Record status history
                $newBooking->logStatusChange(
                    toStatus: Booking::STATUS_MENUNGGU_KONFIRMASI,
                    changedBy: $user->id,
                    alasan: 'Pengajuan booking baru oleh calon penghuni.'
                );

                // Save requested additional facilities with exact pricing & ownership tracking
                foreach ($fasilitasTambahan as $f) {
                    $opsi = $pilihanMap[$f->id] ?? ($f->kategori_biaya === 'sekali_bayar' ? 'permanen' : 'dari_kost');
                    $hargaBarang = (float) ($f->harga_barang > 0 ? $f->harga_barang : ($opsi === 'permanen' ? $f->biaya_tambahan : ($f->biaya_tambahan * 10)));
                    $biayaBulanan = (float) ($opsi === 'permanen' ? 0 : $f->biaya_tambahan);
                    $isHakMilik = ($opsi === 'permanen');

                    KamarFasilitas::create([
                        'booking_id' => $newBooking->id,
                        'kamar_id' => $kamar->id,
                        'fasilitas_id' => $f->id,
                        'status_request' => 'menunggu_konfirmasi',
                        'opsi_pembayaran' => $opsi,
                        'harga_barang' => $hargaBarang,
                        'biaya_bulanan' => $biayaBulanan,
                        'total_terbayar' => 0,
                        'is_hak_milik' => $isHakMilik,
                        'tanggal_pasang' => $tanggalMulaiInput,
                        'created_at' => now(),
                    ]);
                }

                // Log Activity
                ActivityLog::catat(
                    userId: $user->id,
                    cabangId: $kamar->gedung?->cabang_id,
                    peran: 'customer',
                    jenisAksi: 'booking_dibuat',
                    objekTerkait: "Booking #{$newBooking->id}",
                    detail: "Calon penghuni {$user->nama} mengajukan booking kamar {$kamar->nomor_kamar} durasi {$durasiBulan} bulan mulai {$tanggalMulaiInput}."
                );

                // Notifications
                $this->notificationService->notifyUser(
                    user: $user,
                    judul: 'Permohonan Booking Terkirim',
                    isi: "Booking Anda untuk Kamar {$kamar->nomor_kamar} ({$kamar->gedung?->cabang?->nama_cabang}) berhasil dikirim dan menunggu konfirmasi pengelola kost.",
                    tipe: 'info',
                    redirectUrl: '/booking-saya'
                );

                $this->notificationService->notifyAdmins(
                    judul: 'Permohonan Booking Baru Masuk',
                    isi: "Calon penghuni {$user->nama} mengajukan booking Kamar {$kamar->nomor_kamar} ({$kamar->gedung?->cabang?->nama_cabang}).",
                    tipe: 'info',
                    redirectUrl: '/admin/booking'
                );

                $this->notificationService->notifyBranchGuards(
                    cabangId: $kamar->gedung?->cabang_id ?? 0,
                    judul: 'Booking Baru Masuk di Cabang Anda',
                    isi: "Booking baru kamar {$kamar->nomor_kamar} oleh {$user->nama} menunggu konfirmasi.",
                    tipe: 'info'
                );

                return $newBooking;
            });

            return response()->json([
                'status' => 'success',
                'message' => 'Permohonan booking berhasil dibuat! Silakan pantau status booking Anda di menu Booking Saya.',
                'data' => $booking->load(['kamar.gedung.cabang']),
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * List all bookings made by the authenticated customer.
     */
    public function myBookings(Request $request): JsonResponse
    {
        $userId = $request->user()->id;

        $bookings = Booking::with([
            'kamar.gedung.cabang',
            'kamar.kamarFoto',
            'kamarFasilitas.fasilitas',
            'kamarAlternatif.gedung.cabang',
            'kamarAlternatif.kamarFoto',
            'pembayaranBooking',
            'statusHistories.user',
        ])
            ->where('user_id', $userId)
            ->orderBy('tanggal_booking', 'desc')
            ->get();

        return response()->json([
            'status' => 'success',
            'data' => $bookings,
        ]);
    }

    /**
     * Single booking detail for authenticated customer.
     */
    public function show(Request $request, int $id): JsonResponse
    {
        $userId = $request->user()->id;

        $booking = Booking::with([
            'kamar.gedung.cabang',
            'kamar.kamarFoto',
            'kamarFasilitas.fasilitas',
            'kamarAlternatif.gedung.cabang',
            'kamarAlternatif.kamarFoto',
            'pembayaranBooking.penerima',
            'statusHistories.user',
        ])
            ->where('user_id', $userId)
            ->where('id', $id)
            ->firstOrFail();

        // Include QRIS settings if payment is pending
        $qrisGopayImage = Pengaturan::get('qris_gopay_image');

        return response()->json([
            'status' => 'success',
            'data' => $booking,
            'qris_gopay_image' => $qrisGopayImage,
        ]);
    }

    /**
     * Cancel an active booking by customer.
     * If unpaid -> dibatalkan immediately.
     * If paid -> status_refund = menunggu_refund, room released immediately.
     */
    public function cancel(Request $request, int $id): JsonResponse
    {
        $userId = $request->user()->id;

        $booking = Booking::with(['kamar.gedung.cabang', 'pembayaranBooking'])
            ->where('user_id', $userId)
            ->where('id', $id)
            ->firstOrFail();

        if (in_array($booking->status, [Booking::STATUS_AKTIF, Booking::STATUS_SELESAI, Booking::STATUS_DIBATALKAN, Booking::STATUS_DITOLAK])) {
            return response()->json([
                'status' => 'error',
                'message' => 'Booking dengan status ini tidak dapat dibatalkan sendiri.',
            ], 422);
        }

        DB::transaction(function () use ($booking, $userId) {
            $prevStatus = $booking->status;

            // Check if any payment was verified/paid
            $paidPayment = $booking->pembayaranBooking()
                ->where('status', PembayaranBooking::STATUS_LUNAS)
                ->first();

            $booking->status = Booking::STATUS_DIBATALKAN;
            $booking->save();

            $alasan = 'Dibatalkan oleh calon penghuni.';
            if ($paidPayment) {
                $paidPayment->status_refund = PembayaranBooking::REFUND_MENUNGGU;
                $paidPayment->save();
                $alasan .= ' Mengajukan pengembalian dana (refund).';
            }

            $booking->logStatusChange(
                toStatus: Booking::STATUS_DIBATALKAN,
                changedBy: $userId,
                alasan: $alasan
            );

            // Release room
            if ($booking->kamar && $booking->kamar->status === 'dibooking') {
                $booking->kamar->status = 'kosong';
                $booking->kamar->save();
            }

            ActivityLog::catat(
                userId: $userId,
                cabangId: $booking->kamar?->gedung?->cabang_id,
                peran: 'customer',
                jenisAksi: 'booking_dibatalkan',
                objekTerkait: "Booking #{$booking->id}",
                detail: "Calon penghuni membatalkan booking kamar {$booking->kamar?->nomor_kamar}.".($paidPayment ? ' Permintaan refund diajukan.' : '')
            );

            $this->notificationService->notifyUser(
                user: $booking->user,
                judul: 'Booking Dibatalkan',
                isi: "Booking Anda untuk kamar {$booking->kamar?->nomor_kamar} telah dibatalkan.".($paidPayment ? ' Pengembalian dana akan diproses oleh admin.' : ''),
                tipe: 'peringatan',
                redirectUrl: '/booking-saya'
            );

            $this->notificationService->notifyAdmins(
                judul: 'Booking Dibatalkan Calon Penghuni',
                isi: "Booking #{$booking->id} kamar {$booking->kamar?->nomor_kamar} dibatalkan oleh calon penghuni.".($paidPayment ? ' Terdapat pembayaran yang memerlukan refund.' : ''),
                tipe: 'peringatan',
                redirectUrl: '/admin/booking'
            );
        });

        return response()->json([
            'status' => 'success',
            'message' => 'Booking telah berhasil dibatalkan.',
            'data' => $booking->fresh(['pembayaranBooking', 'statusHistories']),
        ]);
    }

    /**
     * Upload proof of payment for approved booking (Transfer / QRIS).
     */
    public function uploadPaymentProof(Request $request, int $id): JsonResponse
    {
        $userId = $request->user()->id;

        $booking = Booking::with(['kamar.gedung.cabang', 'pembayaranBooking'])
            ->where('user_id', $userId)
            ->where('id', $id)
            ->firstOrFail();

        if (! in_array($booking->status, [
            Booking::STATUS_MENUNGGU_PEMBAYARAN,
            Booking::STATUS_MENUNGGU_VERIFIKASI,
            'menunggu_pembayaran',
        ])) {
            return response()->json([
                'status' => 'error',
                'message' => 'Status booking saat ini tidak dalam tahap menunggu pembayaran.',
            ], 422);
        }

        $request->validate([
            'bukti_pembayaran' => 'required|file|mimes:jpeg,png,jpg,webp,pdf|max:4096',
            'metode_pembayaran' => 'nullable|string|max:50',
        ], [
            'bukti_pembayaran.required' => 'File bukti pembayaran wajib diupload.',
            'bukti_pembayaran.mimes' => 'Format file bukti bayar harus JPG, PNG, WEBP, atau PDF.',
            'bukti_pembayaran.max' => 'Ukuran file maksimal 4 MB.',
        ]);

        $filePath = $request->file('bukti_pembayaran')->store('bukti_booking', 'public');
        $fileUrl = Storage::url($filePath);

        $payment = DB::transaction(function () use ($booking, $request, $fileUrl, $userId) {
            // Find existing month-1 payment or create draft
            $pembayaran = $booking->pembayaranBooking()
                ->where('periode_bulan_ke', 1)
                ->first();

            if (! $pembayaran) {
                $kodeUnik = mt_rand(100, 999);
                $pembayaran = PembayaranBooking::create([
                    'booking_id' => $booking->id,
                    'periode_bulan_ke' => 1,
                    'nominal' => $booking->hitungBiayaBulanPertama(),
                    'kode_unik' => $kodeUnik,
                    'metode' => $request->input('metode_pembayaran', 'transfer_qris'),
                    'bukti_bayar' => $fileUrl,
                    'bukti_pembayaran' => $fileUrl,
                    'status' => PembayaranBooking::STATUS_MENUNGGU_VERIFIKASI,
                    'tanggal_bayar' => now(),
                ]);
            } else {
                $pembayaran->bukti_bayar = $fileUrl;
                $pembayaran->bukti_pembayaran = $fileUrl;
                $pembayaran->metode = $request->input('metode_pembayaran', $pembayaran->metode ?? 'transfer_qris');
                $pembayaran->status = PembayaranBooking::STATUS_MENUNGGU_VERIFIKASI;
                $pembayaran->tanggal_bayar = now();
                $pembayaran->save();
            }

            // Update booking status to menunggu_verifikasi
            $booking->status = Booking::STATUS_MENUNGGU_VERIFIKASI;
            $booking->save();

            $booking->logStatusChange(
                toStatus: Booking::STATUS_MENUNGGU_VERIFIKASI,
                changedBy: $userId,
                alasan: 'Customer telah mengunggah bukti pembayaran.'
            );

            ActivityLog::catat(
                userId: $userId,
                cabangId: $booking->kamar?->gedung?->cabang_id,
                peran: 'customer',
                jenisAksi: 'upload_bukti_bayar',
                objekTerkait: "Booking #{$booking->id}",
                detail: "Customer mengunggah bukti bayar untuk booking kamar {$booking->kamar?->nomor_kamar}."
            );

            // Notifications
            $this->notificationService->notifyUser(
                user: $booking->user,
                judul: 'Bukti Pembayaran Terkirim',
                isi: "Bukti transfer booking kamar {$booking->kamar?->nomor_kamar} berhasil dikirim dan menunggu verifikasi admin.",
                tipe: 'info',
                redirectUrl: '/booking-saya'
            );

            $this->notificationService->notifyAdmins(
                judul: 'Bukti Bayar Booking Masuk',
                isi: "Calon penghuni kamar {$booking->kamar?->nomor_kamar} telah mengunggah bukti bayar. Silakan verifikasi di menu Booking.",
                tipe: 'info',
                redirectUrl: '/admin/booking'
            );

            $this->notificationService->notifyBranchGuards(
                cabangId: $booking->kamar?->gedung?->cabang_id ?? 0,
                judul: 'Bukti Bayar Booking Menunggu Verifikasi',
                isi: "Bukti bayar booking kamar {$booking->kamar?->nomor_kamar} siap diverifikasi.",
                tipe: 'info'
            );

            return $pembayaran;
        });

        return response()->json([
            'status' => 'success',
            'message' => 'Bukti pembayaran berhasil diunggah! Pengelola akan segera memverifikasi pembayaran Anda.',
            'data' => $payment,
        ]);
    }

    /**
     * Accept alternative room offer by customer.
     * Moves booking to the new room, status -> menunggu_pembayaran.
     */
    public function acceptAlternative(Request $request, int $id): JsonResponse
    {
        $userId = $request->user()->id;

        $booking = Booking::with(['kamarAlternatif.gedung.cabang'])
            ->where('user_id', $userId)
            ->where('id', $id)
            ->firstOrFail();

        if (! in_array($booking->status, [Booking::STATUS_MENUNGGU_RESPON_CUSTOMER, 'ditawarkan_alternatif']) || ! $booking->kamar_alternatif_id) {
            return response()->json([
                'status' => 'error',
                'message' => 'Booking ini tidak dalam status menunggu respon penawaran kamar alternatif.',
            ], 422);
        }

        // Check if offer expired
        if ($booking->tawaran_kadaluarsa_pada && now()->isAfter($booking->tawaran_kadaluarsa_pada)) {
            $booking->status = Booking::STATUS_DITOLAK;
            $booking->alasan_tolak = 'Batas waktu respon penawaran kamar alternatif telah habis.';
            $booking->save();

            $booking->logStatusChange(
                toStatus: Booking::STATUS_DITOLAK,
                changedBy: null,
                alasan: 'Kedaluwarsa respon tawaran alternatif.'
            );

            return response()->json([
                'status' => 'error',
                'message' => 'Mohon maaf, batas waktu konfirmasi penawaran kamar alternatif ini telah berakhir.',
            ], 422);
        }

        return DB::transaction(function () use ($booking, $userId) {
            $oldKamarId = $booking->kamar_id;
            $altKamar = $booking->kamarAlternatif;

            // Check availability of alternative room
            $this->availabilityService->lockAndVerifyKamar(
                kamarId: $altKamar->id,
                tanggalMulai: $booking->tanggal_mulai ?? $booking->rencana_checkin ?? Carbon::today()->toDateString(),
                durasiBulan: (int) ($booking->durasi_bulan ?? 1)
            );

            $altKamar->status = 'dibooking';
            $altKamar->save();

            // Release old room if held
            $oldKamar = Kamar::find($oldKamarId);
            if ($oldKamar && $oldKamar->status === 'dibooking') {
                $oldKamar->status = 'kosong';
                $oldKamar->save();
            }

            $booking->kamar_id = $altKamar->id;
            $booking->kamar_alternatif_id = null;
            $booking->status = Booking::STATUS_MENUNGGU_PEMBAYARAN;
            $booking->batas_bayar = now()->addHours(24);
            $booking->save();

            // Create draft month 1 payment if not exists
            $kodeUnik = mt_rand(100, 999);
            PembayaranBooking::firstOrCreate(
                ['booking_id' => $booking->id, 'periode_bulan_ke' => 1],
                [
                    'nominal' => $altKamar->harga_bulanan,
                    'kode_unik' => $kodeUnik,
                    'metode' => 'transfer_qris',
                    'status' => PembayaranBooking::STATUS_MENUNGGU_PEMBAYARAN,
                    'batas_bayar' => $booking->batas_bayar,
                ]
            );

            $booking->logStatusChange(
                toStatus: Booking::STATUS_MENUNGGU_PEMBAYARAN,
                changedBy: $userId,
                alasan: "Customer menyetujui tawaran alternatif kamar {$altKamar->nomor_kamar}."
            );

            ActivityLog::catat(
                userId: $userId,
                cabangId: $altKamar->gedung?->cabang_id,
                peran: 'customer',
                jenisAksi: 'terima_alternatif',
                objekTerkait: "Booking #{$booking->id}",
                detail: "Customer menyetujui penawaran kamar alternatif {$altKamar->nomor_kamar}."
            );

            $this->notificationService->notifyUser(
                user: $booking->user,
                judul: 'Tawaran Alternatif Diterima',
                isi: "Anda menyetujui Kamar {$altKamar->nomor_kamar} ({$altKamar->gedung?->cabang?->nama_cabang}). Silakan lakukan pembayaran dalam 24 jam.",
                tipe: 'sukses',
                redirectUrl: '/booking-saya'
            );

            $this->notificationService->notifyAdmins(
                judul: 'Tawaran Alternatif Disetujui Customer',
                isi: "Customer {$booking->user?->nama} menyetujui penawaran kamar {$altKamar->nomor_kamar}. Status kini menunggu pembayaran.",
                tipe: 'sukses',
                redirectUrl: '/admin/booking'
            );

            return response()->json([
                'status' => 'success',
                'message' => 'Tawaran kamar alternatif berhasil diterima! Silakan lanjutkan ke pembayaran.',
                'data' => $booking->fresh(['kamar.gedung.cabang', 'pembayaranBooking']),
            ]);
        });
    }

    /**
     * Reject alternative room offer by customer.
     * Automatically sets status to ditolak with reason "Customer menolak alternatif".
     */
    public function rejectAlternative(Request $request, int $id): JsonResponse
    {
        $userId = $request->user()->id;

        $booking = Booking::with('user')
            ->where('user_id', $userId)
            ->where('id', $id)
            ->firstOrFail();

        if (! in_array($booking->status, [Booking::STATUS_MENUNGGU_RESPON_CUSTOMER, 'ditawarkan_alternatif'])) {
            return response()->json([
                'status' => 'error',
                'message' => 'Booking ini tidak dalam status penawaran kamar alternatif.',
            ], 422);
        }

        DB::transaction(function () use ($booking, $userId) {
            $booking->status = Booking::STATUS_DITOLAK;
            $booking->alasan_tolak = 'Customer menolak tawaran kamar alternatif';
            $booking->alasan_penolakan = 'Customer menolak tawaran kamar alternatif';
            $booking->save();

            $booking->logStatusChange(
                toStatus: Booking::STATUS_DITOLAK,
                changedBy: $userId,
                alasan: 'Customer menolak tawaran alternatif.'
            );

            if ($booking->kamar && $booking->kamar->status === 'dibooking') {
                $booking->kamar->status = 'kosong';
                $booking->kamar->save();
            }

            ActivityLog::catat(
                userId: $userId,
                cabangId: $booking->kamar?->gedung?->cabang_id,
                peran: 'customer',
                jenisAksi: 'tolak_alternatif',
                objekTerkait: "Booking #{$booking->id}",
                detail: 'Customer menolak kamar alternatif yang ditawarkan.'
            );

            $this->notificationService->notifyUser(
                user: $booking->user,
                judul: 'Tawaran Ditolak',
                isi: 'Anda telah menolak tawaran kamar alternatif. Booking ini telah ditutup.',
                tipe: 'peringatan',
                redirectUrl: '/booking-saya'
            );

            $this->notificationService->notifyAdmins(
                judul: 'Customer Menolak Kamar Alternatif',
                isi: "Customer {$booking->user?->nama} menolak tawaran kamar alternatif. Booking #{$booking->id} ditutup.",
                tipe: 'peringatan',
                redirectUrl: '/admin/booking'
            );
        });

        return response()->json([
            'status' => 'success',
            'message' => 'Tawaran kamar alternatif telah ditolak dan booking ditutup.',
            'data' => $booking->fresh(),
        ]);
    }

    /**
     * Request extension (Tahap 5).
     * Must check H-7 and ensure no collision with subsequent bookings.
     */
    public function ajukanPerpanjang(Request $request, int $id): JsonResponse
    {
        $userId = $request->user()->id;

        $request->validate([
            'durasi_bulan' => 'required|integer|min:1|max:12',
        ]);

        $booking = Booking::with(['kamar.gedung.cabang', 'user'])
            ->where('user_id', $userId)
            ->where('id', $id)
            ->firstOrFail();

        if ($booking->status !== Booking::STATUS_AKTIF) {
            return response()->json([
                'status' => 'error',
                'message' => 'Hanya booking yang sedang aktif yang dapat mengajukan perpanjangan.',
            ], 422);
        }

        $durasiTambah = (int) $request->input('durasi_bulan');
        $currentEnd = Carbon::parse($booking->tanggal_selesai);

        // Check availability starting from current end date
        $availableInfo = $this->availabilityService->calculateAvailableDurations(
            kamarId: $booking->kamar_id,
            tanggalMulai: $currentEnd->toDateString(),
            excludeBookingId: $booking->id
        );

        $allowableDurations = $availableInfo['durasi_pilihan'] ?? $availableInfo['durasi_tersedia'] ?? [];

        if (! in_array($durasiTambah, $allowableDurations)) {
            return response()->json([
                'status' => 'error',
                'message' => "Perpanjangan {$durasiTambah} bulan tidak dapat dilakukan karena bertabrakan dengan booking berikutnya atau melebihi kuota sewa.",
                'durasi_tersedia' => $allowableDurations,
            ], 422);
        }

        DB::transaction(function () use ($booking, $durasiTambah, $currentEnd, $userId) {
            $newEnd = $this->availabilityService->calculateEndDate($currentEnd->toDateString(), $durasiTambah);
            $newBlockEnd = $this->availabilityService->calculateBlockEndDate($newEnd);

            $booking->durasi_bulan += $durasiTambah;
            $booking->tanggal_selesai = $newEnd;
            $booking->tanggal_blok_selesai = $newBlockEnd;
            $booking->save();

            $booking->logStatusChange(
                toStatus: Booking::STATUS_AKTIF,
                changedBy: $userId,
                alasan: "Perpanjangan sewa bertambah {$durasiTambah} bulan hingga {$newEnd}."
            );

            ActivityLog::catat(
                userId: $userId,
                cabangId: $booking->kamar?->gedung?->cabang_id,
                peran: 'customer',
                jenisAksi: 'perpanjang_sewa',
                objekTerkait: "Booking #{$booking->id}",
                detail: "Penghuni memperpanjang sewa kamar {$booking->kamar?->nomor_kamar} selama {$durasiTambah} bulan (sampai {$newEnd})."
            );

            $this->notificationService->notifyUser(
                user: $booking->user,
                judul: 'Perpanjangan Berhasil Diajukan',
                isi: "Masa sewa kamar {$booking->kamar?->nomor_kamar} Anda berhasil diperpanjang hingga {$newEnd}.",
                tipe: 'sukses',
                redirectUrl: '/booking-saya'
            );

            $this->notificationService->notifyAdmins(
                judul: 'Perpanjangan Masa Sewa',
                isi: "Penghuni {$booking->user?->nama} (Kamar {$booking->kamar?->nomor_kamar}) memperpanjang sewa {$durasiTambah} bulan hingga {$newEnd}.",
                tipe: 'info',
                redirectUrl: '/admin/booking'
            );
        });

        return response()->json([
            'status' => 'success',
            'message' => 'Perpanjangan masa sewa berhasil diperbarui.',
            'data' => $booking->fresh(['kamar.gedung.cabang']),
        ]);
    }
}
