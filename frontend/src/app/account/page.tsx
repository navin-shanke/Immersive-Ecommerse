'use client';

import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import ProfileTab from './_components/ProfileTab';
import WishlistTab from './_components/WishlistTab';
import OrdersTab from './_components/OrdersTab';

type Tab = 'profile' | 'wishlist' | 'orders';

const tabs: { key: Tab; label: string }[] = [
  { key: 'profile', label: 'Profile' },
  { key: 'wishlist', label: 'Wishlist' },
  { key: 'orders', label: 'Orders' },
];

export default function AccountPage() {
  const { user, isAuthenticated, isLoading, isMockAuth, logout, updateUser } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('profile');

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="pt-24 pb-16 px-4">
        <div className="max-w-2xl mx-auto animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-zinc-700 rounded w-48" />
          <div className="h-4 bg-gray-200 dark:bg-zinc-700 rounded w-32" />
          <div className="h-32 bg-gray-200 dark:bg-zinc-700 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="pt-24 pb-16 px-4">
      <div className="max-w-2xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-white">My Account</h1>

          <div className="p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm mb-6">
            <div className="flex items-center gap-4 mb-6">
              {user.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-16 h-16 rounded-full object-cover border border-gray-200 dark:border-zinc-700"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                  <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{user.name}</h2>
                <p className="text-gray-500 dark:text-gray-400">{user.email}</p>
              </div>
              {isMockAuth && (
                <span className="text-xs px-2 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 font-medium">
                  Demo Mode
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-4 bg-gray-50 dark:bg-zinc-800 rounded-xl">
                <p className="text-sm text-gray-500 dark:text-gray-400">Role</p>
                <p className="font-medium capitalize text-gray-900 dark:text-white">{user.role}</p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-zinc-800 rounded-xl">
                <p className="text-sm text-gray-500 dark:text-gray-400">Member Since</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {new Date(user.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="flex gap-2 p-1 bg-gray-50 dark:bg-zinc-800 rounded-xl">
              {tabs.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTab(t.key)}
                  aria-pressed={tab === t.key}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                    tab === t.key
                      ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm mb-6">
            {tab === 'profile' && <ProfileTab user={user} onUserUpdated={updateUser} />}
            {tab === 'wishlist' && <WishlistTab />}
            {tab === 'orders' && <OrdersTab />}
          </div>

          <div className="space-y-3">
            <button
              onClick={() => {
                logout();
                router.push('/');
              }}
              className="w-full p-4 bg-white dark:bg-zinc-900 rounded-xl border border-red-200 dark:border-red-800 shadow-sm text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              Logout
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
