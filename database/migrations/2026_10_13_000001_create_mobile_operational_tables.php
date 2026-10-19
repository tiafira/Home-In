<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Tabel absensi (Check-in / Check-out Penjaga tanpa shift, validasi radius 100m)
        if (! Schema::hasTable('absensi')) {
            Schema::create('absensi', function (Blueprint $table) {
                $table->id();
                $table->foreignId('pegawai_id')->constrained('pegawai')->cascadeOnDelete();
                $table->foreignId('cabang_id')->constrained('cabang')->cascadeOnDelete();
                $table->date('tanggal');
                $table->dateTime('jam_masuk')->nullable();
                $table->dateTime('jam_keluar')->nullable();
                $table->decimal('latitude_masuk', 10, 7)->nullable();
                $table->decimal('longitude_masuk', 10, 7)->nullable();
                $table->decimal('latitude_keluar', 10, 7)->nullable();
                $table->decimal('longitude_keluar', 10, 7)->nullable();
                $table->unsignedInteger('jarak_masuk_meter')->nullable();
                $table->unsignedInteger('jarak_keluar_meter')->nullable();
                $table->unsignedSmallInteger('menit_terlambat')->default(0);
                $table->enum('status', ['hadir', 'terlambat', 'izin', 'alpha'])->default('hadir');
                $table->text('keterangan')->nullable();
                $table->timestamps();

                $table->unique(['pegawai_id', 'tanggal'], 'uq_absensi_pegawai_tanggal');
                $table->index(['cabang_id', 'tanggal'], 'idx_absensi_cabang_tanggal');
            });
        }

        // 2. Tabel log_gerbang (Catat Masuk / Keluar Gerbang Penghuni)
        if (! Schema::hasTable('log_gerbang')) {
            Schema::create('log_gerbang', function (Blueprint $table) {
                $table->id();
                $table->foreignId('penghuni_id')->constrained('penghuni')->cascadeOnDelete();
                $table->foreignId('cabang_id')->constrained('cabang')->cascadeOnDelete();
                $table->foreignId('dicatat_oleh')->nullable()->constrained('pegawai')->nullOnDelete();
                $table->enum('jenis', ['masuk', 'keluar']);
                $table->dateTime('waktu')->useCurrent();
                $table->boolean('lewat_jam_malam')->default(false);
                $table->foreignId('izin_keluar_id')->nullable()->constrained('izin_keluar')->nullOnDelete();
                $table->boolean('diteruskan_ke_admin')->default(false);
                $table->foreignId('peringatan_id')->nullable()->constrained('peringatan')->nullOnDelete();
                $table->text('keterangan')->nullable();
                $table->timestamps();

                $table->index(['cabang_id', 'waktu'], 'idx_loggerbang_cabang_waktu');
                $table->index(['penghuni_id', 'waktu'], 'idx_loggerbang_penghuni_waktu');
            });
        }

        // 3. Tabel laporan_masalah (Tab Lapor Masalah / Insiden oleh Penjaga)
        if (! Schema::hasTable('laporan_masalah')) {
            Schema::create('laporan_masalah', function (Blueprint $table) {
                $table->id();
                $table->foreignId('pegawai_id')->constrained('pegawai')->cascadeOnDelete();
                $table->foreignId('cabang_id')->constrained('cabang')->cascadeOnDelete();
                $table->foreignId('kamar_id')->nullable()->constrained('kamar')->nullOnDelete();
                $table->enum('kategori', ['kerusakan', 'gangguan', 'insiden', 'kebersihan', 'lainnya'])->default('kerusakan');
                $table->string('judul', 150);
                $table->text('deskripsi');
                $table->string('foto_lampiran', 255)->nullable();
                $table->enum('prioritas', ['rendah', 'sedang', 'tinggi', 'darurat'])->default('sedang');
                $table->enum('status', ['baru', 'diproses', 'selesai'])->default('baru');
                $table->foreignId('ditangani_oleh')->nullable()->constrained('users')->nullOnDelete();
                $table->text('catatan_admin')->nullable();
                $table->dateTime('tanggal_selesai')->nullable();
                $table->timestamps();

                $table->index(['cabang_id', 'status'], 'idx_lapmasalah_cabang_status');
            });
        }

        // 4. Tabel setoran_kas (Rekonsiliasi Setoran Cash Penjaga ke Admin)
        if (! Schema::hasTable('setoran_kas')) {
            Schema::create('setoran_kas', function (Blueprint $table) {
                $table->id();
                $table->foreignId('pegawai_id')->constrained('pegawai')->cascadeOnDelete();
                $table->foreignId('cabang_id')->constrained('cabang')->cascadeOnDelete();
                $table->date('tanggal_setor');
                $table->date('periode_awal')->nullable();
                $table->date('periode_akhir')->nullable();
                $table->decimal('total_setoran', 14, 2)->default(0);
                $table->unsignedInteger('jumlah_transaksi')->default(0);
                $table->string('bukti_setoran', 255)->nullable();
                $table->enum('status', ['menunggu', 'diterima', 'ditolak'])->default('menunggu');
                $table->foreignId('diterima_oleh')->nullable()->constrained('users')->nullOnDelete();
                $table->dateTime('tanggal_diterima')->nullable();
                $table->text('catatan')->nullable();
                $table->timestamps();

                $table->index(['cabang_id', 'status'], 'idx_setorankas_cabang_status');
                $table->index(['pegawai_id', 'tanggal_setor'], 'idx_setorankas_pegawai_tanggal');
            });
        }

        // 5. Tabel pengajuan_sewa (Perpanjang masa tinggal & ajukan berhenti/keluar penghuni)
        if (! Schema::hasTable('pengajuan_sewa')) {
            Schema::create('pengajuan_sewa', function (Blueprint $table) {
                $table->id();
                $table->foreignId('penghuni_id')->constrained('penghuni')->cascadeOnDelete();
                $table->enum('jenis', ['perpanjang', 'berhenti']);
                $table->date('tanggal_pengajuan')->nullable();
                $table->unsignedSmallInteger('durasi_bulan')->nullable();
                $table->date('tanggal_target')->nullable();
                $table->text('alasan')->nullable();
                $table->enum('status', ['menunggu', 'disetujui', 'ditolak'])->default('menunggu');
                $table->text('catatan_admin')->nullable();
                $table->foreignId('diproses_oleh')->nullable()->constrained('users')->nullOnDelete();
                $table->dateTime('diproses_pada')->nullable();
                $table->timestamps();

                $table->index(['penghuni_id', 'status'], 'idx_pengajuansewa_penghuni_status');
            });
        }

        // 6. Kolom tambahan pada pembayaran & pembayaran_booking & komplain
        Schema::table('pembayaran', function (Blueprint $table) {
            if (! Schema::hasColumn('pembayaran', 'alasan_penolakan')) {
                $table->text('alasan_penolakan')->nullable()->after('bukti_pembayaran');
            }
            if (! Schema::hasColumn('pembayaran', 'setoran_kas_id')) {
                $table->foreignId('setoran_kas_id')->nullable()->after('penjaga_perantara_id')->constrained('setoran_kas')->nullOnDelete();
            }
        });

        Schema::table('pembayaran_booking', function (Blueprint $table) {
            if (! Schema::hasColumn('pembayaran_booking', 'alasan_penolakan')) {
                $table->text('alasan_penolakan')->nullable()->after('bukti_pembayaran');
            }
        });

        Schema::table('komplain', function (Blueprint $table) {
            if (! Schema::hasColumn('komplain', 'foto_balasan')) {
                $table->string('foto_balasan', 255)->nullable()->after('balasan');
            }
        });
    }

    public function down(): void
    {
        if (Schema::hasTable('komplain') && Schema::hasColumn('komplain', 'foto_balasan')) {
            Schema::table('komplain', function (Blueprint $table) {
                $table->dropColumn('foto_balasan');
            });
        }

        if (Schema::hasTable('pembayaran_booking') && Schema::hasColumn('pembayaran_booking', 'alasan_penolakan')) {
            Schema::table('pembayaran_booking', function (Blueprint $table) {
                $table->dropColumn('alasan_penolakan');
            });
        }

        if (Schema::hasTable('pembayaran')) {
            Schema::table('pembayaran', function (Blueprint $table) {
                if (Schema::hasColumn('pembayaran', 'setoran_kas_id')) {
                    $table->dropForeign(['setoran_kas_id']);
                    $table->dropColumn('setoran_kas_id');
                }
                if (Schema::hasColumn('pembayaran', 'alasan_penolakan')) {
                    $table->dropColumn('alasan_penolakan');
                }
            });
        }

        Schema::dropIfExists('pengajuan_sewa');
        Schema::dropIfExists('setoran_kas');
        Schema::dropIfExists('laporan_masalah');
        Schema::dropIfExists('log_gerbang');
        Schema::dropIfExists('absensi');
    }
};
