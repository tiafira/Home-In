<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SetoranKas extends Model
{
    use HasFactory;

    protected $table = 'setoran_kas';

    protected $fillable = [
        'pegawai_id',
        'cabang_id',
        'tanggal_setor',
        'periode_awal',
        'periode_akhir',
        'total_setoran',
        'jumlah_transaksi',
        'bukti_setoran',
        'status',
        'diterima_oleh',
        'tanggal_diterima',
        'catatan',
    ];

    protected function casts(): array
    {
        return [
            'tanggal_setor' => 'date',
            'periode_awal' => 'date',
            'periode_akhir' => 'date',
            'total_setoran' => 'decimal:2',
            'jumlah_transaksi' => 'integer',
            'tanggal_diterima' => 'datetime',
        ];
    }

    public function pegawai(): BelongsTo
    {
        return $this->belongsTo(Pegawai::class, 'pegawai_id');
    }

    public function cabang(): BelongsTo
    {
        return $this->belongsTo(Cabang::class, 'cabang_id');
    }

    public function penerima(): BelongsTo
    {
        return $this->belongsTo(User::class, 'diterima_oleh');
    }

    public function pembayaran(): HasMany
    {
        return $this->hasMany(Pembayaran::class, 'setoran_kas_id');
    }
}
