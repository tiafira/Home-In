<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Penghuni extends Model
{
    use HasFactory;

    protected $table = 'penghuni';

    protected $fillable = [
        'user_id',
        'kamar_id',
        'no_ktp',
        'alamat_asal',
        'kontak_darurat_nama',
        'kontak_darurat_hp',
        'tanggal_masuk',
        'tanggal_keluar',
        'masa_tinggal_sampai',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'tanggal_masuk' => 'date',
            'tanggal_keluar' => 'date',
            'masa_tinggal_sampai' => 'date',
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

    public function pembayaran(): HasMany
    {
        return $this->hasMany(Pembayaran::class, 'penghuni_id');
    }

    public function komplain(): HasMany
    {
        return $this->hasMany(Komplain::class, 'penghuni_id');
    }

    public function peringatan(): HasMany
    {
        return $this->hasMany(Peringatan::class, 'penghuni_id');
    }

    public function izinKeluar(): HasMany
    {
        return $this->hasMany(IzinKeluar::class, 'penghuni_id');
    }

    public function laporanTamu(): HasMany
    {
        return $this->hasMany(LaporanTamu::class, 'penghuni_id');
    }

    public function laporanPulang(): HasMany
    {
        return $this->hasMany(LaporanPulang::class, 'penghuni_id');
    }
}
