'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';

export function useAuth() {
  const { user, isLoading, isAuthenticated, isMockAuth, login, signup, logout, loadUser, updateUser } =
    useAuthStore();

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  return { user, isLoading, isAuthenticated, isMockAuth, login, signup, logout, updateUser };
}
