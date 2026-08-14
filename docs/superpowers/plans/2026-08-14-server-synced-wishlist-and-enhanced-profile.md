# Server-Synced Wishlist & Enhanced Profile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist the wishlist server-side per account (with guest merge on login) and enhance the `/account` page into Profile | Wishlist | Orders tabs with editable name/email/phone/address and avatar upload.

**Architecture:** Hybrid wishlist store in zustand (guests use `localStorage`, authenticated users use a new `wishlists` Laravel table/API; the store API `toggleWishlist`/`isInWishlist`/`clearWishlist` is preserved so existing product cards are untouched). A `ProfileController` exposes `PUT /auth/me` and `POST /auth/avatar` reusing the existing public-disk upload pattern. The account page becomes a 3-tab client component.

**Tech Stack:** Laravel (PHP 8.5, PostgreSQL in prod / MySQL in tests), Sanctum, Next.js 16 (React 19), zustand, axios, framer-motion, vitest + jsdom, PHPUnit.

## Global Constraints

- Backend test command (from `laravel-backend/`): `php artisan test`. Frontend test command (from `frontend/`): `npm test`. Frontend lint: `npm run lint`.
- Frontend TypeScript is `strict: true`. No new dependencies (backend or frontend).
- Store public API must stay: `toggleWishlist(productId)`, `isInWishlist(productId)`, `clearWishlist()` — `ProductCard.tsx` and `products/[id]/page.tsx` must not change.
- Wishlist route ordering: `POST /wishlist/merge` declared before any `{param}` route.
- `clearWishlist()` is LOCAL-ONLY. On logout the server-side wishlist MUST be preserved (account data survives across sessions/devices).
- Auth storage keys: `accessToken` / `refreshToken` / `immersive_user` in localStorage. API base: `@/lib/api` axios instance (adds Bearer + CSRF automatically).
- Auth is detected client-side by presence of `localStorage.getItem('accessToken')`.
- Avatar upload allowed MIMEs: `image/jpeg|png|webp|gif|avif|bmp|svg+xml`, max 5MB, stored on `public` disk under `avatars/`, deletes the previous avatar first.
- UserResource `avatar` field: `$request->getSchemeAndHttpHost().'/storage/'.$this->avatar_path` (null when unset), matching `AdminUploadController:56`.
- StrictMode/react-jsx; test dirs are `__tests__` beside source files (vitest include: `src/**/__tests__/**/*.test.{ts,tsx}`).
- Commit each task separately; messages prefixed `feat:` / `test:` / `chore:` matching repo style.

---

### Task 1: Backend migrations + Wishlist model + User relations

**Files:**
- Create: `laravel-backend/database/migrations/2026_08_14_000001_create_wishlists_table.php`
- Create: `laravel-backend/database/migrations/2026_08_14_000002_add_profile_fields_to_users_table.php`
- Create: `laravel-backend/app/Models/Wishlist.php`
- Modify: `laravel-backend/app/Models/User.php`

**Interfaces:**
- Produces: `users` table gains nullable `phone` (string 20), `address` (text), `avatar_path` (string). New `wishlists` table: `id`, `user_id` FK cascade, `product_id` FK cascade, timestamps, `unique(['user_id','product_id'])`. `App\Models\Wishlist` with `user()`/`product()` BelongsTo. `App\Models\User` gains `wishlists(): HasMany`, `wishlistedProducts(): BelongsToMany(->withTimestamps())`, and `phone|address|avatar_path` in `$fillable`.

- [ ] **Step 1: Create the wishlists migration**

`laravel-backend/database/migrations/2026_08_14_000001_create_wishlists_table.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('wishlists', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['user_id', 'product_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('wishlists');
    }
};
```

- [ ] **Step 2: Create the profile-fields migration**

`laravel-backend/database/migrations/2026_08_14_000002_add_profile_fields_to_users_table.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('phone', 20)->nullable();
            $table->text('address')->nullable();
            $table->string('avatar_path')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['phone', 'address', 'avatar_path']);
        });
    }
};
```

- [ ] **Step 3: Create the Wishlist model**

