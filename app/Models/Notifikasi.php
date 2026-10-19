<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Notifikasi extends Model
{
    use HasFactory;

    protected $table = 'notifikasi';

    public $timestamps = false;

    protected $fillable = [
        'user_id',
        'judul',
        'isi',
        'pesan',
        'tipe',
        'referensi_tabel',
        'referensi_id',
        'sudah_dibaca',
        'created_at',
    ];

    public function getPesanAttribute(): ?string
    {
        return $this->attributes['isi'] ?? null;
    }

    public function setPesanAttribute(?string $value): void
    {
        $this->attributes['isi'] = $value;
    }

    protected function casts(): array
    {
        return [
            'sudah_dibaca' => 'boolean',
            'created_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
