<?php

namespace Database\Seeders;

use App\Models\Faq;
use Illuminate\Database\Seeder;

class FaqSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $faqs = [
            [
                'pertanyaan' => 'Bagaimana prosedur dan cara melakukan booking kamar di Home-In?',
                'jawaban' => 'Calon penghuni dapat memilih kamar yang tersedia melalui menu "Cari Kamar", menentukan tanggal mulai sewa (maksimal 3 bulan ke depan), dan memilih durasi sewa bulan penuh. Setelah permohonan booking dikirimkan, sistem akan mengunci kamar sementara waktu dan admin akan melakukan peninjauan/konfirmasi maksimal dalam 48 jam.',
                'urutan' => 1,
            ],
            [
                'pertanyaan' => 'Kapan status sewa saya resmi berubah menjadi Aktif sebagai Penghuni?',
                'jawaban' => 'Status sewa Anda akan berubah menjadi "Aktif" secara otomatis saat permohonan booking Anda telah disetujui admin, pembayaran sewa bulan pertama telah diverifikasi LUNAS, dan tanggal mulai sewa yang Anda pilih sudah tiba.',
                'urutan' => 2,
            ],
            [
                'pertanyaan' => 'Metode pembayaran apa saja yang disediakan untuk pembayaran sewa?',
                'jawaban' => 'Home-In menyediakan dua metode pembayaran resmi: Transfer Bank/QRIS otomatis dengan batas waktu konfirmasi 24 jam dan upload bukti transfer, serta Pembayaran Tunai (Cash) langsung di kantor/pos pengelola kost dengan batas waktu 48 jam sebelum batas pembayaran kedaluwarsa.',
                'urutan' => 3,
            ],
            [
                'pertanyaan' => 'Kapan tagihan sewa bulanan berikutnya diterbitkan?',
                'jawaban' => 'Tagihan sewa bulan berikutnya akan dibuat secara otomatis tiap bulan pada tanggal yang sama dengan tanggal mulai sewa Anda. Anda dapat melihat rincian tagihan dan status pembayaran secara transparan pada aplikasi.',
                'urutan' => 4,
            ],
            [
                'pertanyaan' => 'Bagaimana aturan jam malam (curfew) yang berlaku di kost?',
                'jawaban' => 'Gerbang utama kost ditutup setiap hari pada pukul 23:00 WIB demi keamanan dan ketertiban bersama. Penghuni yang terpaksa pulang melewati jam malam wajib mengisi formulir "Izin Keluar" sebelumnya di aplikasi agar pos satpam/penjaga terinformasi.',
                'urutan' => 5,
            ],
            [
                'pertanyaan' => 'Bagaimana prosedur pengajuan Izin Keluar atau Pulang Malam?',
                'jawaban' => 'Penghuni dapat mengajukan Izin Keluar secara mandiri melalui menu Izin Keluar di aplikasi dengan mengisi tanggal, perkiraan jam kembali, dan alasan keperluan. Admin/penjaga akan menerima notifikasi dan memantau kepulangan penghuni.',
                'urutan' => 6,
            ],
            [
                'pertanyaan' => 'Apakah penghuni diperbolehkan membawa tamu ke dalam kamar?',
                'jawaban' => 'Tamu diperkenankan berkunjung hanya di area ruang tamu/lobby bersama hingga pukul 21:00 WIB. Setiap tamu wajib melapor ke pos resepsionis/satpam, menyerahkan identitas (KTP/SIM) untuk dicatat dalam Buku Tamu, dan mematuhi norma kesopanan yang berlaku.',
                'urutan' => 7,
            ],
            [
                'pertanyaan' => 'Bagaimana alur penerimaan dan pengambilan paket kiriman kurir/ekspedisi?',
                'jawaban' => 'Kurir ekspedisi (JNE, J&T, Shopee, SiCepat, dll.) dapat menitipkan paket di Pos Keamanan/Lobi. Petugas akan mencatat data paket dan mengambil foto dokumentasi. Penghuni dapat memantau status paket ("Belum Diambil" / "Sudah Diambil") di sistem dan mengambilnya dengan menunjukkan identitas kamar.',
                'urutan' => 8,
            ],
            [
                'pertanyaan' => 'Bagaimana cara menyampaikan komplain atau meminta perbaikan fasilitas kamar?',
                'jawaban' => 'Jika terjadi kerusakan fasilitas (seperti AC tidak dingin, kran bocor, lampu mati, atau kendala kebersihan), penghuni dapat mengirim tiket Komplain melalui aplikasi disertai foto bukti kendala. Admin akan menugaskan teknisi/karyawan terkait dan Anda dapat memantau progres perbaikannya.',
                'urutan' => 9,
            ],
            [
                'pertanyaan' => 'Bagaimana cara menggunakan atau mereservasi fasilitas bersama (dapur/ruang belajar)?',
                'jawaban' => 'Fasilitas bersama dapat digunakan oleh seluruh penghuni aktif. Untuk fasilitas tertentu yang memiliki kuota atau memerlukan jadwal khusus, penghuni dapat mengajukan "Reservasi Fasilitas" di aplikasi dengan memilih tanggal dan rentang jam penggunaan agar tidak bentrok dengan penghuni lain.',
                'urutan' => 10,
            ],
            [
                'pertanyaan' => 'Bagaimana sistem poin pelanggaran dan sanksi Surat Peringatan (SP)?',
                'jawaban' => 'Setiap pelanggaran tata tertib (seperti keterlambatan jam malam tanpa izin, merokok di area dilarang, atau merusak fasilitas) memiliki bobot poin pelanggaran. Akumulasi poin akan menjadi acuan penerbitan SP 1, SP 2, hingga SP 3 (pemutusan sewa sepihak).',
                'urutan' => 11,
            ],
            [
                'pertanyaan' => 'Mengapa ada jeda 14 hari setelah masa sewa kamar selesai?',
                'jawaban' => 'Jeda 14 hari adalah standar operasional Home-In untuk memastikan proses pembersihan mendalam, sterilisasi, pengecatan ulang, dan pengecekan kelayakan sarana kamar sebelum dihuni oleh penghuni baru berikutnya.',
                'urutan' => 12,
            ],
        ];

        foreach ($faqs as $item) {
            Faq::updateOrCreate(
                ['pertanyaan' => $item['pertanyaan']],
                [
                    'jawaban' => $item['jawaban'],
                    'urutan' => $item['urutan'],
                    'cabang_id' => null,
                ]
            );
        }
    }
}
