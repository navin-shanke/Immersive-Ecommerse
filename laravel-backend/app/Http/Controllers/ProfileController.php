<?php

namespace App\Http\Controllers;

use App\Http\Resources\UserResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class ProfileController extends Controller
{
    private const ALLOWED_MIMES = [
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/gif',
        'image/avif',
        'image/bmp',
    ];

    public function update(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'phone' => ['nullable', 'string', 'max:20'],
            'address' => ['nullable', 'string', 'max:1000'],
        ]);

        $user->update($validated);

        return response()->json([
            'success' => true,
            'data' => ['user' => new UserResource($user->fresh())],
        ]);
    }

    public function uploadAvatar(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'file' => ['required', 'file', 'max:5120'],
        ]);

        $file = $validated['file'];
        $mime = $file->getMimeType();

        if (! in_array($mime, self::ALLOWED_MIMES, true)) {
            return response()->json([
                'success' => false,
                'message' => 'Unsupported file type. Allowed: JPG, PNG, WebP, GIF, AVIF, BMP.',
            ], 422);
        }

        $extension = strtolower(Str::afterLast($mime, '/'));
        if (! $extension) {
            $extension = strtolower($file->getClientOriginalExtension());
        }

        $filename = Str::random(24).'.'.$extension;
        $stored = $file->storeAs('avatars', $filename, 'public');

        if ($stored === false || ! Storage::disk('public')->exists('avatars/'.$filename)) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to store the uploaded file. Please check server storage permissions and try again.',
            ], 500);
        }

        if ($user->avatar_path && Storage::disk('public')->exists($user->avatar_path)) {
            Storage::disk('public')->delete($user->avatar_path);
        }

        $user->update(['avatar_path' => 'avatars/'.$filename]);

        return response()->json([
            'success' => true,
            'data' => ['user' => new UserResource($user->fresh())],
        ], 201);
    }
}
