# Implementation Plan: Fix dummy features, add image uploads & store settings, speed up admin panel

Date: 2026-08-12
Status: Approved design (`.superpowers/sdd-2026-08-12-fix-dummy-features/design.md`)

## Objective

Make every non-working control in the admin panel, user dashboard, and storefront actually work, in three connected tracks:

1. **Wire up the settings system** that already persists (`StoreSetting` + `AdminSettingsController` + `StoreSettingsSeeder`) but is never read: expose it to the storefront and enforce maintenance mode + store info (name, announcement, contact details).
2. **Add local image uploads** (drag-drop + file picker) to replace the URL-only product image input, and keep the URL input for external links.
3. **Speed up the admin dashboard** by collapsing N queries into 3 aggregate queries and adding two database indexes.

Then sweep the remaining panel/dashboard/storefront pages for any other dead buttons/controls.

## Global Constraints

- Repo root: `E:\Projects\Immersive-Ecommerse`. Backend = `laravel-backend/`, frontend = `frontend/`.
- Backend runs on `:4000`, frontend on `:3000`. Test DB is `immersive_ecommerce_test` (MySQL, see `laravel-backend/phpunit.xml`); run tests from `laravel-backend/`.
- **TDD everywhere**: write the failing test first, watch it fail, then implement, then watch it pass.
- Commit after each green task with conventional-commit messages matching repo style (`feat(admin): ...`, `fix(frontend,backend): ...`).
- Uploads: stored under `storage/app/public/uploads`, served via the `public` disk symlink. `POST /admin/uploads` returns an **absolute URL** built from `request()->getSchemeAndHttpHost()` (never `APP_URL`, which lacks the `:4000` dev port). 5MB cap; allow JPG/PNG/WebP/GIF/AVIF/BMP/SVG.
- `frontend/next.config.ts` needs an `http` `remotePattern` added for `/storage/uploads/...` so the Next `<Image>` optimizer can load uploaded images.
- The existing uncommitted fallback fix in `frontend/src/components/ui/ProductShowcase.tsx` (`src={product.images[0]?.url || '/placeholder.svg'}`) must be preserved.
- Do not gate `/auth/*` routes behind the maintenance screen (admins must be able to log in to reach the admin panel).
- Cache keys used by settings: invalidate `store.public.settings` and `store.maintenance` whenever settings change (in addition to the existing `admin.*` keys already handled by `AdminSettingsController`).

## Design Recap (from approved design doc)

- **Storefront settings**: `GET /api/settings/public` returns `{ store: {name, tagline, announcement, support_email, support_phone, address}, security: {maintenance_mode} }`. `GET /api/settings/public/maintenance` returns `{ maintenance_mode }`. Both cached. Maintenance mode is enforced by the `admin` middleware alias on a new public route group (403 JSON for all non-admin storefront requests), and the frontend `SiteChrome` shows an offline screen when maintenance is on (admin + auth routes exempt).
- **Uploads**: `POST /admin/uploads` (multipart `file`) → `{ success, data: { url } }` with absolute URL. Frontend `ProductForm` gets a drag-drop/file-picker area that uploads and appends a `ProductImagePayload` with just `{ url }`; the URL input stays for external links.
- **Performance**: new migration adds `orders(paid_at)`, `orders(status, paid_at)`, `order_items(product_id, created_at)` indexes. `AdminDashboardController::kpis()` rewritten as 3 aggregate queries; `revenueTrend()` rewritten as 1 grouped query + day fill-in.

## Task 1 — Backend upload endpoint

Files: `laravel-backend/app/Http/Controllers/AdminUploadController.php` (new), `laravel-backend/routes/api.php`, `laravel-backend/tests/Feature/AdminUploadTest.php` (new)

