# Design: Admin Image Crop & Adjust Editor

Date: 2026-08-12
Status: Approved

## Problem

The admin product form uploads images directly with no way to crop, zoom, or rotate them before they reach the storefront. Administrators need a manual crop/adjust step when adding product images.

## Goals

- Let admins crop, zoom, and rotate an image before it is uploaded from the admin product form.
- Support all formats the backend already accepts (JPG, PNG, WebP, GIF, AVIF, BMP, SVG).
- Avoid touching the upload backend; export the edited image as PNG and send it through the existing `POST /admin/uploads` endpoint.

## Non-Goals

- No standalone/re-edit page for already-uploaded images.
- No brightness/contrast/saturation sliders (out of scope).
- No backend changes; PNG is already in the allowed MIME list.

## Approach

Use the `react-easy-crop` library for the interactive cropper (zoom, rotate, aspect presets, touch, and drag-resize all handled by the library via CSS transforms) plus a small canvas export util that produces a PNG `Blob`.

## Components & Data Flow

### New files

- `frontend/src/app/admin/products/_components/ImageCropModal.tsx` (`'use client'`)
  - Fixed overlay (`fixed inset-0 z-50`), centered dark panel matching the admin theme.
  - `Cropper` fills the panel's rounded container with `objectFit="contain"` and `showGrid`.
  - Controls row below the cropper:
    - Zoom slider (`min={1}`, `max={3}`).
    - Rotate buttons (90° left / right) using the `rotation` prop.
    - Aspect preset buttons: Free (default), 1:1, 4:3, 16:9. Changing aspect resets the crop box.
  - Footer: Cancel / Save & Upload.
  - Props: `open`, `imageSrc`, `onCancel`, `onConfirm(file: File)`.
- `frontend/src/lib/image-crop.ts`
  - `getCroppedBlob(imageSrc: string, croppedAreaPixels: Area, rotation: number): Promise<Blob>`
  - Loads the image, sizes a hidden canvas to the crop pixels (handles EXIF rotation), draws the cropped region, and resolves `canvas.toBlob('image/png')`.
  - `toPngFile(imageSrc, croppedAreaPixels, rotation): Promise<File>` — wraps the blob as `new File([blob], 'cropped.png', { type: 'image/png' })`.
  - `loadImage(src): Promise<HTMLImageElement>` helper for reuse and testability.

### Modified files

- `frontend/src/app/admin/products/_components/ProductForm.tsx`
  - Add `react-easy-crop` import and modal state (`editing: { src: string; file: File } | null`, queue for multiple files).
  - `handleFiles()`: for each raster image, check the 5MB cap, then enqueue the file into the editor queue (open modal for the first; on confirm/cancel advance to the next).
  - On Confirm: `toPngFile(...)` -> re-check size vs `MAX_IMAGE_SIZE` (exported PNG of a ≤5MB source can exceed 5MB) -> if over cap, error toast and keep modal open; otherwise `uploadAdminImage(pngFile)` -> append `{ url, alt: '', width: null, height: null }` to `form.images` (existing code path).
  - SVG passthrough: files with `type === 'image/svg+xml'` skip the editor and upload directly (existing toast/logic) since vector images cannot be meaningfully re-rasterized into a crop editor.
  - Existing drop zone, `accept="image/*"`, progress state, and drag handlers remain unchanged.

## Error Handling

- Exported PNG over 5MB: error toast, modal stays open so the admin can crop tighter or cancel.
- Export/upload failure: existing error toast (`'Upload failed. Check your connection and try again.'`), modal closes.
- Unsupported source type is already filtered before the editor (`f.type.startsWith('image/')`).

## Testing

- TDD with `vitest` + `jsdom` for `frontend/src/lib/image-crop.ts`:
  - `loadImage` resolves an `HTMLImageElement` from a source.
  - `getCroppedBlob` returns a PNG blob and canvas sized to `croppedAreaPixels`.
  - Rotation is applied to the exported dimensions.
- Component test for `ImageCropModal`:
  - Renders the cropper and controls when `open`.
  - Aspect preset button changes the `aspect` prop passed to the cropper.
  - Cancel calls `onCancel` and never uploads.
  - Save calls `onConfirm` with a `File`.
- Manual verification:
  - Drop JPEG/PNG/WebP/GIF -> editor opens -> crop/zoom/rotate -> Save -> image appears in the list and storefront renders it (next.config `dangerouslyAllowLocalIP: true` already set).
  - SVG bypasses the editor and uploads directly.
  - A source near the 5MB cap that exports over cap is blocked with an error toast.
- If the repo has no existing vitest config, add a minimal `vitest` + `jsdom` dev dependency and `vitest.config.ts` scoped to the frontend only.

## Dependency

- `react-easy-crop` (runtime, frontend).
- `vitest` + `jsdom` (dev, frontend) only if not already present.
