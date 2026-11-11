<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

class KamarFoto extends Model
{
    use HasFactory;

    protected $table = 'kamar_foto';

    public $timestamps = false;

    protected $fillable = [
        'kamar_id',
        'url_foto',
        'created_at',
    ];

    public function getUrlFotoAttribute(?string $value): ?string
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

    protected function casts(): array
    {
        return [
            'created_at' => 'datetime',
        ];
    }

    public function kamar(): BelongsTo
    {
        return $this->belongsTo(Kamar::class, 'kamar_id');
    }
}
