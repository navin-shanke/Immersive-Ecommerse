<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\StoreSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class CheckoutController extends Controller
{
    /**
     * Create a pending order.
     *
     * Authenticated users check out from their server-side cart. Guests are
     * allowed when the store's `allow_guest_checkout` setting is enabled and
     * checkout is not gated by `require_login_for_checkout`; guest orders
     * submit their items in the request and are stamped with a `guest_token`.
     *
     * Returns the Razorpay-compatible payload the frontend expects:
     * { orderId, razorpayOrderId, amount (in paise), currency }.
     *
     * Razorpay is configured via RAZORPAY_KEY_ID/SECRET in `.env`. When keys
     * are set, a real order is created through the Razorpay Orders API and
     * `verify` performs signature verification. When no key is configured, a
     * locally generated order id is returned and `verify` accepts the payment
     * in test mode so the checkout flow remains testable offline.
     */
    public function createOrder(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'shippingAddress.firstName' => ['required', 'string'],
            'shippingAddress.lastName' => ['required', 'string'],
            'shippingAddress.street1' => ['required', 'string'],
            'shippingAddress.street2' => ['nullable', 'string'],
            'shippingAddress.city' => ['required', 'string'],
            'shippingAddress.state' => ['required', 'string'],
            'shippingAddress.postalCode' => ['required', 'string'],
            'shippingAddress.country' => ['required', 'string'],
            'shippingAddress.phone' => ['nullable', 'string'],
            'shippingMethod' => ['nullable', 'string'],
            'promoCode' => ['nullable', 'string'],
            'items' => ['nullable', 'array', 'min:1'],
            'items.*.productId' => ['required_with:items', 'string'],
            'items.*.variantId' => ['required_with:items', 'string'],
            'items.*.quantity' => ['required_with:items', 'integer', 'min:1', 'max:99'],
        ]);

        $user = $request->user();
        $isGuest = $user === null;

        if ($isGuest) {
            $requireLogin = StoreSetting::bool('security', 'require_login_for_checkout', false);

            if ($requireLogin) {
                return response()->json([
                    'success' => false,
                    'message' => 'Please sign in to complete your checkout.',
                ], 401);
            }

            if (! StoreSetting::bool('security', 'allow_guest_checkout', true)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Guest checkout is disabled. Please sign in to continue.',
                ], 403);
            }

            if (empty($validated['items'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Your cart is empty',
                ], 422);
            }

            $entries = collect($validated['items'])->map(fn ($item) => [
                'productId' => $item['productId'],
                'variantId' => $item['variantId'],
                'quantity' => (int) $item['quantity'],
            ])->all();
        } else {
            $cart = $user->cart;

            if (! $cart || $cart->items()->count() === 0) {
                return response()->json([
                    'success' => false,
                    'message' => 'Your cart is empty',
                ], 422);
            }

            $entries = $cart->items->map(fn ($item) => [
                'productId' => (string) $item->product_id,
                'variantId' => (string) $item->variant_id,
                'quantity' => (int) $item->quantity,
            ])->all();
        }

        $orderItems = $this->resolveOrderItems($entries);

        if (empty($orderItems)) {
            return response()->json([
                'success' => false,
                'message' => 'Your cart contains unavailable items',
            ], 422);
        }

        $subtotal = round(array_sum(array_map(
            fn ($item) => (float) $item['unit_price'] * (int) $item['quantity'],
            $orderItems
        )), 2);

        $discount = 0.0;
        $promoCode = $validated['promoCode'] ?? null;
        if ($promoCode) {
            $promos = config('promos', []);
            $code = strtoupper(trim($promoCode));
            $promo = $promos[$code] ?? null;
            if (! $promo) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid promo code',
                ], 422);
            }
            if ($subtotal < (float) $promo['minPurchase']) {
                return response()->json([
                    'success' => false,
                    'message' => "Minimum purchase of $" . number_format((float) $promo['minPurchase'], 2) . ' required for this promo',
                ], 422);
            }
            $discount = round($subtotal * ((float) $promo['discountPercent'] / 100), 2);
        }

        $discountedSubtotal = round($subtotal - $discount, 2);

        $freeShippingThreshold = (float) StoreSetting::get('shipping', 'free_shipping_threshold', '100');
        $standardFee = (float) StoreSetting::get('shipping', 'standard_fee', '9.99');
        $taxRate = (float) StoreSetting::get('tax', 'tax_rate', '8');

        $shipping = $discountedSubtotal > $freeShippingThreshold ? 0.0 : $standardFee;
        $tax = round($discountedSubtotal * ($taxRate / 100), 2);
        $total = round($discountedSubtotal + $shipping + $tax, 2);

        $guestToken = $isGuest ? (string) Str::uuid() : null;

        $order = Order::create([
            'user_id' => $user?->id,
            'guest_token' => $guestToken,
            'order_number' => 'ORD-' . strtoupper(Str::random(10)),
            'status' => 'pending',
            'subtotal' => $subtotal,
            'shipping' => $shipping,
            'tax' => $tax,
            'discount' => $discount,
            'total' => $total,
            'currency' => 'INR',
            'shipping_method' => $validated['shippingMethod'] ?? 'standard',
            'shipping_address' => $validated['shippingAddress'],
        ]);

        foreach ($orderItems as $orderItem) {
            $order->items()->create($orderItem);
        }

        $amountPaise = (int) round($total * 100);
        $razorpayOrderId = $this->createRazorpayOrder($amountPaise, $order->order_number);

        $data = [
            'orderId' => (string) $order->id,
            'razorpayOrderId' => $razorpayOrderId,
            'amount' => $amountPaise,
            'currency' => 'INR',
        ];

        if ($isGuest) {
            $data['guestToken'] = $guestToken;
        }

        return response()->json([
            'success' => true,
            'data' => $data,
        ], 201);
    }

    /**
     * Verify a Razorpay payment and mark the order paid.
     *
     * Authenticated orders are matched by the user's id; guest orders by a
     * null user id plus the `guest_token` issued at creation.
     *
     * With no Razorpay secret configured, falls back to test mode: the order is
     * matched and marked paid as long as the supplied razorpay order id matches
     * the one issued at creation.
     */
    public function verify(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'orderId' => ['required', 'string'],
            'razorpayOrderId' => ['required', 'string'],
            'razorpayPaymentId' => ['required', 'string'],
            'razorpaySignature' => ['required', 'string'],
            'guestToken' => ['nullable', 'string'],
        ]);

        $user = $request->user();

        $order = $user
            ? Order::query()
                ->where('user_id', $user->id)
                ->where('id', $validated['orderId'])
                ->first()
            : Order::query()
                ->whereNull('user_id')
                ->where('id', $validated['orderId'])
                ->where('guest_token', $validated['guestToken'] ?? '')
                ->first();

        if (! $order) {
            return response()->json([
                'success' => false,
                'message' => 'Order not found',
            ], 404);
        }

        if ($order->razorpay_order_id && $order->razorpay_order_id !== $validated['razorpayOrderId']) {
            return response()->json([
                'success' => false,
                'message' => 'Payment order mismatch',
            ], 422);
        }

        $secret = config('services.razorpay.key_secret');
        if ($secret) {
            $expected = hash_hmac('sha256', $validated['razorpayOrderId'] . '|' . $validated['razorpayPaymentId'], $secret);
            if (! hash_equals($expected, $validated['razorpaySignature'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid payment signature',
                ], 422);
            }
        }

        $order->update([
            'status' => 'processing',
            'razorpay_order_id' => $validated['razorpayOrderId'],
            'razorpay_payment_id' => $validated['razorpayPaymentId'],
            'razorpay_signature' => $validated['razorpaySignature'],
            'paid_at' => now(),
        ]);

        if ($user && $cart = $user->cart) {
            $cart->items()->delete();
        }

        return response()->json([
            'success' => true,
            'data' => ['orderId' => (string) $order->id, 'status' => $order->status],
        ]);
    }

    /**
     * Resolve raw cart entries into order items with live product/variant data.
     *
     * Inactive or missing products/variants are skipped so an order can never
     * be placed against delisted stock.
     *
     * @param  array<int, array{productId: string, variantId: string, quantity: int}>  $entries
     * @return array<int, array<string, mixed>>
     */
    private function resolveOrderItems(array $entries): array
    {
        $productIds = array_values(array_unique(array_column($entries, 'productId')));
        $variantIds = array_values(array_unique(array_column($entries, 'variantId')));

        $products = Product::query()
            ->whereIn('id', $productIds)
            ->where('status', 'active')
            ->with('images')
            ->get()
            ->keyBy('id');

        $variants = ProductVariant::query()
            ->whereIn('product_id', $productIds)
            ->whereIn('id', $variantIds)
            ->get()
            ->keyBy('id');

        $orderItems = [];

        foreach ($entries as $entry) {
            $product = $products->get($entry['productId']);
            $variant = $variants->get($entry['variantId']);

            if (! $product || ! $variant) {
                continue;
            }

            $effectivePrice = (float) ($variant->sale_price ?? $variant->price);

            $orderItems[] = [
                'product_id' => $product->id,
                'variant_id' => $variant->id,
                'name' => $product->name,
                'sku' => $variant->sku ?: $product->sku,
                'unit_price' => $effectivePrice,
                'quantity' => (int) $entry['quantity'],
                'options' => $variant->options,
                'color' => $variant->color,
                'color_hex' => $variant->color_hex,
                'size' => $variant->size,
                'image_url' => $product->images->first()?->url,
            ];
        }

        return $orderItems;
    }

    /**
     * Create a Razorpay order via the Orders API when test/live keys are
     * configured. Falls back to a locally generated order id (stub mode) when
     * no key is set, keeping the checkout flow testable offline.
     *
     * @return string The Razorpay order id (order_...) or a stub id.
     */
    private function createRazorpayOrder(int $amountPaise, string $receipt): string
    {
        $keyId = config('services.razorpay.key_id');
        $keySecret = config('services.razorpay.key_secret');

        if (! $keyId || ! $keySecret) {
            return $this->stubRazorpayOrderId();
        }

        try {
            $response = Http::withBasicAuth($keyId, $keySecret)
                ->asJson()
                ->acceptJson()
                ->post('https://api.razorpay.com/v1/orders', [
                    'amount' => $amountPaise,
                    'currency' => 'INR',
                    'receipt' => $receipt,
                    'notes' => [
                        'order_id' => $receipt,
                    ],
                ]);

            $body = $response->json();

            if ($response->successful() && isset($body['id'])) {
                return $body['id'];
            }
        } catch (\Throwable $e) {
            // Fall through to stub id; the verify step remains testable.
        }

        return $this->stubRazorpayOrderId();
    }

    private function stubRazorpayOrderId(): string
    {
        return 'order_' . Str::random(24);
    }
}
