<?php

namespace App\Http\Controllers;

use App\Http\Resources\CustomerResource;
use App\Http\Resources\OrderResource;
use App\Models\Order;
use App\Models\OrderStatusHistory;
use App\Models\Product;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;

class AdminDashboardController extends Controller
{
    /**
     * Single aggregate request powering the admin dashboard.
     */
    public function __invoke(Request $request): JsonResponse
    {
        $data = Cache::remember('admin.dashboard', 60, function () {
            $now = Carbon::now();

            $kpis = $this->kpis($now);
            $range = $now->copy()->subDays(29)->startOfDay();

            $revenueTrend = $this->revenueTrend($range, $now);

            $recentOrders = Order::query()
                ->with('user')
                ->withCount('items as items_count')
                ->orderByDesc('created_at')
                ->limit(6)
                ->get();

            $recentCustomers = User::query()
                ->where('role', 'customer')
                ->orderByDesc('created_at')
                ->limit(6)
                ->get(['id', 'name', 'email', 'created_at']);

            $topProducts = $this->topSellingProducts($range, $now, 5);

            $activity = OrderStatusHistory::query()
                ->with(['order.user', 'changedBy'])
                ->orderByDesc('created_at')
                ->limit(8)
                ->get();

            return $this->asPlainArray($kpis, $revenueTrend, $recentOrders, $recentCustomers, $topProducts, $range, $now, $activity);
        });

        return response()->json([
            'success' => true,
            'data' => $data,
        ]);
    }

    private function asPlainArray(
        array $kpis,
        array $revenueTrend,
        \Illuminate\Support\Collection $recentOrders,
        \Illuminate\Support\Collection $recentCustomers,
        array $topProducts,
        Carbon $range,
        Carbon $now,
        \Illuminate\Support\Collection $activity,
    ): array {
        return [
            'kpis' => $kpis,
            'revenueTrend' => $revenueTrend,
            'recentOrders' => OrderResource::collection($recentOrders)->resolve(request()),
            'recentCustomers' => CustomerResource::collection($recentCustomers)->resolve(request()),
            'topSellingProducts' => $topProducts,
            'statusBreakdown' => $this->statusBreakdown($range, $now),
            'activity' => $activity->map(fn (OrderStatusHistory $h) => [
                'id' => (string) $h->id,
                'orderNumber' => $h->order?->order_number,
                'orderId' => $h->order_id ? (string) $h->order_id : null,
                'fromStatus' => $h->from_status,
                'toStatus' => $h->to_status,
                'changedBy' => $h->changedBy?->name ?? 'System',
                'createdAt' => $h->created_at?->toISOString(),
            ])->values()->all(),
        ];
    }

    private function kpis(Carbon $now): array
    {
        $monthStart = $now->copy()->startOfMonth();
        $todayStart = $now->copy()->startOfDay();

        $orderAgg = Order::query()
            ->selectRaw("
                COUNT(*) AS total_orders,
                SUM(CASE WHEN status = 'delivered' THEN total ELSE 0 END) AS delivered_total,
                SUM(CASE WHEN status = 'delivered' AND paid_at >= ? THEN total ELSE 0 END) AS revenue_month,
                SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END) AS orders_today,
                SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END) AS orders_month,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending_orders,
                SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) AS delivered_count
            ", [$monthStart->format('Y-m-d H:i:s'), $todayStart->format('Y-m-d H:i:s'), $monthStart->format('Y-m-d H:i:s')])
            ->first();

        $customerAgg = User::query()
            ->where('role', 'customer')
            ->selectRaw('COUNT(*) AS total_customers, SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END) AS customers_month', [$monthStart->format('Y-m-d H:i:s')])
            ->first();

        $lowStockCount = Product::query()
            ->where('status', 'active')
            ->whereColumn('stock', '<=', 'low_stock_threshold')
            ->count();

        $deliveredCount = (int) ($orderAgg->delivered_count ?? 0);
        $deliveredTotal = (float) ($orderAgg->delivered_total ?? 0);

        return [
            'revenue' => [
                'total' => round($deliveredTotal, 2),
                'month' => round((float) ($orderAgg->revenue_month ?? 0), 2),
            ],
            'orders' => [
                'total' => (int) ($orderAgg->total_orders ?? 0),
                'today' => (int) ($orderAgg->orders_today ?? 0),
                'month' => (int) ($orderAgg->orders_month ?? 0),
                'pending' => (int) ($orderAgg->pending_orders ?? 0),
            ],
            'customers' => [
                'total' => (int) ($customerAgg->total_customers ?? 0),
                'month' => (int) ($customerAgg->customers_month ?? 0),
            ],
            'avgOrderValue' => $deliveredCount > 0 ? round($deliveredTotal / $deliveredCount, 2) : 0.0,
            'lowStock' => $lowStockCount,
            'asOf' => $now->toISOString(),
        ];
    }

    private function revenueTrend(Carbon $from, Carbon $now): array
    {
        $rows = Order::query()
            ->where('status', 'delivered')
            ->where('paid_at', '>=', $from)
            ->selectRaw('DATE(paid_at) AS day, SUM(total) AS revenue, COUNT(*) AS orders')
            ->groupBy('day')
            ->get()
            ->keyBy('day');

        $days = [];
        $cursor = $from->copy();

        while ($cursor <= $now) {
            $key = $cursor->format('Y-m-d');
            $row = $rows->get($key);

            $days[] = [
                'date' => $key,
                'revenue' => $row ? round((float) $row->revenue, 2) : 0.0,
                'orders' => $row ? (int) $row->orders : 0,
            ];
            $cursor->addDay();
        }

        return $days;
    }

    private function topSellingProducts(Carbon $from, Carbon $now, int $limit): array
    {
        return \App\Models\OrderItem::query()
            ->selectRaw('product_id, name, SUM(quantity) as qty, SUM(unit_price * quantity) as revenue')
            ->whereHas('order', fn ($q) => $q->where('status', '!=', 'cancelled')->where('created_at', '>=', $from))
            ->groupBy('product_id', 'name')
            ->orderByDesc('revenue')
            ->limit($limit)
            ->get()
            ->map(fn ($item) => [
                'productId' => $item->product_id ? (string) $item->product_id : null,
                'name' => $item->name,
                'unitsSold' => (int) $item->qty,
                'revenue' => round((float) $item->revenue, 2),
            ])
            ->values()
            ->all();
    }

    private function statusBreakdown(Carbon $from, Carbon $now): array
    {
        $counts = Order::query()
            ->where('created_at', '>=', $from)
            ->selectRaw('status, COUNT(*) as count')
            ->groupBy('status')
            ->pluck('count', 'status');

        return collect(['pending', 'processing', 'shipped', 'delivered', 'cancelled'])
            ->mapWithKeys(fn ($s) => [$s => (int) $counts->get($s, 0)])
            ->all();
    }
}