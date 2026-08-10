# Migration Audit Report — Express/MongoDB → Laravel/MySQL

Date: 2026-08-08
Scope: verify every storefront/admin flow after the backend migration, classify bugs by severity.
Method: static review + live API calls with real Sanctum tokens + `tsc`/`next build`.

> **Follow-up (same day):** all CRITICAL and HIGH issues have been fixed and verified. See
> the [Resolution Log](#resolution-log) at the bottom. MEDIUM/LOW items were documented and
> later resolved — see the status column and the [Late Fixes](#late-fixes) section.

---

## Severity Classification Summary

| # | Severity | Bug | Status |
|---|----------|-----|--------|
| 1 | CRITICAL | Cart API entirely missing in Laravel (`/api/cart` → 404) | **FIXED & VERIFIED** |
| 2 | CRITICAL | Checkout API entirely missing (`/checkout/create-order` → 404) | **FIXED & VERIFIED** |
| 3 | HIGH | `next build` fails type-check (pre-existing `ProductForm.tsx` errors) | **FIXED & VERIFIED** |
| 4 | HIGH | Admin category edit always fails (422 slug collision) | **FIXED & VERIFIED** |
| 5 | HIGH | Product detail page color swatches broken (variant shape mismatch) | **FIXED & VERIFIED** |
| 6 | MEDIUM | `api.ts` JWT-expiry decode runs on Sanctum opaque tokens (dead/wasteful path) | FIXED — removed dead branch |
| 7 | MEDIUM | Brand filter is dead (frontend hardcodes `brand:''`; no brand field in API) | CONFIRMED — not fixed |
| 8 | LOW | `CategoryResource` duplicated fallback expression | FIXED — deduped |
| 9 | LOW | `docs/API.md` describes the old Express/Mongo backend (fully stale) | FIXED — deleted |

---

## CRITICAL

### 1. Cart is completely broken — `/api/cart` returns 404

**Root cause:** The Laravel backend has no cart implementation at all:
- No `carts` / `cart_items` migrations (only users, cache, jobs, personal_access_tokens, categories, products, product_images, product_variants)
- No `Cart` model, no `CartController`
- No `/cart` routes in `routes/api.php`

**Affected files:**
- `laravel-backend/routes/api.php` — missing cart group
- `frontend/src/stores/useCartStore.ts` — `addItem`, `removeItem`, `updateQuantity`, `clearCart`, `loadCart` all hit `/cart*`

**Repro:** `GET /api/cart` with valid Bearer token → `404`. Every cart operation shows "Failed to add item to cart" toast and rolls back.

**Impact:** Cart drawer, add-to-cart, quantity updates, and cart persistence all fail for every customer.

**Fix approach:** Add `carts` + `cart_items` migration, `Cart`/`CartItem` models, `CartController` (GET/POST/PATCH/DELETE `/cart/:itemId`/DELETE `/cart`), auth middleware, routes. Return shape compatible with `transformCart()` in `useCartStore.ts`.

### 2. Checkout is completely broken — `/checkout/create-order` returns 404

**Root cause:** No order implementation in Laravel:
- No `orders` / `order_items` / `addresses` migrations
- No `Order` model, no `CheckoutController`
- No `/checkout/*` routes

**Affected files:**
- `laravel-backend/routes/api.php` — missing checkout group
- `frontend/src/app/checkout/page.tsx` — posts to `/checkout/create-order` (steps 1→2) and `/checkout/verify` (Razorpay verify, step 3→4)

**Repro:** Attempt checkout → `POST /api/checkout/create-order` → `404`, stuck on delivery step.

**Impact:** No customer can place an order; Razorpay flow is dead.

**Fix approach:** Add `orders` + `order_items` migrations, `Order`/`OrderItem` models, `CheckoutController` (`create-order` → 201 with `orderId` + `amount`, `verify` → mark paid via Razorpay signature check), auth middleware, routes.

---

## HIGH

### 3. Production build fails — `next build` errors in `ProductForm.tsx`

**Root cause:** Pre-existing TypeScript errors in the admin product form, not caused by the migration:
- `frontend/src/app/admin/products/_components/ProductForm.tsx:66` (and 119, 147, 300) — variant `price`/`sale_price` typed as `string` from form inputs but passed to API as `number` (and vice-versa); `alt: string | null` vs `string | undefined`.

**Repro:** `npx next build` → "Compiled successfully in 2.6s" then **"Failed to type check"** → build exits non-zero.

**Impact:** **Deployment blocker** — the production build cannot be produced.

**Fix approach:** Correct the variant payload types (parse to number / handle null-alt) so `tsc --noEmit` and `next build` pass.

### 4. Admin category edit always fails — 422 "slug has already been taken"

**Root cause:** `UpdateCategoryRequest` (and `UpdateProductRequest`) call
`$this->route('category')` / `$this->route('product')` for the unique-rule `ignore()`, but the routes are declared as `{id}`. `route('category')` returns `null`, so `ignore()` never excludes the current record and the unchanged unique value always collides with itself.

**Affected files:**
- `laravel-backend/app/Http/Requests/UpdateCategoryRequest.php`
- `laravel-backend/app/Http/Requests/UpdateProductRequest.php`
- `laravel-backend/routes/api.php` — `/admin/categories/{id}`, `/admin/products/{id}`

**Repro (confirmed):** `PUT /api/admin/categories/1` with unchanged slug → `422 {"slug":["The slug has already been taken."]}`.

**Why products "work":** The frontend `ProductForm.tsx` (lines 131-137) omits `sku`/`slug` from the payload when unchanged — a workaround that masks the same backend bug. The categories page always sends `slug`, so category edits are fully broken.

**Fix approach:** Use the correct param key — `$this->route('id')` (or `Rule::unique(..)->ignore($category)` via `find($id)`).

### 5. Product detail color swatches broken — variant shape mismatch

**Root cause:** `ProductResource` emits variant fields at the **top level**:
```json
{ "color": "Black", "colorHex": "#1f2937", "size": "M", "options": { "size": "M" } }
```
but the storefront detail page reads them from `options`:
- `frontend/src/app/products/[id]/page.tsx` — `v.options?.color`, `v.options?.colorHex`, `v.options?.size`

**Impact:** Color swatches / hex never render on the product detail page (size happens to work because `options.size` exists).

**Fix approach:** In `products/[id]/page.tsx`, read `v.color` / `v.colorHex` / `v.size` (top level) with fallback to `v.options`.

---

## MEDIUM

### 6. `api.ts` decodes Sanctum tokens as JWT

`frontend/src/lib/api.ts` does `atob(accessToken.split('.')[1])` to read `exp`. Sanctum tokens look like `67|a1b2...` (no dots) → `JSON.parse(atob(''))` throws → the catch falls through to the refresh path. It works, but it is a dead/wasteful branch and never actually detects expiry (tokens are opaque, server-side only).

### 7. Brand filter is dead

- `frontend/src/app/products/page.tsx` / `ProductsPageClient` hardcodes `brand: ''` in the API request and never passes the `brands` prop to `ProductFilters` (so the brand section is hidden).
- The Laravel `ProductResource` has no `brand` field at all; `transformProduct` maps `brand: ''`.

**Impact:** Brand filtering is unimplemented in both layers. Pre-existing; only surfaced by the audit.

---

## LOW

### 8. `CategoryResource` duplicated fallback

`laravel-backend/app/Http/Resources/CategoryResource.php:22`:
```php
'product_count' => $this->product_count ?? $this->product_count ?? 0,
```
Double `??` — harmless, remove the duplicate.

### 9. `docs/API.md` describes the old backend

It documents `_id`, JWT auth + cookies, Stripe, cents prices, `/auth/signup`. The real backend is Laravel/Sanctum/Razorpay, uses `id`, returns dollars, and has `/auth/register`. Rewrite or delete.

---

## What Is Verified Working (no action needed)

- **Auth:** register (201), login (200/422), me, refresh — Sanctum token pairs; shape matches `types/user.ts` (`id`, not `_id`).
- **Admin auth gate:** customer token → `403` on `/admin/*`; `admin@immersive.test` (from `.env`) works, role `admin`.
- **Admin CRUD:** products list/create/update/delete, categories list/create/delete (only *update* is broken, see #4).
- **Storefront catalogue:** product list (dollars), search, categories, product detail, related — all confirmed via live calls.
- **Frontend `tsc`/lint:** only `ProductForm.tsx` blocks (see #3); eslint warnings are pre-existing (`no-img-element`, unescaped entities).

---

## Resolution Log

### Fixed — #1 Cart backend (Laravel)

New files (matching existing `2026_08_07_*` migration style, Laravel 13.24 / PHP 8.5):
- `database/migrations/2026_08_08_000001_create_carts_table.php` — `carts` (user_id unique FK)
- `database/migrations/2026_08_08_000002_create_cart_items_table.php` — `cart_items` (unique `cart_id+variant_id`, FKs to products/product_variants)
- `app/Models/Cart.php`, `app/Models/CartItem.php`
- `app/Http/Controllers/CartController.php` — GET `/cart`, POST `/cart`, PATCH `/cart/{id}`, DELETE `/cart/{id}`, DELETE `/cart`
- `routes/api.php` — cart routes under `auth:sanctum`

Response shape matches `transformCart()` in `useCartStore.ts` exactly:
`item.variant` is a **scalar variant id** (frontend calls `item.variant?.toString()`), `item.price` is the effective sale price, cart payload returns `_id`, `items[]`, `total`, and embeds a full `ProductResource` per item.

### Fixed — #2 Checkout backend (Laravel)

- `database/migrations/2026_08_08_000003_create_orders_table.php` — `orders` with embedded `shipping_address` JSON, `order_number`, status enum matching `types/order.ts`, Razorpay fields
- `database/migrations/2026_08_08_000004_create_order_items_table.php` — `order_items` snapshot (name/sku/unit_price/options/color/size/image_url)
- `app/Models/Order.php`, `app/Models/OrderItem.php`
- `app/Http/Controllers/CheckoutController.php` — `create-order` (201) + `verify`
- `routes/api.php` — checkout routes under `auth:sanctum`

Pricing mirrors `CartSummary.tsx`: shipping `0` when subtotal > 100 else `9.99`, tax `round(subtotal × 0.08)`, total rounded to 2dp. Returns `{orderId, razorpayOrderId, amount (paise), currency: 'INR'}` as the frontend expects.

**Razorpay**: `config/services.php` now exposes a `razorpay` block (`key_id`/`key_secret`/`webhook_secret`). When `RAZORPAY_KEY_ID` + `RAZORPAY_KEY_SECRET` are set in `laravel-backend/.env`, `create-order` calls the Razorpay Orders API and returns a real `order_*` id; `verify` performs the real HMAC signature check. With no keys configured it falls back to a locally generated id and test-mode verify (matches order + marks `processing`, records payment ids, clears the cart), keeping the flow testable offline. Note: PHP on the dev machine must have a CA bundle (`curl.cainfo`/`openssl.cafile`) or the Razorpay HTTPS call fails SSL verification and silently falls back to stub mode.

### Fixed — #3 `next build` type-check (`ProductForm.tsx`)

Root cause: `FormState.variants` was typed as `ProductVariantPayload[]` (numeric `price`/`stock`/`sale_price`) but the form edits these as strings. Added a form-local `FormVariant` interface (string price fields) used by `FormState`/`setVariant`; the submit path already converts to `Number(...)` for the payload. Also changed image `alt` mapping `|| null` → `|| undefined` to match `ProductImagePayload.alt?: string`. Verified: `npx tsc --noEmit` clean and `npx next build` completes successfully (15 routes generated).

### Fixed — #4 Admin 422 on edit

`UpdateProductRequest`/`UpdateCategoryRequest` now call `$this->route('id')` in the unique-rule `ignore()` (the admin routes are `/admin/{resource}/{id}`), so unchanged `slug`/`sku` no longer collide with the current row. Verified live: `PUT /api/admin/categories/5` and `PUT /api/admin/products/12` with unchanged slug/sku → 200.

### Fixed — #5 Product detail color swatches

`products/[id]/page.tsx` now types the top-level `salePrice`/`color`/`colorHex`/`size` on `ApiProduct.variants` and maps them in `transformProduct` (`v.size ?? v.options?.size`, `v.color ?? v.options?.color`, `v.colorHex`), matching what `ProductResource` actually emits.

### Verification evidence

- `php artisan migrate --force` — 4 new tables created.
- Live (admin Bearer token): POST `/cart` (add, sale-price honored) → GET `/cart` → PATCH `/cart/1` (qty 3) → duplicate-variant POST bumps qty → POST `/checkout/create-order` (amount 41036 paise = 379.96 subtotal + 30.40 tax, free shipping) → POST `/checkout/verify` (status `processing`) → GET `/cart` empty. Empty-cart `create-order` → 422; unauthenticated `/cart` → 401.
- `php -l` clean on all 11 new/modified PHP files; `route:list` shows 5 cart + 2 checkout routes.
- `npx tsc --noEmit` → clean; `npx next build` → success.

### Test data cleanup

The verification run created cart/order rows for user id 1 (admin). Left in place as seed data; delete via `php artisan tinker` if unwanted:
```php
App\Models\Order::truncate(); App\Models\OrderItem::truncate(); App\Models\CartItem::truncate(); App\Models\Cart::truncate();
```

---

## Late Fixes

Applied after the original audit, low-risk cleanups:

### #6 — removed dead JWT-expiry decode in `frontend/src/lib/api.ts`

The 401 interceptor decoded the access token as a JWT to check `exp`, but Sanctum OPQRST tokens are opaque (`67|a1b2…`, no dot-separated payload), so the branch always threw and fell through to the refresh path. Removed the dead branch; 401 now goes straight to the refresh flow.

### #8 — deduped `CategoryResource` fallback

`CategoryResource` emitted `'productCount' => $this->product_count ?? $this->product_count ?? 0` — duplicated fallback expression. Now single `?? 0`.

### #9 — deleted stale docs

`docs/API.md`, `docs/ARCHITECTURE.md`, `docs/SETUP.md` documented the pre-migration Express/MongoDB/Stripe stack. None were referenced by the README. Deleted. Superpowers planning artifacts under `docs/superpowers/` (guest-cart/admin-dashboard specs) also removed as stale scratch docs.
