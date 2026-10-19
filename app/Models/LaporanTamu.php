<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LaporanTamu extends Model
{
    use HasFactory;

    protected $table = 'laporan_tamu';

    public $timestamps = false;

    protected $fillable = [
        'penghuni_id',
        'nama_tamu',
        'keperluan',
        'tanggal',
        'jam_masuk',
        'jam_keluar',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'tanggal' => 'date',
            'created_at' => 'datetime',
        ];
    }

    public function penghuni(): BelongsTo
    {
        return $this->belongsTo(Penghuni::class, 'penghuni_id');
    }
}
