<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ChatRoom extends Model
{
    use HasFactory;

    protected $table = 'chat_room';

    public $timestamps = false;

    protected $fillable = [
        'firestore_chat_id',
        'penghuni_id',
        'pihak_kedua_id',
        'pesan_terakhir',
        'waktu_pesan_terakhir',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'waktu_pesan_terakhir' => 'datetime',
            'created_at' => 'datetime',
        ];
    }

    public function penghuni(): BelongsTo
    {
        return $this->belongsTo(Penghuni::class, 'penghuni_id');
    }

    public function pihakKedua(): BelongsTo
    {
        return $this->belongsTo(User::class, 'pihak_kedua_id');
    }
}
