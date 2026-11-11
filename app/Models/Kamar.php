<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

class Kamar extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'kamar';

    protected $fillable = [
        'gedung_id',
        'nomor_kamar',
        'lantai',
        'harga_bulanan',
        'luas_m2',
        'kapasitas',
        'status',
        'deskripsi',
    ];

    protected function casts(): array
    {
        return [
            'lantai' => 'integer',
            'harga_bulanan' => 'decimal:2',
            'luas_m2' => 'decimal:1',
            'kapasitas' => 'integer',
        ];
    }

    public function gedung(): BelongsTo
    {
        return $this->belongsTo(Gedung::class, 'gedung_id');
    }

    public function kamarFoto(): HasMany
    {
        return $this->hasMany(KamarFoto::class, 'kamar_id');
    }

    public function penghuni(): HasMany
    {
        return $this->hasMany(Penghuni::class, 'kamar_id');
    }

    public function penghuniAktif(): HasOne
    {
        return $this->hasOne(Penghuni::class, 'kamar_id')->where('status', 'aktif');
    }

    public function kamarFasilitas(): HasMany
    {
        return $this->hasMany(KamarFasilitas::class, 'kamar_id');
    }

    public function bookings(): HasMany
    {
        return $this->hasMany(Booking::class, 'kamar_id');
    }

    public function activeBookings(): HasMany
    {
        return $this->hasMany(Booking::class, 'kamar_id')->whereIn('status', Booking::STATUSES_HOLDING_ROOM);
    }

    /**
     * Scope rooms eligible for booking (no active tenant and not under maintenance).
     */
    public function scopeDapatDibooking($query)
    {
        return $query->whereDoesntHave('penghuni', function ($q): void {
            $q->where('status', 'aktif');
        })->where('status', '!=', 'maintenance');
    }
}
