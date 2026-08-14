<?php

namespace App\Http\Controllers;

use App\Http\Resources\ProductResource;
use App\Models\Product;
use App\Models\Wishlist;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WishlistController extends Controller
{
    private function list(Request $request)
    {
        return $request->user()
            ->wishlistedProducts()
            ->with(['category', 'images', 'variants'])
            ->orderByDesc('wishlists.created_at')
            ->get();
    }

    public function index(Request $request): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => ['items' => ProductResource::collection($this->list($request))],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'product_id' => ['required', 'integer', 'exists:products,id'],
        ]);

        $request->user()->wishlistedProducts()->syncWithoutDetaching([$validated['product_id']]);

        $product = Product::with(['category', 'images', 'variants'])->findOrFail($validated['product_id']);

        return response()->json([
            'success' => true,
            'data' => ['item' => new ProductResource($product)],
        ], 201);
    }

    public function destroy(Request $request, string $productId): JsonResponse
    {
        $deleted = Wishlist::where('user_id', $request->user()->id)
            ->where('product_id', $productId)
            ->delete();

        if ($deleted === 0) {
            return response()->json([
                'success' => false,
                'message' => 'Product not in wishlist.',
            ], 404);
        }

        return response()->json(['success' => true]);
    }

    public function merge(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'product_ids' => ['required', 'array'],
            'product_ids.*' => ['integer', 'exists:products,id'],
        ]);

        $request->user()->wishlistedProducts()->syncWithoutDetaching($validated['product_ids']);

        return response()->json([
            'success' => true,
            'data' => ['items' => ProductResource::collection($this->list($request))],
        ]);
    }
}