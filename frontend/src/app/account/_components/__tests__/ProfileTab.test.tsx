import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup, fireEvent } from '@testing-library/react';
import ProfileTab from '../ProfileTab';
import api from '@/lib/api';
import { useUIStore } from '@/stores/useUIStore';
import { User } from '@/types/user';

vi.mock('@/lib/api', () => ({
  default: { put: vi.fn(), postForm: vi.fn() },
}));

const user: User = {
  id: '1',
  name: 'Ada',
  email: 'ada@example.com',
  role: 'customer',
  createdAt: '2026-01-01T00:00:00Z',
};

beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
  useUIStore.setState({ toasts: [] });
});

afterEach(() => cleanup());

describe('ProfileTab', () => {
  it('submits updated fields to PUT /auth/me on save', async () => {
    vi.mocked(api.put).mockResolvedValue({ data: { success: true, data: { user } } });
    const onUserUpdated = vi.fn();

    render(<ProfileTab user={user} onUserUpdated={onUserUpdated} />);

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Grace' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'grace@example.com' } });
    fireEvent.click(screen.getByText('Save Changes'));

    await waitFor(() =>
      expect(api.put).toHaveBeenCalledWith('/auth/me', {
        name: 'Grace',
        email: 'grace@example.com',
        phone: '',
        address: '',
      })
    );
    await waitFor(() => expect(onUserUpdated).toHaveBeenCalledWith(user));
  });

  it('shows per-field 422 errors', async () => {
    vi.mocked(api.put).mockRejectedValue({
      response: { status: 422, data: { errors: { email: ['The email has already been taken.'] } } },
    });

    render(<ProfileTab user={user} onUserUpdated={vi.fn()} />);

    fireEvent.click(screen.getByText('Save Changes'));

    await waitFor(() => expect(screen.getByText('The email has already been taken.')).toBeTruthy());
  });

  it('uploads an avatar file via POST /auth/avatar', async () => {
    vi.mocked(api.postForm).mockResolvedValue({ data: { success: true, data: { user } } });
    const onUserUpdated = vi.fn();

    render(<ProfileTab user={user} onUserUpdated={onUserUpdated} />);

    const input = document.querySelector('input[type=file]') as HTMLInputElement;
    fireEvent.change(input, {
      target: { files: [new File(['x'], 'a.png', { type: 'image/png' })] },
    });

    await waitFor(() =>
      expect(api.postForm).toHaveBeenCalledWith('/auth/avatar', expect.objectContaining({ file: expect.any(File) }))
    );
    await waitFor(() => expect(onUserUpdated).toHaveBeenCalledWith(user));
  });
});
