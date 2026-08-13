import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import ImageCropModal from '../ImageCropModal';

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
