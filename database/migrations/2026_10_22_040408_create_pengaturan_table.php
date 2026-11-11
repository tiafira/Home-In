<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('pengaturan', function (Blueprint $table) {
            $table->id();
            $table->string('key', 100)->unique();
            $table->text('value')->nullable();
            $table->string('tipe', 50)->default('string');
            $table->string('kategori', 50)->default('booking');
            $table->string('deskripsi', 255)->nullable();
            $table->timestamps();

            $table->index(['kategori', 'key'], 'idx_pengaturan_kategori_key');
        });

        // Seed initial default configurations
        $now = now();
        $defaults = [
            [
                'key' => 'booking_qris_image',
                'value' => '/images/qris-gopay.png',
                'tipe' => 'image',
                'kategori' => 'booking',
                'deskripsi' => 'Gambar barcode QRIS GoPay untuk pembayaran transfer booking',
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'key' => 'booking_nominal_denda',
                'value' => '50000',
                'tipe' => 'integer',
                'kategori' => 'booking',
                'deskripsi' => 'Nominal denda per hari/minggu untuk penghuni yang melewati batas sewa saat kamar sudah dibooking',
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'key' => 'booking_batas_bayar_transfer_jam',
                'value' => '24',
                'tipe' => 'integer',
                'kategori' => 'booking',
                'deskripsi' => 'Durasi batas waktu pembayaran via Transfer / QRIS (jam)',
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'key' => 'booking_batas_bayar_tunai_jam',
                'value' => '48',
                'tipe' => 'integer',
                'kategori' => 'booking',
                'deskripsi' => 'Durasi batas waktu pembayaran via Tunai / Langsung (jam)',
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'key' => 'booking_admin_timeout_jam',
                'value' => '48',
                'tipe' => 'integer',
                'kategori' => 'booking',
                'deskripsi' => 'Batas waktu admin merespon booking sebelum kedaluwarsa otomatis (jam)',
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'key' => 'booking_customer_respon_alternatif_jam',
                'value' => '48',
                'tipe' => 'integer',
                'kategori' => 'booking',
                'deskripsi' => 'Batas waktu customer merespon tawaran kamar alternatif sebelum kedaluwarsa (jam)',
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'key' => 'booking_jeda_hari',
                'value' => '14',
                'tipe' => 'integer',
                'kategori' => 'booking',
                'deskripsi' => 'Durasi jeda hari pengosongan & pembersihan kamar setelah masa sewa selesai (hari)',
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'key' => 'booking_max_bulan_ke_depan',
                'value' => '3',
                'tipe' => 'integer',
                'kategori' => 'booking',
                'deskripsi' => 'Maksimal bulan ke depan untuk tanggal mulai sewa (bulan)',
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'key' => 'booking_h_min_perpanjang',
                'value' => '7',
                'tipe' => 'integer',
                'kategori' => 'booking',
                'deskripsi' => 'Batas paling lambat pengajuan perpanjangan sebelum tanggal selesai (H-x hari)',
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'key' => 'booking_toleransi_telat_bulan',
                'value' => '1',
                'tipe' => 'integer',
                'kategori' => 'booking',
                'deskripsi' => 'Toleransi maksimal keterlambatan bayar sebelum dinonaktifkan otomatis (bulan)',
                'created_at' => $now,
                'updated_at' => $now,
            ],
        ];

        DB::table('pengaturan')->insert($defaults);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('pengaturan');
    }
};
