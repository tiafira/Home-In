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
        Schema::create('booking_status_history', function (Blueprint $table) {
            $table->id();
            $table->foreignId('booking_id')
                ->constrained('booking')
                ->cascadeOnDelete();

            $table->foreignId('user_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->string('dari_status', 50)->nullable();
            $table->string('ke_status', 50);
            $table->text('alasan')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['booking_id', 'created_at'], 'idx_bsh_booking_time');
            $table->index(['user_id'], 'idx_bsh_user');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('booking_status_history');
    }
};
