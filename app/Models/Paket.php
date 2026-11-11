<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Paket extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'paket';

    protected $fillable = [
        'penghuni_id',
        'kamar_id',
        'nama_penerima',
        'nomor_kamar',
        'ekspedisi',
        'no_resi',
        'foto_paket',
        'status',
        'waktu_tiba',
        'waktu_diambil',
        'diterima_oleh',
        'catatan',
    ];

    protected function casts(): array
    {
        return [
            'waktu_tiba' => 'datetime',
            'waktu_diambil' => 'datetime',
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

    public function diterimaOleh(): BelongsTo
    {
        return $this->belongsTo(User::class, 'diterima_oleh');
    }
}
