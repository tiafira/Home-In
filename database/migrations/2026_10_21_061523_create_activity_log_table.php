<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('activity_log')) {
            return;
        }

        Schema::create('activity_log', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('cabang_id')->nullable()->constrained('cabang')->nullOnDelete();
            $table->string('aksi', 100);
            $table->string('model_type', 100)->nullable();
            $table->unsignedBigInteger('model_id')->nullable();
            $table->json('data_lama')->nullable();
            $table->json('data_baru')->nullable();
            $table->string('keterangan')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['user_id', 'created_at'], 'idx_actlog_user_time');
            $table->index(['model_type', 'model_id'], 'idx_actlog_model');
            $table->index(['cabang_id', 'created_at'], 'idx_actlog_cabang_time');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('activity_log');
    }
};
