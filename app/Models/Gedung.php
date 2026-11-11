<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Storage;

class Gedung extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'gedung';

    protected $fillable = [
        'cabang_id',
        'nama_gedung',
        'foto',
        'jumlah_lantai',
        'alamat',
        'latitude',
        'longitude',
        'link_gmaps',
    ];

    protected $appends = [
        'url_foto',
    ];

    public function getFotoAttribute(?string $value): ?string
    {
        if (! $value) {
            return null;
        }

        if (str_starts_with($value, 'http://') || str_starts_with($value, 'https://')) {
            return $value;
        }

        if (str_starts_with($value, '/storage/') || str_starts_with($value, 'storage/')) {
            return '/' . ltrim($value, '/');
        }

        return Storage::url($value);
    }

    public function getUrlFotoAttribute(): ?string
    {
        return $this->foto;
    }

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
