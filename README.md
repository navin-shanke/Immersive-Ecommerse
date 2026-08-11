<div align="center">

# 🛍️ Immersive E-Commerce

**A visually rich, full-stack e-commerce platform with 3D product previews, fluid animations, and a production-grade backend.**

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org)
[![Laravel](https://img.shields.io/badge/Laravel-13-FF2D20?logo=laravel)](https://laravel.com)
[![PHP](https://img.shields.io/badge/PHP-8.3-777BB4?logo=php)](https://php.net)
[![MySQL](https://img.shields.io/badge/MySQL-8-4479A1?logo=mysql)](https://mysql.com)
[![Three.js](https://img.shields.io/badge/Three.js-0.184-black?logo=threedotjs)](https://threejs.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss)](https://tailwindcss.com)
[![Razorpay](https://img.shields.io/badge/Razorpay-Payments-02042B)](https://razorpay.com)

</div>

---

## ✨ What Makes It Immersive

- **3D intro scene** — Three.js/React Three Fiber animated entry on first visit (session-cached)
- **3D product viewer** — Rotate and inspect products in real time with hotspot annotations
- **Fluid motion** — Framer Motion page transitions, GSAP scroll parallax, Canvas 2D ambient backgrounds
- **Dark / light mode** — Flash-free system-preference detection via `next-themes`
- **Magnetic & glass UI** — Magnetic buttons, glassmorphism cards, stagger reveals, scroll-triggered animations
- **Full checkout** — 3-step flow with Razorpay payment integration and signature-verified confirmation

---

## 🖥️ Pages

| Route | Description |
|---|---|
| `/` | Animated landing — 3D intro, hero, brand ticker, categories, trending, lookbook, testimonials |
| `/products` | Product listing with filters (category, price, color, brand, sort) |
| `/products/[id]` | Product detail — image gallery, 3D viewer, color swatches, size selector, reviews |
| `/cart` | Cart with quantity controls, summary, and promo code input |
| `/checkout` | 3-step checkout: Shipping → Payment (Razorpay) → Confirmation |
| `/auth/login` | Login with email/password |
| `/auth/signup` | Registration form |
| `/account` | User account and order history |
| `/admin` | Admin dashboard (products, orders, customers, analytics, settings) |
| `/docs/[slug]` | Documentation pages (dynamic route, 11 articles) |

---

## 🏗️ Architecture

```
Immersive-Ecommerse/
├── frontend/                    # Next.js 16 App Router
│   └── src/
│       ├── app/                 # Pages & layouts
│       │   ├── page.tsx         # Home (3D intro, hero, sections)
│       │   ├── products/        # Listing + detail pages
│       │   ├── cart/            # Cart page
│       │   ├── checkout/        # 3-step checkout
│       │   ├── auth/            # Login & signup
│       │   ├── account/         # User dashboard
│       │   └── docs/[slug]/     # Docs dynamic route
│       ├── components/
│       │   ├── three/           # Three.js — IntroScene, ProductViewer3D, ProductModel, Hotspot
│       │   ├── effects/         # AmbientBackground, ParallaxSection
│       │   ├── product/         # ProductCard, Grid, Filters, Gallery, Reviews, QuickView
│       │   ├── cart/            # CartDrawer, CartItem, CartSummary
│       │   ├── checkout/        # CheckoutProgress, ShippingForm, PaymentForm
│       │   ├── auth/            # LoginForm, SignupForm
│       │   ├── layout/          # Navbar, Footer, PageTransition
│       │   └── ui/              # AnimatedButton, GlassCard, MagneticButton, Toast, RatingStars…
│       ├── stores/              # Zustand — useAuthStore, useCartStore, useUIStore, useWishlistStore
│       ├── hooks/               # useAuth, useScrollReveal, useReducedMotion
│       ├── lib/                 # api.ts (axios), queryClient.ts, utils.ts
│       └── types/               # Product, Cart, Order, User TypeScript types
│
│
├── laravel-backend/             # Laravel API (primary backend, used by frontend)
│   └── app/
│       ├── Http/Controllers/    # Auth, Cart, Checkout, PublicProduct + Admin controllers (product, order, customer, analytics, settings)
│       ├── Http/Middleware/     # EnsureUserIsAdmin
│       ├── Models/              # User, Product, Category, Order, OrderStatusHistory, StoreSetting
│       └── Http/Resources/      # OrderResource, CustomerResource…
│   └── database/
│       ├── migrations/          # Schema incl. settings + order_status_histories
│       └── seeders/             # Categories, products, admin, 40 customers, 240 orders
│
└── docs/                        # MIGRATION_AUDIT_REPORT.md
```

---

## ⚙️ Tech Stack

### Frontend

| Technology | Version | Purpose |
|---|---|---|
| [Next.js](https://nextjs.org) | 16 | App Router, SSR, SSG |
| [React](https://react.dev) | 19 | UI framework |
| [TypeScript](https://typescriptlang.org) | 5 | Type safety |
| [Tailwind CSS](https://tailwindcss.com) | 4 | Utility-first styling |
| [Three.js](https://threejs.org) + [@react-three/fiber](https://r3f.docs.pmnd.rs) | 0.184 / 9 | 3D intro & product viewer |
| [@react-three/drei](https://github.com/pmndrs/drei) | 10 | Three.js helpers (hotspots, controls) |
| [Framer Motion](https://www.framer.com/motion/) | 12 | Page transitions, micro-interactions |
| [GSAP](https://gsap.com) | 3 | Scroll parallax, scroll triggers |
| [Zustand](https://zustand-demo.pmnd.rs) | 5 | Client state (auth, cart, UI, wishlist) |
| [TanStack Query](https://tanstack.com/query) | 5 | Server state, caching, background refetch |
| [Axios](https://axios-http.com) | 1 | HTTP client with auto token refresh |
| [next-themes](https://github.com/pacocoursey/next-themes) | 0.4 | Dark/light mode without flash |
| [Lucide React](https://lucide.dev) | 1 | Icon set |

### Backend (primary — `laravel-backend/`)

| Technology | Version | Purpose |
|---|---|---|
| [Laravel](https://laravel.com) | 13 | REST API framework |
| [PHP](https://php.net) | 8.3 | Runtime |
| [MySQL](https://mysql.com) | 8 | Database |
| [Laravel Sanctum](https://laravel.com/docs/sanctum) | 4 | Bearer-token API auth (`access` / `refresh` tokens) |
| [Razorpay API](https://razorpay.com) | Orders API | Payment orders + HMAC-SHA256 signature verification |

---

## 🎬 Animation System

Three independent animation layers work together for the immersive experience:

| Layer | Technology | Used For |
|---|---|---|
| 3D Scenes | Three.js + React Three Fiber | Intro animation, product 3D viewer |
| Page & UI motion | Framer Motion | Page transitions, hover, scroll reveals |
| Scroll effects | GSAP ScrollTrigger | Parallax, horizontal scroll, section reveals |
| Ambient FX | Canvas 2D | Particle fields, mesh gradients, ambient glow |

### 3D Intro Timeline (first visit only)
```
0–200ms     Skeleton placeholder visible
200–1500ms  Brand text scales in (spring physics)
500–2500ms  Products orbit in from edges
800–2000ms  Particles fade in
1000–1800ms Orbital rings appear
2500–3000ms Converge & pulse
3000–4000ms Camera zoom + canvas fade out
4000ms+     Page content reveals with stagger
```

> Stored in `sessionStorage` so the intro only plays once per session.

---

## 🗄️ Database Schema

The primary backend uses **MySQL** via Laravel migrations. Key tables:

```
users            — id, name, email (unique), password, role [customer|admin],
                   timestamps
categories       — id, name, slug, description, image (URL), parent_id, sort_order,
                   is_active, timestamps
products         — id, name, slug, description, long_description, price,
                   compare_at_price, sku, category_id, featured, stock,
                   low_stock_threshold, status, tags (json)
product_images   — id, product_id, url (external), alt, width, height, sort_order
product_variants — id, product_id, name, sku, price, sale_price, stock, options,
                   color, color_hex, size, sort_order
carts            — id, user_id (unique)
cart_items       — id, cart_id, product_id, variant_id, quantity
orders           — id, user_id, order_number (unique), status, subtotal, shipping,
                   tax, discount, total, currency, shipping_method,
                   shipping_address (json), razorpay_order_id, razorpay_payment_id,
                   razorpay_signature, paid_at
order_items      — id, order_id, product_id, variant_id, name, sku, unit_price,
                   quantity, options, color, color_hex, size, image_url
order_status_histories — id, order_id, status, note, created_by
settings         — id, group, key, value (unique [group,key])
personal_access_tokens — Sanctum tokens (access/refresh)
```

> All product/category images are **external URLs** (e.g. `https://picsum.photos/...`); no binary file uploads or object storage is used.

---

## 🔐 Security

| Concern | Solution |
|---|---|
| Auth | Laravel Sanctum **Personal Access Tokens** — `access` + `refresh` returned in JSON, sent as `Authorization: Bearer` |
| Passwords | Bcrypt with 12 rounds |
| Admin access | `EnsureUserIsAdmin` middleware on all `/admin` routes (403/404 for non-admins) |
| CSRF | Sanctum cookie handshake on `/sanctum/csrf-cookie`; frontend sends `X-XSRF-TOKEN` on mutations |
| Payments | HMAC-SHA256 signature verification on confirmation (`/checkout/verify`) |

---

## 💳 Payment Flow (Razorpay)

```
1. User submits shipping address in checkout
2. POST /api/checkout/create-order
   → Calculate subtotal, shipping, tax, total (INR)
   → Create Order in DB (status: pending)
   → Create Razorpay Order (or stub id when keys unset — test mode)
   → Return { orderId, razorpayOrderId, amount, currency }
3. Razorpay checkout opens (in-browser SDK)
4. User completes payment
5. POST /api/checkout/verify
   → Verify Razorpay signature (HMAC-SHA256) when a key_secret is set
   → Update order → processing, store razorpay ids, set paid_at
   → Clear the user's cart
6. User sees confirmation page
```

> No webhook endpoint is used. Confirmation is done client-side via `/checkout/verify`. Without `RAZORPAY_KEY_ID`/`SECRET`, checkout runs in **stub mode** (locally-generated order id, verify accepts) so the flow is testable offline.

---

## 🚀 Getting Started

### Prerequisites

- PHP 8.3+
- Composer
- Node.js 20+
- MySQL 8+
- Razorpay **test** keys from [dashboard.razorpay.com](https://dashboard.razorpay.com/developers) (create a *test mode* key pair)
- Git

### 1. Clone

```bash
git clone https://github.com/navin-shanke/Immersive-Ecommerse.git
cd Immersive-Ecommerse
```

### 2. Backend (Laravel — used by the frontend)

```bash
cd laravel-backend
composer install
cp .env.example .env
php artisan key:generate
# Edit .env: set DB_CONNECTION=mysql + your DB_* credentials, then
# set RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET to your test-mode keys
php artisan migrate --seed   # creates schema + demo data (12 products, 40 customers, 240 orders)
php artisan serve            # → http://localhost:4000
```

> **Development admin** (created by `AdminUserSeeder`): `admin@immersive.test` / `ChangeMe123!`
> Override via `ADMIN_EMAIL` / `ADMIN_NAME` / `ADMIN_PASSWORD` in `laravel-backend/.env`. Non-local environments must set real credentials and change the password after first login.

Razorpay runs in **test mode**: use the `rzp_test_*` keys from your dashboard; transactions are simulated, no real money moves. Checkout/confirmaton verifies the payment signature exactly like production.

### 3. Frontend

```bash
cd frontend
npm install
echo "NEXT_PUBLIC_API_URL=http://localhost:4000/api" > .env.local
echo "NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx" >> .env.local
npm run dev       # → http://localhost:3000
```

`NEXT_PUBLIC_RAZORPAY_KEY_ID` must match the `RAZORPAY_KEY_ID` in the backend `.env`. Restart `npm run dev` after changing it.

---

## 🔧 Environment Variables

### `laravel-backend/.env`

Start from `laravel-backend/.env.example`, then fill in:

```env
APP_ENV=local
APP_DEBUG=true

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=immersive_ecommerce
DB_USERNAME=immersive_app
DB_PASSWORD=your_db_password

# Razorpay test keys — https://dashboard.razorpay.com/developers
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
RAZORPAY_WEBHOOK_SECRET=your_razorpay_webhook_secret

# Seeded admin (used by AdminUserSeeder) — change in non-local environments
ADMIN_NAME=Admin
ADMIN_EMAIL=admin@immersive.test
ADMIN_PASSWORD=ChangeMe123!
```

`php artisan key:generate` sets `APP_KEY` automatically.

### `frontend/.env.local`

```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx
```

`NEXT_PUBLIC_API_URL` must point at the running Laravel server (`/api`). `NEXT_PUBLIC_RAZORPAY_KEY_ID` must match the backend `RAZORPAY_KEY_ID`, otherwise the Razorpay checkout modal cannot open. Restart `npm run dev` after changing either.

---

## 📡 API Quick Reference

Base URL: `http://localhost:4000/api` (Laravel backend). Auth endpoints return `{ accessToken, refreshToken, user }`; tokens are sent as `Authorization: Bearer <accessToken>`.

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/register` | Register (alias of signup) |
| POST | `/auth/signup` | Register with name + email + password |
| POST | `/auth/login` | Login — returns access/refresh tokens + user |
| POST | `/auth/refresh` | Rotate access + refresh tokens |
| POST | `/auth/logout` | Revoke current token |
| GET | `/auth/me` | Current user (requires auth) |

### Products (public)
| Method | Endpoint | Description |
|---|---|---|
| GET | `/products` | List with filter, sort, paginate |
| GET | `/products/search?q=` | Search |
| GET | `/products/categories` | All categories |
| GET | `/products/{id|slug}/related` | Related products |
| GET | `/products/{id|slug}` | Product detail |

### Cart (auth required)
| Method | Endpoint | Description |
|---|---|---|
| GET | `/cart` | Get cart |
| POST | `/cart` | Add item |
| PATCH | `/cart/{itemId}` | Update quantity |
| DELETE | `/cart/{itemId}` | Remove item |
| DELETE | `/cart` | Clear cart |

### Checkout (auth required)
| Method | Endpoint | Description |
|---|---|---|
| POST | `/checkout/create-order` | Create Razorpay order (validate `shippingAddress`) |
| POST | `/checkout/verify` | Verify signature + mark order paid |

### Admin (auth + `admin` role)
| Method | Endpoint | Description |
|---|---|---|
| GET | `/admin/dashboard` | Dashboard stats |
| GET | `/admin/analytics` | Sales/revenue analytics |
| CRUD | `/admin/products` | Product management |
| CRUD | `/admin/categories` | Category management |
| GET | `/admin/orders`, `PATCH /admin/orders/{id}/status` | Order management |
| GET | `/admin/customers` | Customer management |
| GET/PUT | `/admin/settings` | Store settings |

> The API routes above mirror `laravel-backend/routes/api.php`.

---

## 🌐 Deployment

### Frontend → Vercel

```bash
cd frontend && vercel --prod
```

Env vars on the Vercel project:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://<railway-app>.up.railway.app/api` (Laravel on Railway) |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | `rzp_test_...` (must match backend) |

> ⚠️ `frontend/src/lib/api.ts` falls back to a hardcoded URL when `NEXT_PUBLIC_API_URL` is unset — **always set it explicitly** in the Vercel dashboard.

### Backend + Database → Railway

Run a **Laravel** service and a **MySQL** service in the same Railway project.

Backend env vars (set in Railway dashboard):
```env
APP_ENV=production
APP_DEBUG=false
APP_URL=https://<railway-app>.up.railway.app
APP_KEY=base64:...                # php artisan key:generate

DB_CONNECTION=mysql
DB_HOST=<railway-mysql-host>
DB_PORT=3306
DB_DATABASE=<db-name>
DB_USERNAME=<db-user>
DB_PASSWORD=<db-password>

# Allow the Vercel origin to talk to the API
SANCTUM_STATEFUL_DOMAINS=<vercel-domain>

RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
ADMIN_EMAIL=you@example.com
ADMIN_PASSWORD=<strong-password>
```

**Start command** (Railway → Settings → Start Command):
```bash
php artisan migrate --force --no-interaction && php artisan serve --host=0.0.0.0 --port=$PORT
```

**Pre-deploy checklist:**
- Run `composer install --no-dev --optimize-autoloader`
- Set a real `ADMIN_PASSWORD` and `ADMIN_EMAIL` (the default `ChangeMe123!` is dev-only)
- `php artisan migrate --seed` only for a demo DB; for prod, rely on `--force` migrate + optionally seed categories/products
- No `storage:link` needed — product images are external URLs

> ⚠️ `config/cors.php` currently allows `allowed_origins: ['*']` with `supports_credentials: true`. Laravel reflects the requester origin under credentials, so cross-origin works, but for production you should pin it to your Vercel origin.

---

## 🎨 Design Tokens

```css
/* Light */
--primary:    #4f46e5   /* Indigo 600 */
--background: #ffffff
--muted:      #f9fafb
--border:     #e5e7eb

/* Dark */
--primary:    #6366f1   /* Indigo 500 */
--background: #0a0a0a
--muted:      #18181b
--border:     #27272a
```

**Typography:** Geist Sans (body), Geist Mono (code) — Next.js built-in font optimization

---

## 📄 License

MIT © [navin-shanke](https://github.com/navin-shanke)
