# Render Deployment — Persistent Disk for Uploads

The Laravel backend (`immersive-ecommerse-api` on Render) stores uploaded product
images in `storage/app/public/uploads`. Render containers have **ephemeral**
filesystems: files written at runtime are lost on redeploy. A Render **Disk**
mounted at `/app/storage` makes uploads survive restarts and deploys.

## Prerequisite: instance plan

Render **Disks require a paid instance** (Starter or higher). Free instances
have ephemeral storage only — the disk cannot be attached. Upgrade the web
service plan before attaching the disk.

## Option A — Attach to the existing service (recommended)

Your live service was created manually, so attach the disk through the dashboard:

1. Render dashboard → **Immersive Ecommerce API** web service → **Settings** → **Disks**.
2. **Add Disk**:
   - Name: `storage`
   - Mount Path: `/app/storage`
   - Size: `1 GB` (default; resize later if needed)
3. **Save & Redeploy** (Render restarts the service with the disk attached).
4. Confirm storage is writable and the symlink exists:
   ```bash
   # from a Render Shell (Settings → Shell) or via a deploy log check
   ls -ld /app/storage/app/public/uploads /app/public/storage
   ```
   Both should exist; `uploads` should be owned by `application`.

No code changes are needed for Option A: `run-deploy.sh` already
pre-creates the writable directories, `chown`s `/app/storage` and
`/app/bootstrap/cache` to the php-fpm user, and runs `php artisan storage:link`.

## Option B — Redeploy from blueprint (reproducible infra)

`render.yaml` codifies the service, the managed Postgres database, and the
`storage` disk. To provision a **new** environment from it:

1. Render dashboard → **New** → **Blueprint** → select this repo.
2. Review the service + disk; set the `sync: false` env vars (`APP_URL`,
   `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `SANCTUM_STATEFUL_DOMAINS`,
   `ADMIN_EMAIL`, `ADMIN_PASSWORD`).
3. Apply. The blueprint creates the Postgres DB, the web service, and the disk.

> Note: applying a blueprint provisions new resources. If your goal is just the
> disk on the **existing** service, use Option A.

## Verify uploads persist

1. Log in to the admin, upload an image (Products → New → upload).
2. Open the returned `/storage/uploads/<file>` URL → should be HTTP 200.
3. **Trigger a redeploy**, then reload the same URL → should still be 200
   (this is what fails without the disk).
