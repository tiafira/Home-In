<?php

namespace App\Console\Commands;

use App\Models\ActivityLog;
use App\Models\Booking;
use App\Models\Notifikasi;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class CancelExpiredBookings extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'booking:cancel-expired {--hours=24 : Jam kadaluarsa pembayaran}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Batalkan otomatis booking yang tidak dibayar melewati batas waktu atau tawaran alternatif yang expired';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $hours = (int) $this->option('hours');
        $expiryTime = Carbon::now()->subHours($hours);

        $this->info("Memeriksa booking kadaluarsa (batas waktu: {$hours} jam)...");

        // 1. Booking menunggu pembayaran yang melewati batas waktu tanpa bukti bayar
        $expiredUnpaid = Booking::with(['kamar.gedung', 'user', 'pembayaranBooking'])
            ->where('status', 'menunggu_pembayaran')
            ->where('created_at', '<=', $expiryTime)
            ->whereDoesntHave('pembayaranBooking', function ($q) {
                $q->whereIn('status', ['menunggu_konfirmasi', 'dikonfirmasi']);
            })
            ->get();

        $cancelledCount = 0;

        foreach ($expiredUnpaid as $booking) {
            DB::transaction(function () use ($booking, $hours, &$cancelledCount) {
                $booking->status = 'dibatalkan';
                $booking->alasan_penolakan = "Dibatalkan otomatis oleh sistem karena pembayaran tidak diselesaikan dalam {$hours} jam.";
                $booking->save();

                // Kembalikan status kamar ke kosong jika masih dibooking
                if ($booking->kamar && $booking->kamar->status === 'dibooking') {
                    $hasOtherActiveBooking = Booking::where('kamar_id', $booking->kamar_id)
                        ->where('id', '!=', $booking->id)
                        ->whereIn('status', ['menunggu_pembayaran', 'dikonfirmasi'])
                        ->exists();

                    if (! $hasOtherActiveBooking) {
                        $booking->kamar->status = 'kosong';
                        $booking->kamar->save();
                    }
                }

                // Kirim notifikasi ke calon penghuni
                Notifikasi::create([
                    'user_id' => $booking->user_id,
                    'judul' => 'Booking Dibatalkan Otomatis',
                    'isi' => "Booking Anda untuk kamar {$booking->kamar?->nomor_kamar} telah dibatalkan otomatis karena melewati batas waktu pembayaran {$hours} jam.",
                    'tipe' => 'peringatan',
                    'redirect_url' => '/booking-saya',
                    'referensi_tabel' => 'booking',
                    'referensi_id' => $booking->id,
                    'sudah_dibaca' => false,
                ]);

                $systemUser = User::where('role', 'pemilik')->first();
                $systemUserId = $systemUser ? $systemUser->id : 1;

                // Catat di ActivityLog
                ActivityLog::create([
                    'user_id' => $systemUserId,
                    'cabang_id' => $booking->kamar?->gedung?->cabang_id,
                    'aksi' => 'auto_cancel_booking',
                    'model_type' => 'Booking',
                    'model_id' => $booking->id,
                    'keterangan' => "Sistem membatalkan otomatis booking #{$booking->id} karena tidak ada bukti bayar setelah {$hours} jam.",
                    'created_at' => now(),
                ]);

                $cancelledCount++;
            });
        }

        // 2. Booking dengan tawaran alternatif yang sudah kadaluarsa
        $expiredOffers = Booking::with(['kamar.gedung', 'kamarAlternatif', 'user'])
            ->where('status', 'ditawarkan_alternatif')
            ->where('tawaran_kadaluarsa_pada', '<=', Carbon::now())
            ->get();

        $expiredOfferCount = 0;

        foreach ($expiredOffers as $booking) {
            DB::transaction(function () use ($booking, &$expiredOfferCount) {
                $booking->status = 'ditolak';
                $booking->alasan_penolakan = 'Tawaran cabang alternatif otomatis ditolak karena batas waktu konfirmasi telah habis.';
                $booking->save();

                Notifikasi::create([
                    'user_id' => $booking->user_id,
                    'judul' => 'Tawaran Alternatif Kadaluarsa',
                    'isi' => 'Batas waktu konfirmasi tawaran kamar alternatif telah berakhir. Permohonan booking telah ditolak.',
                    'tipe' => 'peringatan',
                    'redirect_url' => '/booking-saya',
                    'referensi_tabel' => 'booking',
                    'referensi_id' => $booking->id,
                    'sudah_dibaca' => false,
                ]);

                $systemUser = User::where('role', 'pemilik')->first();
                $systemUserId = $systemUser ? $systemUser->id : 1;

                ActivityLog::create([
                    'user_id' => $systemUserId,
                    'cabang_id' => $booking->kamar?->gedung?->cabang_id,
                    'aksi' => 'auto_expire_offer',
                    'model_type' => 'Booking',
                    'model_id' => $booking->id,
                    'keterangan' => "Sistem menolak booking #{$booking->id} karena masa aktif tawaran alternatif telah habis.",
                    'created_at' => now(),
                ]);

                $expiredOfferCount++;
            });
        }

        $this->info("Selesai: {$cancelledCount} booking unpaid dibatalkan, {$expiredOfferCount} tawaran alternatif kadaluarsa.");

        return Command::SUCCESS;
    }
}
