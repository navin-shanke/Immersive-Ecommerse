<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class StoreSetting extends Model
{
    /** @use HasFactory<\Database\Factories\StoreSettingFactory> */
    use HasFactory;

    protected $table = 'settings';

    protected $fillable = [
        'group',
        'key',
        'value',
    ];

    /**
     * Get a settings value as a string (or parsed JSON when stored as such).
     */
    public static function get(string $group, string $key, ?string $default = null): mixed
    {
        $row = static::query()->where('group', $group)->where('key', $key)->first();

        if (! $row || $row->value === null) {
            return $default;
        }

        $json = json_decode($row->value, true);

        if (json_last_error() === JSON_ERROR_NONE) {
            return $json;
        }

        return $row->value;
    }

    /**
     * Upsert a single setting.
     */
    public static function set(string $group, string $key, mixed $value): void
    {
        $encoded = is_scalar($value) || $value === null
            ? (string) $value
            : json_encode($value);

        static::query()->updateOrCreate(
            ['group' => $group, 'key' => $key],
            ['value' => $encoded]
        );
    }

    /**
     * Read a setting as a boolean.
     */
    public static function bool(string $group, string $key, bool $default = false): bool
    {
        $value = static::get($group, $key);

        if ($value === null) {
            return $default;
        }

        return filter_var((string) $value, FILTER_VALIDATE_BOOLEAN);
    }

    /**
     * Fetch all settings as { "group": { "key": value, ... } }.
     */
    public static function allGrouped(): array
    {
        $result = [];

        foreach (static::query()->orderBy('group')->get() as $setting) {
            $decoded = json_decode($setting->value, true);
            $result[$setting->group][$setting->key] = json_last_error() === JSON_ERROR_NONE
                ? $decoded
                : $setting->value;
        }

        return $result;
    }
}