`laravel-backend/app/Models/Wishlist.php`:

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Wishlist extends Model
{
    protected $fillable = [
        'user_id',
        'product_id',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
```

- [ ] **Step 4: Add relations + fillable to User model**

`laravel-backend/app/Models/User.php` — read the file first, then add `HasMany` and `BelongsToMany` to the `use` imports, add the three fields to `$fillable`, and add the two relations after the existing ones:

```php
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
```

Fillable becomes:

```php
    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'phone',
        'address',
        'avatar_path',
    ];
```

Relations:

```php
    public function wishlists(): HasMany
    {
        return $this->hasMany(Wishlist::class);
    }

    public function wishlistedProducts(): BelongsToMany
    {
        return $this->belongsToMany(Product::class, 'wishlists')->withTimestamps();
    }
```

- [ ] **Step 5: Run migrations on the local dev DB**

Run from `laravel-backend/`:

```
php artisan migrate --force
```

Expected: both new migrations run; `Select migration to run` prompt absent because `--force` in non-interactive mode.

- [ ] **Step 6: Commit**

```bash
git add laravel-backend/database/migrations/2026_08_14_000001_create_wishlists_table.php laravel-backend/database/migrations/2026_08_14_000002_add_profile_fields_to_users_table.php laravel-backend/app/Models/Wishlist.php laravel-backend/app/Models/User.php
git commit -m "feat: add wishlists table and profile fields (phone, address, avatar_path)"
```

---

### Task 2: Wishlist API (TDD backend)

**Files:**
- Test: `laravel-backend/tests/Feature/WishlistTest.php`
- Create: `laravel-backend/app/Http/Controllers/WishlistController.php`
- Modify: `laravel-backend/routes/api.php`

**Interfaces:**
- Consumes: `App\Models\Wishlist`, `User::wishlistedProducts()`, `ProductResource` (exists), `Product` model.
- Produces:
  - `GET /api/wishlist` -> `{ success: true, data: { items: ProductResource[] } }` ordered newest-first by pivot `created_at`.
  - `POST /api/wishlist` body `{ product_id: int }` -> `201 { success, data: { item: ProductResource } }` (idempotent).
  - `POST /api/wishlist/merge` body `{ product_ids: int[] }` -> `{ success, data: { items: ProductResource[] } }`.
  - `DELETE /api/wishlist/{productId}` -> `{ success: true }`; 404 when not wishlisted.

Use `syncWithoutDetaching` for both store and merge (handles the unique constraint idempotently).

- [ ] **Step 1: Write the failing tests**

`laravel-backend/tests/Feature/WishlistTest.php`:

```php
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
```

- [ ] **Step 2: Run tests to verify they fail**

From `laravel-backend/`:

```
php artisan test --filter=WishlistTest
```

Expected: FAIL — routes not found (404 when hitting `GET /api/wishlist`), i.e. tests error with `Symfony\Component\HttpKernel\Exception\NotFoundHttpException`.

- [ ] **Step 3: Implement WishlistController**

`laravel-backend/app/Http/Controllers/WishlistController.php`:

```php
<?php

namespace App\Http\Controllers;

use App\Http\Resources\ProductResource;
use App\Models\Product;
use App\Models\Wishlist;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WishlistController extends Controller
{
    private function list(Request $request)
    {
        return $request->user()
            ->wishlistedProducts()
            ->with(['category', 'images', 'variants'])
            ->orderByDesc('wishlists.created_at')
            ->get();
    }

    public function index(Request $request): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => ['items' => ProductResource::collection($this->list($request))],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'product_id' => ['required', 'integer', 'exists:products,id'],
        ]);

        $request->user()->wishlistedProducts()->syncWithoutDetaching([$validated['product_id']]);

        $product = Product::with(['category', 'images', 'variants'])->findOrFail($validated['product_id']);

        return response()->json([
            'success' => true,
            'data' => ['item' => new ProductResource($product)],
        ], 201);
    }

    public function destroy(Request $request, string $productId): JsonResponse
    {
        $deleted = Wishlist::where('user_id', $request->user()->id)
            ->where('product_id', $productId)
            ->delete();

        if ($deleted === 0) {
            return response()->json([
                'success' => false,
                'message' => 'Product not in wishlist.',
            ], 404);
        }

        return response()->json(['success' => true]);
    }

    public function merge(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'product_ids' => ['required', 'array'],
            'product_ids.*' => ['integer', 'exists:products,id'],
        ]);

        $request->user()->wishlistedProducts()->syncWithoutDetaching($validated['product_ids']);

        return response()->json([
            'success' => true,
            'data' => ['items' => ProductResource::collection($this->list($request))],
        ]);
    }
}
```

- [ ] **Step 4: Register the routes**

`laravel-backend/routes/api.php` — inside the existing `auth:sanctum` group, after the `/auth/logout` line. Add `use App\Http\Controllers\WishlistController;` to the imports, and inside the group after the orders routes:

```php
    // ─── Wishlist ────────────────────────────────────────────────────────────
    Route::get('/wishlist', [WishlistController::class, 'index']);
    Route::post('/wishlist', [WishlistController::class, 'store']);
    Route::post('/wishlist/merge', [WishlistController::class, 'merge']);
    Route::delete('/wishlist/{productId}', [WishlistController::class, 'destroy']);
```

- [ ] **Step 5: Run tests to verify they pass**

From `laravel-backend/`:

```
php artisan test --filter=WishlistTest
```

Expected: PASS — 8 tests.

- [ ] **Step 6: Commit**

```bash
git add laravel-backend/app/Http/Controllers/WishlistController.php laravel-backend/routes/api.php laravel-backend/tests/Feature/WishlistTest.php
git commit -m "feat: add server-side wishlist API (index, store, merge, destroy)"
```

---

### Task 3: Profile API (TDD backend)

**Files:**
- Test: `laravel-backend/tests/Feature/ProfileTest.php`
- Create: `laravel-backend/app/Http/Controllers/ProfileController.php`
- Modify: `laravel-backend/app/Http/Resources/UserResource.php`
- Modify: `laravel-backend/routes/api.php`

**Interfaces:**
- Consumes: `UserResource`, public-disk `Storage`, `AdminUploadController` MIME list.
- Produces:
  - `PUT /api/auth/me` body `{ name, email, phone?, address? }` -> `{ success, data: { user: UserResource } }`; 422 with per-field errors; email unique-except-self.
  - `POST /api/auth/avatar` multipart `file` -> `201 { success, data: { user } }`; stores under `avatars/`, deletes previous avatar. `UserResource.avatar` now real URL.

- [ ] **Step 1: Write the failing tests**

`laravel-backend/tests/Feature/ProfileTest.php`:

```php
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
}
```

- [ ] **Step 2: Run tests to verify they fail**

From `laravel-backend/`:

```
php artisan test --filter=ProfileTest
```

Expected: FAIL — `PUT /api/auth/me` and `POST /api/auth/avatar` do not exist (404/405), avatar tests fail.

- [ ] **Step 3: Update UserResource avatar field**

`laravel-backend/app/Http/Resources/UserResource.php` — change line 21 from `'avatar' => null,` to:

```php
            'avatar' => $this->avatar_path ? $request->getSchemeAndHttpHost().'/storage/'.$this->avatar_path : null,
```

And add `phone` / `address` after the `name` line:

```php
            'phone' => $this->phone,
            'address' => $this->address,
```

- [ ] **Step 4: Implement ProfileController**

`laravel-backend/app/Http/Controllers/ProfileController.php`:

```php
<?php

namespace App\Http\Controllers;

