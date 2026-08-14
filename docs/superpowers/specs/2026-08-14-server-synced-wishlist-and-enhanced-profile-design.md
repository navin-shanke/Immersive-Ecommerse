# Design: Server-Synced Wishlist & Enhanced Profile

Date: 2026-08-14
Status: Approved

## Problem

1. The "wishlist" icon saves product IDs **only in the browser** (`localStorage` key `wishlist-storage`, zustand `persist` in `frontend/src/stores/useWishlistStore.ts`). It does not follow the user across devices, browsers, or after clearing browser data. There is no backend table or API route.
2. The user profile is read-only. The `users` table stores only `name`, `email`, `password`, `role`. There is no way to edit name/email, add phone/address, set an avatar, or view the wishlist; `/account` (frontend) only displays info + order history + logout.

## Goals

- Persist the wishlist server-side, keyed to the logged-in account, with a product join so the profile shows rich product cards (image, price, stock, slug).
- Keep a browser-only wishlist for guests and **merge it into the account on login/signup** (mirroring the existing cart behavior: `mergeGuestCart` in `useAuthStore`).
- Enhance the `/account` page: edit name/email, optional phone + address, avatar upload, and a wishlist list.
- Keep the existing wishlist store API (`toggleWishlist` / `isInWishlist` / `clearWishlist`) so `ProductCard.tsx` and the product detail page keep working without changes.

## Non-Goals

