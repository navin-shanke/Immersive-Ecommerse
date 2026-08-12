<?php

namespace App\Http\Middleware;

use Illuminate\Cookie\Middleware\QuantifyCookies as Middleware;

class QuantifyCookies extends Middleware
{
    /**
     * The names of the cookies that should not be quantified.
     *
     * @var array<int, string>
     */
    protected $except = [
        //
    ];
}
