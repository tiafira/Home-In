<?php

namespace App\Console\Commands;

use App\Models\ActivityLog;
use App\Models\Booking;
use App\Models\Kamar;
use App\Models\PembayaranBooking;
use App\Models\Pengaturan;
use App\Models\Penghuni;
use App\Services\BookingAvailabilityService;
use App\Services\NotificationService;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class BookingDailyCheckCommand extends Command
{
    protected $signature = 'booking:daily-check';

    protected $description = 'Pemeriksaan harian booking: aktivasi jadwal, kadaluarsa, tagihan bulanan, eskalasi telat bayar, dan overstay';

    public function __construct(
        protected BookingAvailabilityService $availabilityService,
        protected NotificationService $notificationService
    ) {
        parent::__construct();
    }

    public function handle(): int
    {
        $this->info('Memulai pemeriksaan harian booking...');

        $this->activateScheduledBookings();
        $this->cancelExpiredBookings();
        $this->generateMonthlyInvoices();
        $this->escalateLatePayments();
        $this->handleOverstayAndImpendingBookings();
        $this->remindExtension();

        $this->info('Pemeriksaan harian booking selesai.');

        return self::SUCCESS;
    }

    /**
     * 1. Aktivasi booking terjadwal jika tanggal mulai sewa telah tiba (dan sudah lunas).
     */
    protected function activateScheduledBookings(): void
    {
        $today = Carbon::today();

        $bookings = Booking::with(['kamar.gedung.cabang', 'user'])
            ->whereIn('status', [Booking::STATUS_TERJADWAL, 'dikonfirmasi'])
            ->whereDate('tanggal_mulai', '<=', $today)
            ->get();

        foreach ($bookings as $booking) {
            DB::transaction(function () use ($booking) {
                $booking->status = Booking::STATUS_AKTIF;
                $booking->save();

                $booking->logStatusChange(
                    toStatus: Booking::STATUS_AKTIF,
                    changedBy: null,
                    alasan: 'Aktivasi otomatis oleh sistem karena tanggal mulai sewa telah tiba.'
                );

                // Update / create Penghuni
                $penghuni = Penghuni::updateOrCreate(
                    ['user_id' => $booking->user_id],
                    [
                        'kamar_id' => $booking->kamar_id,
                        'tanggal_masuk' => $booking->tanggal_mulai,
                        'masa_tinggal_sampai' => $booking->tanggal_selesai,
                        'status' => 'aktif',
                    ]
                );

                // Update role user to penghuni
                if ($booking->user) {
                    $booking->user->role = 'penghuni';
                    $booking->user->save();
                }

                // Update Kamar to terisi
                if ($booking->kamar) {
                    $booking->kamar->status = 'terisi';
                    $booking->kamar->save();
                }

                ActivityLog::catat(
                    userId: $booking->user_id,
                    cabangId: $booking->kamar?->gedung?->cabang_id,
                    peran: 'sistem',
                    jenisAksi: 'aktivasi_penghuni_otomatis',
                    objekTerkait: "Booking #{$booking->id}",
                    detail: "Booking #{$booking->id} resmi aktif, kamar {$booking->kamar?->nomor_kamar} berstatus terisi."
                );

                $this->notificationService->notifyUser(
                    user: $booking->user,
                    judul: 'Masa Sewa Dimulai!',
                    isi: "Selamat! Masa sewa Anda untuk kamar {$booking->kamar?->nomor_kamar} resmi dimulai hari ini. Selamat menikmati kenyamanan Home-In!",
                    tipe: 'sukses',
                    redirectUrl: '/booking-saya'
                );
            });
        }
    }

    /**
     * 2. Batalkan otomatis booking yang kadaluarsa (lewat batas bayar, batas konfirmasi alternatif, atau batas konfirmasi admin).
     */
    protected function cancelExpiredBookings(): void
    {
        $now = Carbon::now();

        // 2a. Lewat batas bayar (menunggu pembayaran)
        $unpaidExpired = Booking::with(['kamar.gedung', 'user'])
            ->where('status', Booking::STATUS_MENUNGGU_PEMBAYARAN)
            ->whereNotNull('batas_bayar')
            ->where('batas_bayar', '<', $now)
            ->whereDoesntHave('pembayaranBooking', function ($q) {
                $q->whereIn('status', [PembayaranBooking::STATUS_MENUNGGU_VERIFIKASI, PembayaranBooking::STATUS_LUNAS]);
            })
            ->get();

        foreach ($unpaidExpired as $booking) {
            DB::transaction(function () use ($booking) {
                $booking->status = Booking::STATUS_KEDALUWARSA;
                $booking->alasan_tolak = 'Kedaluwarsa karena pembayaran tidak diselesaikan hingga batas waktu.';
                $booking->save();

                $booking->logStatusChange(
                    toStatus: Booking::STATUS_KEDALUWARSA,
                    changedBy: null,
                    alasan: 'Kedaluwarsa karena batas waktu pembayaran habis.'
                );

                if ($booking->kamar && $booking->kamar->status === 'dibooking') {
                    $booking->kamar->status = 'kosong';
                    $booking->kamar->save();
                }

                ActivityLog::catat(
                    userId: $booking->user_id,
                    cabangId: $booking->kamar?->gedung?->cabang_id,
                    peran: 'sistem',
                    jenisAksi: 'booking_kedaluwarsa',
                    objekTerkait: "Booking #{$booking->id}",
                    detail: "Booking #{$booking->id} kamar {$booking->kamar?->nomor_kamar} dibatalkan otomatis karena melewati batas pembayaran."
                );

                $this->notificationService->notifyUser(
                    user: $booking->user,
                    judul: 'Booking Kedaluwarsa',
                    isi: "Batas waktu pembayaran untuk booking kamar {$booking->kamar?->nomor_kamar} telah habis. Booking dibatalkan otomatis.",
                    tipe: 'peringatan',
                    redirectUrl: '/booking-saya'
                );
            });
        }

        // 2b. Lewat batas konfirmasi alternatif
        $altExpired = Booking::with(['kamar.gedung', 'user'])
            ->whereIn('status', [Booking::STATUS_MENUNGGU_RESPON_CUSTOMER, 'ditawarkan_alternatif'])
            ->whereNotNull('tawaran_kadaluarsa_pada')
            ->where('tawaran_kadaluarsa_pada', '<', $now)
            ->get();

        foreach ($altExpired as $booking) {
            DB::transaction(function () use ($booking) {
                $booking->status = Booking::STATUS_DITOLAK;
                $booking->alasan_tolak = 'Kedaluwarsa karena tidak ada respon penawaran kamar alternatif dari calon penghuni.';
                $booking->save();

                $booking->logStatusChange(
                    toStatus: Booking::STATUS_DITOLAK,
                    changedBy: null,
                    alasan: 'Batas respon alternatif habis.'
                );

                if ($booking->kamar && $booking->kamar->status === 'dibooking') {
                    $booking->kamar->status = 'kosong';
                    $booking->kamar->save();
                }

                $this->notificationService->notifyUser(
                    user: $booking->user,
                    judul: 'Tawaran Alternatif Kedaluwarsa',
                    isi: 'Batas waktu konfirmasi penawaran kamar alternatif telah habis. Booking ditutup.',
                    tipe: 'peringatan',
                    redirectUrl: '/booking-saya'
                );
            });
        }
    }

    /**
     * 3. Buat tagihan bulanan untuk sewa aktif berdurasi lebih dari 1 bulan.
     */
    protected function generateMonthlyInvoices(): void
    {
        $today = Carbon::today();

        $activeBookings = Booking::with(['kamar', 'user', 'pembayaranBooking'])
            ->where('status', Booking::STATUS_AKTIF)
            ->where('durasi_bulan', '>', 1)
            ->get();

        foreach ($activeBookings as $booking) {
            $startDate = Carbon::parse($booking->tanggal_mulai);

            for ($bulanKe = 2; $bulanKe <= $booking->durasi_bulan; $bulanKe++) {
                // Tanggal jatuh tempo untuk bulan ke-$bulanKe
                $cycleStart = (clone $startDate)->addMonthsNoOverflow($bulanKe - 1);
                $invoiceDueDate = (clone $cycleStart)->subDays(7); // Terbitkan tagihan H-7 sebelum siklus dimulai

                if ($today->greaterThanOrEqualTo($invoiceDueDate)) {
                    $existingBill = $booking->pembayaranBooking
                        ->firstWhere('periode_bulan_ke', $bulanKe);

                    if (! $existingBill) {
                        $kodeUnik = mt_rand(100, 999);
                        $nominal = $booking->hitungBiayaBulanBerikutnya();
                        $bill = PembayaranBooking::create([
                            'booking_id' => $booking->id,
                            'periode_bulan_ke' => $bulanKe,
                            'nominal' => $nominal,
                            'jumlah' => $nominal,
                            'kode_unik' => $kodeUnik,
                            'metode' => 'transfer_qris',
                            'status' => PembayaranBooking::STATUS_MENUNGGU_PEMBAYARAN,
                            'tanggal_jatuh_tempo' => $cycleStart,
                        ]);

                        $totalTagihan = number_format($nominal + $kodeUnik, 0, ',', '.');

                        $this->notificationService->notifyUser(
                            user: $booking->user,
                            judul: "Tagihan Sewa Bulan ke-{$bulanKe}",
                            isi: "Tagihan sewa bulan ke-{$bulanKe} untuk kamar {$booking->kamar->nomor_kamar} sebesar Rp{$totalTagihan} telah terbit. Harap bayar sebelum {$cycleStart->format('d M Y')}.",
                            tipe: 'info',
                            redirectUrl: '/booking-saya'
                        );
                    }
                }
            }
        }
    }

    /**
     * 4. Eskalasi keterlambatan pembayaran bulanan:
     *    - Minggu 1-2 (hari 1-14): Notifikasi peringatan.
     *    - Minggu 3 (hari 15-28): Tugas/peringatan admin "barang disita".
     *    - > 1 bulan (hari > 30): Otomatis dinonaktifkan (penghuni nonaktif, kamar dilepas).
     */
    protected function escalateLatePayments(): void
    {
        $today = Carbon::today();

        $overduePayments = PembayaranBooking::with(['booking.kamar.gedung.cabang', 'booking.user'])
            ->whereIn('status', [PembayaranBooking::STATUS_MENUNGGU_PEMBAYARAN, PembayaranBooking::STATUS_TERLAMBAT])
            ->whereNotNull('tanggal_jatuh_tempo')
            ->whereDate('tanggal_jatuh_tempo', '<', $today)
            ->get();

        foreach ($overduePayments as $payment) {
            $booking = $payment->booking;
            if (! $booking || $booking->status !== Booking::STATUS_AKTIF) {
                continue;
            }

            if ($payment->status !== PembayaranBooking::STATUS_TERLAMBAT) {
                $payment->status = PembayaranBooking::STATUS_TERLAMBAT;
                $payment->save();
            }

            $batasBayar = Carbon::parse($payment->batas_bayar);
            $daysLate = $batasBayar->diffInDays($today);

            if ($daysLate > 30) {
                // > 1 bulan: Nonaktifkan penghuni secara otomatis
                DB::transaction(function () use ($booking, $daysLate) {
                    $booking->status = Booking::STATUS_SELESAI;
                    $booking->alasan_selesai = 'dinonaktifkan telat bayar';
                    $booking->waktu_keluar = now();
                    $booking->save();

                    $booking->logStatusChange(
                        toStatus: Booking::STATUS_SELESAI,
                        changedBy: null,
                        alasan: "Otomatis dinonaktifkan sistem karena telat bayar {$daysLate} hari (> 1 bulan)."
                    );

                    // Penghuni nonaktif
                    Penghuni::where('user_id', $booking->user_id)->update(['status' => 'nonaktif']);

                    // Kamar jadi kosong
                    if ($booking->kamar) {
                        $booking->kamar->status = 'kosong';
                        $booking->kamar->save();
                    }

                    ActivityLog::catat(
                        userId: $booking->user_id,
                        cabangId: $booking->kamar?->gedung?->cabang_id,
                        peran: 'sistem',
                        jenisAksi: 'penonaktifan_telat_bayar',
                        objekTerkait: "Booking #{$booking->id}",
                        detail: "Penghuni {$booking->user?->nama} dinonaktifkan otomatis karena telat bayar lebih dari 1 bulan ({$daysLate} hari)."
                    );

                    $this->notificationService->notifyUser(
                        user: $booking->user,
                        judul: 'Sewa Dinonaktifkan',
                        isi: 'Masa sewa Anda telah dinonaktifkan secara otomatis karena tunggakan pembayaran melebihi 1 bulan.',
                        tipe: 'peringatan',
                        redirectUrl: '/booking-saya'
                    );

                    $this->notificationService->notifyBranchGuards(
                        cabangId: $booking->kamar?->gedung?->cabang_id ?? 0,
                        judul: 'Penghuni Dinonaktifkan (Telat Bayar > 1 Bulan)',
                        isi: "Penghuni kamar {$booking->kamar?->nomor_kamar} ({$booking->user?->nama}) telah dinonaktifkan sistem. Kamar dapat dibersihkan dan siap disewa kembali.",
                        tipe: 'peringatan'
                    );
                });
            } elseif ($daysLate >= 15) {
                // Minggu 3: Tugas peringatan admin "barang disita"
                ActivityLog::catat(
                    userId: $booking->user_id,
                    cabangId: $booking->kamar?->gedung?->cabang_id,
                    peran: 'sistem',
                    jenisAksi: 'peringatan_barang_disita',
                    objekTerkait: "Booking #{$booking->id}",
                    detail: "PERINGATAN MINGGU 3: Penghuni kamar {$booking->kamar?->nomor_kamar} ({$booking->user?->nama}) telat bayar {$daysLate} hari. Prosedur penyitaan barang dapat dijalankan."
                );

                $this->notificationService->notifyBranchGuards(
                    cabangId: $booking->kamar?->gedung?->cabang_id ?? 0,
                    judul: 'Perhatian: Prosedur Sita Barang (Telat Bayar Minggu 3)',
                    isi: "Penghuni kamar {$booking->kamar?->nomor_kamar} ({$booking->user?->nama}) menunggak {$daysLate} hari. Penjaga harap memeriksa dan melakukan tindakan sesuai SOP kost.",
                    tipe: 'peringatan'
                );

                $this->notificationService->notifyUser(
                    user: $booking->user,
                    judul: 'Peringatan Terakhir: Penunggakan Sewa',
                    isi: "Tagihan sewa Anda telah menunggak {$daysLate} hari. Sesuai aturan kost, pengelola berhak menyita aset/barang di dalam kamar jika tidak dilunasi segera.",
                    tipe: 'peringatan',
                    redirectUrl: '/booking-saya'
                );
            } else {
                // Minggu 1-2: Peringatan berkala
                $this->notificationService->notifyUser(
                    user: $booking->user,
                    judul: 'Pengingat Keterlambatan Sewa',
                    isi: "Tagihan sewa Anda telah terlambat {$daysLate} hari. Mohon segera selesaikan pembayaran untuk menghindari denda dan sanksi aturan kost.",
                    tipe: 'peringatan',
                    redirectUrl: '/booking-saya'
                );
            }
        }
    }

    /**
     * 5. Penanganan overstay (selesai tapi belum keluar):
     *    - Jika ada booking berikutnya: H-14 ingatkan penghuni lama, H-7 denda per hari, H-2 tugas keluarkan barang.
     */
    protected function handleOverstayAndImpendingBookings(): void
    {
        $today = Carbon::today();

        $overstayBookings = Booking::with(['kamar.gedung.cabang', 'user'])
            ->where('status', Booking::STATUS_AKTIF)
            ->whereDate('tanggal_selesai', '<', $today)
            ->get();

        $dendaPerHari = (float) Pengaturan::get('nominal_denda', 50000);

        foreach ($overstayBookings as $booking) {
            // Cek apakah ada booking berikutnya di kamar ini
            $nextBooking = Booking::where('kamar_id', $booking->kamar_id)
                ->where('id', '!=', $booking->id)
                ->whereIn('status', [Booking::STATUS_TERJADWAL, Booking::STATUS_MENUNGGU_PEMBAYARAN, Booking::STATUS_MENUNGGU_VERIFIKASI])
                ->whereDate('tanggal_mulai', '>', $booking->tanggal_selesai)
                ->orderBy('tanggal_mulai', 'asc')
                ->first();

            if (! $nextBooking) {
                continue;
            }

            $nextStart = Carbon::parse($nextBooking->tanggal_mulai);
            $daysUntilNext = $today->diffInDays($nextStart, false);

            if ($daysUntilNext <= 2) {
                // H-2 belum keluar: Tugas admin/penjaga "keluarkan barang"
                ActivityLog::catat(
                    userId: $booking->user_id,
                    cabangId: $booking->kamar?->gedung?->cabang_id,
                    peran: 'sistem',
                    jenisAksi: 'tugas_keluarkan_barang',
                    objekTerkait: "Booking #{$booking->id}",
                    detail: "DARURAT H-{$daysUntilNext}: Penghuni lama kamar {$booking->kamar?->nomor_kamar} belum checkout padahal booking berikutnya mulai {$nextStart->format('d M Y')}. Penjaga harap mengosongkan/mengeluarkan barang penghuni."
                );

                $this->notificationService->notifyBranchGuards(
                    cabangId: $booking->kamar?->gedung?->cabang_id ?? 0,
                    judul: "TUGAS PENJAGA: Kosongkan Kamar {$booking->kamar?->nomor_kamar}",
                    isi: "Penghuni baru akan masuk pada {$nextStart->format('d M Y')}. Penghuni lama belum checkout, harap segera tindak lanjuti pengosongan kamar.",
                    tipe: 'peringatan'
                );
            } elseif ($daysUntilNext <= 7) {
                // H-7: Peringatan denda harian
                $dendaFmt = number_format($dendaPerHari, 0, ',', '.');
                $this->notificationService->notifyUser(
                    user: $booking->user,
                    judul: 'Peringatan Denda Keterlambatan Checkout',
                    isi: "Masa sewa Anda telah berakhir dan kamar telah dibooking oleh penghuni baru ({$nextStart->format('d M Y')}). Anda dikenakan denda overstay Rp{$dendaFmt}/hari sampai kamar dikosongkan.",
                    tipe: 'peringatan',
                    redirectUrl: '/booking-saya'
                );
            } elseif ($daysUntilNext <= 14) {
                // H-14: Peringatan awal booking berikutnya
                $this->notificationService->notifyUser(
                    user: $booking->user,
                    judul: 'Pengingat: Kamar Telah Dipesan Penghuni Baru',
                    isi: "Kamar Anda telah dipesan oleh penghuni berikutnya mulai {$nextStart->format('d M Y')}. Harap segera menyelesaikan checkout dan mengosongkan kamar.",
                    tipe: 'peringatan',
                    redirectUrl: '/booking-saya'
                );
            }
        }
    }

    /**
     * 6. H-7 selesai, ingatkan perpanjang jika tidak ada booking berikutnya.
     */
    protected function remindExtension(): void
    {
        $today = Carbon::today();
        $targetDate = (clone $today)->addDays(7);

        $expiringBookings = Booking::with(['kamar.gedung.cabang', 'user'])
            ->where('status', Booking::STATUS_AKTIF)
            ->whereDate('tanggal_selesai', $targetDate)
            ->get();

        foreach ($expiringBookings as $booking) {
            $nextBooking = Booking::where('kamar_id', $booking->kamar_id)
                ->where('id', '!=', $booking->id)
                ->whereIn('status', Booking::STATUSES_HOLDING_ROOM)
                ->whereDate('tanggal_mulai', '>', $booking->tanggal_selesai)
                ->exists();

            if (! $nextBooking) {
                $this->notificationService->notifyUser(
                    user: $booking->user,
                    judul: 'Masa Sewa Berakhir Dalam 7 Hari',
                    isi: "Masa sewa kamar {$booking->kamar?->nomor_kamar} Anda akan berakhir pada {$targetDate->format('d M Y')}. Anda dapat mengajukan perpanjangan masa sewa sekarang.",
                    tipe: 'info',
                    redirectUrl: '/booking-saya'
                );
            } else {
                $this->notificationService->notifyUser(
                    user: $booking->user,
                    judul: 'Masa Sewa Berakhir Dalam 7 Hari (Tidak Dapat Diperpanjang)',
                    isi: "Masa sewa Anda berakhir pada {$targetDate->format('d M Y')}. Karena kamar telah dipesan oleh calon penghuni berikutnya, Anda tidak dapat memperpanjang sewa. Harap bersiap melakukan checkout.",
                    tipe: 'peringatan',
                    redirectUrl: '/booking-saya'
                );
            }
        }
    }
}
