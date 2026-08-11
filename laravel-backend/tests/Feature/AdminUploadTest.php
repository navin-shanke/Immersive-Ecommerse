<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class AdminUploadTest extends TestCase
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

    public function test_requires_authentication(): void
    {
        Storage::fake('public');

        $this->postJson('/api/admin/uploads', [
            'file' => UploadedFile::fake()->image('photo.png')->size(100),
        ])->assertStatus(401);
    }

    public function test_forbids_customers(): void
    {
        Storage::fake('public');

        $this->actingAs($this->customer(), 'sanctum')
            ->postJson('/api/admin/uploads', [
                'file' => UploadedFile::fake()->image('photo.png')->size(100),
            ])->assertStatus(403);
    }

    public function test_stores_uploaded_image_and_returns_absolute_url(): void
    {
        Storage::fake('public');

        $response = $this->actingAs($this->admin(), 'sanctum')
            ->postJson('/api/admin/uploads', [
                'file' => UploadedFile::fake()->image('photo.png')->size(100),
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonStructure(['data' => ['url']]);

        $url = $response->json('data.url');
        $this->assertStringStartsWith('http://localhost/storage/uploads/', $url);

        Storage::disk('public')->assertExists('uploads/'.basename($url));
    }

    public function test_accepts_supported_formats(): void
    {
        Storage::fake('public');

        $formats = [
            ['name' => 'photo.png', 'mime' => 'image/png'],
            ['name' => 'photo.jpg', 'mime' => 'image/jpeg'],
            ['name' => 'photo.webp', 'mime' => 'image/webp'],
            ['name' => 'photo.gif', 'mime' => 'image/gif'],
            ['name' => 'photo.avif', 'mime' => 'image/avif'],
            ['name' => 'photo.bmp', 'mime' => 'image/bmp'],
            ['name' => 'icon.svg', 'mime' => 'image/svg+xml'],
        ];

        foreach ($formats as $format) {
            $response = $this->actingAs($this->admin(), 'sanctum')
                ->postJson('/api/admin/uploads', [
                    'file' => UploadedFile::fake()->create($format['name'], 100, $format['mime']),
                ]);

            $response->assertStatus(201);
            Storage::disk('public')->assertExists('uploads/'.basename($response->json('data.url')));
        }
    }

    public function test_rejects_oversized_file(): void
    {
        Storage::fake('public');

        $this->actingAs($this->admin(), 'sanctum')
            ->postJson('/api/admin/uploads', [
                'file' => UploadedFile::fake()->image('big.png')->size(6000),
            ])->assertStatus(422);
    }

    public function test_rejects_non_image(): void
    {
        Storage::fake('public');

        $this->actingAs($this->admin(), 'sanctum')
            ->postJson('/api/admin/uploads', [
                'file' => UploadedFile::fake()->create('doc.txt', 100, 'text/plain'),
            ])->assertStatus(422);
    }
}
