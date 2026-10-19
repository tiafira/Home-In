<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LogGerbang extends Model
{
    use HasFactory;

    protected $table = 'log_gerbang';

    protected $fillable = [
        'penghuni_id',
        'cabang_id',
        'dicatat_oleh',
        'jenis',
        'waktu',
        'lewat_jam_malam',
        'izin_keluar_id',
        'diteruskan_ke_admin',
        'peringatan_id',
        'keterangan',
    ];

    protected function casts(): array
    {
        return [
            'waktu' => 'datetime',
            'lewat_jam_malam' => 'boolean',
            'diteruskan_ke_admin' => 'boolean',
        ];
    }

    public function penghuni(): BelongsTo
    {
        return $this->belongsTo(Penghuni::class, 'penghuni_id');
    }

    public function cabang(): BelongsTo
    {
        return $this->belongsTo(Cabang::class, 'cabang_id');
    }

    public function pencatat(): BelongsTo
    {
        return $this->belongsTo(Pegawai::class, 'dicatat_oleh');
    }

    public function izinKeluar(): BelongsTo
    {
        return $this->belongsTo(IzinKeluar::class, 'izin_keluar_id');
    }

    public function peringatan(): BelongsTo
    {
        return $this->belongsTo(Peringatan::class, 'peringatan_id');
    }
}
