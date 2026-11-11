<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('kamar', function (Blueprint $table) {
            if (! Schema::hasColumn('kamar', 'luas_m2')) {
                $table->decimal('luas_m2', 5, 1)->nullable()->after('harga_bulanan');
            }
            if (! Schema::hasColumn('kamar', 'kapasitas')) {
                $table->unsignedTinyInteger('kapasitas')->default(1)->after('luas_m2');
            }
        });
    }

    public function down(): void
    {
        Schema::table('kamar', function (Blueprint $table) {
            if (Schema::hasColumn('kamar', 'kapasitas')) {
                $table->dropColumn('kapasitas');
            }
            if (Schema::hasColumn('kamar', 'luas_m2')) {
                $table->dropColumn('luas_m2');
            }
        });
    }
};
