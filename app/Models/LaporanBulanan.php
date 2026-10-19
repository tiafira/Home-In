<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LaporanBulanan extends Model
{
    use HasFactory;

    protected $table = 'laporan_bulanan';

    public $timestamps = false;

    protected $fillable = [
        'cabang_id',
        'periode_bulan',
        'periode_tahun',
        'total_pemasukan',
        'total_penghuni_aktif',
        'total_kamar_kosong',
        'total_komplain',
        'total_pelanggaran',
        'detail_json',
        'dibuat_oleh',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'total_pemasukan' => 'decimal:2',
            'detail_json' => 'array',
            'created_at' => 'datetime',
        ];
    }

    public function cabang(): BelongsTo
    {
        return $this->belongsTo(Cabang::class, 'cabang_id');
    }

    public function dibuatOleh(): BelongsTo
    {
        return $this->belongsTo(User::class, 'dibuat_oleh');
    }

    public function pembuat(): BelongsTo
    {
        return $this->belongsTo(User::class, 'dibuat_oleh');
    }
}
