'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { ProductImage } from '@/types/product';

interface ImageGalleryProps {
  images: ProductImage[];
  variantImages?: ProductImage[];
}

export default function ImageGallery({ images, variantImages }: ImageGalleryProps) {
  const [selected, setSelected] = useState(0);
  const [activeImages, setActiveImages] = useState(images);
  const [prevImages, setPrevImages] = useState<{ images: ProductImage[]; variantImages?: ProductImage[] }>({
    images,
    variantImages,
  });
  const scrollRef = useRef<HTMLDivElement>(null);

  if (prevImages.variantImages !== variantImages || prevImages.images !== images) {
    setPrevImages({ images, variantImages });
    if (variantImages && variantImages.length > 0) {
      setActiveImages(variantImages);
      setSelected(0);
    } else {
      setActiveImages(images);
    }
  }

  const displayImages = activeImages.length > 0 ? activeImages : images;

  return (
    <div className="space-y-4">
      <div className="relative aspect-square rounded-2xl overflow-hidden bg-gray-100 dark:bg-zinc-800">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${selected}-${displayImages[selected]?.id}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0"
          >
            <Image
              src={displayImages[selected]?.url || '/placeholder.svg'}
              alt={displayImages[selected]?.alt || 'Product image'}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
              priority
            />
          </motion.div>
        </AnimatePresence>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide"
      >
        {displayImages.map((image, index) => (
          <motion.button
            key={image.id}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setSelected(index)}
            className={`relative flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border-2 transition-colors ${
              selected === index
                ? 'border-indigo-500'
                : 'border-transparent hover:border-gray-300 dark:hover:border-zinc-600'
            }`}
          >
            <Image
              src={image.url}
              alt={image.alt}
              fill
              className="object-cover"
              sizes="80px"
              loading={index === 0 ? 'eager' : 'lazy'}
            />
          </motion.button>
        ))}
      </div>
    </div>
  );
}
