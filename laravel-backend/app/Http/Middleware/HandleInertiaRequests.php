<?php

namespace App\Http\Middleware;

use Inertia\Middleware;
use Tighten\Ziggy\RouteNameCallbackType;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that is loaded on the first page visit.
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determine the current asset version.
     */
    public function version(Request $request): string|null
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'authUser' => fn () => $request->user()
                ? $request->user()->toArray()
                : null,
            'ziggy' => fn () => [
                ...(new \Tighten\Ziggy\Ziggy($request->route()->named(), $request->url()))->toArray(),
                'location' => $request->url(),
            ],
        ];
    }
}
