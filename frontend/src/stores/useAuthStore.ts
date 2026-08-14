import { create } from 'zustand';
import { User } from '@/types/user';
import api from '@/lib/api';
import { useCartStore } from '@/stores/useCartStore';
import { useWishlistStore } from '@/stores/useWishlistStore';

const USER_STORAGE_KEY = 'immersive_user';

function saveUserToStorage(user: User | null) {
  if (typeof window === 'undefined') return;
  if (user) {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(USER_STORAGE_KEY);
  }
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isMockAuth: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  loadUser: () => Promise<void>;
  updateUser: (user: User) => void;
}

let userLoaded = false;

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  isMockAuth: false,

  login: async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    const user = data.user;
    saveUserToStorage(user);
    userLoaded = true;
    set({ user, isAuthenticated: true, isMockAuth: false, isLoading: false });
    await useCartStore.getState().mergeGuestCart();
    await useWishlistStore.getState().mergeGuestWishlist();
  },

  signup: async (name, email, password) => {
    const { data } = await api.post('/auth/signup', { name, email, password });
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    const user = data.user;
    saveUserToStorage(user);
    userLoaded = true;
    set({ user, isAuthenticated: true, isMockAuth: false, isLoading: false });
    await useCartStore.getState().mergeGuestCart();
    await useWishlistStore.getState().mergeGuestWishlist();
  },

  logout: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    saveUserToStorage(null);
    userLoaded = false;
    set({ user: null, isAuthenticated: false, isMockAuth: false, isLoading: false });
    useCartStore.getState().resetCart();
    useWishlistStore.getState().clearWishlist();
  },

  loadUser: async () => {
    if (userLoaded) {
      set({ isLoading: false });
      return;
    }
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        userLoaded = true;
        set({ isLoading: false });
        return;
      }
      const { data } = await api.get('/auth/me');
      const user = data.user;
      saveUserToStorage(user);
      userLoaded = true;
      set({ user, isAuthenticated: true, isMockAuth: false, isLoading: false });
      await useWishlistStore.getState().hydrateWishlist();
    } catch {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      saveUserToStorage(null);
      userLoaded = true;
      set({ isLoading: false });
    }
  },

  updateUser: (user) => {
    saveUserToStorage(user);
    set({ user });
  },
}));
