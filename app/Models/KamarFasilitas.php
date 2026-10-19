<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class KamarFasilitas extends Model
{
    use HasFactory;

    protected $table = 'kamar_fasilitas';

    public $timestamps = false;

    protected $fillable = [
        'kamar_id',
        'fasilitas_id',
        'status_request',
        'tanggal_pasang',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'tanggal_pasang' => 'date',
            'created_at' => 'datetime',
        ];
    }

    public function kamar(): BelongsTo
    {
        return $this->belongsTo(Kamar::class, 'kamar_id');
    }

    public function fasilitas(): BelongsTo
    {
        return $this->belongsTo(Fasilitas::class, 'fasilitas_id');
    }
}
