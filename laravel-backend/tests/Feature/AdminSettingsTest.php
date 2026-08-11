<?php

namespace Tests\Feature;

use App\Models\StoreSetting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminSettingsTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        return User::factory()->create(['role' => 'admin']);
    }

    private function customer(): User
    {
        return User::factory()->create(['role' => 'customer']);
    }

    public function test_index_forbids_customers(): void
    {
        $this->actingAs($this->customer(), 'sanctum')
            ->getJson('/api/admin/settings')
            ->assertStatus(403);
    }

    public function test_index_returns_grouped_settings(): void
    {
        StoreSetting::factory()->create(['group' => 'store', 'key' => 'name', 'value' => 'Immersive']);
        StoreSetting::factory()->create(['group' => 'shipping', 'key' => 'standard_fee', 'value' => '9.99']);

        $this->actingAs($this->admin(), 'sanctum')
            ->getJson('/api/admin/settings')
            ->assertOk()
            ->assertJsonPath('data.settings.store.name', 'Immersive')
            ->assertJsonPath('data.settings.shipping.standard_fee', 9.99);
    }

    public function test_update_upserts_and_forgets_cache(): void
    {
        \Illuminate\Support\Facades\Cache::put('admin.dashboard', ['dummy'], 60);
        \Illuminate\Support\Facades\Cache::put('store.public.settings', ['dummy'], 60);
        \Illuminate\Support\Facades\Cache::put('store.maintenance', ['dummy'], 60);

        $this->actingAs($this->admin(), 'sanctum')
            ->putJson('/api/admin/settings', [
                'group' => 'shipping',
                'settings' => ['standard_fee' => '12.99'],
            ])
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.settings.shipping.standard_fee', 12.99);

        $this->assertDatabaseHas('settings', [
            'group' => 'shipping',
            'key' => 'standard_fee',
            'value' => '12.99',
        ]);
        $this->assertFalse(\Illuminate\Support\Facades\Cache::has('admin.dashboard'));
        $this->assertFalse(\Illuminate\Support\Facades\Cache::has('store.public.settings'));
        $this->assertFalse(\Illuminate\Support\Facades\Cache::has('store.maintenance'));
    }

    public function test_update_validates_group(): void
    {
        $this->actingAs($this->admin(), 'sanctum')
            ->putJson('/api/admin/settings', [
                'group' => 'nope',
                'settings' => ['a' => 'b'],
            ])
            ->assertStatus(422);
    }
}