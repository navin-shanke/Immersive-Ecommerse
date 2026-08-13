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
  default: ({ onCropComplete }: { onCropComplete?: (a: unknown, b: unknown) => void }) => (
    <div data-testid="cropper">
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

const categories: { id: string; name: string; slug: string; image: string | null; productCount: number }[] = [
  { id: 'c1', name: 'Electronics', slug: 'electronics', image: null, productCount: 0 },
];

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
    fireEvent.click(screen.getByText('complete-crop'));
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