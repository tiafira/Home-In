<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Fasilitas extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'fasilitas';

    protected $fillable = [
        'nama_fasilitas',
        'deskripsi',
        'tipe',
        'kategori_biaya',
        'biaya_tambahan',
        'harga_barang',
    ];

    public function isSekaliBayar(): bool
    {
        return $this->kategori_biaya === 'sekali_bayar';
    }

    public function isPerBulan(): bool
    {
        return $this->kategori_biaya === 'per_bulan';
    }

    protected function casts(): array
    {
        return [
            'biaya_tambahan' => 'decimal:2',
            'harga_barang' => 'decimal:2',
        ];
    }

    public function kamarFasilitas(): HasMany
    {
        return $this->hasMany(KamarFasilitas::class, 'fasilitas_id');
    }
}
