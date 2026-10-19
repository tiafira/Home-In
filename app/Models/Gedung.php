<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Gedung extends Model
{
    use HasFactory;

    protected $table = 'gedung';

    protected $fillable = [
        'cabang_id',
        'nama_gedung',
        'jumlah_lantai',
        'alamat',
        'latitude',
        'longitude',
        'link_gmaps',
    ];

    protected function casts(): array
    {
        return [
            'jumlah_lantai' => 'integer',
            'latitude' => 'float',
            'longitude' => 'float',
        ];
    }

    public function cabang(): BelongsTo
    {
        return $this->belongsTo(Cabang::class, 'cabang_id');
    }

    public function kamar(): HasMany
    {
        return $this->hasMany(Kamar::class, 'gedung_id');
    }
}
