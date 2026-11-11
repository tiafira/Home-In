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
        'booking_id',
        'kamar_id',
        'fasilitas_id',
        'status_request',
        'opsi_pembayaran',
        'harga_barang',
        'biaya_bulanan',
        'total_terbayar',
        'is_hak_milik',
        'tanggal_pasang',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'harga_barang' => 'decimal:2',
            'biaya_bulanan' => 'decimal:2',
            'total_terbayar' => 'decimal:2',
            'is_hak_milik' => 'boolean',
            'tanggal_pasang' => 'date',
            'created_at' => 'datetime',
        ];
    }

    public function booking(): BelongsTo
    {
        return $this->belongsTo(Booking::class, 'booking_id');
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
