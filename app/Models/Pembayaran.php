<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Pembayaran extends Model
{
    use HasFactory;

    protected $table = 'pembayaran';

    protected $fillable = [
        'penghuni_id',
        'periode_bulan',
        'periode_tahun',
        'jumlah_tagihan',
        'tanggal_jatuh_tempo',
        'tanggal_bayar',
        'metode_pembayaran',
        'bukti_pembayaran',
        'status',
        'dikonfirmasi_oleh',
        'tanggal_konfirmasi',
        'penjaga_perantara_id',
    ];

    protected function casts(): array
    {
        return [
            'periode_bulan' => 'integer',
            'periode_tahun' => 'integer',
            'jumlah_tagihan' => 'decimal:2',
            'tanggal_jatuh_tempo' => 'date',
            'tanggal_bayar' => 'datetime',
            'tanggal_konfirmasi' => 'datetime',
        ];
    }

    public function penghuni(): BelongsTo
    {
        return $this->belongsTo(Penghuni::class, 'penghuni_id');
    }

    public function konfirmator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'dikonfirmasi_oleh');
    }

    public function penjaga(): BelongsTo
    {
        return $this->belongsTo(Pegawai::class, 'penjaga_perantara_id');
    }
}
