# Admin Image Crop & Adjust Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let admins crop, zoom, and rotate product images in the admin form before they upload, by routing raster uploads through a `react-easy-crop` modal that exports a PNG and sends it through the existing upload endpoint.

**Architecture:** A reusable `ImageCropModal` (react-easy-crop) plus a pure canvas export util (`image-crop.ts`) that produce a PNG `File`. `ProductForm.handleFiles()` now enqueues raster files into the editor queue, opens the modal for the first, and only uploads after Confirm. SVG bypasses the editor. Backend untouched.

**Tech Stack:** Next.js 16.2.9 (App Router), React 19.2.4, `react-easy-crop`, `vitest` + `jsdom` + `@testing-library/react` (dev).

## Global Constraints

- Repo root: `E:\Projects\Immersive-Ecommerse`; frontend code lives under `frontend/`.
- Commands run from `frontend/`: `npm run dev`, `npx tsc --noEmit`, `cmd /c "npm run lint"`, `cmd /c "npm run build"`.
- Windows PowerShell 5.1 shell — no `&&`; chain with `;`/`if ($?)`. ESLint/build need the `cmd /c` wrapper.
- Conventional commits (`feat:`, `fix:`, `docs:`, `test:`, `chore:`). TDD: write failing test → see it fail → implement → see it pass → commit.
- No comments in code unless asked. Follow existing admin theming (`zinc-*`/`indigo-*`, `Button`/`Card`/`Field` primitives imported from `../../_components/ui` relative to files in `admin/products/_components/`).
- Do NOT modify `laravel-backend/` — PNG is already accepted (`AdminUploadController::ALLOWED_MIMES`).
- `next.config.ts` already has `images.dangerouslyAllowLocalIP: true` (committed `3a9fdc0`) — do not remove.
- Frontend has no test runner today. This plan adds a minimal vitest setup; it must not break `next build` or `tsc`.
- Path alias `@/*` → `frontend/src/*` (existing).

---

### Task 1: Test infra + PNG export util (`lib/image-crop.ts`)

Folds the repo's first-ever vitest setup into the task whose deliverable needs it (the crop util). Produces the util every later task imports.

**Files:**
- Create: `frontend/vitest.config.ts`
- Modify: `frontend/package.json` (devDeps + `test` scripts)
- Create: `frontend/src/lib/image-crop.ts`
- Create: `frontend/src/lib/__tests__/image-crop.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `export interface Area { x: number; y: number; width: number; height: number }`
  - `export function loadImage(src: string): Promise<HTMLImageElement>`
  - `export async function getCroppedBlob(imageSrc: string, croppedAreaPixels: Area, rotation?: number): Promise<Blob>`
  - `export async function toPngFile(imageSrc: string, croppedAreaPixels: Area, rotation?: number): Promise<File>`

- [ ] **Step 1: Install test dependencies**

Run from `frontend/`:

```
npm install react-easy-crop
npm install -D vitest jsdom @vitejs/plugin-react @testing-library/react
```

Then add to `frontend/package.json` scripts:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 2: Add vitest config**

Create `frontend/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    include: ['src/**/__tests__/**/*.test.{ts,tsx}'],
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
```

- [ ] **Step 3: Write the failing test**

Create `frontend/src/lib/__tests__/image-crop.test.ts`:

```ts
import { describe, it, expect, vi, afterEach } from 'vitest';
import { getCroppedBlob, toPngFile, loadImage } from '@/lib/image-crop';
import type { Area } from '@/lib/image-crop';

const AREA: Area = { x: 0, y: 0, width: 100, height: 80 };

let lastCanvasWidth = 0;
let lastCanvasHeight = 0;
let lastDrawCount = 0;

function fakeImage(): HTMLImageElement {
  const img = new (originalImage())();
  Object.defineProperty(img, 'naturalWidth', { value: 200 });
  Object.defineProperty(img, 'naturalHeight', { value: 160 });
  return img;
}

let originalImageCtor: typeof Image;
function originalImage(): typeof Image {
  return originalImageCtor ?? globalThis.Image;
}

function mockImageLoads(img: HTMLImageElement, fail = false) {
  vi.spyOn(globalThis, 'Image').mockImplementation(
    () => img as unknown as typeof Image
  );
  queueMicrotask(() => {
    if (fail) img.onerror?.(new Event('error'));
    else img.onload?.(new Event('load'));
  });
}

