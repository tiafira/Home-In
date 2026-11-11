<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Komplain extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'komplain';

    protected $fillable = [
        'penghuni_id',
        'kategori',
        'isi',
        'foto_lampiran',
        'status',
        'ditangani_oleh',
        'karyawan_id',
        'balasan',
        'catatan_progres',
        'estimasi_selesai',
        'tanggal_selesai',
    ];

    protected function casts(): array
    {
        return [
            'estimasi_selesai' => 'date',
            'tanggal_selesai' => 'datetime',
        ];
    }

    public function penghuni(): BelongsTo
    {
        return $this->belongsTo(Penghuni::class, 'penghuni_id');
    }

    public function penangan(): BelongsTo
    {
        return $this->belongsTo(User::class, 'ditangani_oleh');
    }

    public function karyawan(): BelongsTo
    {
        return $this->belongsTo(Pegawai::class, 'karyawan_id');
    }
}
