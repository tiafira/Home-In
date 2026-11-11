<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

class Booking extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'booking';

    // Status Constants
    public const STATUS_MENUNGGU_KONFIRMASI = 'menunggu_konfirmasi';

    public const STATUS_MENUNGGU_RESPON_CUSTOMER = 'menunggu_respon_customer';

    public const STATUS_MENUNGGU_PEMBAYARAN = 'menunggu_pembayaran';

    public const STATUS_MENUNGGU_VERIFIKASI = 'menunggu_verifikasi';

    public const STATUS_TERJADWAL = 'terjadwal';

    public const STATUS_AKTIF = 'aktif';

    public const STATUS_SELESAI = 'selesai';

    public const STATUS_DITOLAK = 'ditolak';

    public const STATUS_DIBATALKAN = 'dibatalkan';

    public const STATUS_KEDALUWARSA = 'kedaluwarsa';

    // Legacy status aliases for backwards compatibility
    public const STATUS_LEGACY_PERSETUJUAN = 'menunggu_persetujuan';

    public const STATUS_LEGACY_ALTERNATIF = 'ditawarkan_alternatif';

    public const STATUS_LEGACY_DIKONFIRMASI = 'dikonfirmasi';

    /**
     * Statuses that actively lock / hold the room from other bookings
     */
    public const STATUSES_HOLDING_ROOM = [
        self::STATUS_MENUNGGU_KONFIRMASI,
        self::STATUS_MENUNGGU_RESPON_CUSTOMER,
        self::STATUS_MENUNGGU_PEMBAYARAN,
        self::STATUS_MENUNGGU_VERIFIKASI,
        self::STATUS_TERJADWAL,
        self::STATUS_AKTIF,
        self::STATUS_LEGACY_PERSETUJUAN,
        self::STATUS_LEGACY_ALTERNATIF,
        self::STATUS_LEGACY_DIKONFIRMASI,
    ];

    protected $fillable = [
        'user_id',
        'kamar_id',
        'tanggal_booking',
        'rencana_checkin',
        'tanggal_mulai',
        'tanggal_selesai',
        'tanggal_blok_selesai',
        'durasi_bulan',
        'status',
        'catatan',
        'alasan_penolakan',
        'alasan_tolak',
        'kamar_alternatif_id',
        'tawaran_kadaluarsa_pada',
        'metode_bayar',
        'batas_bayar',
        'waktu_keluar',
        'dikonfirmasi_keluar_oleh',
        'alasan_selesai',
        'diproses_oleh',
        'diproses_pada',
    ];

    protected $appends = [
        'rincian_biaya',
    ];

    protected function casts(): array
    {
        return [
            'tanggal_booking' => 'datetime',
            'rencana_checkin' => 'date',
            'tanggal_mulai' => 'date',
            'tanggal_selesai' => 'date',
            'tanggal_blok_selesai' => 'date',
            'durasi_bulan' => 'integer',
            'tawaran_kadaluarsa_pada' => 'datetime',
            'batas_bayar' => 'datetime',
            'waktu_keluar' => 'datetime',
            'diproses_pada' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::saving(function (Booking $booking) {
            // Bi-directional sync between tanggal_mulai & rencana_checkin
            if ($booking->tanggal_mulai && ! $booking->rencana_checkin) {
                $booking->rencana_checkin = $booking->tanggal_mulai;
            } elseif ($booking->rencana_checkin && ! $booking->tanggal_mulai) {
                $booking->tanggal_mulai = $booking->rencana_checkin;
            }

            // Sync alasan_tolak & alasan_penolakan
            if ($booking->alasan_tolak && ! $booking->alasan_penolakan) {
                $booking->alasan_penolakan = $booking->alasan_tolak;
            } elseif ($booking->alasan_penolakan && ! $booking->alasan_tolak) {
                $booking->alasan_tolak = $booking->alasan_penolakan;
            }

            // Calculate tanggal_selesai and tanggal_blok_selesai if not provided
            if ($booking->tanggal_mulai && $booking->durasi_bulan && ! $booking->tanggal_selesai) {
                $start = Carbon::parse($booking->tanggal_mulai);
                $booking->tanggal_selesai = (clone $start)->addMonthsNoOverflow($booking->durasi_bulan)->toDateString();
            }

            if ($booking->tanggal_selesai && ! $booking->tanggal_blok_selesai) {
                $jedaHari = (int) Pengaturan::get('booking_jeda_hari', 14);
                $booking->tanggal_blok_selesai = Carbon::parse($booking->tanggal_selesai)->addDays($jedaHari)->toDateString();
            }
        });
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function kamar(): BelongsTo
    {
        return $this->belongsTo(Kamar::class, 'kamar_id');
    }

    public function kamarAlternatif(): BelongsTo
    {
        return $this->belongsTo(Kamar::class, 'kamar_alternatif_id');
    }

    public function diprosesOleh(): BelongsTo
    {
        return $this->belongsTo(User::class, 'diproses_oleh');
    }

    public function dikonfirmasiKeluarOleh(): BelongsTo
    {
        return $this->belongsTo(User::class, 'dikonfirmasi_keluar_oleh');
    }

    public function pembayaranBooking(): HasMany
    {
        return $this->hasMany(PembayaranBooking::class, 'booking_id');
    }

    public function kamarFasilitas(): HasMany
    {
        return $this->hasMany(KamarFasilitas::class, 'booking_id');
    }

    /**
     * Hitung total tagihan sewa bulan pertama:
     * Harga Kamar + Fasilitas Per Bulan (Dari Kost) + Fasilitas Beli Permanen (Hak Milik Langsung)
     */
    public function hitungBiayaBulanPertama(): float
    {
        $hargaKamar = (float) ($this->kamar?->harga_bulanan ?? 0);

        $totalFasilitas = 0;
        $kamarFasilitas = $this->kamarFasilitas()->with('fasilitas')->get();

        if ($kamarFasilitas->isEmpty() && $this->kamar_id) {
            $kamarFasilitas = KamarFasilitas::where('kamar_id', $this->kamar_id)
                ->where('status_request', 'menunggu_konfirmasi')
                ->with('fasilitas')
                ->get();
        }

        foreach ($kamarFasilitas as $kf) {
            if (! $kf->fasilitas) {
                continue;
            }

            $opsi = $kf->opsi_pembayaran ?? ($kf->fasilitas->kategori_biaya === 'sekali_bayar' ? 'permanen' : 'dari_kost');

            if ($opsi === 'permanen') {
                // Harga beli permanen hak milik langsung
                $biaya = (float) ($kf->harga_barang > 0 ? $kf->harga_barang : ($kf->fasilitas->harga_barang > 0 ? $kf->fasilitas->harga_barang : $kf->fasilitas->biaya_tambahan));
                $totalFasilitas += $biaya;
            } else {
                // Sewa bulanan dari kost
                if (! $kf->is_hak_milik) {
                    $biaya = (float) ($kf->biaya_bulanan > 0 ? $kf->biaya_bulanan : $kf->fasilitas->biaya_tambahan);
                    $totalFasilitas += $biaya;
                }
            }
        }

        return $hargaKamar + $totalFasilitas;
    }

    /**
     * Hitung total tagihan sewa bulan ke-2 dan seterusnya:
     * Harga Kamar + Fasilitas Sewa Dari Kost SAJA yang belum lunas menjadi Hak Milik
     */
    public function hitungBiayaBulanBerikutnya(): float
    {
        $hargaKamar = (float) ($this->kamar?->harga_bulanan ?? 0);

        $totalFasilitas = 0;
        $kamarFasilitas = $this->kamarFasilitas()->with('fasilitas')->get();
        if ($kamarFasilitas->isEmpty() && $this->kamar_id) {
            $kamarFasilitas = KamarFasilitas::where('kamar_id', $this->kamar_id)
                ->with('fasilitas')
                ->get();
        }

        foreach ($kamarFasilitas as $kf) {
            if (! $kf->fasilitas) {
                continue;
            }

            $opsi = $kf->opsi_pembayaran ?? ($kf->fasilitas->kategori_biaya === 'sekali_bayar' ? 'permanen' : 'dari_kost');

            // Permanen tidak ditagih lagi di bulan berikutnya
            if ($opsi === 'permanen') {
                continue;
            }

            // Dari kost: jika belum lunas menjadi hak milik, tetap ditagih
            $hargaBarang = (float) ($kf->harga_barang > 0 ? $kf->harga_barang : ($kf->fasilitas->harga_barang > 0 ? $kf->fasilitas->harga_barang : 0));
            $totalTerbayar = (float) ($kf->total_terbayar ?? 0);
            $sudahLunas = $kf->is_hak_milik || ($hargaBarang > 0 && $totalTerbayar >= $hargaBarang);

            if (! $sudahLunas) {
                $biaya = (float) ($kf->biaya_bulanan > 0 ? $kf->biaya_bulanan : $kf->fasilitas->biaya_tambahan);
                $totalFasilitas += $biaya;
            }
        }

        return $hargaKamar + $totalFasilitas;
    }

    /**
     * Rincian tagihan terstruktur untuk ditampilkan di UI (Bulan 1 vs Bulan 2+)
     */
    public function getRincianBiayaAttribute(): array
    {
        $hargaKamar = (float) ($this->kamar?->harga_bulanan ?? 0);
        $kamarFasilitas = $this->kamarFasilitas()->with('fasilitas')->get();
        if ($kamarFasilitas->isEmpty() && $this->kamar_id) {
            $kamarFasilitas = KamarFasilitas::where('kamar_id', $this->kamar_id)
                ->with('fasilitas')
                ->get();
        }

        $fasilitasPerBulan = [];
        $fasilitasSekaliBayar = [];

        foreach ($kamarFasilitas as $kf) {
            if (! $kf->fasilitas) {
                continue;
            }

            $opsi = $kf->opsi_pembayaran ?? ($kf->fasilitas->kategori_biaya === 'sekali_bayar' ? 'permanen' : 'dari_kost');
            $hargaBarang = (float) ($kf->harga_barang > 0 ? $kf->harga_barang : ($kf->fasilitas->harga_barang > 0 ? $kf->fasilitas->harga_barang : $kf->fasilitas->biaya_tambahan));
            $biayaBulanan = (float) ($kf->biaya_bulanan > 0 ? $kf->biaya_bulanan : $kf->fasilitas->biaya_tambahan);
            $totalTerbayar = (float) ($kf->total_terbayar ?? 0);
            $sudahLunas = (bool) ($kf->is_hak_milik || ($hargaBarang > 0 && $totalTerbayar >= $hargaBarang));

            if ($opsi === 'permanen') {
                $fasilitasSekaliBayar[] = [
                    'id' => $kf->fasilitas->id,
                    'nama' => $kf->fasilitas->nama_fasilitas,
                    'biaya' => $hargaBarang,
                    'opsi' => 'permanen',
                    'kategori_biaya' => 'sekali_bayar',
                    'is_hak_milik' => true,
                    'keterangan' => 'Beli Putus • Hak Milik Langsung',
                ];
            } else {
                $sisaBayar = max(0, $hargaBarang - $totalTerbayar);
                $fasilitasPerBulan[] = [
                    'id' => $kf->fasilitas->id,
                    'nama' => $kf->fasilitas->nama_fasilitas,
                    'biaya' => $sudahLunas ? 0 : $biayaBulanan,
                    'biaya_normal' => $biayaBulanan,
                    'opsi' => 'dari_kost',
                    'kategori_biaya' => 'per_bulan',
                    'harga_barang' => $hargaBarang,
                    'total_terbayar' => $totalTerbayar,
                    'sisa_bayar' => $sisaBayar,
                    'is_hak_milik' => $sudahLunas,
                    'keterangan' => $sudahLunas ? 'Sudah Lunas • Hak Milik Anda' : 'Sewa Kost (+Rp'.number_format($biayaBulanan, 0, ',', '.').'/bln)',
                ];
            }
        }

        $totalPerBulan = array_sum(array_column($fasilitasPerBulan, 'biaya'));
        $totalSekaliBayar = array_sum(array_column($fasilitasSekaliBayar, 'biaya'));

        return [
            'harga_kamar' => $hargaKamar,
            'fasilitas_per_bulan' => $fasilitasPerBulan,
            'fasilitas_sekali_bayar' => $fasilitasSekaliBayar,
            'subtotal_fasilitas_per_bulan' => $totalPerBulan,
            'subtotal_fasilitas_sekali_bayar' => $totalSekaliBayar,
            'total_bulan_pertama' => $hargaKamar + $totalPerBulan + $totalSekaliBayar,
            'total_bulan_berikutnya' => $hargaKamar + $totalPerBulan,
        ];
    }

    public function pembayaranPertama(): HasOne
    {
        return $this->hasOne(PembayaranBooking::class, 'booking_id')->where('periode_bulan_ke', 1);
    }

    public function statusHistories(): HasMany
    {
        return $this->hasMany(BookingStatusHistory::class, 'booking_id')->orderBy('created_at', 'asc');
    }

    /**
     * Record status change with reason and performer
     */
    public function logStatusChange(
        ?string $newStatus = null,
        ?string $alasan = null,
        ?int $userId = null,
        ?string $toStatus = null,
        ?int $changedBy = null
    ): BookingStatusHistory {
        $targetStatus = $toStatus ?? $newStatus ?? $this->status;
        $performerId = $changedBy ?? $userId ?? auth()->id();
        $oldStatus = $this->status;

        $this->update(['status' => $targetStatus]);

        return $this->statusHistories()->create([
            'user_id' => $performerId,
            'dari_status' => $oldStatus,
            'ke_status' => $targetStatus,
            'alasan' => $alasan,
            'created_at' => now(),
        ]);
    }
}
