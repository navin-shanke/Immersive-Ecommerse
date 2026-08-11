'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import ImageGallery from '@/components/product/ImageGallery';
import SizeSelector from '@/components/product/SizeSelector';
import ColorSwatch from '@/components/product/ColorSwatch';
import AddToCartButton from '@/components/product/AddToCartButton';
import RatingStars from '@/components/ui/RatingStars';
import PriceTag from '@/components/ui/PriceTag';
import ProductRecommendations from '@/components/product/ProductRecommendations';
import { useWishlistStore } from '@/stores/useWishlistStore';
import { useUIStore } from '@/stores/useUIStore';
import { Product } from '@/types/product';
import api from '@/lib/api';

interface ApiProduct {
  _id: string;
  name: string;
  slug: string;
  description: string;
  longDescription?: string;
  price: number;
  compareAtPrice?: number;
  category: { _id: string; name: string };
  images: { url: string; alt: string }[];
  variants: { _id: string; name: string; sku: string; price: number; salePrice?: number | null; stock: number; options?: Record<string, string>; color?: string | null; colorHex?: string | null; size?: string | null }[];
  ratings: { average: number; count: number };
  tags: string[];
  featured: boolean;
  stock: number;
  status?: string;
}

function transformProduct(apiProduct: ApiProduct): Product {
  const { _id, name, slug, description, longDescription, price, compareAtPrice, category, images, variants, ratings, tags, featured } = apiProduct;

  return {
    id: _id,
    name,
    slug,
    description: longDescription || description,
    shortDescription: description.length > 100 ? description.substring(0, 100) + '...' : description,
    price,
    salePrice: compareAtPrice && compareAtPrice < price ? compareAtPrice : undefined,
    brand: '',
    category: category?.name || '',
    tags: tags || [],
    featured: featured || false,
    images: (images || []).map((img, idx) => ({
      id: `${_id}-img-${idx}`,
      url: img.url,
      alt: img.alt || name,
      width: 600,
      height: 600,
    })),
    variants: (variants || []).map((v) => ({
      id: v._id,
      name: v.name,
      sku: v.sku,
      price: v.price,
      salePrice: v.salePrice ?? undefined,
      stock: v.stock,
      size: v.size ?? v.options?.size,
      color: v.color ?? v.options?.color,
      colorHex: v.colorHex ?? undefined,
      images: [],
    })),
    reviews: [],
    averageRating: ratings?.average || 0,
    reviewCount: ratings?.count || 0,
    createdAt: '',
    updatedAt: '',
  };
}

