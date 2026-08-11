<?php

use App\Http\Controllers\AdminCategoryController;
use App\Http\Controllers\AdminCustomerController;
use App\Http\Controllers\AdminDashboardController;
use App\Http\Controllers\AdminOrderController;
use App\Http\Controllers\AdminProductController;
use App\Http\Controllers\AdminSettingsController;
use App\Http\Controllers\AdminUploadController;
use App\Http\Controllers\AdminAnalyticsController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\CartController;
use App\Http\Controllers\CheckoutController;
use App\Http\Controllers\CustomerOrderController;
use App\Http\Controllers\PublicProductController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return ['name' => 'Immersive Ecommerce API', 'version' => '1.0.0'];
});

// ─── Public auth ────────────────────────────────────────────────────────────
Route::post('/auth/register', [AuthController::class, 'register']);
Route::post('/auth/signup', [AuthController::class, 'register']);
Route::post('/auth/login', [AuthController::class, 'login']);
Route::post('/auth/refresh', [AuthController::class, 'refresh']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);

    // ─── Cart ───────────────────────────────────────────────────────────────
    Route::get('/cart', [CartController::class, 'index']);
    Route::post('/cart', [CartController::class, 'store']);
    Route::patch('/cart/{id}', [CartController::class, 'update']);
    Route::delete('/cart/{id}', [CartController::class, 'destroyItem']);
    Route::delete('/cart', [CartController::class, 'destroy']);

    // ─── Checkout ───────────────────────────────────────────────────────────
    Route::post('/checkout/create-order', [CheckoutController::class, 'createOrder']);
    Route::post('/checkout/verify', [CheckoutController::class, 'verify']);

    // Customer orders
    Route::get('/orders', [CustomerOrderController::class, 'index']);
    Route::get('/orders/{id}', [CustomerOrderController::class, 'show']);
});

// ─── Public catalogue ───────────────────────────────────────────────────────
Route::get('/products/search', [PublicProductController::class, 'search']);
Route::get('/products/categories', [PublicProductController::class, 'categories']);
Route::get('/products/{id}/related', [PublicProductController::class, 'related']);
Route::get('/products/{idOrSlug}', [PublicProductController::class, 'show']);
Route::get('/products', [PublicProductController::class, 'index']);

// ─── Admin ──────────────────────────────────────────────────────────────────
Route::middleware(['auth:sanctum', 'admin'])->prefix('/admin')->group(function () {
    Route::get('/products', [AdminProductController::class, 'index']);
    Route::post('/products', [AdminProductController::class, 'store']);
    Route::get('/products/{id}', [AdminProductController::class, 'show']);
    Route::put('/products/{id}', [AdminProductController::class, 'update']);
    Route::patch('/products/{id}', [AdminProductController::class, 'update']);
    Route::delete('/products/{id}', [AdminProductController::class, 'destroy']);

    Route::get('/categories', [AdminCategoryController::class, 'index']);
    Route::post('/categories', [AdminCategoryController::class, 'store']);
    Route::get('/categories/{id}', [AdminCategoryController::class, 'show']);
    Route::put('/categories/{id}', [AdminCategoryController::class, 'update']);
    Route::patch('/categories/{id}', [AdminCategoryController::class, 'update']);
    Route::delete('/categories/{id}', [AdminCategoryController::class, 'destroy']);

    Route::get('/dashboard', AdminDashboardController::class);
    Route::get('/analytics', AdminAnalyticsController::class);

    Route::get('/orders', [AdminOrderController::class, 'index']);
    Route::get('/orders/{id}', [AdminOrderController::class, 'show']);
    Route::patch('/orders/{id}/status', [AdminOrderController::class, 'updateStatus']);

    Route::get('/customers', [AdminCustomerController::class, 'index']);
    Route::get('/customers/{id}', [AdminCustomerController::class, 'show']);

    Route::get('/settings', [AdminSettingsController::class, 'index']);
    Route::put('/settings', [AdminSettingsController::class, 'update']);

    Route::post('/uploads', [AdminUploadController::class, 'store']);
});
