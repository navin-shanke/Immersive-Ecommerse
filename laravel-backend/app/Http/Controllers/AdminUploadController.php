<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class AdminUploadController extends Controller
{
    private const ALLOWED_MIMES = [
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/gif',
        'image/avif',
        'image/bmp',
        'image/svg+xml',
    ];

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'file' => ['required', 'file', 'max:5120'],
        ]);

        $file = $validated['file'];
        $mime = $file->getMimeType();

        if (! in_array($mime, self::ALLOWED_MIMES, true)) {
            return response()->json([
                'success' => false,
                'message' => 'Unsupported file type. Allowed: JPG, PNG, WebP, GIF, AVIF, BMP, SVG.',
            ], 422);
        }

        $extension = $file->getClientOriginalExtension();
        if (! $extension) {
            $extension = Str::afterLast($mime, '/');
        }

        $filename = Str::random(24).'.'.strtolower($extension);
        $file->storeAs('uploads', $filename, 'public');

        return response()->json([
            'success' => true,
            'data' => [
                'url' => $request->getSchemeAndHttpHost().'/storage/uploads/'.$filename,
            ],
        ], 201);
    }
}