1. **Test first** — write `tests/Feature/AdminUploadTest.php`:
   - `store_lists_uploads`: `actingAs($user,'sanctum')` (create admin via `AdminUserFactory` pattern used in `AdminProductTest`), fake `Storage::fake('public')`, `postJson('/admin/uploads', ['file' => UploadedFile::fake()->image('photo.png')->size(100)])` → assert 201, `data.url` starts with `http://localhost/storage/uploads/`, and `Storage::disk('public')->exists("uploads/{basename(url)}")` (extract filename).
   - `store_uploads_allowed_formats`: parameterized over `image/png`, `image/jpeg`, `image/webp`, `image/gif`, `image/avif`, `image/bmp`, `image/svg+xml` → 201 each.
   - `rejects_oversized_file`: 6000 KB PNG → 422.
   - `rejects_non_image`: `UploadedFile::fake()->create('doc.txt', 10, 'text/plain')` → 422.
   - `requires_authentication`: no auth → 401.
   - `requires_admin`: `actingAs` a `role=customer` user → 403 (uses the existing `admin` middleware alias).
   - Run: `php artisan test --filter=AdminUploadTest` → RED.
2. Implement `AdminUploadController`:
   ```php
   <?php

   namespace App\Http\Controllers;

   use Illuminate\Http\Request;
   use Illuminate\Http\JsonResponse;
   use Illuminate\Support\Str;
   use Illuminate\Support\Facades\Storage;

   class AdminUploadController extends Controller
   {
       private const ALLOWED_MIMES = [
           'image/jpeg', 'image/png', 'image/webp', 'image/gif',
           'image/avif', 'image/bmp', 'image/svg+xml',
       ];

       public function store(Request $request): JsonResponse
       {
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
           $file->storeAs('uploads', $filename, 'public');

           return response()->json([
               'success' => true,
               'data' => [
                   'url' => $request->getSchemeAndHttpHost().'/storage/uploads/'.$filename,
               ],
           ], 201);
       }
   }
   ```
   Register route in `routes/api.php` **inside the existing admin group** (uses `admin` middleware alias):
   ```php
   Route::post('/admin/uploads', [AdminUploadController::class, 'store']);
   ```
   (Import the controller at the top of the file alongside the existing admin controllers.)
3. Run `php artisan test --filter=AdminUploadTest` → GREEN.
4. Verify symlink + manual smoke (fold in here because the endpoint needs it): `php artisan storage:link` (creates `laravel-backend/public/storage`). Start server if needed (`php artisan serve` on `:4000`), upload a file via the running app UI later in Task 2; at minimum confirm `GET http://localhost:4000/storage/...` resolves after Task 2.
5. Commit: `feat(admin): add POST /admin/uploads for product image uploads`

## Task 2 — Frontend image upload UI

Files: `frontend/src/lib/admin-api.ts`, `frontend/src/app/admin/products/_components/ProductForm.tsx`, `frontend/next.config.ts`, `frontend/src/lib/types.ts` (if `AdminImage` needs a home)

1. Add to `admin-api.ts`:
   ```ts
   export interface AdminUploadResponse {
     success: boolean;
     data: { url: string };
   }

   /** Upload an image file and return the stored absolute URL. */
   export async function uploadAdminImage(file: File): Promise<{ url: string }> {
     const { data } = await api.postForm<AdminUploadResponse>('/admin/uploads', { file });
     return data.data;
   }
   ```
2. `next.config.ts`: add to `remotePatterns`:
   ```ts
   { protocol: 'http', hostname: '**' },
   ```
   (keeps the existing `https` `**` pattern).
