<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Booking extends Model
{
    use HasFactory;

    protected $table = 'booking';

    protected $fillable = [
        'user_id',
        'kamar_id',
        'tanggal_booking',
        'rencana_checkin',
        'status',
        'catatan',
        'alasan_penolakan',
        'kamar_alternatif_id',
        'tawaran_kadaluarsa_pada',
        'diproses_oleh',
        'diproses_pada',
    ];

    protected function casts(): array
    {
        return [
            'tanggal_booking' => 'datetime',
            'rencana_checkin' => 'date',
            'tawaran_kadaluarsa_pada' => 'datetime',
            'diproses_pada' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function kamar(): BelongsTo
    {
        return $this->belongsTo(Kamar::class, 'kamar_id');
    }

    public function kamarAlternatif(): BelongsTo
    {
        return $this->belongsTo(Kamar::class, 'kamar_alternatif_id');
    }

    public function diprosesOleh(): BelongsTo
    {
        return $this->belongsTo(User::class, 'diproses_oleh');
    }

    public function pembayaranBooking(): HasOne
    {
        return $this->hasOne(PembayaranBooking::class, 'booking_id');
    }
}
