<?php

namespace App\Http\Controllers;

use App\Http\Resources\CategoryResource;
use App\Http\Resources\ProductResource;
use App\Models\Category;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PublicProductController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Product::query()->where('status', 'active');

        $category = $request->query('category');
        if ($category) {
            $cat = Category::where('slug', $category)
                ->orWhere('id', $category)
                ->first();
            if ($cat) {
                $query->where('category_id', $cat->id);
            }
        }

        if ($request->has('minPrice')) {
            $query->where('price', '>=', (float) $request->query('minPrice'));
        }
        if ($request->has('maxPrice')) {
            $query->where('price', '<=', (float) $request->query('maxPrice'));
        }

        if ($request->has('featured')) {
            $featured = filter_var($request->query('featured'), FILTER_VALIDATE_BOOLEAN);
            $query->where('featured', $featured);
        }

        if (filter_var($request->query('sale'), FILTER_VALIDATE_BOOLEAN)) {
            $query->whereHas('variants', fn ($v) => $v->whereNotNull('sale_price')->where('sale_price', '<>', 0));
        }

        $search = $request->query('search');
        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%")
                    ->orWhereJsonContains('tags', $search);
            });
        }

        $sort = $request->query('sort');
        switch ($sort) {
            case 'price_asc':
                $query->orderBy('price');
                break;
            case 'price_desc':
                $query->orderByDesc('price');
                break;
            case 'name':
                $query->orderBy('name');
                break;
            case 'popular':
                $query->orderByDesc('featured')->orderByDesc('created_at');
                break;
            case 'newest':
                $query->orderByDesc('created_at');
                break;
            default:
                $query->orderByDesc('created_at');
                break;
        }

        $page = max(1, (int) $request->query('page', 1));
        $limit = min(100, max(1, (int) $request->query('limit', 12)));

        $products = $query
            ->with(['category', 'images', 'variants'])
            ->paginate($limit, ['*'], 'page', $page);

        return response()->json([
            'success' => true,
            'data' => [
                'products' => ProductResource::collection($products->items()),
                'pagination' => [
                    'page' => $products->currentPage(),
                    'limit' => $products->perPage(),
                    'total' => $products->total(),
                    'pages' => $products->lastPage(),
                ],
            ],
        ]);
    }

    public function show(Request $request, string $idOrSlug): JsonResponse
    {
        $product = Product::with(['category', 'images', 'variants'])
            ->where('status', 'active')
            ->where(function ($q) use ($idOrSlug) {
                $q->where('id', $idOrSlug)->orWhere('slug', $idOrSlug);
            })
            ->first();

        if (! $product) {
            return response()->json([
                'success' => false,
                'message' => 'Product not found',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'product' => new ProductResource($product),
            ],
        ]);
    }

    public function related(Request $request, string $id): JsonResponse
    {
        $product = Product::find($id);

        if (! $product) {
            return response()->json([
                'success' => false,
                'message' => 'Product not found',
            ], 404);
        }

        $related = Product::with(['category', 'images', 'variants'])
            ->where('category_id', $product->category_id)
            ->where('id', '!=', $product->id)
            ->where('status', 'active')
            ->limit(4)
            ->get();

        return response()->json([
            'success' => true,
            'data' => [
                'products' => ProductResource::collection($related),
            ],
        ]);
    }

    public function categories(): JsonResponse
    {
        $categories = Category::where('is_active', true)
            ->orderBy('sort_order')
            ->withCount(['products' => fn ($q) => $q->where('status', 'active')])
            ->get();

        return response()->json([
            'success' => true,
            'data' => [
                'categories' => CategoryResource::collection($categories),
            ],
        ]);
    }

    public function search(Request $request): JsonResponse
    {
        $q = trim((string) $request->query('q', ''));

        if ($q === '') {
            return response()->json([
                'success' => true,
                'data' => [
                    'products' => [],
                    'suggestions' => [],
                ],
            ]);
        }

        $products = Product::with(['category', 'images', 'variants'])
            ->where('status', 'active')
            ->where(function ($query) use ($q) {
                $query->where('name', 'like', "%{$q}%")
                    ->orWhere('description', 'like', "%{$q}%")
                    ->orWhereJsonContains('tags', $q);
            })
            ->limit(20)
            ->get();

        $suggestions = DB::table('products')
            ->where('status', 'active')
            ->where('name', 'like', "%{$q}%")
            ->orderByDesc('created_at')
            ->limit(5)
            ->pluck('name')
            ->all();

        return response()->json([
            'success' => true,
            'data' => [
                'products' => ProductResource::collection($products),
                'suggestions' => $suggestions,
            ],
        ]);
    }
}
