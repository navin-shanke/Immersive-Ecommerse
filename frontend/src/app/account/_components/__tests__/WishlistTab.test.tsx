import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup, fireEvent } from '@testing-library/react';
import WishlistTab from '../WishlistTab';
import api from '@/lib/api';
import { useWishlistStore } from '@/stores/useWishlistStore';
import { useUIStore } from '@/stores/useUIStore';

vi.mock('@/lib/api', () => ({
  default: { get: vi.fn() },
}));

vi.mock('@/stores/useWishlistStore', () => ({
  useWishlistStore: {
    getState: vi.fn(() => ({ toggleWishlist: vi.fn().mockImplementation(async () => {}) })),
  },
}));

const items = [
  {
    _id: 'p1',
    name: 'Headphones',
    slug: 'headphones',
    description: 'Bass',
    longDescription: null,
    price: 100,
    compareAtPrice: null,
    sku: 'S1',
    category: { _id: 'c1', name: 'Audio' },
    images: [{ url: '/x.jpg', alt: 'x', width: 600, height: 600 }],
    variants: [],
    ratings: { average: 4, count: 2 },
    tags: [],
    featured: false,
    stock: 5,
    status: 'active',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
];

beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
  useUIStore.setState({ toasts: [] });
});

afterEach(() => cleanup());

describe('WishlistTab', () => {
  it('renders wishlist product cards from GET /wishlist', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { success: true, data: { items } } });

    render(<WishlistTab />);

    await waitFor(() => expect(screen.getByText('Headphones')).toBeTruthy());
    expect(document.querySelector('a[href="/products/headphones"]')).toBeTruthy();
  });

  it('shows empty state when there are no items', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { success: true, data: { items: [] } } });

    render(<WishlistTab />);

    await waitFor(() => expect(screen.getByText('Your wishlist is empty.')).toBeTruthy());
  });

  it('removes an item on button click', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { success: true, data: { items } } });
    const toggleWishlist = vi.fn().mockImplementation(async () => {});
    vi.mocked(useWishlistStore.getState).mockReturnValue({
      toggleWishlist,
    } as unknown as ReturnType<typeof useWishlistStore.getState>);

    render(<WishlistTab />);
    await waitFor(() => expect(screen.getByText('Headphones')).toBeTruthy());

    fireEvent.click(screen.getByLabelText('Remove Headphones'));
    await waitFor(() => expect(toggleWishlist).toHaveBeenCalledWith('p1'));
  });
});
