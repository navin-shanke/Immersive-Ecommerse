'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { useWishlistStore } from '@/stores/useWishlistStore';
import { useUIStore } from '@/stores/useUIStore';

interface WishlistProduct {
  _id: string;
  name: string;
  slug: string;
  price: number;
  compareAtPrice?: number | null;
  stock: number;
  images: { url: string; alt: string }[];
}

const imageOrFallback = (p: WishlistProduct) => p.images[0]?.url || '/placeholder.svg';

export default function WishlistTab() {
  const [items, setItems] = useState<WishlistProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const addToast = useUIStore((s) => s.addToast);

  const fetchWishlist = async () => {
    try {
      const { data } = await api.get('/wishlist');
      if (data?.success && Array.isArray(data?.data?.items)) {
        setItems(data.data.items);
      } else {
        setItems([]);
      }
    } catch {
      setError('Unable to load your wishlist. Please try again.');
    }
  };

  useEffect(() => {
    let cancelled = false;
    Promise.resolve()
      .then(fetchWishlist)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleRemove = async (product: WishlistProduct) => {
    const removed = await useWishlistStore.getState().toggleWishlist(product._id);
    if (!removed) return;
    addToast({ type: 'success', message: `${product.name} removed from wishlist` });
    fetchWishlist();
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="p-4 bg-gray-50 dark:bg-zinc-800 rounded-xl animate-pulse h-20" />
        ))}
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-red-600 dark:text-red-400">{error}</p>;
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 dark:text-gray-400 mb-4">Your wishlist is empty.</p>
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
      {items.map((product) => (
        <div
          key={product._id}
          className="p-4 bg-gray-50 dark:bg-zinc-800 rounded-xl flex items-center gap-4"
        >
          <Link href={`/products/${product.slug || product._id}`} className="shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageOrFallback(product)}
              alt={product.name}
              className="w-16 h-16 rounded-lg object-cover bg-gray-200 dark:bg-zinc-700"
            />
          </Link>
          <div className="flex-1 min-w-0">
            <Link
              href={`/products/${product.slug || product._id}`}
              className="font-medium text-gray-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors block truncate"
            >
              {product.name}
            </Link>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              ₹ {Number(product.price).toFixed(2)}
            </p>
            {product.stock <= 0 ? (
              <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 font-medium">
                Out of stock
              </span>
            ) : null}
          </div>
          <button
            type="button"
            aria-label={`Remove ${product.name}`}
            onClick={() => handleRemove(product)}
            className="shrink-0 px-3 py-2 text-sm rounded-xl text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            Remove
          </button>
        </div>
      ))}
    </div>
  );
}
