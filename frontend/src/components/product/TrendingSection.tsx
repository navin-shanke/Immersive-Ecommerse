'use client';

import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { Product } from '@/types/product';
import RatingStars from '@/components/ui/RatingStars';
import PriceTag from '@/components/ui/PriceTag';
import { useCartStore } from '@/stores/useCartStore';
import { useUIStore } from '@/stores/useUIStore';

interface TrendingSectionProps {
  products: Product[];
  loading?: boolean;
}

export default function TrendingSection({ products, loading = false }: TrendingSectionProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
  };

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const amount = 320;
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -amount : amount,
      behavior: 'smooth',
    });
  };

  return (
    <section className="py-16 px-4 bg-gray-50 dark:bg-zinc-900">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 text-xs font-medium rounded-full">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
                </svg>
                Trending Now
              </span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">What&apos;s Hot</h2>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Most popular this week</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => scroll('left')}
              disabled={!canScrollLeft}
              aria-label="Scroll left"
              className="w-10 h-10 rounded-full border border-gray-200 dark:border-zinc-700 flex items-center justify-center hover:bg-white dark:hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors bg-white dark:bg-zinc-800"
            >
              <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={() => scroll('right')}
              disabled={!canScrollRight}
              aria-label="Scroll right"
              className="w-10 h-10 rounded-full border border-gray-200 dark:border-zinc-700 flex items-center justify-center hover:bg-white dark:hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors bg-white dark:bg-zinc-800"
            >
              <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Scrollable row */}
        <div
          ref={scrollRef}
          onScroll={checkScroll}
          className="flex gap-4 overflow-x-auto scrollbar-hide pb-4 -mx-4 px-4"
        >
          {loading && products.length === 0 ? (
            <div className="flex gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  data-testid="trending-skeleton"
                  className="flex-shrink-0 w-[280px] rounded-xl bg-gray-200 dark:bg-zinc-800 animate-pulse"
                  style={{ height: 280 }}
                />
              ))}
            </div>
          ) : (
            products.map((product, i) => (
              <TrendingCard key={product.id} product={product} index={i} />
            ))
          )}
        </div>
      </div>
    </section>
  );
}

function TrendingCard({ product, index }: { product: Product; index: number }) {
  const addItem = useCartStore((s) => s.addItem);
  const addToast = useUIStore((s) => s.addToast);

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const variant = product.variants[0];
    if (variant) {
      addItem(product.id, variant.id, 1, product, variant);
      addToast({ type: 'success', message: `${product.name} added to cart` });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="flex-shrink-0 w-[280px]"
    >
      <Link href={`/products/${product.id}`} className="block group">
        <div className="relative aspect-square overflow-hidden rounded-xl bg-gray-100 dark:bg-zinc-800 mb-3">
          <Image
            src={product.images[0]?.url || '/placeholder.svg'}
            alt={product.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes="280px"
          />

          {/* Trending badge */}
          <div className="absolute top-3 left-3">
            <span className="px-2 py-1 bg-white/90 dark:bg-zinc-800/90 backdrop-blur-sm text-gray-900 dark:text-white text-xs font-medium rounded-lg shadow-sm">
              #{index + 1} Trending
            </span>
          </div>

          {product.salePrice && (
            <div className="absolute top-3 right-3">
              <span className="px-2 py-1 bg-red-500 text-white text-xs font-medium rounded-lg">
                Sale
              </span>
            </div>
          )}

          {/* Quick add on hover */}
          <div className="absolute bottom-3 left-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={handleQuickAdd}
              className="w-full py-2.5 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-sm text-gray-900 dark:text-white text-sm font-medium rounded-lg shadow-lg hover:bg-indigo-600 hover:text-white transition-colors"
            >
              Quick Add
            </button>
          </div>
        </div>

        <h3 className="font-medium text-gray-900 dark:text-white line-clamp-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
          {product.name}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">{product.shortDescription}</p>
        <div className="flex items-center gap-2 mt-1.5">
          <RatingStars rating={product.averageRating} size="sm" animated={false} />
          <span className="text-xs text-gray-400 dark:text-gray-500">({product.reviewCount})</span>
        </div>
        <PriceTag price={product.price} salePrice={product.salePrice} size="sm" />
      </Link>
    </motion.div>
  );
}
