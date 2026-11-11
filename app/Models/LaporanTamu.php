<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class LaporanTamu extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'laporan_tamu';

    public $timestamps = true;

    protected $fillable = [
        'penghuni_id',
        'kamar_id',
        'nama_tamu',
        'no_hp_tamu',
        'jumlah_tamu',
        'keperluan',
        'foto_identitas',
        'tanggal',
        'jam_masuk',
        'jam_keluar',
        'status',
        'created_at',
        'updated_at',
    ];

    protected function casts(): array
    {
        return [
            'tanggal' => 'date',
            'jumlah_tamu' => 'integer',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    public function penghuni(): BelongsTo
    {
        return $this->belongsTo(Penghuni::class, 'penghuni_id');
    }

    public function kamar(): BelongsTo
    {
        return $this->belongsTo(Kamar::class, 'kamar_id');
    }
}
