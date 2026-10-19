<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Kamar extends Model
{
    use HasFactory;

    protected $table = 'kamar';

    protected $fillable = [
        'gedung_id',
        'nomor_kamar',
        'lantai',
        'harga_bulanan',
        'status',
        'deskripsi',
    ];

    protected function casts(): array
    {
        return [
            'lantai' => 'integer',
            'harga_bulanan' => 'decimal:2',
        ];
    }

    public function gedung(): BelongsTo
    {
        return $this->belongsTo(Gedung::class, 'gedung_id');
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
}
