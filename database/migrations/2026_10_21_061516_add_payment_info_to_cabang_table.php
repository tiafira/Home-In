<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('cabang', function (Blueprint $table) {
            if (! Schema::hasColumn('cabang', 'nama_bank')) {
                $table->string('nama_bank', 100)->nullable()->after('jam_malam');
            }
            if (! Schema::hasColumn('cabang', 'no_rekening')) {
                $table->string('no_rekening', 50)->nullable()->after('nama_bank');
            }
            if (! Schema::hasColumn('cabang', 'nama_pemilik_rekening')) {
                $table->string('nama_pemilik_rekening', 100)->nullable()->after('no_rekening');
            }
            if (! Schema::hasColumn('cabang', 'qr_pembayaran')) {
                $table->string('qr_pembayaran', 255)->nullable()->after('nama_pemilik_rekening');
            }
            if (! Schema::hasColumn('cabang', 'no_wa')) {
                $table->string('no_wa', 20)->nullable()->after('qr_pembayaran');
            }
            if (! Schema::hasColumn('cabang', 'email_cabang')) {
                $table->string('email_cabang', 100)->nullable()->after('no_wa');
            }
        });
    }

    public function down(): void
    {
        Schema::table('cabang', function (Blueprint $table) {
            $table->dropColumn(array_filter([
                Schema::hasColumn('cabang', 'email_cabang') ? 'email_cabang' : null,
                Schema::hasColumn('cabang', 'no_wa') ? 'no_wa' : null,
                Schema::hasColumn('cabang', 'qr_pembayaran') ? 'qr_pembayaran' : null,
                Schema::hasColumn('cabang', 'nama_pemilik_rekening') ? 'nama_pemilik_rekening' : null,
                Schema::hasColumn('cabang', 'no_rekening') ? 'no_rekening' : null,
                Schema::hasColumn('cabang', 'nama_bank') ? 'nama_bank' : null,
            ]));
        });
    }
};
