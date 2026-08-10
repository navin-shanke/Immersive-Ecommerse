'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import api from '@/lib/api';

interface ApiOrder {
  _id: string;
  orderNumber: string;
  status: string;
  total: number;
  currency: string;
  createdAt: string;
  items: { name: string; quantity: number }[] | null;
  itemsSummary?: { count: number };
}

const statusColors: Record<string, string> = {
  Delivered: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  Shipped: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  Processing: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  Pending: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  Cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

function formatStatus(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export default function AccountPage() {
  const { user, isAuthenticated, isLoading, isMockAuth, logout } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState('');

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    api
      .get('/orders')
      .then(({ data }) => {
        if (!cancelled && data.success) {
          const raw = data.data?.orders || [];
          setOrders(
            raw.map((o: ApiOrder) => ({
              ...o,
              items:
                o.items?.map((i) => ({
                  name: i.name || 'Item',
                  quantity: i.quantity || 1,
                })) || [],
              total: Number(o.total) || 0,
            }))
          );
        }
      })
      .catch(() => {
        if (!cancelled) setOrdersError('Unable to load your orders. Please try again.');
      })
      .finally(() => {
        if (!cancelled) setOrdersLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

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
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-white">My Account</h1>

          <div className="p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm mb-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                  {user.name.charAt(0).toUpperCase()}
                </span>
              </div>
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

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 dark:bg-zinc-800 rounded-xl">
                <p className="text-sm text-gray-500 dark:text-gray-400">Role</p>
                <p className="font-medium capitalize text-gray-900 dark:text-white">{user.role}</p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-zinc-800 rounded-xl">
                <p className="text-sm text-gray-500 dark:text-gray-400">Member Since</p>
                <p className="font-medium text-gray-900 dark:text-white">{new Date(user.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
          </div>

          <div className="p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm mb-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Order History</h3>
            {ordersLoading ? (
              <div className="space-y-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="p-4 bg-gray-50 dark:bg-zinc-800 rounded-xl animate-pulse h-20" />
                ))}
              </div>
            ) : ordersError ? (
              <p className="text-sm text-red-600 dark:text-red-400">{ordersError}</p>
            ) : orders.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 dark:text-gray-400 mb-4">You haven&apos;t placed any orders yet.</p>
                <Link
                  href="/products"
                  className="inline-flex px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
                >
                  Start Shopping
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {orders.map((order) => (
                  <div
                    key={order._id}
                    className="p-4 bg-gray-50 dark:bg-zinc-800 rounded-xl flex items-center justify-between"
                  >
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{order.orderNumber}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {order.items?.length
                          ? order.items.map((i) => `${i.name} ×${i.quantity}`).join(', ')
                          : `${order.itemsSummary?.count ?? 0} item(s)`}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {order.currency || 'INR'} {order.total.toFixed(2)}
                      </p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[formatStatus(order.status)] || 'bg-gray-100 text-gray-600'}`}>
                        {formatStatus(order.status)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <button
              onClick={() => { logout(); router.push('/'); }}
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