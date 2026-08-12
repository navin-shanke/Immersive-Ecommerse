<?php

namespace App\Http\Middleware;

use Illuminate\Foundation\Http\Middleware\TransformsRequest as Middleware;

class TransformRequest extends Middleware
{
    /**
     * The attributes that should be transformed.
     *
     * @var array<int, string>
     */
    protected $except = [
        //
    ];
}
