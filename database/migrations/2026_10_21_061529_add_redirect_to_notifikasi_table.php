<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('notifikasi', function (Blueprint $table) {
            if (! Schema::hasColumn('notifikasi', 'redirect_url')) {
                $table->string('redirect_url', 255)->nullable()->after('tipe');
            }
        });
    }

    public function down(): void
    {
        Schema::table('notifikasi', function (Blueprint $table) {
            if (Schema::hasColumn('notifikasi', 'redirect_url')) {
                $table->dropColumn('redirect_url');
            }
        });
    }
};