const originalCreateElement = document.createElement.bind(document);

function mockCanvas() {
  const drawSpy = vi.fn(() => { lastDrawCount += 1; });
  vi.spyOn(document, 'createElement').mockImplementation(
    (tag: string, options?: ElementCreationOptions) => {
      if (tag !== 'canvas') return originalCreateElement(tag, options);
      const canvas = originalCreateElement('canvas') as HTMLCanvasElement;
      Object.defineProperty(canvas, 'width', {
        configurable: true,
        get: () => lastCanvasWidth,
        set: (v: number) => { lastCanvasWidth = v; },
      });
      Object.defineProperty(canvas, 'height', {
        configurable: true,
        get: () => lastCanvasHeight,
        set: (v: number) => { lastCanvasHeight = v; },
      });
      canvas.getContext = (() =>
        ({ drawImage: drawSpy, setTransform: vi.fn(), clearRect: vi.fn(), canvas }) as unknown as CanvasRenderingContext2D) as typeof canvas.getContext;
      canvas.toBlob = ((cb: BlobCallback) =>
        cb(new Blob([''], { type: 'image/png' }))) as typeof canvas.toBlob;
      return canvas;
    }
  );
  return drawSpy;
}

afterEach(() => {
  vi.restoreAllMocks();
  lastCanvasWidth = 0;
  lastCanvasHeight = 0;
  lastDrawCount = 0;
});

describe('loadImage', () => {
  it('resolves with the image element when it loads', async () => {
    const img = fakeImage();
    mockImageLoads(img);
    const loaded = await loadImage('data:image/png;base64,AAAA');
    expect(loaded).toBe(img);
  });

  it('rejects when the image fails to load', async () => {
    const img = fakeImage();
    mockImageLoads(img, true);
    await expect(loadImage('bad://src')).rejects.toThrow('Failed to load image');
  });
});

describe('getCroppedBlob', () => {
  it('returns a PNG blob with canvas sized to the crop area', async () => {
    const img = fakeImage();
    mockImageLoads(img);
    mockCanvas();
    const blob = await getCroppedBlob('data:image/png;base64,AAAA', AREA);
    expect(blob.type).toBe('image/png');
    expect(lastCanvasWidth).toBe(100);
    expect(lastCanvasHeight).toBe(80);
  });

  it('draws the source onto the canvas (rotation-aware)', async () => {
    const img = fakeImage();
    mockImageLoads(img);
    const drawSpy = mockCanvas();
    await getCroppedBlob('data:image/png;base64,AAAA', AREA, 90);
    expect(drawSpy).toHaveBeenCalled();
  });
});