use App\Http\Resources\UserResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class ProfileController extends Controller
{
    private const ALLOWED_MIMES = [
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/gif',
        'image/avif',
        'image/bmp',
        'image/svg+xml',
    ];

    public function update(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'phone' => ['nullable', 'string', 'max:20'],
            'address' => ['nullable', 'string', 'max:1000'],
        ]);

        $user->update($validated);

        return response()->json([
            'success' => true,
            'data' => ['user' => new UserResource($user->fresh())],
        ]);
    }

    public function uploadAvatar(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'file' => ['required', 'file', 'max:5120'],
        ]);

        $file = $validated['file'];
        $mime = $file->getMimeType();

        if (! in_array($mime, self::ALLOWED_MIMES, true)) {
            return response()->json([
                'success' => false,
                'message' => 'Unsupported file type. Allowed: JPG, PNG, WebP, GIF, AVIF, BMP, SVG.',
            ], 422);
        }

        $extension = $file->getClientOriginalExtension();
        if (! $extension) {
            $extension = Str::afterLast($mime, '/');
        }

        $filename = Str::random(24).'.'.strtolower($extension);
        $stored = $file->storeAs('avatars', $filename, 'public');

        if ($stored === false || ! Storage::disk('public')->exists('avatars/'.$filename)) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to store the uploaded file. Please check server storage permissions and try again.',
            ], 500);
        }

        if ($user->avatar_path && Storage::disk('public')->exists($user->avatar_path)) {
            Storage::disk('public')->delete($user->avatar_path);
        }

        $user->update(['avatar_path' => 'avatars/'.$filename]);

        return response()->json([
            'success' => true,
            'data' => ['user' => new UserResource($user->fresh())],
        ], 201);
    }
}
```

- [ ] **Step 5: Register routes**

`laravel-backend/routes/api.php` — add `use App\Http\Controllers\ProfileController;` to imports; inside the `auth:sanctum` group next to `/auth/logout`:

```php
    Route::put('/auth/me', [ProfileController::class, 'update']);
    Route::post('/auth/avatar', [ProfileController::class, 'uploadAvatar']);
```

- [ ] **Step 6: Run tests to verify they pass**

From `laravel-backend/`:

```
php artisan test --filter=ProfileTest
```

Expected: PASS — 9 tests.

- [ ] **Step 7: Commit**

```bash
git add laravel-backend/app/Http/Controllers/ProfileController.php laravel-backend/app/Http/Resources/UserResource.php laravel-backend/routes/api.php laravel-backend/tests/Feature/ProfileTest.php
git commit -m "feat: add profile update and avatar upload endpoints"
```

---

### Task 4: Full backend test suite

**Files:** none new.

- [ ] **Step 1: Run the entire backend suite**

From `laravel-backend/`:

```
php artisan test
```

Expected: PASS — all existing (Auth, Cart, Checkout, Admin*, Public*, Maintenance, Example) plus the new 17 tests. No failures.

- [ ] **Step 2: Fix anything that regressed, re-run**

If any failure appears, fix and re-run `php artisan test` until green.

- [ ] **Step 3: Commit any fixes**

```bash
git add -A
git commit -m "chore: fix backend test regressions"  # only if fixes were needed; skip otherwise
```

---

### Task 5: Hybrid wishlist store + auth wiring (TDD frontend)

**Files:**
- Test: `frontend/src/stores/__tests__/useWishlistStore.test.ts`
- Modify: `frontend/src/stores/useWishlistStore.ts`
- Modify: `frontend/src/stores/useAuthStore.ts`
- Modify: `frontend/src/types/user.ts`
- Modify: `frontend/src/hooks/useAuth.ts`

**Interfaces:**
- Consumes: `@/lib/api` (`get/post/delete`), `localStorage` keys `accessToken` / `wishlist-storage` / `immersive_user`.
- Produces:
  - `useWishlistStore`: state `items: string[]`; actions `toggleWishlist(productId): Promise<void>`, `isInWishlist(productId): boolean`, `clearWishlist(): void`, `hydrateWishlist(): Promise<void>`, `mergeGuestWishlist(): Promise<void>`. Persisted via `persist` under name `wishlist-storage` with `partialize: (s) => ({ items: s.items })` (keeps version-0 local data compatible).
  - `useAuthStore`: adds `updateUser(user: User): void`; `login`/`signup` call `mergeGuestWishlist()` after `mergeGuestCart()`; `logout` calls `clearWishlist()`; `loadUser()` calls `hydrateWishlist()` on success.
  - `User` type: adds `phone?: string`, `address?: string`.
  - `useAuth()` hook: returns `updateUser` alongside existing fields.
- Auth check helper `hasToken(): boolean` = `typeof window !== 'undefined' && !!localStorage.getItem('accessToken')` (mirrors `api.ts` interceptor).

- [ ] **Step 1: Write the failing store tests**

`frontend/src/stores/__tests__/useWishlistStore.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useWishlistStore } from '../useWishlistStore';
import api from '@/lib/api';

