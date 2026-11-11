<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Gedung
        if (Schema::hasTable('gedung') && Schema::hasColumn('gedung', 'cabang_id')) {
            $this->dropForeignKeyIfExists('gedung', 'fk_gedung_cabang');
            DB::statement('ALTER TABLE `gedung` MODIFY `cabang_id` BIGINT UNSIGNED NULL');
            DB::statement('ALTER TABLE `gedung` ADD CONSTRAINT `fk_gedung_cabang` FOREIGN KEY (`cabang_id`) REFERENCES `cabang` (`id`) ON DELETE SET NULL');
        }

        // 2. Pegawai
        if (Schema::hasTable('pegawai') && Schema::hasColumn('pegawai', 'cabang_id')) {
            $this->dropForeignKeyIfExists('pegawai', 'fk_pegawai_cabang');
            DB::statement('ALTER TABLE `pegawai` MODIFY `cabang_id` BIGINT UNSIGNED NULL');
            DB::statement('ALTER TABLE `pegawai` ADD CONSTRAINT `fk_pegawai_cabang` FOREIGN KEY (`cabang_id`) REFERENCES `cabang` (`id`) ON DELETE SET NULL');
        }

        // 3. FAQ
        if (Schema::hasTable('faq') && Schema::hasColumn('faq', 'cabang_id')) {
            $this->dropForeignKeyIfExists('faq', 'fk_faq_cabang');
            DB::statement('ALTER TABLE `faq` MODIFY `cabang_id` BIGINT UNSIGNED NULL');
            DB::statement('ALTER TABLE `faq` ADD CONSTRAINT `fk_faq_cabang` FOREIGN KEY (`cabang_id`) REFERENCES `cabang` (`id`) ON DELETE SET NULL');
        }

        // 4. Laporan Bulanan
        if (Schema::hasTable('laporan_bulanan') && Schema::hasColumn('laporan_bulanan', 'cabang_id')) {
            $this->dropForeignKeyIfExists('laporan_bulanan', 'fk_lapbulanan_cabang');
            DB::statement('ALTER TABLE `laporan_bulanan` MODIFY `cabang_id` BIGINT UNSIGNED NULL');
            DB::statement('ALTER TABLE `laporan_bulanan` ADD CONSTRAINT `fk_lapbulanan_cabang` FOREIGN KEY (`cabang_id`) REFERENCES `cabang` (`id`) ON DELETE SET NULL');
        }

        // 5. Pengumuman
        if (Schema::hasTable('pengumuman') && Schema::hasColumn('pengumuman', 'cabang_id')) {
            $this->dropForeignKeyIfExists('pengumuman', 'fk_pengumuman_cabang');
            DB::statement('ALTER TABLE `pengumuman` MODIFY `cabang_id` BIGINT UNSIGNED NULL');
            DB::statement('ALTER TABLE `pengumuman` ADD CONSTRAINT `fk_pengumuman_cabang` FOREIGN KEY (`cabang_id`) REFERENCES `cabang` (`id`) ON DELETE SET NULL');
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Revert is optional as nullable is more permissive
    }

    private function dropForeignKeyIfExists(string $table, string $foreignKey): void
    {
        $keys = DB::select("
            SELECT CONSTRAINT_NAME 
            FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
            WHERE TABLE_SCHEMA = DATABASE() 
              AND TABLE_NAME = ? 
              AND CONSTRAINT_NAME = ?
              AND CONSTRAINT_TYPE = 'FOREIGN KEY'
        ", [$table, $foreignKey]);

        if (! empty($keys)) {
            DB::statement("ALTER TABLE `{$table}` DROP FOREIGN KEY `{$foreignKey}`");
        }
    }
};
