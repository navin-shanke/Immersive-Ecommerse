<?php

namespace App\Http\Controllers;

use App\Models\StoreSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;

class PublicSettingsController extends Controller
{
    public function index(): JsonResponse
    {
        // Cache the plain payload array, NOT a JsonResponse object. The
        // database cache store serializes values, and unserializing a
        // Response object on a later request yields __PHP_Incomplete_Class
        // and a 500 (the "announcement banner not showing" bug).
        $settings = Cache::remember('store.public.settings', now()->addMinutes(5), function () {
            return [
                'store' => [
                    'name' => StoreSetting::get('store', 'name'),
                    'tagline' => StoreSetting::get('store', 'tagline'),
                    'announcement' => StoreSetting::get('store', 'announcement'),
                    'support_email' => StoreSetting::get('store', 'support_email'),
                    'support_phone' => StoreSetting::get('store', 'support_phone'),
                    'address' => StoreSetting::get('store', 'address'),
                ],
                'security' => [
                    'maintenance_mode' => StoreSetting::bool('security', 'maintenance_mode'),
                    'allow_guest_checkout' => StoreSetting::bool('security', 'allow_guest_checkout', true),
                    'require_login_for_checkout' => StoreSetting::bool('security', 'require_login_for_checkout', false),
                ],
            ];
        });

        return response()->json(['data' => $settings]);
    }

    public function maintenance(): JsonResponse
    {
        $flag = Cache::remember('store.maintenance', now()->addMinutes(5), fn () =>
            StoreSetting::bool('security', 'maintenance_mode'));

        return response()->json(['data' => ['maintenance_mode' => $flag]]);
    }
}