describe('toPngFile', () => {
  it('wraps the exported blob as a File named cropped.png', async () => {
    const img = fakeImage();
    mockImageLoads(img);
    mockCanvas();
    const file = await toPngFile('data:image/png;base64,AAAA', AREA);
    expect(file.name).toBe('cropped.png');
    expect(file.type).toBe('image/png');
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

Run from `frontend/`: `npx vitest run src/lib/__tests__/image-crop.test.ts`

Expected: FAIL — `Cannot find module '@/lib/image-crop'` (or import error).

- [ ] **Step 5: Implement `lib/image-crop.ts`**

Create `frontend/src/lib/image-crop.ts`:

```ts
export interface Area {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = src;
  });
}

function rotateSize(width: number, height: number, rotation: number): { width: number; height: number } {
  const rad = (rotation * Math.PI) / 180;
  const cos = Math.abs(Math.cos(rad));
  const sin = Math.abs(Math.sin(rad));
  return {
    width: Math.round(width * cos + height * sin),
    height: Math.round(height * cos + width * sin),
  };
}

export async function getCroppedBlob(
  imageSrc: string,
  croppedAreaPixels: Area,
  rotation = 0
): Promise<Blob> {
  const img = await loadImage(imageSrc);
  const { width: sourceWidth, height: sourceHeight } = rotateSize(img.naturalWidth, img.naturalHeight, rotation);
  const canvas = document.createElement('canvas');
  canvas.width = croppedAreaPixels.width;
  canvas.height = croppedAreaPixels.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const rad = (rotation * Math.PI) / 180;
  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(rad);
  ctx.drawImage(
    img,
    -sourceWidth / 2,
    -sourceHeight / 2,
    sourceWidth,
    sourceHeight
  );
  ctx.restore();

  const cropped = document.createElement('canvas');
  cropped.width = croppedAreaPixels.width;
  cropped.height = croppedAreaPixels.height;
  const croppedCtx = cropped.getContext('2d');
  if (!croppedCtx) throw new Error('Canvas 2D context unavailable');
  croppedCtx.drawImage(
    canvas,
    croppedAreaPixels.x,
    croppedAreaPixels.y,
    croppedAreaPixels.width,
    croppedAreaPixels.height,
    0,
    0,
    croppedAreaPixels.width,
    croppedAreaPixels.height
  );

  return new Promise((resolve, reject) => {
    cropped.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('PNG export failed'));
    }, 'image/png');
  });
}

export async function toPngFile(
  imageSrc: string,
  croppedAreaPixels: Area,
  rotation = 0
): Promise<File> {
  const blob = await getCroppedBlob(imageSrc, croppedAreaPixels, rotation);
  return new File([blob], 'cropped.png', { type: 'image/png' });
}
```

**Important:** react-easy-crop's `croppedAreaPixels` (from `onCropComplete`) are already expressed in the **source image's natural pixel space** for `objectFit="contain"` — use them directly; no extra scaling. `imageSrc` is the `URL.createObjectURL(file)` result.

- [ ] **Step 6: Run tests to verify they pass**

Run from `frontend/`: `npx vitest run src/lib/__tests__/image-crop.test.ts`

Expected: PASS (all 5 tests).

- [ ] **Step 7: Sanity: tsc still clean**

Run from `frontend/`: `npx tsc --noEmit`
Expected: exit 0, no output.

- [ ] **Step 8: Commit**

```bash
git add frontend/vitest.config.ts frontend/package.json frontend/package-lock.json frontend/src/lib/image-crop.ts frontend/src/lib/__tests__/image-crop.test.ts
git commit -m "feat(frontend): add PNG crop export util and vitest setup"
```

---

### Task 2: `ImageCropModal` component

The interactive crop/adjust UI. Pure presentational modal — it does NOT upload; the parent decides what to do with the PNG `File` via `onConfirm`.

**Files:**
- Create: `frontend/src/app/admin/products/_components/ImageCropModal.tsx`
- Create: `frontend/src/app/admin/products/_components/__tests__/ImageCropModal.test.tsx`

**Interfaces:**
- Consumes: `toPngFile`, `Area` from `@/lib/image-crop` (Task 1).
- Produces:
  - `interface ImageCropModalProps { open: boolean; imageSrc: string; onCancel: () => void; onConfirm: (file: File) => void }`
  - `export default function ImageCropModal(props: ImageCropModalProps)`
  - Internally emits `onConfirm` with a `File`.

- [ ] **Step 1: Write the failing component test**

Create `frontend/src/app/admin/products/_components/__tests__/ImageCropModal.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import ImageCropModal from '../ImageCropModal';
import { toPngFile } from '@/lib/image-crop';

vi.mock('react-easy-crop', () => ({
  __esModule: true,
  default: ({ aspect, onCropComplete }: { aspect: number | undefined; onCropComplete?: (a: unknown, b: unknown) => void }) => (
    <div data-testid="cropper" data-aspect={aspect ?? ''}>
      <button type="button" onClick={() => onCropComplete?.({}, { x: 0, y: 0, width: 100, height: 100 })}>
        complete-crop
      </button>
    </div>
  ),
}));

vi.mock('@/lib/image-crop', () => ({
  __esModule: true,
  toPngFile: vi.fn(() => Promise.resolve(new File([''], 'cropped.png', { type: 'image/png' }))),
}));

const baseProps = {
  imageSrc: 'blob:test',
  onCancel: vi.fn(),
  onConfirm: vi.fn(),
};

describe('ImageCropModal', () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  afterEach(() => cleanup());

  it('renders nothing when closed', () => {
    const { container } = render(<ImageCropModal open={false} {...baseProps} />);
    expect(container.querySelector('[data-testid="cropper"]')).toBeNull();
  });

  it('renders the cropper and controls when open', () => {
    render(<ImageCropModal open {...baseProps} />);
    expect(screen.getByTestId('cropper')).toBeTruthy();
    expect(screen.getByText('Save & Upload')).toBeTruthy();
    expect(screen.getByText('Cancel')).toBeTruthy();
    expect(screen.getByText('1:1')).toBeTruthy();
  });

  it('changes the aspect when a preset is clicked', () => {
    render(<ImageCropModal open {...baseProps} />);
    fireEvent.click(screen.getByText('1:1'));
    expect(screen.getByTestId('cropper').getAttribute('data-aspect')).toBe('1');
    fireEvent.click(screen.getByText('16:9'));
    const ratio = parseFloat(screen.getByTestId('cropper').getAttribute('data-aspect') ?? '');
    expect(ratio).toBeGreaterThan(1.5);
  });

  it('calls onCancel without confirming', () => {
    render(<ImageCropModal open {...baseProps} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(baseProps.onCancel).toHaveBeenCalledTimes(1);
    expect(baseProps.onConfirm).not.toHaveBeenCalled();
  });

  it('calls onConfirm with a File on Save', async () => {
    render(<ImageCropModal open {...baseProps} />);
    fireEvent.click(screen.getByText('complete-crop'));
    fireEvent.click(screen.getByText('Save & Upload'));
    await waitFor(() => expect(baseProps.onConfirm).toHaveBeenCalledTimes(1));
    const arg = baseProps.onConfirm.mock.calls[0][0] as File;
    expect(arg.name).toBe('cropped.png');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run from `frontend/`: `npx vitest run src/app/admin/products/_components/__tests__/ImageCropModal.test.tsx`

Expected: FAIL — cannot resolve `../ImageCropModal`.

- [ ] **Step 3: Implement `ImageCropModal.tsx`**

Create `frontend/src/app/admin/products/_components/ImageCropModal.tsx` (imports `Button` from `../../_components/ui`, matching `ProductForm`'s import path):

```tsx
'use client';

import { useCallback, useState } from 'react';
import Cropper from 'react-easy-crop';
import type { Area } from 'react-easy-crop';
import { X, RotateCcw, RotateCw } from 'lucide-react';
import { toPngFile } from '@/lib/image-crop';
import { Button } from '../../_components/ui';

interface ImageCropModalProps {
  open: boolean;
  imageSrc: string;
  onCancel: () => void;
  onConfirm: (file: File) => void;
}

const ASPECTS: { label: string; value: number | undefined }[] = [
  { label: 'Free', value: undefined },
  { label: '1:1', value: 1 },
  { label: '4:3', value: 4 / 3 },
  { label: '16:9', value: 16 / 9 },
];

export default function ImageCropModal({ open, imageSrc, onCancel, onConfirm }: ImageCropModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [aspect, setAspect] = useState<number | undefined>(undefined);
  const [area, setArea] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);

  const onCropComplete = useCallback((_: Area, croppedAreaPixels: Area) => {
    setArea(croppedAreaPixels);
  }, []);

  if (!open) return null;

  const handleSave = async () => {
    if (!area || saving) return;
    setSaving(true);
    try {
      const file = await toPngFile(imageSrc, area, rotation);
      onConfirm(file);
    } catch {
      setSaving(false);
    }
  };

  const handleAspect = (value: number | undefined) => {
    setAspect(value);
    setCrop({ x: 0, y: 0 });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-100">Crop & Adjust Image</h2>
          <button type="button" onClick={onCancel} aria-label="Close" className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="relative h-80 m-4 rounded-lg overflow-hidden bg-zinc-950">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={aspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onRotationChange={setRotation}
            onCropComplete={onCropComplete}
            objectFit="contain"
            showGrid
            minZoom={1}
            maxZoom={3}
          />
        </div>

        <div className="p-4 pt-0 space-y-4">
          <div className="flex items-center gap-4">
            <label className="text-xs w-14 text-zinc-400">Zoom</label>
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1 accent-indigo-500"
            />
            <span className="text-xs text-zinc-500 tabular-nums">{zoom.toFixed(2)}x</span>
          </div>

          <div className="flex items-center gap-4">
            <label className="text-xs w-14 text-zinc-400">Aspect</label>
            <div className="flex gap-2">
              {ASPECTS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => handleAspect(preset.value)}
                  className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                    aspect === preset.value
                      ? 'border-indigo-500 bg-indigo-500/10 text-indigo-300'
                      : 'border-zinc-800 text-zinc-400 hover:border-zinc-600'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <label className="text-xs w-14 text-zinc-400">Rotate</label>
            <div className="flex gap-2">
              <button type="button" onClick={() => setRotation((r) => (r + 360 - 90) % 360)} className="p-2 rounded-lg border border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200 transition-colors" aria-label="Rotate left">
                <RotateCcw className="w-4 h-4" />
              </button>
              <button type="button" onClick={() => setRotation((r) => (r + 90) % 360)} className="p-2 rounded-lg border border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200 transition-colors" aria-label="Rotate right">
                <RotateCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-zinc-800 pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="button" loading={saving} onClick={handleSave}>
              Save & Upload
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run from `frontend/`: `npx vitest run src/app/admin/products/_components/__tests__/ImageCropModal.test.tsx`

Expected: PASS (all 5 tests).

- [ ] **Step 5: Typecheck + lint**

Run from `frontend/`:
- `npx tsc --noEmit`
- `cmd /c "npm run lint"`

Expected: both clean.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/admin/products/_components/ImageCropModal.tsx frontend/src/app/admin/products/_components/__tests__/ImageCropModal.test.tsx
git commit -m "feat(frontend): add admin image crop and adjust modal"
```

---

### Task 3: Wire the editor into `ProductForm` (queue, upload, SVG passthrough)

Route all raster uploads through the modal; upload only after Confirm. SVG stays on the existing direct-upload path.

**Files:**
- Modify: `frontend/src/app/admin/products/_components/ProductForm.tsx`
- Test: `frontend/src/app/admin/products/_components/__tests__/ProductFormImages.test.tsx` (new)

**Interfaces:**
- Consumes: `ImageCropModal` (`open`, `imageSrc`, `onCancel`, `onConfirm(file: File)`), `uploadAdminImage(file): Promise<{ url: string }>` (existing), `MAX_IMAGE_SIZE` (existing `5 * 1024 * 1024`).
- Produces: `form.images` entries of shape `{ url: string; alt: string; width: null; height: null }` (existing shape — unchanged for the API).

- [ ] **Step 1: Write the failing integration test**

Create `frontend/src/app/admin/products/_components/__tests__/ProductFormImages.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup, fireEvent } from '@testing-library/react';
import ProductForm from '../ProductForm';
import { uploadAdminImage } from '@/lib/admin-api';

vi.mock('@/lib/admin-api', () => ({
  __esModule: true,
  uploadAdminImage: vi.fn(),
}));

vi.mock('react-easy-crop', () => ({
  __esModule: true,
  default: () => <div data-testid="cropper" />,
}));

vi.mock('@/lib/image-crop', () => ({
  __esModule: true,
  toPngFile: vi.fn(() => Promise.resolve(new File([''], 'cropped.png', { type: 'image/png' }))),
}));

const categories: { _id: string; name: string }[] = [{ _id: 'c1', name: 'Electronics' }];

function pngFile(name = 'img.png'): File {
  return new File(['x'], name, { type: 'image/png' });
}

describe('ProductForm image upload', () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.mocked(uploadAdminImage).mockResolvedValue({ url: 'http://localhost:4000/storage/uploads/abc.png' });
  });

  afterEach(() => cleanup());

  it('opens the crop modal for a raster file and uploads after Save', async () => {
    render(<ProductForm initial={null} categories={categories} submitting={false} onSubmit={vi.fn()} />);
    const input = document.querySelector('input[type=file]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [pngFile()] } });
    await waitFor(() => expect(screen.getByText('Save & Upload')).toBeTruthy());
    // The modal's Save button triggers toPngFile (mocked) -> onConfirm(file) -> uploadAdminImage
    fireEvent.click(screen.getByText('Save & Upload'));
    await waitFor(() => expect(uploadAdminImage).toHaveBeenCalledTimes(1));
  });

  it('uploads SVG files directly without opening the crop modal', async () => {
    render(<ProductForm initial={null} categories={categories} submitting={false} onSubmit={vi.fn()} />);
    const input = document.querySelector('input[type=file]') as HTMLInputElement;
    fireEvent.change(input, {
      target: { files: [new File(['<svg/>'], 'logo.svg', { type: 'image/svg+xml' })] },
    });
    await waitFor(() => expect(uploadAdminImage).toHaveBeenCalledTimes(1));
    expect(screen.queryByText('Save & Upload')).toBeNull();
  });

  it('cancelling the crop modal does not upload', async () => {
    render(<ProductForm initial={null} categories={categories} submitting={false} onSubmit={vi.fn()} />);
    const input = document.querySelector('input[type=file]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [pngFile()] } });
    await waitFor(() => expect(screen.getByText('Cancel')).toBeTruthy());
    fireEvent.click(screen.getByText('Cancel'));
    await waitFor(() => expect(uploadAdminImage).not.toHaveBeenCalled());
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run from `frontend/`: `npx vitest run src/app/admin/products/_components/__tests__/ProductFormImages.test.tsx`

Expected: FAIL — current `handleFiles` uploads immediately with no modal, so `Save & Upload` never appears.

- [ ] **Step 3: Implement the wiring in `ProductForm.tsx`**

Apply these edits in order.

**3a. Imports** — add the modal import and `useEffect`:

```tsx
import { useEffect, useRef, useState } from 'react';
```
```tsx
import ImageCropModal from './ImageCropModal';
```

(Add the `ImageCropModal` import after the `import { Button, Card, ... } from '../../_components/ui';` line. Keep everything else in the import block unchanged.)

**3b. State** — after `const fileInputRef = useRef<HTMLInputElement>(null);` add:

```tsx
  const [editQueue, setEditQueue] = useState<{ src: string; file: File }[]>([]);
  const currentEdit = editQueue[0] ?? null;
  const objectUrls = useRef<string[]>([]);

  const revokeObjectUrls = () => {
    objectUrls.current.forEach((u) => URL.revokeObjectURL(u));
    objectUrls.current = [];
  };

  const dequeueEditor = () => {
    setEditQueue((queue) => {
      if (queue[0]) URL.revokeObjectURL(queue[0].src);
      return queue.slice(1);
    });
  };
```

**3c. Cleanup on unmount** — add after the state/derived declarations:

```tsx
  useEffect(() => {
    return revokeObjectUrls;
  }, []);
```

**3d. Replace `handleFiles`** — replace the whole existing function (currently ~lines 124-151):

```tsx
  async function handleFiles(files: FileList | File[]) {
    const list = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (list.length === 0) {
      addToast({ type: 'error', message: 'Only image files are supported.' });
      return;
    }

    const direct: File[] = [];
    const toEdit: File[] = [];
    for (const file of list) {
      if (file.size > MAX_IMAGE_SIZE) {
        addToast({ type: 'error', message: `${file.name} is larger than 5 MB and was skipped.` });
        continue;
      }
      if (file.type === 'image/svg+xml') {
        direct.push(file);
      } else {
        toEdit.push(file);
      }
    }

    let directUploads = 0;
    for (const file of direct) {
      try {
        const { url } = await uploadAdminImage(file);
        setForm((prev) => ({ ...prev, images: [...prev.images, { url, alt: '', width: null, height: null }] }));
        directUploads += 1;
      } catch {
        addToast({ type: 'error', message: 'Upload failed. Check your connection and try again.' });
      }
    }
    if (directUploads > 0) {
      addToast({ type: 'success', message: 'Image uploaded.' });
    }

    if (toEdit.length > 0) {
      const queue = toEdit.map((file) => ({ src: URL.createObjectURL(file), file }));
      objectUrls.current.push(...queue.map((q) => q.src));
      setEditQueue((prev) => [...prev, ...queue]);
    }

    setUploading(false);
    setDragging(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }
```

**3e. Confirm/cancel handlers** — add after the existing `handleFileInput` function:

```tsx
  async function handleEditorConfirm(file: File) {
    setUploading(true);
    try {
      if (file.size > MAX_IMAGE_SIZE) {
        addToast({ type: 'error', message: 'Edited PNG exceeds 5 MB. Crop tighter and try again.' });
        return;
      }
      const { url } = await uploadAdminImage(file);
      setForm((prev) => ({ ...prev, images: [...prev.images, { url, alt: '', width: null, height: null }] }));
      addToast({ type: 'success', message: 'Image uploaded.' });
      dequeueEditor();
    } catch {
      addToast({ type: 'error', message: 'Upload failed. Check your connection and try again.' });
    } finally {
      setUploading(false);
      setDragging(false);
    }
  }

  function handleEditorCancel() {
    dequeueEditor();
    setDragging(false);
  }
```

Note: in `handleEditorConfirm`, on the over-cap branch we `return` without dequeuing so the modal stays open (size-cap error path per spec); the `finally` still resets `uploading`. This keeps the modal open since `currentEdit` is unchanged.

**3f. Render the modal** — insert immediately before the closing `</form>` (after the sticky submit column's closing `</div>`):

```tsx
      <ImageCropModal
        open={currentEdit !== null}
        imageSrc={currentEdit?.src ?? ''}
        onCancel={handleEditorCancel}
        onConfirm={handleEditorConfirm}
      />
```

- [ ] **Step 4: Run tests to verify they pass**

Run from `frontend/`: `npx vitest run src/app/admin/products/_components/__tests__/ProductFormImages.test.tsx`

Expected: PASS (all 3 tests).

- [ ] **Step 5: Full frontend checks**

Run from `frontend/`:
- `npx tsc --noEmit`
- `cmd /c "npm run lint"`
- `cmd /c "npm run test"`

Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/admin/products/_components/ProductForm.tsx frontend/src/app/admin/products/_components/__tests__/ProductFormImages.test.tsx
git commit -m "feat(frontend): route admin image uploads through crop editor"
```

---

### Task 4: Manual end-to-end verification

Confirm the feature works against the live backend and storefront.

**Files:** none (verification only).

- [ ] **Step 1: Ensure servers are running**

- Backend: port 4000. If down: `php artisan serve` in `laravel-backend/`.
- Frontend: port 3000. If down: `npm run dev` in `frontend/` (detached, log to `dev-server.log`).
- Admin login: `admin@immersive.test` / `ChangeMe123!` (seeded).

- [ ] **Step 2: Browser flow — success path**

1. Open `http://localhost:3000/admin/products` → login if needed → **New product**.
2. Drop (or browse-select) a JPEG/PNG/WebP/GIF.
3. Confirm the crop modal opens with the image, zoom slider, aspect buttons (Free/1:1/4:3/16:9), and rotate buttons.
4. Change aspect to 1:1 → drag/zoom → rotate 90° right → **Save & Upload**.
5. Expect the image to appear in the product Images list with "Image uploaded." toast.
6. Save the product as Active → open the storefront product page → the cropped image renders (thanks to `dangerouslyAllowLocalIP`, already committed).

- [ ] **Step 3: Browser flow — SVG passthrough**

1. In the same form, drop an `.svg` file.
2. Expect: no modal; it uploads directly and appears in the list.

- [ ] **Step 4: Browser flow — size cap on export**

1. Find/prepare an image just under 5MB that, cropped-to-PNG, exceeds 5MB (or temporarily lower `MAX_IMAGE_SIZE` and revert after).
2. If reproducible: expect an error toast "Edited PNG exceeds 5 MB." and the modal staying open.

- [ ] **Step 5: Regression sweep**

1. Storefront `/products`, `/products/:id` listings render images for existing products (seed + Navin upload).
2. `frontend` checks from Task 3 Step 5 still pass.
3. Confirm no editor appears when just viewing images (URL-add flow untouched).

- [ ] **Step 6: Report results**

Summarize: what shipped, test counts, manual results. Do NOT commit in this task unless a fix surfaces (then commit it with a focused conventional message and re-run checks).

---

## Self-Review Notes

- **Spec coverage:** crop/zoom/rotate ✓ (Task 2), aspect presets Free/1:1/4:3/16:9 ✓ (Task 2 `ASPECTS`), PNG export ✓ (Task 1), SVG passthrough ✓ (Task 3 `handleFiles`), export-size re-check with modal kept open ✓ (Task 3 `handleEditorConfirm` + note in 3e), backend untouched ✓ (Global Constraints), vitest added only because absent ✓ (Task 1 — confirmed absent). JSON: `next.config.ts` untouched.
- **Type consistency:** `Area` defined in Task 1, imported by Task 1 test, Task 2 component, Task 2 test's `react-easy-crop` types; `toPngFile(imageSrc, area, rotation)` signature identical across Task 1 impl/test, Task 2 and Task 3. `onConfirm(file: File)` matches between Task 2 props and Task 3 `handleEditorConfirm`.
- **Fixed during self-review:** (a) canvas mock no longer recurses — it calls the captured original `document.createElement`; (b) `16:9` assertion checks a numeric ratio instead of a brittle string; (c) removed stray `Area: {}` from module mocks; (d) `Button` import path corrected to `../../_components/ui`; (e) functional `setForm` used to avoid stale-closure drops when multiple files queue before a re-render.