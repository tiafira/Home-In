<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Peringatan extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'peringatan';

    public $timestamps = true;

    protected $fillable = [
        'penghuni_id',
        'jenis',
        'kategori_pelanggaran',
        'tingkat_pelanggaran',
        'poin_pelanggaran',
        'tingkat_sp',
        'status',
        'keterangan',
        'tindakan',
        'tanggal_kejadian',
        'dibuat_oleh',
        'created_at',
        'updated_at',
    ];

    protected function casts(): array
    {
        return [
            'poin_pelanggaran' => 'integer',
            'tanggal_kejadian' => 'date',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
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