vi.mock('@/lib/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockedApi = vi.mocked(api);

beforeEach(() => {
  localStorage.clear();
  useWishlistStore.setState({ items: [] });
  vi.clearAllMocks();
});

describe('useWishlistStore', () => {
  it('toggles locally for guests without calling the API', () => {
    localStorage.removeItem('accessToken');

    useWishlistStore.getState().toggleWishlist('p1');
    expect(useWishlistStore.getState().isInWishlist('p1')).toBe(true);

    useWishlistStore.getState().toggleWishlist('p1');
    expect(useWishlistStore.getState().isInWishlist('p1')).toBe(false);

    expect(mockedApi.post).not.toHaveBeenCalled();
    expect(mockedApi.delete).not.toHaveBeenCalled();
  });

  it('persists guest items to localStorage', () => {
    localStorage.removeItem('accessToken');

    useWishlistStore.getState().toggleWishlist('p1');

    expect(localStorage.getItem('wishlist-storage')).toContain('p1');
  });

  it('adds to the server when authenticated and stays optimistic', async () => {
    localStorage.setItem('accessToken', 't');
    mockedApi.post.mockResolvedValue({ data: { success: true } });

    await useWishlistStore.getState().toggleWishlist('p1');

    expect(mockedApi.post).toHaveBeenCalledWith('/wishlist', { product_id: 'p1' });
    expect(useWishlistStore.getState().isInWishlist('p1')).toBe(true);
  });

  it('removes from the server when authenticated', async () => {
    localStorage.setItem('accessToken', 't');
    mockedApi.post.mockResolvedValue({ data: { success: true } });
    mockedApi.delete.mockResolvedValue({ data: { success: true } });

    await useWishlistStore.getState().toggleWishlist('p1');
    expect(useWishlistStore.getState().isInWishlist('p1')).toBe(true);

    await useWishlistStore.getState().toggleWishlist('p1');
    expect(useWishlistStore.getState().isInWishlist('p1')).toBe(false);
    expect(mockedApi.delete).toHaveBeenCalledWith('/wishlist/p1');
  });

  it('rolls back local state on API failure', async () => {
    localStorage.setItem('accessToken', 't');
    mockedApi.post.mockRejectedValue(new Error('network'));

    await useWishlistStore.getState().toggleWishlist('p1');

    expect(useWishlistStore.getState().isInWishlist('p1')).toBe(false);
  });

  it('hydrateWishlist loads server ids when authenticated', async () => {
    localStorage.setItem('accessToken', 't');
    mockedApi.get.mockResolvedValue({
      data: { success: true, data: { items: [{ _id: 'a' }, { _id: 'b' }] } },
    });

    await useWishlistStore.getState().hydrateWishlist();

    expect(useWishlistStore.getState().items).toEqual(['a', 'b']);
  });

  it('hydrateWishlist does nothing for guests', async () => {
    localStorage.removeItem('accessToken');
    useWishlistStore.setState({ items: ['local'] });

    await useWishlistStore.getState().hydrateWishlist();

    expect(useWishlistStore.getState().items).toEqual(['local']);
    expect(mockedApi.get).not.toHaveBeenCalled();
  });

  it('mergeGuestWishlist posts local ids then refreshes from server', async () => {
    localStorage.setItem('accessToken', 't');
    useWishlistStore.setState({ items: ['g1'] });
    mockedApi.post.mockResolvedValue({ data: { success: true } });
    mockedApi.get.mockResolvedValue({
      data: { success: true, data: { items: [{ _id: 'g1' }, { _id: 's1' }] } },
    });

    await useWishlistStore.getState().mergeGuestWishlist();

    expect(mockedApi.post).toHaveBeenCalledWith('/wishlist/merge', { product_ids: ['g1'] });
    expect(useWishlistStore.getState().items).toEqual(['g1', 's1']);
  });

  it('mergeGuestWishlist still hydrates when there are no local items', async () => {
    localStorage.setItem('accessToken', 't');
    useWishlistStore.setState({ items: [] });
    mockedApi.get.mockResolvedValue({
      data: { success: true, data: { items: [{ _id: 's1' }] } },
    });

    await useWishlistStore.getState().mergeGuestWishlist();

    expect(mockedApi.post).not.toHaveBeenCalled();
    expect(useWishlistStore.getState().items).toEqual(['s1']);
  });

  it('clearWishlist clears local items only', () => {
    localStorage.setItem('accessToken', 't');
    useWishlistStore.setState({ items: ['a', 'b'] });

    useWishlistStore.getState().clearWishlist();

    expect(useWishlistStore.getState().items).toEqual([]);
    expect(mockedApi.delete).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

From `frontend/`:

```
npm test
```

Expected: the new suite FAILS (store still has only local toggling — server calls absent).

- [ ] **Step 3: Rewrite useWishlistStore**

`frontend/src/stores/useWishlistStore.ts`:

```ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '@/lib/api';

interface WishlistState {
  items: string[];
  toggleWishlist: (productId: string) => Promise<void>;
  isInWishlist: (productId: string) => boolean;
  clearWishlist: () => void;
  hydrateWishlist: () => Promise<void>;
  mergeGuestWishlist: () => Promise<void>;
}

function hasToken(): boolean {
  return typeof window !== 'undefined' && !!localStorage.getItem('accessToken');
}

async function fetchServerIds(): Promise<string[] | null> {
  try {
    const { data } = await api.get('/wishlist');
    if (data?.success && Array.isArray(data?.data?.items)) {
      return data.data.items.map((p: { _id: string }) => p._id);
    }
    return null;
  } catch {
    return null;
  }
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],

      toggleWishlist: async (productId) => {
        const { items } = get();
        const isIn = items.includes(productId);
        const next = isIn ? items.filter((id) => id !== productId) : [...items, productId];
        set({ items: next });

        if (!hasToken()) return;

        try {
          if (isIn) {
            await api.delete(`/wishlist/${productId}`);
          } else {
            await api.post('/wishlist', { product_id: productId });
          }
        } catch {
          set({ items });
        }
      },

      isInWishlist: (productId) => get().items.includes(productId),

      clearWishlist: () => set({ items: [] }),

      hydrateWishlist: async () => {
        if (!hasToken()) return;
        const ids = await fetchServerIds();
        if (ids) set({ items: ids });
      },

      mergeGuestWishlist: async () => {
        if (!hasToken()) return;

        const guest = get().items;
        if (guest.length > 0) {
          try {
            await api.post('/wishlist/merge', { product_ids: guest });
          } catch {
            // keep guest items; retried on next login
          }
        }

        const ids = await fetchServerIds();
        if (ids) set({ items: ids });
      },
    }),
    {
      name: 'wishlist-storage',
      partialize: (s) => ({ items: s.items }),
    }
  )
);
```

- [ ] **Step 4: Update User type**

`frontend/src/types/user.ts` — add optional profile fields to the `User` interface:

```ts
  phone?: string;
  address?: string;
```

- [ ] **Step 5: Wire useAuthStore**

`frontend/src/stores/useAuthStore.ts` — read the current file. Add import `import { useWishlistStore } from '@/stores/useWishlistStore';`.

- Add `updateUser: (user: User) => void;` to the `AuthState` interface.
- Extend `login` — after `await useCartStore.getState().mergeGuestCart();` add:

```ts
    await useWishlistStore.getState().mergeGuestWishlist();
```

- Extend `signup` the same way.
- Extend `logout` — right after `useCartStore.getState().resetCart();` add:

```ts
    useWishlistStore.getState().clearWishlist();
```

- In `loadUser` success branch, after `set({ user, isAuthenticated: true, ... })` add:

```ts
      await useWishlistStore.getState().hydrateWishlist();
```

- Add the action implementation alongside the others:

```ts
  updateUser: (user) => {
    saveUserToStorage(user);
    set({ user });
  },
```

- [ ] **Step 6: Expose updateUser from the hook**

`frontend/src/hooks/useAuth.ts` — destructure and return `updateUser`:

```ts
export function useAuth() {
  const { user, isLoading, isAuthenticated, isMockAuth, login, signup, logout, loadUser, updateUser } =
    useAuthStore();
  ...
  return { user, isLoading, isAuthenticated, isMockAuth, login, signup, logout, updateUser };
}
```

- [ ] **Step 7: Run all frontend tests**

From `frontend/`:

```
npm test
```

Expected: PASS — existing suites plus the new wishlist store suite. If a pre-existing test breaks (unlikely), fix and re-run.

- [ ] **Step 8: Run TypeScript check**

From `frontend/`:

```
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 9: Commit**

```bash
git add frontend/src/stores/useWishlistStore.ts frontend/src/stores/useAuthStore.ts frontend/src/types/user.ts frontend/src/hooks/useAuth.ts frontend/src/stores/__tests__/useWishlistStore.test.ts
git commit -m "feat: hybrid wishlist store with server sync and guest merge"
```

---

### Task 6: Enhanced account page (tabs) — TDD frontend

**Files:**
- Create: `frontend/src/app/account/_components/ProfileTab.tsx`
- Create: `frontend/src/app/account/_components/WishlistTab.tsx`
- Create: `frontend/src/app/account/_components/OrdersTab.tsx`
- Modify: `frontend/src/app/account/page.tsx`
- Test: `frontend/src/app/account/_components/__tests__/ProfileTab.test.tsx`
- Test: `frontend/src/app/account/_components/__tests__/WishlistTab.test.tsx`

**Interfaces:**
- Consumes: `useAuth()` (now returns `updateUser`), `useWishlistStore.getState().toggleWishlist`, `api` (`get/put/postForm`), `useUIStore.addToast`, `User` type.
- Produces:
  - `ProfileTab({ user: User, onUserUpdated: (u: User) => void })` — avatar preview + file upload (`POST /auth/avatar` FormData), form fields name/email/phone/address with per-field 422 errors, Save -> `PUT /auth/me` -> `onUserUpdated(user)`.
  - `WishlistTab()` — fetches `GET /wishlist` on mount, renders product cards (image/name/price/stock, link `/products/{slug}`), remove button -> `toggleWishlist(_id)` then refetch; empty state.
  - `OrdersTab()` — verbatim move of the current order-history fetch + render from `account/page.tsx`.
  - `account/page.tsx` — 3-tab state (`profile | wishlist | orders`), default `profile`, keeps loading skeleton, auth redirect guard, logout button.

- [ ] **Step 1: Write failing component tests**

`frontend/src/app/account/_components/__tests__/ProfileTab.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup, fireEvent } from '@testing-library/react';
import ProfileTab from '../ProfileTab';
import api from '@/lib/api';
import { useUIStore } from '@/stores/useUIStore';
import { User } from '@/types/user';

vi.mock('@/lib/api', () => ({
  default: { put: vi.fn(), postForm: vi.fn() },
}));

const user: User = {
  id: '1',
  name: 'Ada',
  email: 'ada@example.com',
  role: 'customer',
  createdAt: '2026-01-01T00:00:00Z',
};

beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
  useUIStore.setState({ toasts: [] });
});

afterEach(() => cleanup());

describe('ProfileTab', () => {
  it('submits updated fields to PUT /auth/me on save', async () => {
    vi.mocked(api.put).mockResolvedValue({ data: { success: true, data: { user } } });
    const onUserUpdated = vi.fn();

    render(<ProfileTab user={user} onUserUpdated={onUserUpdated} />);

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Grace' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'grace@example.com' } });
    fireEvent.click(screen.getByText('Save Changes'));

    await waitFor(() =>
      expect(api.put).toHaveBeenCalledWith('/auth/me', {
        name: 'Grace',
        email: 'grace@example.com',
        phone: '',
        address: '',
      })
    );
    await waitFor(() => expect(onUserUpdated).toHaveBeenCalledWith(user));
  });

  it('shows per-field 422 errors', async () => {
    vi.mocked(api.put).mockRejectedValue({
      response: { status: 422, data: { errors: { email: ['The email has already been taken.'] } } },
    });

    render(<ProfileTab user={user} onUserUpdated={vi.fn()} />);

    fireEvent.click(screen.getByText('Save Changes'));

    await waitFor(() => expect(screen.getByText('The email has already been taken.')).toBeTruthy());
  });

  it('uploads an avatar file via POST /auth/avatar', async () => {
    vi.mocked(api.postForm).mockResolvedValue({ data: { success: true, data: { user } } });
    const onUserUpdated = vi.fn();

    render(<ProfileTab user={user} onUserUpdated={onUserUpdated} />);

    const input = document.querySelector('input[type=file]') as HTMLInputElement;
    fireEvent.change(input, {
      target: { files: [new File(['x'], 'a.png', { type: 'image/png' })] },
    });

    await waitFor(() =>
      expect(api.postForm).toHaveBeenCalledWith('/auth/avatar', expect.objectContaining({ file: expect.any(File) }))
    );
    await waitFor(() => expect(onUserUpdated).toHaveBeenCalledWith(user));
  });
});
```

`frontend/src/app/account/_components/__tests__/WishlistTab.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup, fireEvent } from '@testing-library/react';
import WishlistTab from '../WishlistTab';
import api from '@/lib/api';
import { useWishlistStore } from '@/stores/useWishlistStore';
import { useUIStore } from '@/stores/useUIStore';

vi.mock('@/lib/api', () => ({
  default: { get: vi.fn() },
}));

vi.mock('@/stores/useWishlistStore', () => ({
  useWishlistStore: {
    getState: vi.fn(() => ({ toggleWishlist: vi.fn().mockImplementation(async () => {}) })),
  },
}));

const items = [
  {
    _id: 'p1',
    name: 'Headphones',
    slug: 'headphones',
    description: 'Bass',
    longDescription: null,
    price: 100,
    compareAtPrice: null,
    sku: 'S1',
    category: { _id: 'c1', name: 'Audio' },
    images: [{ url: '/x.jpg', alt: 'x', width: 600, height: 600 }],
    variants: [],
    ratings: { average: 4, count: 2 },
    tags: [],
    featured: false,
    stock: 5,
    status: 'active',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
];

beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
  useUIStore.setState({ toasts: [] });
});

