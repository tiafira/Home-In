<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class PembayaranBooking extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'pembayaran_booking';

    // Status Constants
    public const STATUS_MENUNGGU_PEMBAYARAN = 'menunggu_pembayaran';

    public const STATUS_MENUNGGU_VERIFIKASI = 'menunggu_verifikasi';

    public const STATUS_LUNAS = 'lunas';

    public const STATUS_TERLAMBAT = 'terlambat';

    public const STATUS_KEDALUWARSA = 'kedaluwarsa';

    // Refund Status Constants
    public const REFUND_TIDAK_ADA = 'tidak_ada';

    public const REFUND_MENUNGGU = 'menunggu_refund';

    public const REFUND_SUDAH = 'sudah_direfund';

    // Payment Methods
    public const METODE_TRANSFER_QRIS = 'transfer_qris';

    public const METODE_TUNAI = 'tunai';

    protected $fillable = [
        'booking_id',
        'periode_bulan_ke',
        'nominal',
        'jumlah',
        'kode_unik',
        'metode',
        'metode_pembayaran',
        'bukti_bayar',
        'bukti_pembayaran',
        'status',
        'status_refund',
        'penerima_id',
        'dikonfirmasi_oleh',
        'waktu_lunas',
        'tanggal_konfirmasi',
        'tanggal_bayar',
        'tanggal_jatuh_tempo',
        'kwitansi_nomor',
        'catatan',
        'created_at',
        'updated_at',
    ];

    protected function casts(): array
    {
        return [
            'periode_bulan_ke' => 'integer',
            'nominal' => 'decimal:2',
            'jumlah' => 'decimal:2',
            'kode_unik' => 'integer',
            'tanggal_bayar' => 'datetime',
            'tanggal_konfirmasi' => 'datetime',
            'waktu_lunas' => 'datetime',
            'tanggal_jatuh_tempo' => 'date',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::saving(function (PembayaranBooking $pb) {
            // Sync nominal <-> jumlah
            if ($pb->nominal !== null && $pb->jumlah === null) {
                $pb->jumlah = $pb->nominal;
            } elseif ($pb->jumlah !== null && $pb->nominal === null) {
                $pb->nominal = $pb->jumlah;
            }

            // Sync metode <-> metode_pembayaran
            if ($pb->metode && ! $pb->metode_pembayaran) {
                $pb->metode_pembayaran = $pb->metode;
            } elseif ($pb->metode_pembayaran && ! $pb->metode) {
                $pb->metode = $pb->metode_pembayaran;
            }

            // Sync bukti_bayar <-> bukti_pembayaran
            if ($pb->bukti_bayar && ! $pb->bukti_pembayaran) {
                $pb->bukti_pembayaran = $pb->bukti_bayar;
            } elseif ($pb->bukti_pembayaran && ! $pb->bukti_bayar) {
                $pb->bukti_bayar = $pb->bukti_pembayaran;
            }

            // Sync penerima_id <-> dikonfirmasi_oleh
            if ($pb->penerima_id && ! $pb->dikonfirmasi_oleh) {
                $pb->dikonfirmasi_oleh = $pb->penerima_id;
            } elseif ($pb->dikonfirmasi_oleh && ! $pb->penerima_id) {
                $pb->penerima_id = $pb->dikonfirmasi_oleh;
            }

            // Sync waktu_lunas <-> tanggal_konfirmasi
            if ($pb->waktu_lunas && ! $pb->tanggal_konfirmasi) {
                $pb->tanggal_konfirmasi = $pb->waktu_lunas;
            } elseif ($pb->tanggal_konfirmasi && ! $pb->waktu_lunas) {
                $pb->waktu_lunas = $pb->tanggal_konfirmasi;
            }
        });
    }

    public function getBatasBayarAttribute(): ?string
    {
        return $this->tanggal_jatuh_tempo;
    }

    public function setBatasBayarAttribute($value): void
    {
        $this->attributes['tanggal_jatuh_tempo'] = $value;
    }

    public function booking(): BelongsTo
    {
        return $this->belongsTo(Booking::class, 'booking_id');
    }

    public function penerima(): BelongsTo
    {
        return $this->belongsTo(User::class, 'penerima_id');
    }

    public function konfirmator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'dikonfirmasi_oleh');
    }

    public function diverifikasiOleh(): BelongsTo
    {
        return $this->belongsTo(User::class, 'dikonfirmasi_oleh');
    }

    /**
     * Total amount including unique code for transfer
     */
    public function getTotalBayarAttribute(): float
    {
        $base = (float) ($this->nominal ?? $this->jumlah ?? 0);

        return $base + (int) ($this->kode_unik ?? 0);
    }
}
