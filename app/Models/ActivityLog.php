<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ActivityLog extends Model
{
    use HasFactory;

    protected $table = 'activity_log';

    public $timestamps = false;

    protected $fillable = [
        'user_id',
        'peran',
        'cabang_id',
        'aksi',
        'model_type',
        'model_id',
        'data_lama',
        'data_baru',
        'keterangan',
        'dibaca',
        'ip_address',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'data_lama' => 'array',
            'data_baru' => 'array',
            'dibaca' => 'boolean',
            'created_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function pelaku(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function cabang(): BelongsTo
    {
        return $this->belongsTo(Cabang::class, 'cabang_id');
    }

    /**
     * Easy helper to record any user or system activity
     */
    public static function catat(
        array|int|null $data = null,
        ?int $cabangId = null,
        ?string $peran = null,
        ?string $jenisAksi = null,
        ?string $objekTerkait = null,
        ?string $detail = null,
        ?int $userId = null
    ): self {
        if (is_array($data)) {
            $userId = $data['user_id'] ?? $userId;
            $cabangId = $data['cabang_id'] ?? $cabangId;
            $peran = $data['peran'] ?? $peran;
            $jenisAksi = $data['jenis_aksi'] ?? $data['aksi'] ?? $jenisAksi;
            $objekTerkait = $data['objek_terkait'] ?? $objekTerkait;
            $detail = $data['detail'] ?? $data['keterangan'] ?? $detail;
        }

        $user = auth()->user();
        $finalUserId = $userId ?? $user?->id;
        $finalPeran = $peran ?? ($user?->role ?? 'sistem');

        return static::create([
            'user_id' => $finalUserId,
            'peran' => $finalPeran,
            'cabang_id' => $cabangId,
            'aksi' => $jenisAksi ?? 'umum',
            'jenis_aksi' => $jenisAksi ?? 'umum',
            'objek_terkait' => $objekTerkait,
            'detail' => $detail,
            'keterangan' => $detail ?? '',
            'dibaca' => false,
            'ip_address' => request()?->ip(),
            'created_at' => now(),
        ]);
    }
}
