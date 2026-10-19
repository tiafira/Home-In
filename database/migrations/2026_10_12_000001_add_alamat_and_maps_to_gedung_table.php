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
        Schema::table('gedung', function (Blueprint $table) {
            if (! Schema::hasColumn('gedung', 'alamat')) {
                $table->text('alamat')->nullable()->after('jumlah_lantai');
            }
            if (! Schema::hasColumn('gedung', 'latitude')) {
                $table->decimal('latitude', 10, 7)->nullable()->after('alamat');
            }
            if (! Schema::hasColumn('gedung', 'longitude')) {
                $table->decimal('longitude', 10, 7)->nullable()->after('latitude');
            }
            if (! Schema::hasColumn('gedung', 'link_gmaps')) {
                $table->string('link_gmaps', 500)->nullable()->after('longitude');
            }
        });

        // Backfill existing gedung records from their parent cabang
        DB::statement('
            UPDATE gedung g
            INNER JOIN cabang c ON g.cabang_id = c.id
            SET g.alamat = COALESCE(g.alamat, c.alamat),
                g.latitude = COALESCE(g.latitude, c.latitude),
                g.longitude = COALESCE(g.longitude, c.longitude)
        ');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('gedung', function (Blueprint $table) {
            $table->dropColumn(['alamat', 'latitude', 'longitude', 'link_gmaps']);
        });
    }
};
