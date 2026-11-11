<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Tambah kolom foto pada tabel gedung
        Schema::table('gedung', function (Blueprint $table) {
            if (! Schema::hasColumn('gedung', 'foto')) {
                $table->string('foto', 500)->nullable()->after('nama_gedung');
            }
        });

        // 2. Tambah kolom harga_barang pada tabel fasilitas (harga asli pembelian barang)
        Schema::table('fasilitas', function (Blueprint $table) {
            if (! Schema::hasColumn('fasilitas', 'harga_barang')) {
                $table->decimal('harga_barang', 12, 2)->default(0)->after('biaya_tambahan');
            }
        });

        // 3. Tambah pelacakan opsi pembayaran dan hak milik pada kamar_fasilitas
        Schema::table('kamar_fasilitas', function (Blueprint $table) {
            if (! Schema::hasColumn('kamar_fasilitas', 'opsi_pembayaran')) {
                $table->enum('opsi_pembayaran', ['permanen', 'dari_kost'])->default('dari_kost')->after('status_request');
            }
            if (! Schema::hasColumn('kamar_fasilitas', 'harga_barang')) {
                $table->decimal('harga_barang', 12, 2)->default(0)->after('opsi_pembayaran');
            }
            if (! Schema::hasColumn('kamar_fasilitas', 'biaya_bulanan')) {
                $table->decimal('biaya_bulanan', 12, 2)->default(0)->after('harga_barang');
            }
            if (! Schema::hasColumn('kamar_fasilitas', 'total_terbayar')) {
                $table->decimal('total_terbayar', 12, 2)->default(0)->after('biaya_bulanan');
            }
            if (! Schema::hasColumn('kamar_fasilitas', 'is_hak_milik')) {
                $table->boolean('is_hak_milik')->default(false)->after('total_terbayar');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('kamar_fasilitas', function (Blueprint $table) {
            $cols = ['opsi_pembayaran', 'harga_barang', 'biaya_bulanan', 'total_terbayar', 'is_hak_milik'];
            foreach ($cols as $col) {
                if (Schema::hasColumn('kamar_fasilitas', $col)) {
                    $table->dropColumn($col);
                }
            }
        });

        Schema::table('fasilitas', function (Blueprint $table) {
            if (Schema::hasColumn('fasilitas', 'harga_barang')) {
                $table->dropColumn('harga_barang');
            }
        });

        Schema::table('gedung', function (Blueprint $table) {
            if (Schema::hasColumn('gedung', 'foto')) {
                $table->dropColumn('foto');
            }
        });
    }
};
