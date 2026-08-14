<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ProfileTest extends TestCase
{
    use RefreshDatabase;

    private function customer(array $attrs = []): User
    {
        return User::factory()->create(array_merge(['role' => 'customer'], $attrs));
    }

    public function test_update_requires_authentication(): void
    {
        $this->putJson('/api/auth/me', ['name' => 'X', 'email' => 'x@example.com'])->assertStatus(401);
    }

    public function test_update_changes_profile_fields(): void
    {
        $user = $this->customer();

        $this->actingAs($user, 'sanctum')
            ->putJson('/api/auth/me', [
                'name' => 'New Name',
                'email' => 'new@example.com',
                'phone' => '+911234567890',
                'address' => '1 Main St',
            ])
            ->assertOk()
            ->assertJsonPath('data.user.name', 'New Name')
            ->assertJsonPath('data.user.email', 'new@example.com')
            ->assertJsonPath('data.user.phone', '+911234567890')
            ->assertJsonPath('data.user.address', '1 Main St');

        $this->assertDatabaseHas('users', ['id' => $user->id, 'name' => 'New Name']);
    }

    public function test_update_allows_unchanged_own_email(): void
    {
        $user = $this->customer(['email' => 'same@example.com']);

        $this->actingAs($user, 'sanctum')
            ->putJson('/api/auth/me', ['name' => 'X', 'email' => 'same@example.com'])
            ->assertOk()
            ->assertJsonPath('data.user.email', 'same@example.com');
    }

    public function test_update_rejects_email_taken_by_another_user(): void
    {
        $this->customer(['email' => 'taken@example.com']);
        $user = $this->customer();

        $this->actingAs($user, 'sanctum')
            ->putJson('/api/auth/me', ['name' => 'X', 'email' => 'taken@example.com'])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }

    public function test_update_validates_required_fields(): void
    {
        $user = $this->customer();

        $this->actingAs($user, 'sanctum')
            ->putJson('/api/auth/me', ['name' => '', 'email' => 'not-an-email'])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['name', 'email']);
    }

    public function test_avatar_requires_authentication(): void
    {
        Storage::fake('public');

        $this->postJson('/api/auth/avatar', [
            'file' => UploadedFile::fake()->image('photo.png')->size(100),
        ])->assertStatus(401);
    }

    public function test_avatar_uploads_image_and_sets_avatar_path(): void
    {
        Storage::fake('public');
        $user = $this->customer();

        $response = $this->actingAs($user, 'sanctum')
            ->postJson('/api/auth/avatar', [
                'file' => UploadedFile::fake()->image('photo.png')->size(100),
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonStructure(['data' => ['user' => ['avatar']]]);

        $url = $response->json('data.user.avatar');
        $this->assertStringStartsWith('http://localhost/storage/avatars/', $url);

        Storage::disk('public')->assertExists('avatars/'.basename($url));
    }

    public function test_avatar_replaces_previous_avatar(): void
    {
        Storage::fake('public');
        $user = $this->customer();
        Storage::disk('public')->put('avatars/old.png', 'old');
        $user->update(['avatar_path' => 'avatars/old.png']);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/auth/avatar', [
                'file' => UploadedFile::fake()->image('new.png')->size(100),
            ])->assertStatus(201);

        $this->assertFalse(Storage::disk('public')->exists('avatars/old.png'));
    }

    public function test_avatar_rejects_non_image(): void
    {
        Storage::fake('public');
        $user = $this->customer();

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/auth/avatar', [
                'file' => UploadedFile::fake()->create('doc.txt', 100, 'text/plain'),
            ])->assertStatus(422);
    }

    public function test_avatar_rejects_svg(): void
    {
        Storage::fake('public');
        $user = $this->customer();

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/auth/avatar', [
                'file' => UploadedFile::fake()->create('avatar.svg', 100, 'image/svg+xml'),
            ])->assertStatus(422);
    }
}
