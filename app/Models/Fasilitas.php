<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Fasilitas extends Model
{
    use HasFactory;

    protected $table = 'fasilitas';

    protected $fillable = [
        'nama_fasilitas',
        'deskripsi',
        'tipe',
        'biaya_tambahan',
    ];

    protected function casts(): array
    {
        return [
            'biaya_tambahan' => 'decimal:2',
        ];
    }

    public function kamarFasilitas(): HasMany
    {
        return $this->hasMany(KamarFasilitas::class, 'fasilitas_id');
    }
}
