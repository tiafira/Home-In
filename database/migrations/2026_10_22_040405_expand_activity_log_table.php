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
        Schema::table('activity_log', function (Blueprint $table) {
            $table->string('peran', 50)->nullable()->after('user_id');
            $table->boolean('dibaca')->default(false)->after('keterangan');

            $table->index(['dibaca', 'created_at'], 'idx_actlog_dibaca_time');
            $table->index(['peran'], 'idx_actlog_peran');
            $table->index(['aksi'], 'idx_actlog_aksi');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('activity_log', function (Blueprint $table) {
            $table->dropIndex('idx_actlog_dibaca_time');
            $table->dropIndex('idx_actlog_peran');
            $table->dropIndex('idx_actlog_aksi');

            $table->dropColumn(['peran', 'dibaca']);
        });
    }
};
