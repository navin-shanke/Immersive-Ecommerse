<?php

namespace Tests\Feature;

use App\Models\StoreSetting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class MaintenanceGateTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Cache::flush();
    }

    private function admin(): User
    {
        return User::factory()->create(['role' => 'admin']);
    }

    public function test_storefront_blocked_when_maintenance_on(): void
    {
        StoreSetting::set('security', 'maintenance_mode', true);

        $this->getJson('/api/products')->assertStatus(503);
    }

    public function test_storefront_allowed_when_maintenance_off(): void
    {
        StoreSetting::set('security', 'maintenance_mode', false);

        $this->getJson('/api/products')->assertOk();
    }

    public function test_settings_endpoints_always_available(): void
    {
        StoreSetting::set('security', 'maintenance_mode', true);

        $this->getJson('/api/settings/public/maintenance')->assertOk();
        $this->getJson('/api/settings/public')->assertOk();
    }

    public function test_admin_routes_not_blocked(): void
    {
        StoreSetting::set('security', 'maintenance_mode', true);

        $this->actingAs($this->admin(), 'sanctum')
            ->getJson('/api/admin/products')
            ->assertOk();
    }

    public function test_auth_routes_not_blocked(): void
    {
        StoreSetting::set('security', 'maintenance_mode', true);

        $this->postJson('/api/auth/login', [
            'email' => 'nobody@example.com',
            'password' => 'wrong-password',
        ])->assertStatus(422);
    }
}
