<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

class Pengaturan extends Model
{
    use HasFactory;

    protected $table = 'pengaturan';

    protected $fillable = [
        'key',
        'value',
        'tipe',
        'kategori',
        'deskripsi',
    ];

    /**
     * Get a setting value with fallback and automatic type casting
     */
    public static function get(string $key, mixed $default = null): mixed
    {
        $cacheKey = "pengaturan_{$key}";

        return Cache::remember($cacheKey, 3600, function () use ($key, $default) {
            $record = static::where('key', $key)->first();
            if (! $record || $record->value === null) {
                return $default;
            }

            return match ($record->tipe) {
                'integer', 'int' => (int) $record->value,
                'decimal', 'float' => (float) $record->value,
                'boolean', 'bool' => filter_var($record->value, FILTER_VALIDATE_BOOLEAN),
                'json', 'array' => json_decode($record->value, true) ?? $default,
                default => $record->value,
            };
        });
    }

    /**
     * Set a setting value and invalidate cache
     */
    public static function set(string $key, mixed $value, string $tipe = 'string', string $kategori = 'booking', ?string $deskripsi = null): self
    {
        $stringValue = is_array($value) ? json_encode($value) : (string) $value;

        $record = static::updateOrCreate(
            ['key' => $key],
            [
                'value' => $stringValue,
                'tipe' => $tipe,
                'kategori' => $kategori,
                'deskripsi' => $deskripsi,
            ]
        );

        Cache::forget("pengaturan_{$key}");

        return $record;
    }
}
