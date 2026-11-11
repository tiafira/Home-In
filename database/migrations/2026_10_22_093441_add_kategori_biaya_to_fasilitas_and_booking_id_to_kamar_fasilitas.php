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
        Schema::table('fasilitas', function (Blueprint $table) {
            if (! Schema::hasColumn('fasilitas', 'kategori_biaya')) {
                $table->enum('kategori_biaya', ['per_bulan', 'sekali_bayar'])
                    ->default('per_bulan')
                    ->after('tipe')
                    ->comment('per_bulan: ditagih setiap bulan, sekali_bayar: ditagih sekali di awal dan jadi hak milik penghuni');
            }
        });

        Schema::table('kamar_fasilitas', function (Blueprint $table) {
            if (! Schema::hasColumn('kamar_fasilitas', 'booking_id')) {
                $table->unsignedBigInteger('booking_id')->nullable()->after('id');
                $table->foreign('booking_id')->references('id')->on('booking')->onDelete('cascade');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('kamar_fasilitas', function (Blueprint $table) {
            if (Schema::hasColumn('kamar_fasilitas', 'booking_id')) {
                $table->dropForeign(['booking_id']);
                $table->dropColumn('booking_id');
            }
        });

        Schema::table('fasilitas', function (Blueprint $table) {
            if (Schema::hasColumn('fasilitas', 'kategori_biaya')) {
                $table->dropColumn('kategori_biaya');
            }
        });
    }
};
