<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class ReservasiFasilitas extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'reservasi_fasilitas';

    protected $fillable = [
        'fasilitas_id',
        'penghuni_id',
        'user_id',
        'tanggal',
        'jam_mulai',
        'jam_selesai',
        'jumlah_orang',
        'keperluan',
        'status',
        'catatan_admin',
        'disetujui_oleh',
    ];

    protected function casts(): array
    {
        return [
            'tanggal' => 'date',
            'jumlah_orang' => 'integer',
        ];
    }

    public function fasilitas(): BelongsTo
    {
        return $this->belongsTo(Fasilitas::class, 'fasilitas_id');
    }

    public function penghuni(): BelongsTo
    {
        return $this->belongsTo(Penghuni::class, 'penghuni_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function disetujuiOleh(): BelongsTo
    {
        return $this->belongsTo(User::class, 'disetujui_oleh');
    }
}
