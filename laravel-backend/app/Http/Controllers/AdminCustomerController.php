<?php

namespace App\Http\Controllers;

use App\Http\Resources\CustomerResource;
use App\Http\Resources\OrderResource;
use App\Models\Order;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminCustomerController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = User::query()
            ->where('role', 'customer')
            ->withCount('orders as orders_count')
            ->withSum(['orders as total_spent' => fn ($q) => $q->where('status', 'delivered')], 'total');

        if ($request->has('search')) {
            $search = $request->query('search');
            $query->where(fn ($q) => $q->where('name', 'like', "%{$search}%")
                ->orWhere('email', 'like', "%{$search}%"));
        }

        $page = max(1, (int) $request->query('page', 1));
        $limit = min(100, max(1, (int) $request->query('limit', 10)));

        $customers = $query
            ->orderByDesc('created_at')
            ->paginate($limit, ['*'], 'page', $page);

        $lastOrderDates = \Illuminate\Support\Facades\DB::table('orders')
            ->select('user_id')
            ->selectRaw('MAX(created_at) as last_order_at')
            ->whereIn('user_id', $customers->getCollection()->pluck('id'))
            ->groupBy('user_id')
            ->pluck('last_order_at', 'user_id');

        $customers->getCollection()->each(function (User $user) use ($lastOrderDates) {
            $user->last_order_at = $lastOrderDates->get($user->id);
        });

        return response()->json([
            'success' => true,
            'data' => [
                'items' => CustomerResource::collection($customers->items()),
                'meta' => [
                    'current_page' => $customers->currentPage(),
                    'per_page' => $customers->perPage(),
                    'last_page' => $customers->lastPage(),
                    'total' => $customers->total(),
                ],
            ],
        ]);
    }

    public function show(string $id): JsonResponse
    {
        $customer = User::withCount('orders as orders_count')
            ->where('role', 'customer')
            ->find($id);

        if (! $customer) {
            return response()->json([
                'success' => false,
                'message' => 'Customer not found',
            ], 404);
        }

        $totalSpent = (float) Order::where('user_id', $customer->id)->where('status', 'delivered')->sum('total');
        $customer->total_spent = $totalSpent;
        $customer->last_order_at = $customer->orders()->max('created_at');

        $orders = Order::query()
            ->with(['user', 'items'])
            ->where('user_id', $customer->id)
            ->orderByDesc('created_at')
            ->limit(15)
            ->get();

        $kpis = [
            'totalSpent' => round($totalSpent, 2),
            'orderCount' => $customer->orders_count,
            'avgOrderValue' => $customer->orders_count > 0 ? round($totalSpent / $customer->orders_count, 2) : 0.0,
            'joinedAt' => $customer->created_at?->toISOString(),
            'lastOrderAt' => $customer->last_order_at ? \Illuminate\Support\Carbon::parse($customer->last_order_at)->toISOString() : null,
        ];

        return response()->json([
            'success' => true,
            'data' => [
                'customer' => new CustomerResource($customer),
                'kpis' => $kpis,
                'orders' => OrderResource::collection($orders),
            ],
        ]);
    }
}