afterEach(() => cleanup());

describe('WishlistTab', () => {
  it('renders wishlist product cards from GET /wishlist', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { success: true, data: { items } } });

    render(<WishlistTab />);

    await waitFor(() => expect(screen.getByText('Headphones')).toBeTruthy());
    expect(document.querySelector('a[href="/products/headphones"]')).toBeTruthy();
  });

  it('shows empty state when there are no items', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { success: true, data: { items: [] } } });

    render(<WishlistTab />);

    await waitFor(() => expect(screen.getByText('Your wishlist is empty.')).toBeTruthy());
  });

  it('removes an item on button click', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { success: true, data: { items } } });
    const toggleWishlist = vi.fn().mockImplementation(async () => {});
    vi.mocked(useWishlistStore.getState).mockReturnValue({ toggleWishlist });

    render(<WishlistTab />);
    await waitFor(() => expect(screen.getByText('Headphones')).toBeTruthy());

    fireEvent.click(screen.getByLabelText('Remove Headphones'));
    await waitFor(() => expect(toggleWishlist).toHaveBeenCalledWith('p1'));
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

From `frontend/`:

```
npm test
```

Expected: the two new suites FAIL (component files don't exist).

- [ ] **Step 3: Implement ProfileTab**

`frontend/src/app/account/_components/ProfileTab.tsx`:

```tsx
'use client';

import { useState } from 'react';
import api from '@/lib/api';
import { User } from '@/types/user';
import { useUIStore } from '@/stores/useUIStore';

interface ProfileTabProps {
  user: User;
  onUserUpdated: (user: User) => void;
}

export default function ProfileTab({ user, onUserUpdated }: ProfileTabProps) {
  const addToast = useUIStore((s) => s.addToast);
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [phone, setPhone] = useState(user.phone ?? '');
  const [address, setAddress] = useState(user.address ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    setErrors({});
    try {
      const { data } = await api.put('/auth/me', { name, email, phone, address });
      onUserUpdated(data.data.user);
      addToast({ type: 'success', message: 'Profile updated' });
    } catch (err: unknown) {
      const anyErr = err as { response?: { status?: number; data?: { errors?: Record<string, string[]> } } };
      if (anyErr?.response?.status === 422 && anyErr.response.data?.errors) {
        setErrors(
          Object.fromEntries(
            Object.entries(anyErr.response.data.errors).map(([k, v]) => [k, v[0]])
          ) as Record<string, string>
        );
      } else {
        addToast({ type: 'error', message: 'Failed to update profile. Please try again.' });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { data } = await api.postForm('/auth/avatar', { file });
      onUserUpdated(data.data.user);
      addToast({ type: 'success', message: 'Avatar updated' });
    } catch {
      addToast({ type: 'error', message: 'Failed to upload avatar. Try a different image.' });
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        {user.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.avatar}
            alt={user.name}
            className="w-16 h-16 rounded-full object-cover border border-gray-200 dark:border-zinc-700"
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
            <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
              {user.name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        <div className="flex-1">
          <label className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl cursor-pointer hover:bg-indigo-700 transition-colors">
            {uploading ? 'Uploading…' : 'Change Avatar'}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={uploading}
              onChange={handleFile}
              data-testid="avatar-input"
            />
          </label>
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSave();
        }}
        className="space-y-4"
      >
        <div>
          <label htmlFor="profile-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Name
          </label>
          <input
            id="profile-name"
            aria-label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full p-3 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl text-gray-900 dark:text-white"
          />
          {errors.name && <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errors.name}</p>}
        </div>

        <div>
          <label htmlFor="profile-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Email
          </label>
          <input
            id="profile-email"
            aria-label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl text-gray-900 dark:text-white"
          />
          {errors.email && <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errors.email}</p>}
        </div>

        <div>
          <label htmlFor="profile-phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Phone <span className="text-gray-400">(optional)</span>
          </label>
          <input
            id="profile-phone"
            aria-label="Phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full p-3 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl text-gray-900 dark:text-white"
          />
          {errors.phone && <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errors.phone}</p>}
        </div>

        <div>
          <label htmlFor="profile-address" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Address <span className="text-gray-400">(optional)</span>
          </label>
          <textarea
            id="profile-address"
            aria-label="Address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            rows={3}
            className="w-full p-3 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl text-gray-900 dark:text-white"
          />
          {errors.address && <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errors.address}</p>}
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full py-3 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 4: Implement WishlistTab**

`frontend/src/app/account/_components/WishlistTab.tsx`:

```tsx
'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { useWishlistStore } from '@/stores/useWishlistStore';
import { useUIStore } from '@/stores/useUIStore';

interface WishlistProduct {
  _id: string;
  name: string;
  slug: string;
  price: number;
  compareAtPrice?: number | null;
  stock: number;
  images: { url: string; alt: string }[];
}

const imageOrFallback = (p: WishlistProduct) => p.images[0]?.url || '/placeholder.svg';

export default function WishlistTab() {
  const [items, setItems] = useState<WishlistProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const addToast = useUIStore((s) => s.addToast);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/wishlist');
      if (data?.success && Array.isArray(data?.data?.items)) {
        setItems(data.data.items);
      } else {
        setItems([]);
      }
    } catch {
      setError('Unable to load your wishlist. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleRemove = async (product: WishlistProduct) => {
    await useWishlistStore.getState().toggleWishlist(product._id);
    addToast({ type: 'success', message: `${product.name} removed from wishlist` });
    load();
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="p-4 bg-gray-50 dark:bg-zinc-800 rounded-xl animate-pulse h-20" />
        ))}
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-red-600 dark:text-red-400">{error}</p>;
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 dark:text-gray-400 mb-4">Your wishlist is empty.</p>
        <Link
          href="/products"
          className="inline-flex px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
        >
          Start Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((product) => (
        <div
          key={product._id}
          className="p-4 bg-gray-50 dark:bg-zinc-800 rounded-xl flex items-center gap-4"
        >
          <Link href={`/products/${product.slug || product._id}`} className="shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageOrFallback(product)}
              alt={product.name}
              className="w-16 h-16 rounded-lg object-cover bg-gray-200 dark:bg-zinc-700"
            />
          </Link>
          <div className="flex-1 min-w-0">
            <Link
              href={`/products/${product.slug || product._id}`}
              className="font-medium text-gray-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors block truncate"
            >
              {product.name}
            </Link>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {product.currency || ''} {Number(product.price).toFixed(2)}
            </p>
            {product.stock <= 0 ? (
              <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 font-medium">
                Out of stock
              </span>
            ) : null}
          </div>
          <button
            type="button"
            aria-label={`Remove ${product.name}`}
            onClick={() => handleRemove(product)}
            className="shrink-0 px-3 py-2 text-sm rounded-xl text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            Remove
          </button>
        </div>
      ))}
    </div>
  );
}
```

Note: `product.currency` is not in `ProductResource`; the `|| ''` guard means it renders as `100.00`. If you want the INR label like orders, extend the display to `₹` — but keep the code consistent with `ProductResource` fields. (Simplest: render `₹ {price.toFixed(2)}`.)

- [ ] **Step 5: Implement OrdersTab**

`frontend/src/app/account/_components/OrdersTab.tsx` — move the order-fetch effect and order markup from `account/page.tsx` verbatim:

```tsx
'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';

