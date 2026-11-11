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
        // 1. Expand status enum to flexible VARCHAR(50) to support all 10 workflow statuses
        DB::statement("ALTER TABLE booking MODIFY status VARCHAR(50) NOT NULL DEFAULT 'menunggu_konfirmasi'");

        Schema::table('booking', function (Blueprint $table) {
            $table->date('tanggal_mulai')->nullable()->after('kamar_id');
            $table->date('tanggal_selesai')->nullable()->after('tanggal_mulai');
            $table->date('tanggal_blok_selesai')->nullable()->after('tanggal_selesai');
            $table->unsignedSmallInteger('durasi_bulan')->default(1)->after('tanggal_blok_selesai');

            $table->text('alasan_tolak')->nullable()->after('alasan_penolakan');
            $table->string('metode_bayar', 50)->nullable()->after('kamar_alternatif_id');
            $table->dateTime('batas_bayar')->nullable()->after('metode_bayar');
            $table->dateTime('waktu_keluar')->nullable()->after('batas_bayar');

            $table->foreignId('dikonfirmasi_keluar_oleh')
                ->nullable()
                ->after('waktu_keluar')
                ->constrained('users')
                ->nullOnDelete();

            $table->string('alasan_selesai', 100)->nullable()->after('dikonfirmasi_keluar_oleh');

            // Indexes for high performance availability checking and status filtering
            $table->index(['kamar_id', 'status'], 'idx_booking_kamar_status');
            $table->index(['tanggal_mulai', 'tanggal_blok_selesai'], 'idx_booking_dates');
        });

        // Sync existing records if any
        DB::statement('UPDATE booking SET tanggal_mulai = rencana_checkin WHERE tanggal_mulai IS NULL AND rencana_checkin IS NOT NULL');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('booking', function (Blueprint $table) {
            $table->dropForeign(['dikonfirmasi_keluar_oleh']);
            $table->dropIndex('idx_booking_kamar_status');
            $table->dropIndex('idx_booking_dates');

            $table->dropColumn([
                'tanggal_mulai',
                'tanggal_selesai',
                'tanggal_blok_selesai',
                'durasi_bulan',
                'alasan_tolak',
                'metode_bayar',
                'batas_bayar',
                'waktu_keluar',
                'dikonfirmasi_keluar_oleh',
                'alasan_selesai',
            ]);
        });

        DB::statement("ALTER TABLE booking MODIFY status ENUM('menunggu_pembayaran','menunggu_persetujuan','ditawarkan_alternatif','dikonfirmasi','dibatalkan','ditolak','selesai') NOT NULL DEFAULT 'menunggu_persetujuan'");
    }
};
