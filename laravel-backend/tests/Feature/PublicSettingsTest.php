<?php

namespace Tests\Feature;

use App\Models\StoreSetting;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class PublicSettingsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Cache::flush();
    }

    public function test_returns_public_store_settings(): void
    {
        StoreSetting::set('store', 'name', 'Immersive');
        StoreSetting::set('store', 'announcement', 'Big sale!');
        StoreSetting::set('security', 'maintenance_mode', false);

        $this->getJson('/api/settings/public')
            ->assertOk()
            ->assertJsonPath('data.store.name', 'Immersive')
            ->assertJsonPath('data.store.announcement', 'Big sale!')
            ->assertJsonPath('data.store.support_email', null)
            ->assertJsonPath('data.security.maintenance_mode', false);
    }

    public function test_caches_public_settings_until_invalidated(): void
    {
        StoreSetting::set('security', 'maintenance_mode', false);
        $this->getJson('/api/settings/public')->assertOk();
        $this->assertTrue(Cache::has('store.public.settings'));

        StoreSetting::set('security', 'maintenance_mode', true);
        $this->getJson('/api/settings/public')
            ->assertOk()
            ->assertJsonPath('data.security.maintenance_mode', false);

        Cache::forget('store.public.settings');
        $this->getJson('/api/settings/public')
            ->assertOk()
            ->assertJsonPath('data.security.maintenance_mode', true);
    }

    public function test_returns_maintenance_flag(): void
    {
        $this->getJson('/api/settings/public/maintenance')
            ->assertOk()
            ->assertJsonPath('data.maintenance_mode', false);
    }

    public function test_maintenance_flag_reflects_setting(): void
    {
        StoreSetting::set('security', 'maintenance_mode', true);

        $this->getJson('/api/settings/public/maintenance')
            ->assertOk()
            ->assertJsonPath('data.maintenance_mode', true);
    }
}