export interface ApiOrder {
  _id: string;
  orderNumber: string;
  status: string;
  total: number;
  currency: string;
  createdAt: string;
  items: { name: string; quantity: number }[] | null;
  itemsSummary?: { count: number };
}

const statusColors: Record<string, string> = {
  Delivered: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  Shipped: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  Processing: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  Pending: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  Cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

function formatStatus(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export default function OrdersTab() {
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState('');

  const loadOrders = useCallback(async () => {
    setOrdersLoading(true);
    setOrdersError('');
    try {
      const { data } = await api.get('/orders');
      if (data?.success) {
        const raw = data.data?.orders || [];
        setOrders(
          raw.map((o: ApiOrder) => ({
            ...o,
            items:
              o.items?.map((i) => ({
                name: i.name || 'Item',
                quantity: i.quantity || 1,
              })) || [],
            total: Number(o.total) || 0,
          }))
        );
      }
    } catch {
      setOrdersError('Unable to load your orders. Please try again.');
    } finally {
      setOrdersLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  if (ordersLoading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="p-4 bg-gray-50 dark:bg-zinc-800 rounded-xl animate-pulse h-20" />
        ))}
      </div>
    );
  }

  if (ordersError) {
    return <p className="text-sm text-red-600 dark:text-red-400">{ordersError}</p>;
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 dark:text-gray-400 mb-4">You haven&apos;t placed any orders yet.</p>
        <Link
          href="/products"
          className="inline-flex px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
        >
          Start Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {orders.map((order) => (
        <div
          key={order._id}
          className="p-4 bg-gray-50 dark:bg-zinc-800 rounded-xl flex items-center justify-between"
        >
          <div>
            <p className="font-medium text-gray-900 dark:text-white">{order.orderNumber}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {order.items?.length
                ? order.items.map((i) => `${i.name} ×${i.quantity}`).join(', ')
                : `${order.itemsSummary?.count ?? 0} item(s)`}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              {new Date(order.createdAt).toLocaleDateString()}
            </p>
          </div>
          <div className="text-right">
            <p className="font-medium text-gray-900 dark:text-white">
              {order.currency || 'INR'} {order.total.toFixed(2)}
            </p>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                statusColors[formatStatus(order.status)] || 'bg-gray-100 text-gray-600'
              }`}
            >
              {formatStatus(order.status)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 6: Rewrite account/page.tsx into tabs**

`frontend/src/app/account/page.tsx` — replace the whole file (read it first to preserve the auth guard/skeleton):

```tsx
'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import ProfileTab from './_components/ProfileTab';
import WishlistTab from './_components/WishlistTab';
import OrdersTab from './_components/OrdersTab';

type Tab = 'profile' | 'wishlist' | 'orders';

const tabs: { key: Tab; label: string }[] = [
  { key: 'profile', label: 'Profile' },
  { key: 'wishlist', label: 'Wishlist' },
  { key: 'orders', label: 'Orders' },
];

export default function AccountPage() {
  const { user, isAuthenticated, isLoading, isMockAuth, logout, updateUser } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('profile');

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="pt-24 pb-16 px-4">
        <div className="max-w-2xl mx-auto animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-zinc-700 rounded w-48" />
          <div className="h-4 bg-gray-200 dark:bg-zinc-700 rounded w-32" />
          <div className="h-32 bg-gray-200 dark:bg-zinc-700 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="pt-24 pb-16 px-4">
      <div className="max-w-2xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-white">My Account</h1>

          <div className="p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm mb-6">
            <div className="flex items-center gap-4 mb-6">
              {user.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-16 h-16 rounded-full object-cover border border-gray-200 dark:border-zinc-700"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                  <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{user.name}</h2>
                <p className="text-gray-500 dark:text-gray-400">{user.email}</p>
              </div>
              {isMockAuth && (
                <span className="text-xs px-2 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 font-medium">
                  Demo Mode
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-4 bg-gray-50 dark:bg-zinc-800 rounded-xl">
                <p className="text-sm text-gray-500 dark:text-gray-400">Role</p>
                <p className="font-medium capitalize text-gray-900 dark:text-white">{user.role}</p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-zinc-800 rounded-xl">
                <p className="text-sm text-gray-500 dark:text-gray-400">Member Since</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {new Date(user.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="flex gap-2 p-1 bg-gray-50 dark:bg-zinc-800 rounded-xl">
              {tabs.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTab(t.key)}
                  aria-pressed={tab === t.key}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                    tab === t.key
                      ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm mb-6">
            {tab === 'profile' && <ProfileTab user={user} onUserUpdated={updateUser} />}
            {tab === 'wishlist' && <WishlistTab />}
            {tab === 'orders' && <OrdersTab />}
          </div>

          <div className="space-y-3">
            <button
              onClick={() => {
                logout();
                router.push('/');
              }}
              className="w-full p-4 bg-white dark:bg-zinc-900 rounded-xl border border-red-200 dark:border-red-800 shadow-sm text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              Logout
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Run all frontend tests**

From `frontend/`:

```
npm test
```

Expected: PASS — existing suites plus ProfileTab (3) and WishlistTab (3).

- [ ] **Step 8: TypeScript check**

From `frontend/`:

```
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 9: Commit**

```bash
git add frontend/src/app/account/ frontend/src/app/account/page.tsx
git commit -m "feat: enhanced account page with profile, wishlist, and orders tabs"
```

---

### Task 7: Frontend lint + build + full verification

**Files:** none new.

- [ ] **Step 1: Run ESLint**

From `frontend/`:

```
npm run lint
```

Expected: no errors. Fix any warnings introduced by new files.

- [ ] **Step 2: Full frontend test + typecheck**

From `frontend/`:

```
npm test
npx tsc --noEmit
```

Expected: both green.

- [ ] **Step 3: Production build**

From `frontend/`:

```
npm run build
```

Expected: build succeeds; new account page route compiles.

- [ ] **Step 4: Full backend suite once more**

From `laravel-backend/`:

```
php artisan test
```

Expected: green.

- [ ] **Step 5: Commit any fixes**

```bash
git add -A
git commit -m "chore: lint and build fixes for account tabs"  # only if fixes were needed
```

---

### Task 8: Deploy + live E2E verification

**Files:** none new.

- [ ] **Step 1: Commit any remaining changes and push to origin/main**

```bash
git status
git add -A
git commit -m "feat: server-synced wishlist and enhanced profile"
git push origin main
```

Run from repo root `E:\Projects\Immersive-Ecommerse`. Expected: push succeeds; GitHub triggers Vercel (frontend) and Render (backend) auto-deploys.

- [ ] **Step 2: Wait for deployments to finish and verify backend API live**

Use headless Chrome CDP (pattern from `C:\Users\USER\AppData\Local\Temp\opencode\verify_stale_fix.mjs`) or direct API calls. Confirm against `https://immersive-ecommerse.onrender.com/api`:
- `POST /api/auth/login` with `admin@immersive.test` / `ChangeMe123!` returns tokens + user with `phone`, `address`, `avatar` fields.
- `GET /api/wishlist` with token works and returns `data.items`.
- `PUT /api/auth/me` updates fields.
- `POST /api/auth/avatar` with a test PNG returns `data.user.avatar` URL.

- [ ] **Step 3: Verify storefront E2E**

With the live frontend `https://immersive-ecommerse.vercel.app`:
- Login → add two products to wishlist from product cards → hard reload → wishlist hearts still filled (server-persisted) → `/account` Wishlist tab lists both.
- Guest (clear tokens) → add a product → log in → merged item appears in Wishlist tab.
- Profile tab: edit name/email → save → navbar + header update; upload avatar → avatar shows.
- Reset the admin user's name/email/avatar back to originals after verification.

- [ ] **Step 4: Restore any test data changed**

Restore admin profile (name `Admin`, email `admin@immersive.test`) and remove any temporary wishlist rows created during verification.

- [ ] **Step 5: Final commit if cleanup needed**

```bash
git add -A
git commit -m "chore: cleanup after live verification"  # only if repo files changed
git push origin main
```

---

## Self-Review Notes (run at the end, before handing off)

- [ ] Every spec section has a task: wishlists table (T1), wishlist API (T2), profile API (T3), hybrid store + auth wiring (T5), account tabs (T6), tests/types/lint/build (T4/T7), deploy+verify (T8).
- [ ] No placeholders: every step contains full code/commands.
- [ ] Type consistency: `toggleWishlist` returns `Promise<void>` everywhere; `updateUser` signature `(user: User) => void`; `UserResource` field names (`phone/address/avatar`) match the frontend `User` type.