'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { Product } from '@/types/product';
import RatingStars from '@/components/ui/RatingStars';
import PriceTag from '@/components/ui/PriceTag';
import { useCartStore } from '@/stores/useCartStore';
import { useWishlistStore } from '@/stores/useWishlistStore';
import { useUIStore } from '@/stores/useUIStore';

interface ProductCardProps {
  product: Product;
  index?: number;
}

export default function ProductCard({ product, index = 0 }: ProductCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const addItem = useCartStore((s) => s.addItem);
  const toggleWishlist = useWishlistStore((s) => s.toggleWishlist);
  const isInWishlist = useWishlistStore((s) => s.isInWishlist(product.id));
  const addToast = useUIStore((s) => s.addToast);

  const defaultVariant = product.variants[0];
  const imageUrl = product.images[0]?.url || '/placeholder.svg';
  const discount = product.salePrice
    ? Math.round(((product.price - product.salePrice) / product.price) * 100)
    : 0;

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (defaultVariant) {
      addItem(product.id, defaultVariant.id, 1, product, defaultVariant);
      addToast({ type: 'success', message: `${product.name} added to cart` });
    }
  };

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(product.id);
    addToast({
      type: 'success',
      message: isInWishlist ? `${product.name} removed from wishlist` : `${product.name} added to wishlist`,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group"
    >
      <Link href={`/products/${product.id}`} className="block">
        <div className="relative aspect-square overflow-hidden rounded-xl bg-gray-100 dark:bg-zinc-800 mb-3">
          <Image
            src={imageUrl}
            alt={product.name}
            fill
            loading={index < 4 ? 'eager' : 'lazy'}
            className={`object-cover transition-transform duration-500 ${isHovered ? 'scale-105' : 'scale-100'}`}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />

          {/* Badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-1.5">
            {discount > 0 && (
              <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-medium rounded">
                -{discount}%
              </span>
            )}
            {product.tags.includes('new') && (
              <span className="px-2 py-0.5 bg-green-500 text-white text-xs font-medium rounded">
                New
              </span>
            )}
          </div>

          {/* Wishlist button */}
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: isHovered ? 1 : 0 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleWishlist}
            aria-label={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
            className="absolute top-3 right-3 w-8 h-8 bg-white dark:bg-zinc-800 rounded-full shadow-md flex items-center justify-center hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors"
          >
            <svg
              className={`w-4 h-4 transition-colors ${isInWishlist ? 'text-red-500 fill-red-500' : 'text-gray-400 dark:text-gray-500'}`}
              fill={isInWishlist ? 'currentColor' : 'none'}
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </motion.button>

          {/* Quick add - shows on hover */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: isHovered ? 1 : 0, y: isHovered ? 0 : 10 }}
            className="absolute bottom-3 left-3 right-3"
          >
            <button
              onClick={handleQuickAdd}
              className="w-full py-2.5 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-sm text-gray-900 dark:text-white text-sm font-medium rounded-lg shadow-lg hover:bg-indigo-600 hover:text-white transition-colors"
            >
              Quick Add
            </button>
          </motion.div>
        </div>

        <div className="space-y-1.5">
          <h3 className="font-medium text-gray-900 dark:text-white line-clamp-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
            {product.name}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1">
            {product.shortDescription}
          </p>
          <div className="flex items-center gap-2">
            <RatingStars rating={product.averageRating} size="sm" animated={false} />
            <span className="text-xs text-gray-400 dark:text-gray-500">({product.reviewCount})</span>
          </div>
          <PriceTag price={product.price} salePrice={product.salePrice} size="md" />
        </div>
      </Link>
    </motion.div>
  );
}
