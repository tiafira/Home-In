<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Peringatan extends Model
{
    use HasFactory;

    protected $table = 'peringatan';

    public $timestamps = false;

    protected $fillable = [
        'penghuni_id',
        'jenis',
        'kategori_pelanggaran',
        'keterangan',
        'tanggal_kejadian',
        'dibuat_oleh',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'tanggal_kejadian' => 'date',
            'created_at' => 'datetime',
        ];
    }

    public function penghuni(): BelongsTo
    {
        return $this->belongsTo(Penghuni::class, 'penghuni_id');
    }

    public function pembuat(): BelongsTo
    {
        return $this->belongsTo(User::class, 'dibuat_oleh');
    }

    public function diberikanOleh(): BelongsTo
    {
        return $this->belongsTo(User::class, 'dibuat_oleh');
    }
}
