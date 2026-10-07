<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Cabang extends Model
{
    use HasFactory;

    protected $table = 'cabang';

    protected $fillable = [
        'nama_cabang',
        'alamat',
        'latitude',
        'longitude',
        'jam_operasional_mulai',
        'jam_operasional_selesai',
        'jam_malam',
    ];

    public function gedung(): HasMany
    {
        return $this->hasMany(Gedung::class, 'cabang_id');
    }

    public function pegawai(): HasMany
    {
        return $this->hasMany(Pegawai::class, 'cabang_id');
    }
}
