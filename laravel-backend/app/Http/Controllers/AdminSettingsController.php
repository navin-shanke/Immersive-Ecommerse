<?php

namespace App\Http\Controllers;

use App\Models\StoreSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Validation\Rule;

class AdminSettingsController extends Controller
{
    private const GROUPS = ['store', 'shipping', 'tax', 'profile', 'security'];

    public function index(): JsonResponse
    {
        $settings = StoreSetting::allGrouped();

        return response()->json([
            'success' => true,
            'data' => ['settings' => $settings],
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'group' => ['required', Rule::in(self::GROUPS)],
            'settings' => ['required', 'array'],
            'settings.*' => ['nullable'],
        ]);

        $group = $validated['group'];

        foreach ($validated['settings'] as $key => $value) {
            StoreSetting::set($group, $key, $value);
        }

        Cache::forget('admin.dashboard');
        Cache::forget('admin.analytics.30');
        Cache::forget('admin.analytics.90');
        Cache::forget('admin.analytics.365');
        Cache::forget('admin.analytics.all');
        Cache::forget('store.public.settings');
        Cache::forget('store.maintenance');

        return response()->json([
            'success' => true,
            'message' => 'Settings updated successfully.',
            'data' => ['settings' => StoreSetting::allGrouped()],
        ]);
    }
}