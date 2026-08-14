import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useWishlistStore } from '../useWishlistStore';
import api from '@/lib/api';

vi.mock('@/lib/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockedApi = vi.mocked(api);

beforeEach(() => {
  localStorage.clear();
  useWishlistStore.setState({ items: [] });
  vi.clearAllMocks();
});

describe('useWishlistStore', () => {
  it('toggles locally for guests without calling the API', () => {
    localStorage.removeItem('accessToken');

    useWishlistStore.getState().toggleWishlist('p1');
    expect(useWishlistStore.getState().isInWishlist('p1')).toBe(true);

    useWishlistStore.getState().toggleWishlist('p1');
    expect(useWishlistStore.getState().isInWishlist('p1')).toBe(false);

    expect(mockedApi.post).not.toHaveBeenCalled();
    expect(mockedApi.delete).not.toHaveBeenCalled();
  });

  it('persists guest items to localStorage', () => {
    localStorage.removeItem('accessToken');

    useWishlistStore.getState().toggleWishlist('p1');

    expect(localStorage.getItem('wishlist-storage')).toContain('p1');
  });

  it('adds to the server when authenticated and stays optimistic', async () => {
    localStorage.setItem('accessToken', 't');
    mockedApi.post.mockResolvedValue({ data: { success: true } });

    await useWishlistStore.getState().toggleWishlist('p1');

    expect(mockedApi.post).toHaveBeenCalledWith('/wishlist', { product_id: 'p1' });
    expect(useWishlistStore.getState().isInWishlist('p1')).toBe(true);
  });

  it('removes from the server when authenticated', async () => {
    localStorage.setItem('accessToken', 't');
    mockedApi.post.mockResolvedValue({ data: { success: true } });
    mockedApi.delete.mockResolvedValue({ data: { success: true } });

    await useWishlistStore.getState().toggleWishlist('p1');
    expect(useWishlistStore.getState().isInWishlist('p1')).toBe(true);

    await useWishlistStore.getState().toggleWishlist('p1');
    expect(useWishlistStore.getState().isInWishlist('p1')).toBe(false);
    expect(mockedApi.delete).toHaveBeenCalledWith('/wishlist/p1');
  });

  it('rolls back local state on API failure', async () => {
    localStorage.setItem('accessToken', 't');
    mockedApi.post.mockRejectedValue(new Error('network'));

    await useWishlistStore.getState().toggleWishlist('p1');

    expect(useWishlistStore.getState().isInWishlist('p1')).toBe(false);
  });

  it('rolls back local state when DELETE fails', async () => {
    localStorage.setItem('accessToken', 't');
    mockedApi.post.mockResolvedValue({ data: { success: true } });
    mockedApi.delete.mockRejectedValue(new Error('network'));

    await useWishlistStore.getState().toggleWishlist('p1');
    expect(useWishlistStore.getState().isInWishlist('p1')).toBe(true);

    await useWishlistStore.getState().toggleWishlist('p1');
    expect(useWishlistStore.getState().isInWishlist('p1')).toBe(true);
    expect(mockedApi.delete).toHaveBeenCalledWith('/wishlist/p1');
  });

  it('hydrateWishlist loads server ids when authenticated', async () => {
    localStorage.setItem('accessToken', 't');
    mockedApi.get.mockResolvedValue({
      data: { success: true, data: { items: [{ _id: 'a' }, { _id: 'b' }] } },
    });

    await useWishlistStore.getState().hydrateWishlist();

    expect(useWishlistStore.getState().items).toEqual(['a', 'b']);
  });

  it('hydrateWishlist does nothing for guests', async () => {
    localStorage.removeItem('accessToken');
    useWishlistStore.setState({ items: ['local'] });

    await useWishlistStore.getState().hydrateWishlist();

    expect(useWishlistStore.getState().items).toEqual(['local']);
    expect(mockedApi.get).not.toHaveBeenCalled();
  });

  it('mergeGuestWishlist posts local ids then refreshes from server', async () => {
    localStorage.setItem('accessToken', 't');
    useWishlistStore.setState({ items: ['g1'] });
    mockedApi.post.mockResolvedValue({ data: { success: true } });
    mockedApi.get.mockResolvedValue({
      data: { success: true, data: { items: [{ _id: 'g1' }, { _id: 's1' }] } },
    });

    await useWishlistStore.getState().mergeGuestWishlist();

    expect(mockedApi.post).toHaveBeenCalledWith('/wishlist/merge', { product_ids: ['g1'] });
    expect(useWishlistStore.getState().items).toEqual(['g1', 's1']);
  });

  it('mergeGuestWishlist still hydrates when there are no local items', async () => {
    localStorage.setItem('accessToken', 't');
    useWishlistStore.setState({ items: [] });
    mockedApi.get.mockResolvedValue({
      data: { success: true, data: { items: [{ _id: 's1' }] } },
    });

    await useWishlistStore.getState().mergeGuestWishlist();

    expect(mockedApi.post).not.toHaveBeenCalled();
    expect(useWishlistStore.getState().items).toEqual(['s1']);
  });

  it('clearWishlist clears local items only', () => {
    localStorage.setItem('accessToken', 't');
    useWishlistStore.setState({ items: ['a', 'b'] });

    useWishlistStore.getState().clearWishlist();

    expect(useWishlistStore.getState().items).toEqual([]);
    expect(mockedApi.delete).not.toHaveBeenCalled();
  });
});