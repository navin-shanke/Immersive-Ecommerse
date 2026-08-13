<?php

namespace Tests\Feature;

use App\Models\Cart;
use App\Models\Order;
use App\Models\Product;
use App\Models\StoreSetting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class CheckoutTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Cache::flush();
    }

    private function guestPayload(array $overrides = []): array
    {
        return array_merge([
            'shippingAddress' => [
                'firstName' => 'Jane',
                'lastName' => 'Doe',
                'street1' => '221B Baker Street',
                'city' => 'London',
                'state' => 'London',
                'postalCode' => 'NW1 6XE',
                'country' => 'UK',
                'phone' => '+44 7700 900123',
            ],
            'shippingMethod' => 'standard',
        ], $overrides);
    }

    public function test_guest_can_check_out_when_enabled(): void
    {
        StoreSetting::set('security', 'allow_guest_checkout', true);
        StoreSetting::set('security', 'require_login_for_checkout', false);

        $product = Product::factory()->create(['status' => 'active']);
        $variant = $product->variants()->first();

        $response = $this->postJson('/api/checkout/create-order', $this->guestPayload([
            'items' => [[
                'productId' => (string) $product->id,
                'variantId' => (string) $variant->id,
                'quantity' => 2,
            ]],
        ]));

        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonStructure(['data' => ['orderId', 'razorpayOrderId', 'amount', 'currency', 'guestToken']]);

        $orderId = $response->json('data.orderId');
        $guestToken = $response->json('data.guestToken');

        $this->assertDatabaseHas('orders', [
            'id' => $orderId,
            'user_id' => null,
            'guest_token' => $guestToken,
            'status' => 'pending',
        ]);

        $this->assertDatabaseHas('order_items', [
            'order_id' => $orderId,
            'product_id' => $product->id,
            'variant_id' => $variant->id,
            'quantity' => 2,
        ]);

        $this->postJson('/api/checkout/verify', [
            'orderId' => $orderId,
            'razorpayOrderId' => 'order_stub',
            'razorpayPaymentId' => 'pay_stub',
            'razorpaySignature' => 'sig_stub',
            'guestToken' => $guestToken,
        ])->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.status', 'processing');

        $this->assertDatabaseHas('orders', ['id' => $orderId, 'status' => 'processing']);
    }

    public function test_guest_checkout_rejected_when_disabled(): void
    {
        StoreSetting::set('security', 'allow_guest_checkout', false);

        $product = Product::factory()->create(['status' => 'active']);
        $variant = $product->variants()->first();

        $this->postJson('/api/checkout/create-order', $this->guestPayload([
            'items' => [[
                'productId' => (string) $product->id,
                'variantId' => (string) $variant->id,
                'quantity' => 1,
            ]],
        ]))
            ->assertStatus(403)
            ->assertJsonPath('success', false);
    }

    public function test_guest_checkout_requires_login_when_enabled(): void
    {
        StoreSetting::set('security', 'require_login_for_checkout', true);

        $product = Product::factory()->create(['status' => 'active']);
        $variant = $product->variants()->first();

        $this->postJson('/api/checkout/create-order', $this->guestPayload([
            'items' => [[
                'productId' => (string) $product->id,
                'variantId' => (string) $variant->id,
                'quantity' => 1,
            ]],
        ]))
            ->assertStatus(401)
            ->assertJsonPath('success', false);
    }

    public function test_guest_checkout_requires_items(): void
    {
        StoreSetting::set('security', 'allow_guest_checkout', true);

        $this->postJson('/api/checkout/create-order', $this->guestPayload())
            ->assertStatus(422);
    }

    public function test_authenticated_checkout_uses_server_cart(): void
    {
        $user = User::factory()->create(['role' => 'customer']);

        $product = Product::factory()->create(['status' => 'active']);
        $variant = $product->variants()->first();

        $cart = $user->cart()->create();
        $cart->items()->create([
            'product_id' => $product->id,
            'variant_id' => $variant->id,
            'quantity' => 3,
        ]);

        $response = $this->actingAs($user, 'sanctum')
            ->postJson('/api/checkout/create-order', $this->guestPayload());

        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.guestToken', null);

        $orderId = $response->json('data.orderId');

        $this->assertDatabaseHas('orders', ['id' => $orderId, 'user_id' => $user->id, 'guest_token' => null]);
        $this->assertDatabaseHas('order_items', [
            'order_id' => $orderId,
            'product_id' => $product->id,
            'variant_id' => $variant->id,
            'quantity' => 3,
        ]);

        $this->postJson('/api/checkout/verify', [
            'orderId' => $orderId,
            'razorpayOrderId' => 'order_stub',
            'razorpayPaymentId' => 'pay_stub',
            'razorpaySignature' => 'sig_stub',
        ])->assertOk()
            ->assertJsonPath('data.status', 'processing');

        $this->assertDatabaseHas('orders', ['id' => $orderId, 'status' => 'processing']);
        $this->assertDatabaseMissing('cart_items', ['cart_id' => $cart->id]);
    }

    public function test_authenticated_empty_cart_is_rejected(): void
    {
        $user = User::factory()->create(['role' => 'customer']);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/checkout/create-order', $this->guestPayload())
            ->assertStatus(422)
            ->assertJsonPath('message', 'Your cart is empty');
    }

    public function test_guest_verify_rejects_unknown_guest_token(): void
    {
        $this->postJson('/api/checkout/verify', [
            'orderId' => '999999',
            'razorpayOrderId' => 'order_stub',
            'razorpayPaymentId' => 'pay_stub',
            'razorpaySignature' => 'sig_stub',
            'guestToken' => 'does-not-exist',
        ])->assertStatus(404);
    }

    public function test_public_settings_expose_guest_checkout_flags(): void
    {
        StoreSetting::set('security', 'allow_guest_checkout', true);
        StoreSetting::set('security', 'require_login_for_checkout', false);

        $this->getJson('/api/settings/public')
            ->assertOk()
            ->assertJsonPath('data.security.allow_guest_checkout', true)
            ->assertJsonPath('data.security.require_login_for_checkout', false);
    }

    public function test_guest_order_never_matches_another_users_order(): void
    {
        StoreSetting::set('security', 'allow_guest_checkout', true);

        $product = Product::factory()->create(['status' => 'active']);
        $variant = $product->variants()->first();

        $guestOrder = $this->postJson('/api/checkout/create-order', $this->guestPayload([
            'items' => [[
                'productId' => (string) $product->id,
                'variantId' => (string) $variant->id,
                'quantity' => 1,
            ]],
        ]));

        $orderId = $guestOrder->json('data.orderId');
        $guestToken = $guestOrder->json('data.guestToken');

        $otherUser = User::factory()->create(['role' => 'customer']);

        $this->actingAs($otherUser, 'sanctum')
            ->postJson('/api/checkout/verify', [
                'orderId' => $orderId,
                'razorpayOrderId' => 'order_stub',
                'razorpayPaymentId' => 'pay_stub',
                'razorpaySignature' => 'sig_stub',
                'guestToken' => $guestToken,
            ])->assertStatus(404);
    }
}
