<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PembayaranBooking extends Model
{
    use HasFactory;

    protected $table = 'pembayaran_booking';

    public $timestamps = false;

    protected $fillable = [
        'booking_id',
        'jumlah',
        'metode_pembayaran',
        'bukti_pembayaran',
        'status',
        'dikonfirmasi_oleh',
        'tanggal_bayar',
        'tanggal_konfirmasi',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'jumlah' => 'decimal:2',
            'tanggal_bayar' => 'datetime',
            'tanggal_konfirmasi' => 'datetime',
            'created_at' => 'datetime',
        ];
    }

    public function booking(): BelongsTo
    {
        return $this->belongsTo(Booking::class, 'booking_id');
    }

    public function konfirmator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'dikonfirmasi_oleh');
    }

    public function diverifikasiOleh(): BelongsTo
    {
        return $this->belongsTo(User::class, 'dikonfirmasi_oleh');
    }
}