const ProductViewer3D = dynamic(() => import('@/components/three/ProductViewer3D'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[400px] bg-gray-100 dark:bg-zinc-800 rounded-2xl animate-pulse flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">Loading 3D viewer...</p>
      </div>
    </div>
  ),
});

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d');
  const [productId, setProductId] = useState<string | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);

  useEffect(() => {
    params.then((p) => setProductId(p.id));
  }, [params]);

  useEffect(() => {
    if (!productId) return;
    async function fetchProduct() {
      try {
        setLoading(true);
        const { data } = await api.get(`/products/${productId}`);
        if (data.success && data.data?.product) {
          const transformed = transformProduct(data.data.product);
          setProduct(transformed);

          // Fetch related products by category
          try {
            const categoryId = data.data.product.category?._id;
            if (categoryId) {
              const relatedRes = await api.get(`/products?category=${categoryId}&limit=8`);
              if (relatedRes.data.success && relatedRes.data.data?.products) {
                const related = relatedRes.data.data.products
                  .filter((p: ApiProduct) => p._id !== productId)
                  .map(transformProduct);
                setRelatedProducts(related);
              }
            }
          } catch (relErr) {
            console.error('Failed to fetch related products:', relErr);
          }
        }
      } catch (err) {
        console.error('Failed to fetch product:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchProduct();
  }, [productId]);

  const toggleWishlist = useWishlistStore((s) => s.toggleWishlist);
  const isInWishlist = useWishlistStore((s) => product ? s.isInWishlist(product.id) : false);
  const addToast = useUIStore((s) => s.addToast);

  const [prevProductId, setPrevProductId] = useState<string | undefined>(product?.id);

  if (product && prevProductId !== product.id) {
    setPrevProductId(product.id);
    setSelectedSize(null);
    setSelectedColor(null);
  }

  if (loading) {
    return (
      <div className="pt-20 pb-16 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="h-4 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-6" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <div className="aspect-square bg-gray-200 dark:bg-gray-700 rounded-2xl animate-pulse" />
            <div className="space-y-4">
              <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="h-8 w-3/4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="h-8 w-28 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="h-20 w-full bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="h-12 w-full bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="pt-20 pb-16 px-4">
        <div className="max-w-7xl mx-auto text-center py-20">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Product not found</h1>
          <p className="text-gray-500 dark:text-gray-400 mb-6">The product you&apos;re looking for doesn&apos;t exist or has been removed.</p>
          <Link href="/products" className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline">
            Browse all products
          </Link>
        </div>
      </div>
    );
  }

  const sizes = [...new Set(product.variants.map((v) => v.size).filter(Boolean))] as string[];
  const uniqueColors: { name: string; hex: string }[] = [];
  const seenColorKeys = new Set<string>();
  for (const v of product.variants) {
    const key = `${v.color}-${v.colorHex}`;
    if (v.color && v.colorHex && !seenColorKeys.has(key)) {
      seenColorKeys.add(key);
      uniqueColors.push({ name: v.color, hex: v.colorHex });
    }
  }

  const selectedVariant = product.variants.find(
    (v) =>
      (!selectedSize || v.size === selectedSize) &&
      (!selectedColor || v.color === selectedColor)
  );

  const handleWishlist = () => {
    toggleWishlist(product.id);
    addToast({
      type: 'success',
      message: isInWishlist ? 'Removed from wishlist' : 'Added to wishlist',
    });
  };

  const variantImages = selectedColor
    ? product.variants
        .filter((v) => v.color === selectedColor && v.images.length > 0)
        .flatMap((v) => v.images)
    : undefined;

  const effectivePrice = selectedVariant?.price ?? product.price;
  const effectiveSalePrice = selectedVariant?.salePrice ?? product.salePrice;
  const discount = effectiveSalePrice && effectiveSalePrice < effectivePrice
    ? Math.round(((effectivePrice - effectiveSalePrice) / effectivePrice) * 100)
    : 0;

  return (
    <div className="pt-20 pb-16 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-6 overflow-x-auto whitespace-nowrap" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-gray-700 dark:hover:text-gray-300">Home</Link>
          <span>/</span>
          <Link href="/products" className="hover:text-gray-700 dark:hover:text-gray-300">Products</Link>
          <span>/</span>
          <Link href={`/products?category=${product.category}`} className="hover:text-gray-700 dark:hover:text-gray-300">{product.category}</Link>
          <span>/</span>
          <span className="text-gray-900 dark:text-white">{product.name}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* Left: Images / 3D */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
          >
            {/* View mode toggle */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setViewMode('2d')}
                className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                  viewMode === '2d' ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900' : 'bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-zinc-700'
                }`}
              >
                Gallery
              </button>
              <button
                onClick={() => setViewMode('3d')}
                className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                  viewMode === '3d' ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900' : 'bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-zinc-700'
                }`}
              >
                3D View
              </button>
            </div>

            {viewMode === '2d' ? (
              <ImageGallery images={product.images} variantImages={variantImages} />
            ) : (
              <ProductViewer3D
                product={{
                  name: product.name,
                  category: product.category,
                  specs: {
                    material: 'Premium materials',
                    weight: '250g',
                    dimensions: 'Standard fit',
                    care: 'Follow care label',
                  },
                }}
                selectedColor={selectedColor || undefined}
              />
            )}
          </motion.div>

          {/* Right: Details */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="space-y-5"
          >
            <div>
              <p className="text-sm text-indigo-600 font-medium">{product.category}</p>
              <div className="flex items-start justify-between mt-1">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{product.name}</h1>
                <button
                  onClick={handleWishlist}
                  className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors flex-shrink-0"
                  aria-label="Toggle wishlist"
                >
                  <svg
                    className={`w-5 h-5 ${isInWishlist ? 'text-red-500 fill-red-500' : 'text-gray-400 dark:text-gray-500'}`}
                    fill={isInWishlist ? 'currentColor' : 'none'}
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </button>
              </div>
              <div className="flex items-center gap-3 mt-2">
                <RatingStars rating={product.averageRating} />
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {product.averageRating} ({product.reviewCount} reviews)
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <PriceTag price={selectedVariant?.price ?? product.price} salePrice={selectedVariant?.salePrice ?? product.salePrice} size="lg" />
              {discount > 0 && (
                <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm font-medium rounded">
                  Save {discount}%
                </span>
              )}
            </div>

            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{product.description}</p>

            {uniqueColors.length > 0 && (
              <ColorSwatch
                colors={uniqueColors}
                selected={selectedColor}
                onSelect={(c) => setSelectedColor(c === selectedColor ? null : c)}
              />
            )}

            {sizes.length > 0 && (
              <SizeSelector
                sizes={sizes}
                selected={selectedSize}
                onSelect={(s) => setSelectedSize(s === selectedSize ? null : s)}
              />
            )}

            {selectedVariant && (
              <p className="text-sm">
                {selectedVariant.stock > 0 ? (
                  <span className="text-green-600 dark:text-green-400">
                    {selectedVariant.stock <= 5 ? `Only ${selectedVariant.stock} left in stock` : 'In stock'}
                  </span>
                ) : (
                  <span className="text-red-500 dark:text-red-400">Out of stock</span>
                )}
              </p>
            )}

            <AddToCartButton
              productId={product.id}
              variantId={selectedVariant?.id || product.variants[0]?.id || ''}
              disabled={!selectedVariant || selectedVariant.stock === 0}
              product={product}
              variant={selectedVariant || product.variants[0]}
            />

            {/* Trust signals */}
            <div className="flex items-center gap-6 pt-4 border-t border-gray-100 dark:border-zinc-800">
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
                Free shipping
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
                30-day returns
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                2-year warranty
              </div>
            </div>
          </motion.div>
        </div>

        {/* Recommendations */}
        {relatedProducts.length > 0 && (
          <div className="mt-12 border-t border-gray-100 dark:border-zinc-800 pt-10">
            <ProductRecommendations products={relatedProducts} title="You May Also Like" />
          </div>
        )}
      </div>
    </div>
  );
}
