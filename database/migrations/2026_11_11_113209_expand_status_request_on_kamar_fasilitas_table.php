<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        DB::statement("ALTER TABLE `kamar_fasilitas` MODIFY COLUMN `status_request` ENUM('aktif', 'menunggu_konfirmasi', 'ditolak', 'terpasang') NOT NULL DEFAULT 'aktif'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement("ALTER TABLE `kamar_fasilitas` MODIFY COLUMN `status_request` ENUM('aktif', 'menunggu_konfirmasi', 'ditolak') NOT NULL DEFAULT 'aktif'");
    }
};
