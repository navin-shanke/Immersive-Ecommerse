import { describe, it, expect, vi, afterEach } from 'vitest';
import { getCroppedBlob, toPngFile, loadImage } from '@/lib/image-crop';
import type { Area } from '@/lib/image-crop';

const AREA: Area = { x: 0, y: 0, width: 100, height: 80 };

let lastCanvasWidth = 0;
let lastCanvasHeight = 0;

function fakeImage(): HTMLImageElement {
  const img = new globalThis.Image();
  Object.defineProperty(img, 'naturalWidth', { value: 200 });
  Object.defineProperty(img, 'naturalHeight', { value: 160 });
  return img;
}

function mockImageLoads(img: HTMLImageElement, fail = false) {
  const fakeCtor = function (this: unknown) {
    return img;
  } as unknown as typeof Image;
  vi.spyOn(globalThis, 'Image').mockImplementation(fakeCtor);
  queueMicrotask(() => {
    if (fail) img.onerror?.(new Event('error'));
    else img.onload?.(new Event('load'));
  });
}

const originalCreateElement = document.createElement.bind(document);

function mockCanvas() {
  const drawSpy = vi.fn();
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
      const mockCtx = {
        drawImage: drawSpy,
        setTransform: vi.fn(),
        clearRect: vi.fn(),
        save: vi.fn(),
        restore: vi.fn(),
        translate: vi.fn(),
        rotate: vi.fn(),
        canvas,
      } as unknown as CanvasRenderingContext2D;
      canvas.getContext = (() => mockCtx) as unknown as typeof canvas.getContext;
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
