<?php

namespace Database\Seeders;

use App\Models\Cabang;
use App\Models\Faq;
use App\Models\Fasilitas;
use App\Models\Gedung;
use App\Models\Kamar;
use App\Models\KamarFasilitas;
use App\Models\KamarFoto;
use Illuminate\Database\Seeder;

class PublicWebsiteDataSeeder extends Seeder
{
    public function run(): void
    {
        // 1. FASILITAS (Default & Tambahan)
        $fasilitasData = [
            // Default (Gratis di setiap kamar)
            ['nama_fasilitas' => 'Kamar Mandi Dalam', 'deskripsi' => 'Kamar mandi pribadi bersih dengan shower dan kloset duduk', 'tipe' => 'default', 'biaya_tambahan' => 0],
            ['nama_fasilitas' => 'Free High-Speed Wi-Fi', 'deskripsi' => 'Akses internet stabil hingga 50 Mbps di seluruh area kost', 'tipe' => 'default', 'biaya_tambahan' => 0],
            ['nama_fasilitas' => 'Penjaga 24 Jam & CCTV', 'deskripsi' => 'Penjaga kost standby dan kamera pengawas di titik strategis', 'tipe' => 'default', 'biaya_tambahan' => 0],
            ['nama_fasilitas' => 'Parkiran Motor & Mobil', 'deskripsi' => 'Area parkir aman beratap di dalam area gerbang', 'tipe' => 'default', 'biaya_tambahan' => 0],
            ['nama_fasilitas' => 'Dapur Bersama & Kulkas', 'deskripsi' => 'Area memasak bersama dengan kompor gas dan kulkas umum', 'tipe' => 'default', 'biaya_tambahan' => 0],

            // Tambahan (Bisa di-request dengan biaya tambahan)
            ['nama_fasilitas' => 'Kasur Busa & Bantal', 'deskripsi' => 'Kasur busa empuk ukuran single lengkap dengan bantal dan sprei', 'tipe' => 'tambahan', 'biaya_tambahan' => 100000],
            ['nama_fasilitas' => 'Lemari Pakaian 2 Pintu', 'deskripsi' => 'Lemari pakaian kayu minimalis dengan cermin dan gantungan', 'tipe' => 'tambahan', 'biaya_tambahan' => 75000],
            ['nama_fasilitas' => 'Meja Belajar & Kursi Kerja', 'deskripsi' => 'Set meja ergonomis cocok untuk mahasiswa dan WFH', 'tipe' => 'tambahan', 'biaya_tambahan' => 50000],
            ['nama_fasilitas' => 'AC Dingin 1/2 PK', 'deskripsi' => 'Pendingin ruangan hemat listrik untuk kenyamanan tidur', 'tipe' => 'tambahan', 'biaya_tambahan' => 250000],
        ];

        $fasilitasMap = [];
        foreach ($fasilitasData as $f) {
            $model = Fasilitas::updateOrCreate(
                ['nama_fasilitas' => $f['nama_fasilitas']],
                $f
            );
            $fasilitasMap[$f['nama_fasilitas']] = $model->id;
        }

        // 2. EMPAT CABANG KOST (Salah satunya punya 2 gedung)
        $cabangs = [
            [
                'nama_cabang' => 'Home In Cilandak - Jakarta Selatan',
                'alamat' => 'Jl. Cilandak Barat No. 12, Cilandak, Jakarta Selatan',
                'latitude' => -6.2941234,
                'longitude' => 106.7995678,
                'jam_operasional_mulai' => '06:00:00',
                'jam_operasional_selesai' => '22:00:00',
                'jam_malam' => '23:00:00',
                'nama_bank' => 'BCA (Bank Central Asia)',
                'no_rekening' => '8801234567',
                'nama_pemilik_rekening' => 'PT Home In Properti Cilandak',
                'qr_pembayaran' => 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=00020101021126590014ID.LINKAJA.WWW01189360091438801234565204599953033605802ID5915HOMEIN_CILANDAK6007JAKARTA6105124306304',
                'no_wa' => '081234567890',
                'email_cabang' => 'cilandak@home-in.com',
                'gedungs' => [
                    ['nama_gedung' => 'Gedung Utama', 'jumlah_lantai' => 3, 'alamat' => 'Jl. Cilandak Barat No. 12, Cilandak, Jakarta Selatan'],
                ],
            ],
            [
                // Cabang ini punya 2 gedung!
                'nama_cabang' => 'Home In Kebon Jeruk - Jakarta Barat',
                'alamat' => 'Jl. Surya Kencana No. 45, Kebon Jeruk, Jakarta Barat',
                'latitude' => -6.1912345,
                'longitude' => 106.7723456,
                'jam_operasional_mulai' => '06:00:00',
                'jam_operasional_selesai' => '23:00:00',
                'jam_malam' => '23:30:00',
                'nama_bank' => 'Bank Mandiri',
                'no_rekening' => '1370019283741',
                'nama_pemilik_rekening' => 'PT Home In Properti Kebon Jeruk',
                'qr_pembayaran' => 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=00020101021126590014ID.LINKAJA.WWW01189360091438801234565204599953033605802ID5915HOMEIN_KEBONJERUK6007JAKARTA6105115306304',
                'no_wa' => '081398765432',
                'email_cabang' => 'kebonjeruk@home-in.com',
                'gedungs' => [
                    ['nama_gedung' => 'Gedung Melati (Utara)', 'jumlah_lantai' => 3, 'alamat' => 'Jl. Surya Kencana No. 45A, Kebon Jeruk, Jakarta Barat'],
                    ['nama_gedung' => 'Gedung Mawar (Selatan)', 'jumlah_lantai' => 2, 'alamat' => 'Jl. Surya Kencana No. 45B, Kebon Jeruk, Jakarta Barat'],
                ],
            ],
            [
                'nama_cabang' => 'Home In Rawamangun - Jakarta Timur',
                'alamat' => 'Jl. Pemuda No. 88, Rawamangun, Jakarta Timur',
                'latitude' => -6.1956789,
                'longitude' => 106.8876543,
                'jam_operasional_mulai' => '06:00:00',
                'jam_operasional_selesai' => '22:00:00',
                'jam_malam' => '22:30:00',
                'nama_bank' => 'BNI (Bank Negara Indonesia)',
                'no_rekening' => '0293847561',
                'nama_pemilik_rekening' => 'PT Home In Properti Rawamangun',
                'qr_pembayaran' => 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=00020101021126590014ID.LINKAJA.WWW01189360091438801234565204599953033605802ID5915HOMEIN_RAWAMANGUN6007JAKARTA6105132206304',
                'no_wa' => '081512349876',
                'email_cabang' => 'rawamangun@home-in.com',
                'gedungs' => [
                    ['nama_gedung' => 'Gedung Garuda', 'jumlah_lantai' => 3, 'alamat' => 'Jl. Pemuda No. 88, Rawamangun, Jakarta Timur'],
                ],
            ],
            [
                'nama_cabang' => 'Home In Kelapa Gading - Jakarta Utara',
                'alamat' => 'Jl. Boulevard Raya Blok QJ No. 5, Kelapa Gading, Jakarta Utara',
                'latitude' => -6.1587654,
                'longitude' => 106.9065432,
                'jam_operasional_mulai' => '06:00:00',
                'jam_operasional_selesai' => '23:00:00',
                'jam_malam' => '23:00:00',
                'nama_bank' => 'BRI (Bank Rakyat Indonesia)',
                'no_rekening' => '034101002345502',
                'nama_pemilik_rekening' => 'PT Home In Properti Kelapa Gading',
                'qr_pembayaran' => 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=00020101021126590014ID.LINKAJA.WWW01189360091438801234565204599953033605802ID5915HOMEIN_KELAPAGADING6007JAKARTA6105142406304',
                'no_wa' => '081876543210',
                'email_cabang' => 'kelapagading@home-in.com',
                'gedungs' => [
                    ['nama_gedung' => 'Gedung Boulevard', 'jumlah_lantai' => 4, 'alamat' => 'Jl. Boulevard Raya Blok QJ No. 5, Kelapa Gading, Jakarta Utara'],
                ],
            ],
        ];

        // Sample photos for visual display
        $samplePhotos = [
            'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=800&q=80',
            'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=800&q=80',
            'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=800&q=80',
            'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?auto=format&fit=crop&w=800&q=80',
            'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80',
        ];

        foreach ($cabangs as $cIndex => $cData) {
            $gedungList = $cData['gedungs'];
            unset($cData['gedungs']);

            // Update or create cabang
            $cabang = Cabang::updateOrCreate(
                ['nama_cabang' => $cData['nama_cabang']],
                $cData
            );

            foreach ($gedungList as $gIndex => $gData) {
                $gedung = Gedung::updateOrCreate(
                    ['cabang_id' => $cabang->id, 'nama_gedung' => $gData['nama_gedung']],
                    [
                        'jumlah_lantai' => $gData['jumlah_lantai'],
                        'alamat' => $gData['alamat'],
                        'latitude' => $cabang->latitude,
                        'longitude' => $cabang->longitude,
                    ]
                );

                // Check existing rooms count in this gedung
                $existingCount = Kamar::where('gedung_id', $gedung->id)->count();

                // If fewer than 10 rooms, seed rooms
                if ($existingCount < 8) {
                    $roomsToCreate = 12;
                    for ($r = 1; $r <= $roomsToCreate; $r++) {
                        $lantai = ($r <= 4) ? 1 : (($r <= 8) ? 2 : 3);
                        $prefix = chr(65 + $gIndex); // A, B, etc.
                        $nomor = sprintf('%s%d-%02d', $prefix, $lantai, $r);
                        $isKosong = ($r % 2 === 1); // 50% empty/available
                        $price = 600000 + (($r % 5) * 50000); // 600k, 650k, 700k, 750k, 800k

                        $kamar = Kamar::firstOrCreate(
                            [
                                'gedung_id' => $gedung->id,
                                'nomor_kamar' => $nomor,
                            ],
                            [
                                'lantai' => $lantai,
                                'harga_bulanan' => $price,
                                'luas_m2' => 12.0 + ($r % 3 * 2),
                                'kapasitas' => 1,
                                'status' => $isKosong ? 'kosong' : 'terisi',
                                'deskripsi' => "Kamar nyaman tipe Standard di {$gedung->nama_gedung} Lantai {$lantai}. Dilengkapi kamar mandi dalam, ventilasi udara yang sejuk, dan pencahayaan matahari langsung.",
                            ]
                        );

                        // Attach 2 sample photos
                        KamarFoto::firstOrCreate([
                            'kamar_id' => $kamar->id,
                            'url_foto' => $samplePhotos[($r + $cIndex) % count($samplePhotos)],
                        ]);
                        KamarFoto::firstOrCreate([
                            'kamar_id' => $kamar->id,
                            'url_foto' => $samplePhotos[($r + $cIndex + 1) % count($samplePhotos)],
                        ]);

                        // Attach default facility: Kamar Mandi Dalam & Wi-Fi
                        if (isset($fasilitasMap['Kamar Mandi Dalam'])) {
                            KamarFasilitas::firstOrCreate([
                                'kamar_id' => $kamar->id,
                                'fasilitas_id' => $fasilitasMap['Kamar Mandi Dalam'],
                            ], [
                                'status_request' => 'aktif',
                                'tanggal_pasang' => now()->subMonths(1),
                            ]);
                        }
                        if (isset($fasilitasMap['Free High-Speed Wi-Fi'])) {
                            KamarFasilitas::firstOrCreate([
                                'kamar_id' => $kamar->id,
                                'fasilitas_id' => $fasilitasMap['Free High-Speed Wi-Fi'],
                            ], [
                                'status_request' => 'aktif',
                                'tanggal_pasang' => now()->subMonths(1),
                            ]);
                        }
                    }
                }
            }
        }

        // 3. SEED FAQ TABLE
        $faqs = [
            [
                'pertanyaan' => 'Berapa harga sewa kamar paling murah di Home-In?',
                'jawaban' => 'Harga sewa kamar di Home-In dimulai dari Rp 600.000 per bulan. Seluruh kamar sudah termasuk fasilitas kamar mandi dalam, akses Free Wi-Fi cepat, keamanan penjaga 24 jam, dan area parkir.',
                'urutan' => 1,
            ],
            [
                'pertanyaan' => 'Bagaimana cara memesan (booking) kamar kost di Home-In?',
                'jawaban' => 'Cukup pilih unit kamar yang berstatus kosong, tentukan tanggal rencana check-in, pilih fasilitas tambahan bila perlu (kasur/lemari), lalu klik "Booking Sekarang". Permohonan Anda akan ditinjau oleh pengelola dalam waktu 1x24 jam.',
                'urutan' => 2,
            ],
            [
                'pertanyaan' => 'Apakah kasur dan lemari sudah termasuk dalam kamar?',
                'jawaban' => 'Secara bawaan, kamar disediakan dalam kondisi un-furnished (hanya kamar mandi dalam) agar penyewa yang memiliki perabot sendiri tidak terbebani biaya. Namun, kasur busa empuk dan lemari pakaian dapat Anda tambahkan sebagai fasilitas request saat booking dengan biaya tambahan yang sangat terjangkau.',
                'urutan' => 3,
            ],
            [
                'pertanyaan' => 'Apakah diberlakukan aturan jam malam di Home-In?',
                'jawaban' => 'Ya, demi kenyamanan dan keamanan seluruh penghuni, setiap cabang memberlakukan jam malam (rata-rata pukul 23:00 WIB). Apabila ada urusan mendesak atau lembur kerja, penghuni dapat mengajukan izin keluar lewat aplikasi mobile Home-In kepada penjaga kost.',
                'urutan' => 4,
            ],
            [
                'pertanyaan' => 'Bagaimana metode pembayaran sewa kost?',
                'jawaban' => 'Pembayaran dapat dilakukan melalui transfer bank ke rekening resmi masing-masing cabang atau melalui scan QRIS. Calon penghuni cukup mengunggah foto bukti transfer melalui menu "Booking Saya". Untuk penghuni aktif, pembayaran tunai juga dapat dititipkan kepada penjaga kost.',
                'urutan' => 5,
            ],
            [
                'pertanyaan' => 'Bolehkah saya melakukan survey lokasi terlebih dahulu?',
                'jawaban' => 'Sangat diperbolehkan! Anda dapat menghubungi nomor WhatsApp penjaga cabang terkait yang tertera pada halaman Kontak atau Detail Cabang untuk membuat janji temu survey.',
                'urutan' => 6,
            ],
        ];

        foreach ($faqs as $faq) {
            Faq::updateOrCreate(
                ['pertanyaan' => $faq['pertanyaan']],
                $faq
            );
        }
    }
}
