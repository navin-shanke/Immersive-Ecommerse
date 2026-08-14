import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '@/lib/api';

interface WishlistState {
  items: string[];
  toggleWishlist: (productId: string) => Promise<void>;
  isInWishlist: (productId: string) => boolean;
  clearWishlist: () => void;
  hydrateWishlist: () => Promise<void>;
  mergeGuestWishlist: () => Promise<void>;
}

function hasToken(): boolean {
  return typeof window !== 'undefined' && !!localStorage.getItem('accessToken');
}

async function fetchServerIds(): Promise<string[] | null> {
  try {
    const { data } = await api.get('/wishlist');
    if (data?.success && Array.isArray(data?.data?.items)) {
      return data.data.items.map((p: { _id: string }) => p._id);
    }
    return null;
  } catch {
    return null;
  }
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],

      toggleWishlist: async (productId) => {
        const { items } = get();
        const isIn = items.includes(productId);
        const next = isIn ? items.filter((id) => id !== productId) : [...items, productId];
        set({ items: next });

        if (!hasToken()) return;

        try {
          if (isIn) {
            await api.delete(`/wishlist/${productId}`);
          } else {
            await api.post('/wishlist', { product_id: productId });
          }
        } catch {
          set({ items });
        }
      },

      isInWishlist: (productId) => get().items.includes(productId),

      clearWishlist: () => set({ items: [] }),

      hydrateWishlist: async () => {
        if (!hasToken()) return;
        const ids = await fetchServerIds();
        if (ids) set({ items: ids });
      },

      mergeGuestWishlist: async () => {
        if (!hasToken()) return;

        const guest = get().items;
        if (guest.length > 0) {
          try {
            await api.post('/wishlist/merge', { product_ids: guest });
          } catch {
            // keep guest items; retried on next login
          }
        }

        const ids = await fetchServerIds();
        if (ids) set({ items: ids });
      },
    }),
    {
      name: 'wishlist-storage',
      partialize: (s) => ({ items: s.items }),
    }
  )
);
