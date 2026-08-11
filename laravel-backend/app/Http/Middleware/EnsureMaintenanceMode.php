<?php

namespace App\Http\Middleware;

use App\Models\StoreSetting;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Symfony\Component\HttpFoundation\Response;

class EnsureMaintenanceMode
{
    /**
     * Block storefront requests while maintenance mode is enabled.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $maintenance = Cache::remember('store.maintenance', now()->addMinutes(5), fn () =>
            StoreSetting::bool('security', 'maintenance_mode'));

        if ($maintenance) {
            return response()->json([
                'success' => false,
                'message' => 'Store is under maintenance.',
            ], 503);
        }

        return $next($request);
    }
}
