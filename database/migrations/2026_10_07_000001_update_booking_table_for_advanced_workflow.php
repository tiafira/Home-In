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
        Schema::table('booking', function (Blueprint $table) {
            $table->text('alasan_penolakan')->nullable()->after('catatan');
            $table->unsignedBigInteger('kamar_alternatif_id')->nullable()->after('alasan_penolakan');
            $table->dateTime('tawaran_kadaluarsa_pada')->nullable()->after('kamar_alternatif_id');
            $table->unsignedBigInteger('diproses_oleh')->nullable()->after('tawaran_kadaluarsa_pada');
            $table->dateTime('diproses_pada')->nullable()->after('diproses_oleh');

            $table->foreign('kamar_alternatif_id', 'fk_booking_kamar_alternatif')
                ->references('id')
                ->on('kamar')
                ->nullOnDelete();

            $table->foreign('diproses_oleh', 'fk_booking_diproses_oleh')
                ->references('id')
                ->on('users')
                ->nullOnDelete();
        });

        // Update enum definition for MySQL
        DB::statement("ALTER TABLE `booking` MODIFY COLUMN `status` ENUM('menunggu_pembayaran', 'menunggu_persetujuan', 'ditawarkan_alternatif', 'dikonfirmasi', 'dibatalkan', 'ditolak', 'selesai') NOT NULL DEFAULT 'menunggu_persetujuan'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('booking', function (Blueprint $table) {
            $table->dropForeign('fk_booking_kamar_alternatif');
            $table->dropForeign('fk_booking_diproses_oleh');
            $table->dropColumn([
                'alasan_penolakan',
                'kamar_alternatif_id',
                'tawaran_kadaluarsa_pada',
                'diproses_oleh',
                'diproses_pada',
            ]);
        });

        DB::statement("ALTER TABLE `booking` MODIFY COLUMN `status` ENUM('menunggu_pembayaran', 'dikonfirmasi', 'dibatalkan', 'selesai') NOT NULL DEFAULT 'menunggu_pembayaran'");
    }
};
