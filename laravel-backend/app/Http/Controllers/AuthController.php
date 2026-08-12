<?php

namespace App\Http\Controllers;

use App\Http\Requests\LoginRequest;
use App\Http\Requests\RegisterRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Laravel\Sanctum\PersonalAccessToken;

class AuthController extends Controller
{
    private function tokenPair(User $user): array
    {
        $user->tokens()->where('name', 'refresh')->delete();

        $access = $user->createToken('access', ['access'])->plainTextToken;
        $refresh = $user->createToken('refresh', ['refresh'])->plainTextToken;

        return ['accessToken' => $access, 'refreshToken' => $refresh];
    }

    public function register(RegisterRequest $request): JsonResponse
    {
        // Manual uniqueness check to avoid Laravel bug with Schema::hasTable()
        if (User::where('email', $request->email)->exists()) {
            throw ValidationException::withMessages([
                'email' => ['The email has already been taken.'],
            ]);
        }

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => $request->password,
            'role' => 'customer',
        ]);

        $tokens = $this->tokenPair($user);

        return response()->json([
            'accessToken' => $tokens['accessToken'],
            'refreshToken' => $tokens['refreshToken'],
            'user' => new UserResource($user),
        ], 201);
    }

    public function login(LoginRequest $request): JsonResponse
    {
        $user = User::where('email', $request->email)->first();

        if (! $user || ! Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        $tokens = $this->tokenPair($user);

        return response()->json([
            'accessToken' => $tokens['accessToken'],
            'refreshToken' => $tokens['refreshToken'],
            'user' => new UserResource($user),
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json([
            'user' => new UserResource($request->user()),
        ]);
    }

    public function refresh(Request $request): JsonResponse
    {
        $request->validate([
            'refreshToken' => ['required', 'string'],
        ]);

        $token = PersonalAccessToken::findToken($request->refreshToken);

        if (! $token || ! $token->can('refresh')) {
            return response()->json([
                'message' => 'Invalid or expired refresh token.',
            ], 401);
        }

        $user = $token->tokenable;

        $token->delete();

        $tokens = $this->tokenPair($user);

        return response()->json([
            'accessToken' => $tokens['accessToken'],
            'refreshToken' => $tokens['refreshToken'],
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()?->delete();

        return response()->json([
            'success' => true,
            'message' => 'Logged out successfully.',
        ]);
    }
}
