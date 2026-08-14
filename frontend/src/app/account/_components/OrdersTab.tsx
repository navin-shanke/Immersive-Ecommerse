'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';

export interface ApiOrder {
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

export default function OrdersTab() {
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState('');

  useEffect(() => {
    let cancelled = false;
    api
      .get('/orders')
      .then(({ data }) => {
        if (cancelled) return;
        if (data?.success) {
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
  }, []);

  if (ordersLoading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="p-4 bg-gray-50 dark:bg-zinc-800 rounded-xl animate-pulse h-20" />
        ))}
      </div>
    );
  }

  if (ordersError) {
    return <p className="text-sm text-red-600 dark:text-red-400">{ordersError}</p>;
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 dark:text-gray-400 mb-4">You haven&apos;t placed any orders yet.</p>
        <Link
          href="/products"
          className="inline-flex px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
        >
          Start Shopping
        </Link>
      </div>
    );
  }

  return (
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
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                statusColors[formatStatus(order.status)] || 'bg-gray-100 text-gray-600'
              }`}
            >
              {formatStatus(order.status)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
