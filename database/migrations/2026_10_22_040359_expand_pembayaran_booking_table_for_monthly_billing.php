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
        // 1. Expand status enum to flexible VARCHAR(50)
        DB::statement("ALTER TABLE pembayaran_booking MODIFY status VARCHAR(50) NOT NULL DEFAULT 'menunggu_pembayaran'");

        Schema::table('pembayaran_booking', function (Blueprint $table) {
            $table->unsignedSmallInteger('periode_bulan_ke')->default(1)->after('booking_id');
            $table->decimal('nominal', 12, 2)->nullable()->after('periode_bulan_ke');
            $table->unsignedSmallInteger('kode_unik')->default(0)->after('nominal');

            $table->string('metode', 50)->nullable()->after('metode_pembayaran');
            $table->string('bukti_bayar', 255)->nullable()->after('bukti_pembayaran');

            $table->string('status_refund', 50)->default('tidak_ada')->after('status');

            $table->foreignId('penerima_id')
                ->nullable()
                ->after('dikonfirmasi_oleh')
                ->constrained('users')
                ->nullOnDelete();

            $table->dateTime('waktu_lunas')->nullable()->after('penerima_id');
            $table->date('tanggal_jatuh_tempo')->nullable()->after('waktu_lunas');
            $table->string('kwitansi_nomor', 100)->nullable()->after('tanggal_jatuh_tempo');
            $table->text('catatan')->nullable()->after('kwitansi_nomor');
            $table->timestamp('updated_at')->nullable()->after('created_at');

            $table->index(['booking_id', 'status'], 'idx_pb_booking_status');
            $table->index(['status_refund'], 'idx_pb_status_refund');
        });

        // Sync existing data if any
        DB::statement('UPDATE pembayaran_booking SET nominal = jumlah WHERE nominal IS NULL AND jumlah IS NOT NULL');
        DB::statement('UPDATE pembayaran_booking SET metode = metode_pembayaran WHERE metode IS NULL AND metode_pembayaran IS NOT NULL');
        DB::statement('UPDATE pembayaran_booking SET bukti_bayar = bukti_pembayaran WHERE bukti_bayar IS NULL AND bukti_pembayaran IS NOT NULL');
        DB::statement('UPDATE pembayaran_booking SET penerima_id = dikonfirmasi_oleh WHERE penerima_id IS NULL AND dikonfirmasi_oleh IS NOT NULL');
        DB::statement('UPDATE pembayaran_booking SET waktu_lunas = tanggal_konfirmasi WHERE waktu_lunas IS NULL AND tanggal_konfirmasi IS NOT NULL');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('pembayaran_booking', function (Blueprint $table) {
            $table->dropForeign(['penerima_id']);
            $table->dropIndex('idx_pb_booking_status');
            $table->dropIndex('idx_pb_status_refund');

            $table->dropColumn([
                'periode_bulan_ke',
                'nominal',
                'kode_unik',
                'metode',
                'bukti_bayar',
                'status_refund',
                'penerima_id',
                'waktu_lunas',
                'tanggal_jatuh_tempo',
                'kwitansi_nomor',
                'catatan',
                'updated_at',
            ]);
        });

        DB::statement("ALTER TABLE pembayaran_booking MODIFY status ENUM('menunggu_konfirmasi','dikonfirmasi','ditolak') NOT NULL DEFAULT 'menunggu_konfirmasi'");
    }
};
