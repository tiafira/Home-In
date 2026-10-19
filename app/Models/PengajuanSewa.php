<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PengajuanSewa extends Model
{
    use HasFactory;

    protected $table = 'pengajuan_sewa';

    protected $fillable = [
        'penghuni_id',
        'jenis',
        'tanggal_pengajuan',
        'durasi_bulan',
        'tanggal_target',
        'alasan',
        'status',
        'catatan_admin',
        'diproses_oleh',
        'diproses_pada',
    ];

    protected function casts(): array
    {
        return [
            'tanggal_pengajuan' => 'date',
            'durasi_bulan' => 'integer',
            'tanggal_target' => 'date',
            'diproses_pada' => 'datetime',
        ];
    }

    public function penghuni(): BelongsTo
    {
        return $this->belongsTo(Penghuni::class, 'penghuni_id');
    }

    public function pemroses(): BelongsTo
    {
        return $this->belongsTo(User::class, 'diproses_oleh');
    }
}
