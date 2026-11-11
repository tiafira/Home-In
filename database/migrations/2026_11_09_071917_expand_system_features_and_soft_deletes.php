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
        // 1. Add soft deletes to core tables if not present
        $softDeleteTables = [
            'gedung', 'kamar', 'fasilitas', 'users', 'penghuni',
            'pegawai', 'komplain', 'peringatan', 'laporan_tamu',
            'pengumuman', 'booking', 'pembayaran', 'pembayaran_booking', 'faq',
        ];

        foreach ($softDeleteTables as $tableName) {
            if (Schema::hasTable($tableName) && ! Schema::hasColumn($tableName, 'deleted_at')) {
                Schema::table($tableName, function (Blueprint $table) {
                    $table->softDeletes();
                });
            }
        }

        // 2. Create 'paket' table (Penerimaan Paket)
        if (! Schema::hasTable('paket')) {
            Schema::create('paket', function (Blueprint $table) {
                $table->id();
                $table->foreignId('penghuni_id')->nullable()->constrained('penghuni')->nullOnDelete();
                $table->foreignId('kamar_id')->nullable()->constrained('kamar')->nullOnDelete();
                $table->string('nama_penerima', 100);
                $table->string('nomor_kamar', 50)->nullable();
                $table->string('ekspedisi', 50); // JNE, J&T, SiCepat, Shopee, Pos, dll.
                $table->string('no_resi', 100)->nullable();
                $table->string('foto_paket', 255)->nullable();
                $table->enum('status', ['belum_diambil', 'sudah_diambil'])->default('belum_diambil');
                $table->dateTime('waktu_tiba')->nullable();
                $table->dateTime('waktu_diambil')->nullable();
                $table->foreignId('diterima_oleh')->nullable()->constrained('users')->nullOnDelete();
                $table->text('catatan')->nullable();
                $table->softDeletes();
                $table->timestamps();

                $table->index(['status', 'waktu_tiba']);
            });
        }

        // 3. Expand 'laporan_tamu' table for Buku Tamu features
        if (Schema::hasTable('laporan_tamu')) {
            Schema::table('laporan_tamu', function (Blueprint $table) {
                if (! Schema::hasColumn('laporan_tamu', 'kamar_id')) {
                    $table->foreignId('kamar_id')->nullable()->after('penghuni_id')->constrained('kamar')->nullOnDelete();
                }
                if (! Schema::hasColumn('laporan_tamu', 'foto_identitas')) {
                    $table->string('foto_identitas', 255)->nullable()->after('keperluan');
                }
                if (! Schema::hasColumn('laporan_tamu', 'status')) {
                    $table->enum('status', ['sedang_berkunjung', 'sudah_pulang'])->default('sedang_berkunjung')->after('jam_keluar');
                }
                if (! Schema::hasColumn('laporan_tamu', 'no_hp_tamu')) {
                    $table->string('no_hp_tamu', 30)->nullable()->after('nama_tamu');
                }
                if (! Schema::hasColumn('laporan_tamu', 'jumlah_tamu')) {
                    $table->unsignedSmallInteger('jumlah_tamu')->default(1)->after('nama_tamu');
                }
                if (! Schema::hasColumn('laporan_tamu', 'updated_at')) {
                    $table->timestamp('updated_at')->nullable()->after('created_at');
                }
            });
        }

        // 4. Expand 'peringatan' table for Pelanggaran & Poin SP
        if (Schema::hasTable('peringatan')) {
            Schema::table('peringatan', function (Blueprint $table) {
                if (! Schema::hasColumn('peringatan', 'poin_pelanggaran')) {
                    $table->unsignedSmallInteger('poin_pelanggaran')->default(10)->after('kategori_pelanggaran');
                }
                if (! Schema::hasColumn('peringatan', 'tingkat_sp')) {
                    $table->enum('tingkat_sp', ['none', 'sp1', 'sp2', 'sp3'])->default('none')->after('poin_pelanggaran');
                }
                if (! Schema::hasColumn('peringatan', 'tindakan')) {
                    $table->text('tindakan')->nullable()->after('keterangan');
                }
                if (! Schema::hasColumn('peringatan', 'status')) {
                    $table->enum('status', ['aktif', 'selesai', 'dibatalkan'])->default('aktif')->after('tingkat_sp');
                }
                if (! Schema::hasColumn('peringatan', 'updated_at')) {
                    $table->timestamp('updated_at')->nullable()->after('created_at');
                }
            });
        }

        // 5. Expand 'komplain' table for Penugasan Karyawan & Progress Tracking
        if (Schema::hasTable('komplain')) {
            Schema::table('komplain', function (Blueprint $table) {
                if (! Schema::hasColumn('komplain', 'karyawan_id')) {
                    $table->foreignId('karyawan_id')->nullable()->after('ditangani_oleh')->constrained('pegawai')->nullOnDelete();
                }
                if (! Schema::hasColumn('komplain', 'catatan_progres')) {
                    $table->text('catatan_progres')->nullable()->after('balasan');
                }
                if (! Schema::hasColumn('komplain', 'estimasi_selesai')) {
                    $table->date('estimasi_selesai')->nullable()->after('tanggal_selesai');
                }
            });
            // Update enum/string status if needed: allow menunggu, sedang_dikerjakan, selesai, ditolak
            // We use DB statement to ensure column handles 'menunggu', 'sedang_dikerjakan', 'selesai', 'ditolak', 'baru', 'diproses'
            try {
                DB::statement("
                    ALTER TABLE `komplain` MODIFY COLUMN `status` 
                    ENUM('menunggu', 'sedang_dikerjakan', 'selesai', 'ditolak', 'baru', 'diproses') 
                    NOT NULL DEFAULT 'menunggu'
                ");
            } catch (Throwable $e) {
                // Ignore if driver does not support alter enum
            }
        }

        // 6. Create 'reservasi_fasilitas' table
        if (! Schema::hasTable('reservasi_fasilitas')) {
            Schema::create('reservasi_fasilitas', function (Blueprint $table) {
                $table->id();
                $table->foreignId('fasilitas_id')->constrained('fasilitas')->cascadeOnDelete();
                $table->foreignId('penghuni_id')->nullable()->constrained('penghuni')->nullOnDelete();
                $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
                $table->date('tanggal');
                $table->time('jam_mulai');
                $table->time('jam_selesai');
                $table->unsignedSmallInteger('jumlah_orang')->default(1);
                $table->text('keperluan')->nullable();
                $table->enum('status', ['menunggu', 'disetujui', 'ditolak', 'selesai', 'dibatalkan'])->default('menunggu');
                $table->text('catatan_admin')->nullable();
                $table->foreignId('disetujui_oleh')->nullable()->constrained('users')->nullOnDelete();
                $table->softDeletes();
                $table->timestamps();

                $table->index(['fasilitas_id', 'tanggal', 'status']);
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('reservasi_fasilitas');
        Schema::dropIfExists('paket');
    }
};
