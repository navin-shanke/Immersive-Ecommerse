'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { formatPrice } from '@/lib/utils';
import Image from 'next/image';

interface Product {
  id: string;
  name: string;
  price: number;
  salePrice?: number;
  images: { url: string; alt: string }[];
}

interface ProductShowcaseProps {
  products: Product[];
  intervalMs?: number;
}

export default function ProductShowcase({ products, intervalMs = 3000 }: ProductShowcaseProps) {
  const [current, setCurrent] = useState(0);

  const next = useCallback(() => {
    setCurrent((prev) => (prev + 1) % products.length);
  }, [products.length]);

  useEffect(() => {
    if (products.length === 0) return;
    const timer = setInterval(next, intervalMs);
    return () => clearInterval(timer);
  }, [next, intervalMs, products.length]);

  const product = products[current];

  if (!product) {
    return (
      <div className="relative w-full aspect-square max-w-md mx-auto">
        <div className="absolute inset-0 rounded-3xl bg-gray-200 dark:bg-zinc-800 animate-pulse" />
      </div>
    );
  }

  const formattedPrice = formatPrice(product.salePrice ?? product.price);

  return (
    <div className="relative w-full aspect-square max-w-md mx-auto">
      <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-indigo-200/40 via-purple-100/30 to-pink-200/40 dark:from-indigo-900/30 dark:via-purple-900/20 dark:to-pink-900/30 blur-2xl scale-110" />

      <Link href={`/products/${product.id}`} className="block relative h-full cursor-pointer group">
        <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        className="relative h-full rounded-3xl bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-zinc-900 dark:via-zinc-800 dark:to-zinc-900 shadow-2xl shadow-indigo-200/40 dark:shadow-indigo-900/30 overflow-hidden border border-indigo-100/60 dark:border-zinc-700/50"
      >
        {/* Product image with crossfade */}
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.5, ease: 'easeInOut' }}
            className="absolute inset-0"
          >
            <Image
              src={product.images[0]?.url || '/placeholder.svg'}
              alt={product.images[0]?.alt || product.name}
              fill
              priority
              sizes="(max-width: 768px) 100vw, 480px"
              className="object-cover"
            />
            {/* Glass overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
          </motion.div>
        </AnimatePresence>

        {/* Product info overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-5">
          <AnimatePresence mode="wait">
            <motion.div
              key={`info-${current}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <p className="text-white/70 text-xs font-medium tracking-wider uppercase mb-1">
                {product.name}
              </p>
              <p className="text-white text-2xl font-bold">
                {formattedPrice}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent pointer-events-none" />

        <div className="absolute top-3 right-3 px-2.5 py-1 bg-white/90 dark:bg-zinc-800/90 text-xs font-medium text-gray-700 dark:text-gray-300 rounded-full opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
          View Details
        </div>
      </motion.div>
      </Link>

      <div className="flex justify-center gap-1.5 mt-4">
        {products.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              i === current
                ? 'bg-indigo-500 dark:bg-indigo-400 w-5'
                : 'bg-gray-300 dark:bg-zinc-600 hover:bg-gray-400 dark:hover:bg-zinc-500'
            }`}
            aria-label={`Go to product ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
