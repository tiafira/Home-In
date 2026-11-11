<?php

namespace App\Console\Commands;

use App\Models\ActivityLog;
use App\Models\Notifikasi;
use App\Models\Pembayaran;
use App\Models\Peringatan;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class MarkOverduePayments extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'pembayaran:mark-overdue';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Tandai tagihan kost yang melewati jatuh tempo sebagai telat';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $today = Carbon::today();
        $this->info("Memeriksa tagihan telat per tanggal {$today->toDateString()}...");

        $overduePayments = Pembayaran::with(['penghuni.user', 'penghuni.kamar.gedung'])
            ->where('status', 'belum_bayar')
            ->where('tanggal_jatuh_tempo', '<', $today)
            ->get();

        $count = 0;

        foreach ($overduePayments as $pembayaran) {
            DB::transaction(function () use ($pembayaran, &$count) {
                $pembayaran->status = 'telat';
                $pembayaran->save();

                // Perbarui status penghuni menjadi nunggak
                if ($pembayaran->penghuni && $pembayaran->penghuni->status !== 'nunggak') {
                    $pembayaran->penghuni->status = 'nunggak';
                    $pembayaran->penghuni->save();
                }

                // Kirim notifikasi ke penghuni
                if ($pembayaran->penghuni?->user_id) {
                    Notifikasi::create([
                        'user_id' => $pembayaran->penghuni->user_id,
                        'judul' => 'Tagihan Kost Jatuh Tempo',
                        'isi' => "Tagihan kost periode {$pembayaran->periode_bulan}/{$pembayaran->periode_tahun} sebesar Rp ".number_format($pembayaran->jumlah_tagihan, 0, ',', '.').' telah melewati jatuh tempo. Harap segera melakukan pembayaran.',
                        'tipe' => 'peringatan',
                        'redirect_url' => '/mobile-app',
                        'referensi_tabel' => 'pembayaran',
                        'referensi_id' => $pembayaran->id,
                        'sudah_dibaca' => false,
                    ]);
                }

                // Buat entri peringatan nunggak jika belum ada peringatan untuk pembayaran ini
                $existingPeringatan = Peringatan::where('penghuni_id', $pembayaran->penghuni_id)
                    ->where('jenis', 'nunggak')
                    ->where('tanggal_kejadian', $pembayaran->tanggal_jatuh_tempo)
                    ->exists();

                if (! $existingPeringatan && $pembayaran->penghuni_id) {
                    Peringatan::create([
                        'penghuni_id' => $pembayaran->penghuni_id,
                        'jenis' => 'nunggak',
                        'kategori_pelanggaran' => 'Keterlambatan Pembayaran Sewa',
                        'keterangan' => "Tagihan periode {$pembayaran->periode_bulan}/{$pembayaran->periode_tahun} terlambat dibayar melewati {$pembayaran->tanggal_jatuh_tempo->format('d/m/Y')}",
                        'tanggal_kejadian' => $pembayaran->tanggal_jatuh_tempo,
                        'dibuat_oleh' => 1, // sistem / pemilik default
                    ]);
                }

                $systemUser = User::where('role', 'pemilik')->first();
                $systemUserId = $systemUser ? $systemUser->id : 1;

                ActivityLog::create([
                    'user_id' => $systemUserId,
                    'cabang_id' => $pembayaran->penghuni?->kamar?->gedung?->cabang_id,
                    'aksi' => 'auto_mark_overdue',
                    'model_type' => 'Pembayaran',
                    'model_id' => $pembayaran->id,
                    'keterangan' => "Sistem menandai tagihan #{$pembayaran->id} penghuni {$pembayaran->penghuni?->user?->nama} sebagai telat.",
                    'created_at' => now(),
                ]);

                $count++;
            });
        }

        $this->info("Berhasil menandai {$count} tagihan sebagai telat.");

        return Command::SUCCESS;
    }
}