3. In `ProductForm.tsx`:
   - Add state: `const [uploading, setUploading] = useState(false);` plus `const [dragging, setDragging] = useState(false);`.
   - Add `handleFiles(files: FileList | File[])` that filters image/* files, loops them, calls `uploadAdminImage`, appends `{ url, alt: '', width: null, height: null }` to the `images` field via the existing form state setter, and shows a toast/error on failure (match existing toast usage in the file).
   - Add `handleDrop(e: React.DragEvent<HTMLDivElement>)` (preventDefault + `handleFiles(e.dataTransfer.files)`) and `handleFileInput(e: React.ChangeEvent<HTMLInputElement>)`.
   - Replace the single "Image URL" input block with a two-part block: (a) a drop zone styled like the card (border-dashed, upload icon via `lucide-react`, shows "Upload" button + "or drag and drop", disabled while `uploading`, `onDragOver={() => setDragging(true)}`, `onDragLeave={() => setDragging(false)}`, `onDrop={handleDrop}`, hidden `<input type="file" accept="image/*" multiple>`), and (b) keep the existing URL text input labeled "Or paste an image URL (external images)" so external links still work.
   - Keep the existing images list + remove buttons unchanged.
   - Note: uploaded images already have an absolute URL, so they pass straight through the existing `images` rendering with `unoptimized={false}` (works after the `next.config` change).
4. Verify: `cd frontend; npx tsc --noEmit` (or `npm run lint`), then `npm run build`. If the dev server is running, manually upload a file and confirm it displays.
5. Commit: `feat(frontend): add drag-drop image upload to admin product form`

## Task 3 — Backend public settings endpoint + maintenance enforcement

Files: `laravel-backend/app/Models/StoreSetting.php`, `laravel-backend/app/Http/Controllers/AdminSettingsController.php`, `laravel-backend/app/Http/Controllers/PublicSettingsController.php` (new), `laravel-backend/app/Http/Middleware/EnsureMaintenanceMode.php` (new), `laravel-backend/bootstrap/app.php`, `laravel-backend/routes/api.php`, `laravel-backend/tests/Feature/PublicSettingsTest.php` (new), `laravel-backend/tests/Feature/MaintenanceGateTest.php` (new)

1. **Test first** — `tests/Feature/PublicSettingsTest.php`:
   - `returns_public_store_settings`: seed a `store` group setting (via `StoreSetting::set` or factory), `getJson('/api/settings/public')` → 200, `data.store.name` matches, `data.security.maintenance_mode` is boolean false (seed default).
   - `caches_public_settings`: two requests, `Cache::has('store.public.settings')` true after first; then `StoreSetting::set('security', 'maintenance_mode', true)` and assert `getJson` still returns the cached false, then `Cache::forget('store.public.settings')` and assert it returns true.
   - `returns_maintenance_flag`: `getJson('/api/settings/public/maintenance')` → `data.maintenance_mode` boolean.
   - `maintenance_true_sets_flag_true`: set maintenance true, hit `/api/settings/public/maintenance` → true.
   - **Tests already pass for the endpoint shape** (endpoint doesn't exist yet) → these fail on 404 first; that is the RED.
   Also add to `AdminSettingsTest`: after `PUT /admin/settings`, assert `store.public.settings` and `store.maintenance` cache keys are cleared (extend the existing cache-forget assertion).
2. Implement:
   - `StoreSetting::bool(string $group, string $key, bool $default = false): bool` — `filter_var((string) $this->get($group, $key, $default ? 'true' : 'false'), FILTER_VALIDATE_BOOLEAN)`. (Handle stored values `'1'`, `'true'`, `''`, `'false'`.)
   - `PublicSettingsController`:
     ```php
     <?php

     namespace App\Http\Controllers;

     use App\Models\StoreSetting;
     use Illuminate\Support\Facades\Cache;
     use Illuminate\Http\JsonResponse;

     class PublicSettingsController extends Controller
     {
         public function index(): JsonResponse
         {
             return Cache::remember('store.public.settings', now()->addMinutes(5), function () {
                 return response()->json([
                     'store' => [
                         'name' => StoreSetting::get('store', 'name'),
                         'tagline' => StoreSetting::get('store', 'tagline'),
                         'announcement' => StoreSetting::get('store', 'announcement'),
                         'support_email' => StoreSetting::get('store', 'support_email'),
                         'support_phone' => StoreSetting::get('store', 'support_phone'),
                         'address' => StoreSetting::get('store', 'address'),
                     ],
                     'security' => [
                         'maintenance_mode' => StoreSetting::bool('security', 'maintenance_mode'),
                     ],
                 ]);
             });
         }

         public function maintenance(): JsonResponse
         {
             $flag = Cache::remember('store.maintenance', now()->addMinutes(5), fn () =>
                 StoreSetting::bool('security', 'maintenance_mode'));
             return response()->json(['maintenance_mode' => $flag]);
         }
     }
     ```
   - `AdminSettingsController::update` already invalidates `admin.*` keys; add `Cache::forget('store.public.settings'); Cache::forget('store.maintenance');`.
   - `EnsureMaintenanceMode` middleware:
     ```php
     <?php

     namespace App\Http\Middleware;

     use App\Models\StoreSetting;
     use Illuminate\Support\Facades\Cache;
     use Illuminate\Http\Request;
     use Illuminate\Http\JsonResponse;

     class EnsureMaintenanceMode
     {
         public function handle(Request $request, \Closure $next): JsonResponse
         {
             $maintenance = Cache::remember('store.maintenance', now()->addMinutes(5), fn () =>
                 StoreSetting::bool('security', 'maintenance_mode'));

             if ($maintenance) {
                 return response()->json(['message' => 'Store is under maintenance.'], 503);
             }

             return $next($request);
         }
     }
     ```
   - `bootstrap/app.php`: add `$middleware->alias(['maintenance' => \App\Http\Middleware\EnsureMaintenanceMode::class]);`
   - `routes/api.php`: add a **public** group applying `maintenance` middleware to the storefront routes **except** the new settings routes, auth routes, admin routes, and health route:
     ```php
     Route::middleware(['maintenance'])->group(function () {
         // existing public storefront routes (home, products, product detail, cart, checkout, etc.)
     });
     ```
     Keep the existing admin group and the new `GET /settings/public` + `GET /settings/public/maintenance` **outside** the maintenance group. Auth routes (`/auth/*`) stay outside too.
3. **Test first (middleware)** — `tests/Feature/MaintenanceGateTest.php`:
   - `storefront_blocked_when_maintenance_on`: set maintenance true, `getJson('/api/products')` (or a known public route) → 503.
   - `storefront_allowed_when_maintenance_off`: default seed → 200.
   - `settings_endpoints_always_available`: maintenance true, `getJson('/api/settings/public/maintenance')` → 200.
   - `admin_routes_not_blocked`: maintenance true, `actingAs($admin,'sanctum')` `getJson('/api/admin/dashboard/kpis')` → 200.
   - Run → RED.
4. Implement middleware + alias + route groups → run → GREEN.
5. Verify all: `php artisan test --filter='PublicSettingsTest|MaintenanceGateTest|AdminSettingsTest'` plus full `php artisan test`.
6. Commit: `feat(backend): expose public store settings and enforce maintenance mode`

## Task 4 — Frontend storefront wiring

Files: `frontend/src/lib/store-settings.ts` (new), `frontend/src/components/layout/SiteChrome.tsx`, `frontend/src/components/layout/Navbar.tsx`, `frontend/src/components/ui/Logo.tsx`, `frontend/src/app/layout.tsx`, `frontend/src/app/products/[id]/page.tsx` (title fallback), `frontend/src/app/page.tsx` (hero name fallback), `frontend/src/components/providers/index.tsx` (if needed)

1. Create `frontend/src/lib/store-settings.ts`:
   ```ts
   import api from '@/lib/api';

   export interface PublicStoreSettings {
     store: {
       name: string;
       tagline: string;
       announcement: string;
       support_email: string;
       support_phone: string;
       address: string;
     };
     security: {
       maintenance_mode: boolean;
     };
   }

   export async function fetchPublicStoreSettings(): Promise<PublicStoreSettings> {
     const { data } = await api.get<{ store: PublicStoreSettings['store']; security: PublicStoreSettings['security'] }>('/settings/public');
     return data;
   }
   ```
2. In `SiteChrome.tsx`:
   - Add `useQuery({ queryKey: ['store-settings'], queryFn: fetchPublicStoreSettings, staleTime: 5 * 60_000 })` (import from the new module).
   - Derive `maintenance = settings?.security.maintenance_mode === true`.
   - `const isAdmin = pathname?.startsWith('/admin') ?? false;` and `const isAuth = pathname?.startsWith('/auth') ?? false;`
   - If `maintenance && !isAdmin && !isAuth`: render an offline screen (centered, brand `Logo`, "We'll be right back", support email/phone from settings, in the same theme as the 404 page) and return early.
   - Otherwise for non-admin routes: render `<Navbar settings={settings} />` + `CartDrawer` + `<main className={cn('flex-1', settings?.store.announcement ? 'pt-8' : '')}>` + `Footer`. (The announcement strip renders inside the fixed Navbar, which is 64px + 32px strip = 96px tall; adding `pt-8` only when an announcement is present keeps content clear.)
   - Admin branch unchanged (plain `<main>`), no settings fetch needed — disable the query on admin (`enabled: !isAdmin`) so admins don't hit it.
3. In `Navbar.tsx`:
   - Accept an optional `settings?: PublicStoreSettings` prop.
   - Render a slim announcement strip as the first child of the fixed nav when `settings?.store.announcement` is non-empty (`h-8` centered, small text, brand-tinted background).
   - Replace hardcoded brand text/link with `settings?.store.name || 'IMMERSIVE'` (keep `Logo` component in place, which already renders the name).
4. `Logo.tsx` / `layout.tsx` / page titles: make store name come from settings where the brand is rendered; `layout.tsx` metadata stays static (title "IMMERSIVE - The Future of Shopping" is fine) but pass settings into `Logo` in `SiteChrome`/`Navbar`. For page titles (`products/[id]`, hero), use `settings?.store.name` fallback to 'IMMERSIVE'.
5. Verify: `cd frontend; npx tsc --noEmit; npm run lint; npm run build`. Manual: toggle maintenance in admin settings → storefront shows offline screen (auth still works); set announcement → strip shows; change store name → navbar updates.
6. Commit: `feat(frontend): wire storefront to live store settings and maintenance mode`

## Task 5 — Admin dashboard performance

Files: `laravel-backend/database/migrations/2026_08_12_000001_add_order_performance_indexes.php` (new), `laravel-backend/app/Http/Controllers/AdminDashboardController.php`, `laravel-backend/tests/Feature/AdminDashboardTest.php` (extend)

1. **Migration** (new file):
   ```php
   <?php

   use Illuminate\Database\Migrations\Migration;
   use Illuminate\Database\Schema\Blueprint;
   use Illuminate\Support\Facades\Schema;

   return new class extends Migration
   {
       public function up(): void
       {
           Schema::table('orders', function (Blueprint $table) {
               $table->index('paid_at');
               $table->index(['status', 'paid_at']);
           });

           Schema::table('order_items', function (Blueprint $table) {
               $table->index(['product_id', 'created_at']);
           });
       }

       public function down(): void
       {
           Schema::table('orders', function (Blueprint $table) {
               $table->dropIndex(['orders_status_paid_at_index']);
               $table->dropIndex(['orders_paid_at_index']);
           });

           Schema::table('order_items', function (Blueprint $table) {
               $table->dropIndex(['order_items_product_id_created_at_index']);
           });
       }
   };
   ```
   Run `php artisan migrate` and verify with `SHOW INDEX FROM orders` / `SHOW INDEX FROM order_items` (via `php artisan tinker` or MySQL client).
2. **Test first** — extend `AdminDashboardTest` with a `revenue_trend_includes_zero_days` test: create a delivered order 2 days ago (`Order::factory()->create([... 'status' => 'delivered', 'total' => 250.00, 'paid_at' => now()->subDays(2)])`), request the single dashboard endpoint `/api/admin/dashboard` (route `Route::get('/dashboard', AdminDashboardController::class)` — there is no separate revenue-trend endpoint), then assert `data.revenueTrend` has 30 entries, the entry for `now()->subDays(2)->format('Y-m-d')` has `revenue` 250.00, and the day before it has `revenue` 0.0. Existing tests already cover `kpis` shape. Run the new test → RED.
3. **Refactor `AdminDashboardController`** (keep the response shape identical — all existing tests must stay green):
   - `kpis()`: replace ~9 queries with 3:
     ```php
     private function kpis(Carbon $now): array
     {
         $monthStart = $now->copy()->startOfMonth();
         $todayStart = $now->copy()->startOfDay();

         $orderAgg = Order::query()
             ->selectRaw("
                 COUNT(*) AS total_orders,
                 SUM(CASE WHEN status = 'delivered' THEN total ELSE 0 END) AS delivered_total,
                 SUM(CASE WHEN status = 'delivered' AND paid_at >= ? THEN total ELSE 0 END) AS revenue_month,
                 SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END) AS orders_today,
                 SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END) AS orders_month,
                 SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending_orders,
                 SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) AS delivered_count
             ", [$monthStart->format('Y-m-d H:i:s'), $todayStart->format('Y-m-d H:i:s'), $monthStart->format('Y-m-d H:i:s')])
             ->first();

         $customerAgg = User::query()
             ->where('role', 'customer')
             ->selectRaw('COUNT(*) AS total_customers, SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END) AS customers_month', [$monthStart->format('Y-m-d H:i:s')])
             ->first();

         $lowStockCount = Product::query()
             ->where('status', 'active')
             ->whereColumn('stock', '<=', 'low_stock_threshold')
             ->count();

         $deliveredCount = (int) ($orderAgg->delivered_count ?? 0);
         $deliveredTotal = (float) ($orderAgg->delivered_total ?? 0);

         return [
             'revenue' => [
                 'total' => round($deliveredTotal, 2),
                 'month' => round((float) ($orderAgg->revenue_month ?? 0), 2),
             ],
             'orders' => [
                 'total' => (int) ($orderAgg->total_orders ?? 0),
                 'today' => (int) ($orderAgg->orders_today ?? 0),
                 'month' => (int) ($orderAgg->orders_month ?? 0),
                 'pending' => (int) ($orderAgg->pending_orders ?? 0),
             ],
             'customers' => [
                 'total' => (int) ($customerAgg->total_customers ?? 0),
                 'month' => (int) ($customerAgg->customers_month ?? 0),
             ],
             'avgOrderValue' => $deliveredCount > 0 ? round($deliveredTotal / $deliveredCount, 2) : 0.0,
             'lowStock' => $lowStockCount,
             'asOf' => $now->toISOString(),
         ];
     }
     ```
     (Uses `paid_at` for revenue so refunds/pending still excluded correctly; `total` vs `subtotal` semantics preserved from current code — verify against the current controller before applying.)
   - `revenueTrend()`: one grouped query + day fill-in:
     ```php
     private function revenueTrend(Carbon $from, Carbon $now): array
     {
         $rows = Order::query()
             ->where('status', 'delivered')
             ->where('paid_at', '>=', $from)
             ->selectRaw('DATE(paid_at) AS day, SUM(total) AS revenue, COUNT(*) AS orders')
             ->groupBy('day')
             ->get()
             ->keyBy('day');

         $days = [];
         $cursor = $from->copy();

         while ($cursor <= $now) {
             $key = $cursor->format('Y-m-d');
             $row = $rows->get($key);
             $days[] = [
                 'date' => $key,
                 'revenue' => $row ? round((float) $row->revenue, 2) : 0.0,
                 'orders' => $row ? (int) $row->orders : 0,
             ];
             $cursor->addDay();
         }

         return $days;
     }
     ```
     (Switch the `where` filter from `created_at` to `paid_at` — verify the current controller's intent first; keep whatever semantic the current tests assert.)
   - Leave `statusBreakdown`, `topSellingProducts`, `recentOrders`, `recentCustomers`, `activity` as-is unless they have obvious N+1s.
4. Run full suite: `php artisan test` → all green (existing `AdminDashboardTest` asserts must pass unchanged).
5. **N+1 audit** (part of this task): read `AdminOrderController`, `AdminCustomerController`, `AdminAnalyticsController`; confirm eager loading; fix any `->load()`-less relation access found; add/adjust tests only if a real bug is found. Keep scope tight — report findings in the commit message.
6. Commit: `perf(admin): collapse dashboard KPIs into aggregate queries and add order indexes`

## Task 6 — Sweep remaining dummy controls + full verification

Files: `frontend/src/app/admin/**`, `frontend/src/app/dashboard/**`, `frontend/src/app/**` (storefront pages), `laravel-backend/**` (routes/controllers)

1. **Audit pass** (read, no code yet): grep the frontend for buttons/links with no `onClick`/`href` or with `disabled`/`TODO`/`placeholder` handlers; check admin products/users/orders/analytics pages, dashboard order/history/profile pages, storefront product/cart/checkout pages. Also grep the backend for routes with controllers returning stub/static data.
2. For each dead control found: fix it if it has a real backend counterpart (wire to existing API), or remove it if the feature does not exist (mirror the `bf0294d` "remove dead Google/GitHub OAuth" precedent). Add a feature test only when behavior changes meaningfully (e.g., a button that now triggers a real request). Log each finding + resolution in the commit message.
3. **Full verification**:
   - `cd laravel-backend; php artisan test` (all green).
   - `cd frontend; npx tsc --noEmit; npm run lint; npm run build`.
   - Manual smoke (dev servers on `:3000`/`:4000`): upload an image in product form and see it in the storefront; toggle maintenance on → storefront offline, `/auth/login` still reachable, admin panel works; set announcement + store name → visible in navbar; dashboard KPIs still render.
4. Commit: `fix(admin,frontend): sweep remaining dead controls` (or `chore:`/`refactor:` per the nature of findings; split into multiple commits if findings span distinct features).

## Commit Sequence (each after its task is green)

1. `feat(admin): add POST /admin/uploads for product image uploads`
2. `feat(frontend): add drag-drop image upload to admin product form`
3. `feat(backend): expose public store settings and enforce maintenance mode`
4. `feat(frontend): wire storefront to live store settings and maintenance mode`
5. `perf(admin): collapse dashboard KPIs into aggregate queries and add order indexes`
6. `fix(admin,frontend): sweep remaining dead controls` (+ any extra commits from findings)

## Verification Command Cheatsheet

- Backend tests: `cd laravel-backend; php artisan test` (single: `php artisan test --filter=AdminUploadTest`)
- Typecheck/lint/build: `cd frontend; npx tsc --noEmit; npm run lint; npm run build`
- Manual: dev servers on `:3000`/`:4000`

## Risks / Notes

- `selectRaw` bindings must be pre-formatted date strings (Carbon instances are unreliable in raw bindings).
- `getSchemeAndHttpHost()` in tests returns `http://localhost` (no port) — assertions use that prefix.
- Storage symlink (`php artisan storage:link`) must exist before uploads 404-check; it's created in Task 1.
- The `paid_at`-vs-`created_at` semantics for revenue must be copied from the current controller; do not change revenue semantics, only query shape.
- `order_items.product_id` already has an FK index; the new composite `(product_id, created_at)` is additive.
- Keep the uncommitted `ProductShowcase.tsx` fallback fix in the working tree.
