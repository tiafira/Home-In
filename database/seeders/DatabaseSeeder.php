<?php

namespace Database\Seeders;

use App\Models\Cabang;
use App\Models\Gedung;
use App\Models\Kamar;
use App\Models\Komplain;
use App\Models\Pembayaran;
use App\Models\Penghuni;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $now = Carbon::now();
        $currentMonth = (int) $now->month;
        $currentYear = (int) $now->year;
        $lastMonthDate = Carbon::createFromDate($currentYear, $currentMonth, 1)->subMonth();

        $admin = User::firstOrCreate(
            ['email' => 'admin@homein.com'],
            [
                'nama' => 'Budi Santoso',
                'password' => Hash::make('password123'),
                'no_hp' => '081234567890',
                'role' => 'admin',
                'status_aktif' => 1,
            ]
        );

        $pemilik = User::firstOrCreate(
            ['email' => 'pemilik@homein.com'],
            [
                'nama' => 'Haji Hendra Wijaya',
                'password' => Hash::make('password123'),
                'no_hp' => '081298765432',
                'role' => 'pemilik',
                'status_aktif' => 1,
            ]
        );

        User::firstOrCreate(
            ['email' => 'calon@homein.com'],
            [
                'nama' => 'Calon Penghuni Baru',
                'password' => Hash::make('password123'),
                'no_hp' => '081300112233',
                'role' => 'calon_penghuni',
                'status_aktif' => 1,
            ]
        );

        User::firstOrCreate(
            ['email' => 'nonaktif@homein.com'],
            [
                'nama' => 'Akun Dinonaktifkan',
                'password' => Hash::make('password123'),
                'no_hp' => '081399887766',
                'role' => 'penghuni',
                'status_aktif' => 0,
            ]
        );

        $cabang = Cabang::firstOrCreate(
            ['nama_cabang' => 'Home In Pusat - Jakarta Selatan'],
            [
                'alamat' => 'Jl. Cilandak Barat No. 12, Cilandak, Jakarta Selatan',
                'latitude' => -6.2941234,
                'longitude' => 106.7995678,
                'jam_operasional_mulai' => '06:00:00',
                'jam_operasional_selesai' => '22:00:00',
                'jam_malam' => '00:00:00',
            ]
        );

        $gedung = Gedung::firstOrCreate(
            ['cabang_id' => $cabang->id, 'nama_gedung' => 'Gedung Utama'],
            [
                'jumlah_lantai' => 3,
            ]
        );

        $kamarList = [];
        for ($i = 1; $i <= 50; $i++) {
            $lantai = $i <= 15 ? 1 : ($i <= 35 ? 2 : 3);
            $kodePrefix = $lantai === 1 ? 'A' : ($lantai === 2 ? 'B' : 'C');
            $nomor = sprintf('%s-%02d', $kodePrefix, $i <= 15 ? $i : ($i <= 35 ? $i - 15 : $i - 35));
            $isTerisi = $i <= 38;

            $kamar = Kamar::firstOrCreate(
                [
                    'gedung_id' => $gedung->id,
                    'nomor_kamar' => $nomor,
                ],
                [
                    'lantai' => $lantai,
                    'harga_bulanan' => 600000.00 + (($i % 4) * 50000.00),
                    'status' => $isTerisi ? 'terisi' : 'kosong',
                    'deskripsi' => "Kamar tipe Deluxe Lantai {$lantai} dengan fasilitas AC, kasur springbed, dan kamar mandi dalam.",
                ]
            );
            $kamarList[] = $kamar;
        }

        $sampleNames = [
            'Rina Putri',
            'Dimas Pratama',
            'Siti Rahma',
            'Rizky Fauzi',
            'Maya Dewi',
            'Andi Wijaya',
            'Nadia Safitri',
            'Bagus Wicaksono',
            'Citra Lestari',
            'Doni Kurniawan',
            'Eka Saputra',
            'Fitri Handayani',
            'Gilang Ramadhan',
            'Hana Permata',
            'Indra Gunawan',
            'Joko Susilo',
            'Kartika Sari',
            'Lukman Hakim',
            'Mega Utami',
            'Naufal Farhan',
            'Olivia Sanjaya',
            'Prasetyo Nugroho',
            'Qori Annisa',
            'Rendi Pratama',
            'Siska Amelia',
            'Taufik Hidayat',
            'Umar Bakri',
            'Vina Panduwinata',
            'Wahyu Setiawan',
            'Xenia Maharani',
            'Yusuf Maulana',
            'Zahra Nurul',
            'Arif Rahman',
            'Bella Saphira',
            'Candra Kirana',
            'Dian Pelangi',
            'Erick Firmansyah',
            'Fadli Zonki',
        ];

        $penghuniList = [];
        foreach ($sampleNames as $index => $nama) {
            $email = 'penghuni'.($index + 1).'@homein.com';
            $userPenghuni = User::firstOrCreate(
                ['email' => $email],
                [
                    'nama' => $nama,
                    'password' => Hash::make('password123'),
                    'no_hp' => '0812'.sprintf('%08d', 10000000 + $index),
                    'role' => 'penghuni',
                    'status_aktif' => 1,
                ]
            );

            $penghuni = Penghuni::firstOrCreate(
                ['user_id' => $userPenghuni->id],
                [
                    'kamar_id' => $kamarList[$index]->id,
                    'no_ktp' => '3271'.sprintf('%012d', 200000000000 + $index),
                    'alamat_asal' => 'Bandung, Jawa Barat',
                    'kontak_darurat_nama' => 'Orang Tua '.$nama,
                    'kontak_darurat_hp' => '0811'.sprintf('%08d', 30000000 + $index),
                    'tanggal_masuk' => $now->copy()->subMonths(6)->toDateString(),
                    'masa_tinggal_sampai' => $now->copy()->addMonths(6)->toDateString(),
                    'status' => 'aktif',
                ]
            );
            $penghuniList[] = $penghuni;
        }

        foreach ($penghuniList as $index => $penghuni) {
            $status = 'lunas';
            $tglBayar = $now->copy()->subDays(rand(1, 10));

            if ($index === 1) {
                $status = 'menunggu_konfirmasi';
                $tglBayar = $now->copy()->subHours(2);
            } elseif ($index === 3) {
                $status = 'belum_bayar';
                $tglBayar = null;
            } elseif ($index === 4) {
                $status = 'telat';
                $tglBayar = null;
            } elseif ($index >= 35) {
                $status = 'belum_bayar';
                $tglBayar = null;
            }

            $kamar = $penghuni->kamar;
            $tagihan = $kamar ? (float) $kamar->harga_bulanan : 600000.00;

            Pembayaran::updateOrCreate(
                [
                    'penghuni_id' => $penghuni->id,
                    'periode_bulan' => $currentMonth,
                    'periode_tahun' => $currentYear,
                ],
                [
                    'jumlah_tagihan' => $tagihan,
                    'tanggal_jatuh_tempo' => $now->copy()->day(10)->toDateString(),
                    'tanggal_bayar' => $tglBayar,
                    'metode_pembayaran' => $status === 'lunas' ? 'Transfer BCA' : ($status === 'menunggu_konfirmasi' ? 'QRIS' : null),
                    'status' => $status,
                    'dikonfirmasi_oleh' => $status === 'lunas' ? $admin->id : null,
                    'tanggal_konfirmasi' => $status === 'lunas' ? $tglBayar : null,
                ]
            );

            Pembayaran::updateOrCreate(
                [
                    'penghuni_id' => $penghuni->id,
                    'periode_bulan' => $lastMonthDate->month,
                    'periode_tahun' => $lastMonthDate->year,
                ],
                [
                    'jumlah_tagihan' => $tagihan,
                    'tanggal_jatuh_tempo' => $lastMonthDate->copy()->day(10)->toDateString(),
                    'tanggal_bayar' => $lastMonthDate->copy()->day(5),
                    'metode_pembayaran' => 'Transfer BCA',
                    'status' => 'lunas',
                    'dikonfirmasi_oleh' => $admin->id,
                    'tanggal_konfirmasi' => $lastMonthDate->copy()->day(5),
                ]
            );
        }

        if (isset($penghuniList[3])) {
            Komplain::firstOrCreate(
                ['penghuni_id' => $penghuniList[3]->id, 'isi' => 'AC bocor menetes ke kasur'],
                [
                    'kategori' => 'Fasilitas AC',
                    'status' => 'baru',
                ]
            );
        }

        if (isset($penghuniList[6])) {
            Komplain::firstOrCreate(
                ['penghuni_id' => $penghuniList[6]->id, 'isi' => 'Lampu koridor lantai 2 padam'],
                [
                    'kategori' => 'Kelistrikan',
                    'status' => 'diproses',
                    'ditangani_oleh' => $admin->id,
                ]
            );
        }

        if (isset($penghuniList[4])) {
            Komplain::firstOrCreate(
                ['penghuni_id' => $penghuniList[4]->id, 'isi' => 'Tempat sampah depan penuh'],
                [
                    'kategori' => 'Kebersihan',
                    'status' => 'selesai',
                    'ditangani_oleh' => $admin->id,
                    'balasan' => 'Sudah dibersihkan oleh petugas.',
                    'tanggal_selesai' => $now->copy()->subDay(),
                ]
            );
        }

        $extraKomplain = [
            ['penghuni' => 7, 'kat' => 'Air Bersih', 'isi' => 'Tekanan air di kamar mandi kecil'],
            ['penghuni' => 8, 'kat' => 'Wi-Fi', 'isi' => 'Koneksi internet lantai 2 lambat sejak kemarin'],
            ['penghuni' => 9, 'kat' => 'Kunci', 'isi' => 'Gagang pintu kamar agak longgar'],
            ['penghuni' => 10, 'kat' => 'Kebisingan', 'isi' => 'Tetangga sebelah menyetel musik keras larut malam'],
        ];

        foreach ($extraKomplain as $ek) {
            if (isset($penghuniList[$ek['penghuni']])) {
                Komplain::firstOrCreate(
                    ['penghuni_id' => $penghuniList[$ek['penghuni']]->id, 'isi' => $ek['isi']],
                    [
                        'kategori' => $ek['kat'],
                        'status' => 'baru',
                    ]
                );
            }
        }
    }
}