- No change-password flow (explicitly deselected by the user; can be a follow-up).
- No avatar delete endpoint or crop/zoom editor (single upload replaces current avatar).
- No S3/R2 object storage for avatars (Render's local `public` disk is ephemeral across redeploys; this matches existing product-image behavior and is accepted).
- No "move to cart"/"add all to cart" bulk actions on the wishlist list.
- No admin-side wishlist/customer-wishlist views.

## Approach

Hybrid wishlist store on the frontend (guest = `localStorage`, authenticated = server) + two small Laravel controllers and two migrations on the backend, reusing the existing public-disk upload pattern and the existing cart-merge flow as the templates.

## Components & Data Flow

### Backend (Laravel)

#### New migrations

1. `database/migrations/2026_08_14_000001_create_wishlists_table.php`
   - `id` (bigint, auto), `user_id` FK -> `users.id` (cascade delete), `product_id` FK -> `products.id` (cascade delete), `timestamps`.
   - `unique(['user_id', 'product_id'])` — prevents duplicates, enables idempotent merge.

2. `database/migrations/2026_08_14_000002_add_profile_fields_to_users_table.php`
   - Adds to `users`: `phone` (string, nullable), `address` (text, nullable), `avatar_path` (string, nullable).

#### Model changes (`app/Models/User.php`)

- Add `phone`, `address`, `avatar_path` to `$fillable`.
- Add relations:
  - `wishlists(): HasMany` (Wishlist item rows).
  - `wishlistedProducts(): BelongsToMany(Product::class, 'wishlists')` (unique pivot ordering; ordered by pivot `created_at` desc so newest additions appear first).

#### New model `app/Models/Wishlist.php`

- `$fillable = ['user_id', 'product_id']`.
- `belongsTo(User)`, `belongsTo(Product)`.

#### `app/Http/Resources/UserResource.php`

- Add `phone`, `address`.
- Change `avatar` from hardcoded `null` to: `$this->avatar_path ? $request->getSchemeAndHttpHost().'/storage/'.$this->avatar_path : null` (same scheme/host resolution as `AdminUploadController:56`; `UserResource::toArray` already receives the `$request`).

#### New `app/Http/Controllers/WishlistController.php`

All routes live in the existing `auth:sanctum` group.

- `index()`: `ProductResource::collection($user->wishlistedProducts()->with(['category','images','variants'])->get())` wrapped as `{ success: true, data: { items: [...] } }`. Uses `ProductResource` so the frontend gets image/slug/price/stock exactly as in the catalogue.
- `store(Request)`: validate `product_id` required + exists; `firstOrCreate(['user_id','product_id'])`; return 201 `{ success, data: { item: ProductResource } }` (idempotent — re-adding existing product is a no-op success).
- `destroy(Request, string $id)`: delete the wishlist row for the authenticated user by product id; 404 if not present; `{ success: true }`.
- `merge(Request)`: validate `product_ids` array of existing products; `insertOrIgnore` (as rows) or upsert; return the merged full list (fresh `ProductResource` collection). Used by `login`/`signup` to union the guest browser list into the account.

#### New `app/Http/Controllers/ProfileController.php`

- `update(Request)`: validate `name` required string max 255; `email` required email, `unique:users,email,{id}` (exclude self); `phone` nullable string max 20; `address` nullable string max 1000. Update, then return fresh `UserResource` (`{ success, data: { user } }`).
- `uploadAvatar(Request)`: reuse the allowed-MIME + 5MB validation logic from `AdminUploadController` (`image/jpeg|png|webp|gif|avif|bmp|svg`), store under `avatars/{random}.ext` on the `public` disk, delete the previous avatar file if present, set `avatar_path`, return `{ success, data: { user } }` with the fresh avatar URL.

#### Routes (`routes/api.php`)

Inside the existing `auth:sanctum` group:

```
Route::get('/wishlist', [WishlistController::class, 'index']);
Route::post('/wishlist', [WishlistController::class, 'store']);
Route::post('/wishlist/merge', [WishlistController::class, 'merge']);
Route::delete('/wishlist/{productId}', [WishlistController::class, 'destroy']);

Route::put('/auth/me', [ProfileController::class, 'update']);
Route::post('/auth/avatar', [ProfileController::class, 'uploadAvatar']);
```

Note: route ordering — `POST /wishlist/merge` must be declared before any `{param}` POST route (there are none other, but keep it explicit).

### Frontend (Next.js)

#### `src/types/user.ts`

- Add `phone?: string`, `address?: string`, `avatar?: string`.

#### `src/stores/useWishlistStore.ts` (rework)

Stays hybrid, keeps the existing public API so `ProductCard.tsx:22-23,44` and `products/[id]/page.tsx:139-140,204` are unchanged:

- State: `items: string[]`, plus the existing actions, plus:
  - `hydrateWishlist(): Promise<void>` — when authenticated, replace `items` from `GET /wishlist` (extract product `_id`); when logged out, read from localStorage.
  - `mergeGuestWishlist(): Promise<void>` — POST local-only IDs to `/wishlist/merge`, then clear the local list and refresh `items` from the server. Called by `useAuthStore` in `login`/`signup` (mirrors `mergeGuestCart`, `useAuthStore.ts:44,55`).
  - `toggleWishlist():` — if authenticated, optimistically update local `items` + fire `POST /wishlist` or `DELETE /wishlist/{id}`, rollback + best-effort toast on failure; if guest, update localStorage (existing behavior). `isInWishlist` stays a pure selector over `items`.
  - `clearWishlist(): void` — **local-only** clear (used on logout path so no account data lingers in the browser). Server-side rows are intentionally NOT deleted on logout — the account wishlist must survive across sessions and devices.
- Keep `persist` for the guest list with the same `wishlist-storage` key (store shape grows; old persisted values are `{ state: { items: [...] }, version: 0 }` — keep `version` semantics compatible so existing localStorage carries over).

#### `src/stores/useAuthStore.ts`

- `login` + `signup`: after `mergeGuestCart()` (line 44/55), also `await useWishlistStore.getState().mergeGuestWishlist()`.
- Add `updateUser(user: User)` action: `saveUserToStorage(user)` + `set({ user })` — called by the profile form after a successful `PUT /auth/me` or avatar upload.
- `loadUser()`: after fetching `/auth/me`, also `useWishlistStore.getState().hydrateWishlist()` (fire-and-forget or awaited — awaited avoids a flash of stale local items).

#### `src/app/account/page.tsx` (rework into tabs)

Single page, three tabs toggled in local component state (no routing change):

1. **Profile** tab
   - Avatar: if `user.avatar` show `<img>`; else existing initials circle.
   - Upload control: file input (`accept="image/*"`), on change POST `FormData` to `/auth/avatar` via `api`, then `useAuthStore.updateUser(data.data.user)`; show inline error/toast on failure.
   - Form fields: name (required), email (required), phone (optional), address (optional textarea).
   - Save -> `PUT /auth/me` -> `updateUser(data.data.user)` -> success toast. Validation errors shown per-field from the API response (422 shape).
2. **Wishlist** tab
   - On mount + after toggle/merge: `GET /wishlist` -> render `ProductResource` items as cards (image via `images[0]?.url`, name, price, stock badge, link to `/products/{slug}`, remove button calling `toggleWishlist(product._id)`).
   - Empty state: message + "Start Shopping" link (reuse order-empty styling).
3. **Orders** tab
   - Existing order-history block, moved verbatim into this tab.

The page keeps the redirect-to-login guard (`page.tsx:41-44`), loading skeleton, and logout button.

#### Cart/wishlist interplay

- No changes to `ProductCard.tsx` or `products/[id]/page.tsx` (store API unchanged).
- Logout already calls `useCartStore.getState().resetCart()` (`useAuthStore.ts:64`); add `useWishlistStore.getState().clearWishlist()` alongside so no account data lingers locally (server copy is preserved).

## Error Handling

- Wishlist API failure (network/401): optimistic rollback in the store; existing axios interceptor handles 401 refresh/redirect (`api.ts:121-147`).
- Avatar upload failure: inline error message on the Profile tab; previous avatar untouched.
- Profile save 422: per-field errors from Laravel validation rendered next to inputs.
- Merge failure during login: log + surface non-blocking toast; guest items remain in localStorage so the next login retries.

## Testing

- Backend: PHPUnit harness exists (`tests/Feature/AuthTest.php` pattern, `RefreshDatabase`, `actingAs($user, 'sanctum')`). Add:
  - `tests/Feature/WishlistTest.php` — add/remove/merge/index, auth gating, idempotent add, unique constraint.
  - `tests/Feature/ProfileTest.php` — `PUT /auth/me` updates name/email/phone/address, email-unique-except-self, validation 422s, `POST /auth/avatar` stores file + sets `avatar_path`.
- Frontend TDD with the existing vitest setup (repo already has vitest for settings `normalizeValue`):
  - `useWishlistStore` unit tests: guest toggle mutates localStorage-only; authenticated toggle dispatches POST/DELETE; `mergeGuestWishlist` POSTs local IDs then clears; `isInWishlist` reflects optimistic state.
  - Account page component test: renders three tabs, profile form submits `PUT /auth/me`, avatar input calls `/auth/avatar`, wishlist tab renders items or empty state.
- Manual end-to-end verification on the deployed site (headless Chrome CDP pattern from `verify_stale_fix.mjs`):
  - Login -> add two products to wishlist -> hard refresh -> wishlist still present (server-persisted).
  - Guest adds product -> log in -> merged item appears server-side.
  - Edit name/email/phone/address -> save -> `/auth/me` reflects changes -> navbar name updated.
  - Upload avatar -> `/auth/me` returns new avatar URL -> `/account` renders it; `ProductResource` product join shows image/price on wishlist tab.

## Schema / Migration Concerns

- New `wishlists` table on the existing PostgreSQL instance (Render). `insertOrIgnore`/`firstOrCreate` handles the unique constraint cleanly.
- Backward compatible: old localStorage `{state:{items},version:0}` rehydrates into the new store shape; users table additions are all nullable.

## Dependencies

- None new for the backend (uses existing Laravel `Storage`, validation).
- None new for the frontend (zustand, axios, framer-motion already present).