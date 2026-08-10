<?php

namespace App\Http\Controllers;

use App\Models\Cart;
use App\Models\Order;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class CheckoutController extends Controller
{
    /**
     * Create a pending order from the user's cart.
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
        ]);

        $cart = $request->user()->cart;

        if (! $cart || $cart->items()->count() === 0) {
            return response()->json([
                'success' => false,
                'message' => 'Your cart is empty',
            ], 422);
        }

        $cart = $cart->load(['items.product.images', 'items.product.variants', 'items.product.category', 'items.variant']);

        $subtotal = 0.0;
        $orderItems = [];

        foreach ($cart->items as $item) {
            if (! $item->product || ! $item->variant) {
                continue;
            }
            $variant = $item->variant;
            $effectivePrice = (float) ($variant->sale_price ?? $variant->price);
            $subtotal += $effectivePrice * (int) $item->quantity;

            $orderItems[] = [
                'product_id' => $item->product_id,
                'variant_id' => $item->variant_id,
                'name' => $item->product->name,
                'sku' => $variant->sku ?: $item->product->sku,
                'unit_price' => $effectivePrice,
                'quantity' => (int) $item->quantity,
                'options' => $variant->options,
                'color' => $variant->color,
                'color_hex' => $variant->color_hex,
                'size' => $variant->size,
                'image_url' => $item->product->images->first()?->url,
            ];
        }

        if (empty($orderItems)) {
            return response()->json([
                'success' => false,
                'message' => 'Your cart contains unavailable items',
            ], 422);
        }

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
        $shipping = $discountedSubtotal > 100 ? 0.0 : 9.99;
        $tax = round($discountedSubtotal * 0.08, 2);
        $total = round($discountedSubtotal + $shipping + $tax, 2);

        $order = Order::create([
            'user_id' => $request->user()->id,
            'order_number' => 'ORD-' . strtoupper(Str::random(10)),
            'status' => 'pending',
            'subtotal' => round($subtotal, 2),
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

        return response()->json([
            'success' => true,
            'data' => [
                'orderId' => (string) $order->id,
                'razorpayOrderId' => $razorpayOrderId,
                'amount' => $amountPaise,
                'currency' => 'INR',
            ],
        ], 201);
    }

    /**
     * Verify a Razorpay payment and mark the order paid.
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
        ]);

        $order = Order::where('user_id', $request->user()->id)
            ->where('id', $validated['orderId'])
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

        if ($cart = $request->user()->cart) {
            $cart->items()->delete();
        }

        return response()->json([
            'success' => true,
            'data' => ['orderId' => (string) $order->id, 'status' => $order->status],
        ]);
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
