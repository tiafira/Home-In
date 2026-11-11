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
        Schema::table('peringatan', function (Blueprint $table) {
            if (! Schema::hasColumn('peringatan', 'tingkat_pelanggaran')) {
                $table->enum('tingkat_pelanggaran', ['ringan', 'sedang', 'berat'])->default('ringan')->after('kategori_pelanggaran');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('peringatan', function (Blueprint $table) {
            if (Schema::hasColumn('peringatan', 'tingkat_pelanggaran')) {
                $table->dropColumn('tingkat_pelanggaran');
            }
        });
    }
};
