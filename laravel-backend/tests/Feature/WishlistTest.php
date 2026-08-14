<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\User;
use App\Models\Wishlist;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WishlistTest extends TestCase
{
    use RefreshDatabase;

    private function customer(): User
    {
        return User::factory()->create(['role' => 'customer']);
    }

    public function test_index_requires_authentication(): void
    {
        $this->getJson('/api/wishlist')->assertStatus(401);
    }

    public function test_index_returns_only_wishlisted_products(): void
    {
        $user = $this->customer();
        $wishlisted = Product::factory()->create(['status' => 'active']);
        $other = Product::factory()->create(['status' => 'active']);
        $user->wishlistedProducts()->syncWithoutDetaching([$wishlisted->id]);

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/wishlist')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonCount(1, 'data.items')
            ->assertJsonPath('data.items.0._id', (string) $wishlisted->id);

        $this->assertNotSame((string) $other->id, (string) $wishlisted->id);
    }

    public function test_merge_orders_newest_first(): void
    {
        $user = $this->customer();
        $a = Product::factory()->create(['status' => 'active']);
        $b = Product::factory()->create(['status' => 'active']);
        $user->wishlistedProducts()->attach($a->id, ['created_at' => now()->subHour()]);
        $user->wishlistedProducts()->attach($b->id, ['created_at' => now()]);

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/wishlist')
            ->assertOk()
            ->assertJsonPath('data.items.0._id', (string) $b->id);
    }

    public function test_store_adds_product_and_is_idempotent(): void
    {
        $user = $this->customer();
        $product = Product::factory()->create(['status' => 'active']);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/wishlist', ['product_id' => (string) $product->id])
            ->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.item._id', (string) $product->id);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/wishlist', ['product_id' => (string) $product->id])
            ->assertStatus(201);

        $this->assertSame(1, Wishlist::where('user_id', $user->id)->where('product_id', $product->id)->count());
    }

    public function test_store_rejects_missing_or_invalid_product(): void
    {
        $user = $this->customer();

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/wishlist', ['product_id' => 999999])
            ->assertStatus(422);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/wishlist', [])
            ->assertStatus(422);
    }

    public function test_destroy_removes_product_from_wishlist(): void
    {
        $user = $this->customer();
        $product = Product::factory()->create(['status' => 'active']);
        $user->wishlistedProducts()->syncWithoutDetaching([$product->id]);

        $this->actingAs($user, 'sanctum')
            ->deleteJson('/api/wishlist/'.$product->id)
            ->assertOk()
            ->assertJsonPath('success', true);

        $this->assertDatabaseMissing('wishlists', ['user_id' => $user->id, 'product_id' => $product->id]);
    }

    public function test_destroy_returns_404_when_not_wishlisted(): void
    {
        $user = $this->customer();
        $product = Product::factory()->create(['status' => 'active']);

        $this->actingAs($user, 'sanctum')
            ->deleteJson('/api/wishlist/'.$product->id)
            ->assertStatus(404);
    }

    public function test_merge_adds_guest_ids_and_returns_full_list(): void
    {
        $user = $this->customer();
        $a = Product::factory()->create(['status' => 'active']);
        $b = Product::factory()->create(['status' => 'active']);
        $user->wishlistedProducts()->syncWithoutDetaching([$a->id]);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/wishlist/merge', ['product_ids' => [(string) $a->id, (string) $b->id]])
            ->assertOk()
            ->assertJsonCount(2, 'data.items');

        $this->assertSame(2, Wishlist::where('user_id', $user->id)->count());
    }

    public function test_merge_rejects_unknown_product(): void
    {
        $user = $this->customer();

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/wishlist/merge', ['product_ids' => [999999]])
            ->assertStatus(422);
    }
}