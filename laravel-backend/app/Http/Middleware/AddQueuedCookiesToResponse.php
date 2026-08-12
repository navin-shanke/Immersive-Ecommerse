<?php

namespace App\Http\Middleware;

use Illuminate\Cookie\Middleware\AddQueuedCookiesToResponse as Middleware;

class AddQueuedCookiesToResponse extends Middleware
{
    /**
     * The cookies that should not be queued.
     *
     * @var array<int, string>
     */
    protected $except = [
        //
    ];
}
