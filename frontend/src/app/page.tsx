'use client';

import { useState, useEffect, useSyncExternalStore } from 'react';
import dynamic from 'next/dynamic';
import { motion, useScroll, useTransform } from 'framer-motion';
import Link from 'next/link';
import ProductCard from '@/components/product/ProductCard';
import TrendingSection from '@/components/product/TrendingSection';
import Lookbook from '@/components/product/Lookbook';
import FeaturedBanner from '@/components/ui/FeaturedBanner';
import StatsBar from '@/components/ui/StatsBar';
import BrandTicker from '@/components/ui/BrandTicker';
import AmbientBackground from '@/components/effects/AmbientBackground';
import ParallaxSection from '@/components/effects/ParallaxSection';
import ProductShowcase from '@/components/ui/ProductShowcase';
import SkeletonCard from '@/components/ui/SkeletonCard';
import Logo from '@/components/ui/Logo';
import { Product } from '@/types/product';
import api from '@/lib/api';


const IntroScene = dynamic(() => import('@/components/three/IntroScene'), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-4 bg-black">
      <div className="animate-pulse"><Logo withText={false} /></div>
      <p className="text-xs tracking-[0.3em] text-white/40 font-light uppercase">Loading immersive experience&#8230;</p>
      <div className="flex gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" />
        <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '0.1s' }} />
        <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '0.2s' }} />
      </div>
    </div>
  ),
});

import { homeCategories as categories, features, testimonials } from '@/lib/data/products';

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
  variants: { _id: string; name: string; sku: string; price: number; stock: number; options?: Record<string, string> }[];
  ratings: { average: number; count: number };
  tags: string[];
  featured: boolean;
  stock: number;
  status?: string;
}

function subscribeIntroSeen(): () => void {
  return () => {};
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
      stock: v.stock,
      size: v.options?.size,
      color: v.options?.color,
      colorHex: undefined,
      images: [],
    })),
    reviews: [],
    averageRating: ratings?.average || 0,
    reviewCount: ratings?.count || 0,
    createdAt: '',
    updatedAt: '',
  };
}

export default function HomePage() {
  const [introComplete, setIntroComplete] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [featuredLoading, setFeaturedLoading] = useState(true);
  const introSeen = useSyncExternalStore(
    subscribeIntroSeen,
    () => (typeof window !== 'undefined' ? sessionStorage.getItem('intro-seen') !== null : false),
    () => false
  );
  const shouldShowIntro = !introSeen;
  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 500], [0, 150]);
  const heroOpacity = useTransform(scrollY, [0, 300], [1, 0]);

  const showHero = showContent || introSeen;

  useEffect(() => {
    if (introSeen) {
      return;
    }
    if (introComplete && shouldShowIntro) {
      sessionStorage.setItem('intro-seen', '1');
      const t = setTimeout(() => setShowContent(true), 100);
      return () => clearTimeout(t);
    }
  }, [introSeen, introComplete, shouldShowIntro]);

  useEffect(() => {
    async function fetchFeaturedProducts() {
      try {
        const { data } = await api.get('/products?limit=8');
        if (data.success && data.data?.products) {
          setFeaturedProducts(data.data.products.map(transformProduct));
        }
      } catch (err) {
        console.error('Failed to fetch featured products:', err);
      } finally {
        setFeaturedLoading(false);
      }
    }
    fetchFeaturedProducts();
  }, []);

  return (
    <>
      {shouldShowIntro && !introComplete && <IntroScene onComplete={() => setIntroComplete(true)} />}
      <div className={`transition-opacity duration-700 ${introSeen || showContent ? 'opacity-100' : 'opacity-0'}`}>
        {/* Hero Section with Parallax */}
        <motion.section
          style={{ y: heroY, opacity: heroOpacity }}
          className="relative min-h-[90vh] flex items-center"
        >
          <AmbientBackground className="opacity-40" />

          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                animate={showHero ? { opacity: 1, x: 0 } : {}}
                transition={{ delay: 0.2, duration: 0.6 }}
              >
                <motion.span
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={showHero ? { opacity: 1, scale: 1 } : {}}
                  transition={{ delay: 0.1 }}
                  className="inline-block px-4 py-1.5 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-sm font-medium rounded-full mb-6"
                >
                  New Collection 2026
                </motion.span>

                <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold text-gray-900 dark:text-white mb-6 leading-[1.1]">
                  Shop Smarter.
                  <br />
                  <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 bg-clip-text text-transparent">
                    Experience More.
                  </span>
                </h1>

                <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-lg leading-relaxed">
                  Explore our curated collection with 3D previews, detailed reviews, and a seamless checkout experience.
                </p>

                <div className="flex flex-col sm:flex-row gap-4">
                  <Link
                    href="/products"
                    className="inline-flex items-center justify-center px-7 py-3.5 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/30"
                  >
                    Browse Products
                    <svg className="ml-2 w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </Link>
                  <Link
                    href="/products?sort=popular"
                    className="inline-flex items-center justify-center px-7 py-3.5 border border-gray-300 dark:border-zinc-700 text-gray-700 dark:text-gray-300 font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
                  >
                    Best Sellers
                  </Link>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={showHero ? { opacity: 1, x: 0 } : {}}
                transition={{ delay: 0.4, duration: 0.6 }}
                className="hidden lg:block"
              >
                <ParallaxSection speed={0.15}>
                  <ProductShowcase products={featuredProducts} />
                </ParallaxSection>
              </motion.div>
            </div>
          </div>
        </motion.section>

        {/* Brand Ticker */}
        <BrandTicker />

        {/* Features Bar */}
        <section className="border-y border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-950">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 py-8">
              {features.map((feature, i) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-center gap-3"
                >
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center">
                    <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={feature.icon} />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{feature.title}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{feature.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Categories */}
        <section className="py-16 px-4 bg-white dark:bg-zinc-950">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Shop by Category</h2>
                <p className="text-gray-500 dark:text-gray-400 mt-1">Find what you&apos;re looking for</p>
              </div>
              <Link href="/products" className="text-indigo-600 dark:text-indigo-400 font-medium text-sm hover:text-indigo-700 dark:hover:text-indigo-300">
                View All
              </Link>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {categories.map((cat, i) => (
                <motion.div
                  key={cat.name}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                >
                  <Link
                    href={cat.href}
                    className="block p-6 bg-gray-50 dark:bg-zinc-900 rounded-xl hover:ring-2 hover:ring-indigo-200 dark:hover:ring-indigo-700 transition-all text-center group"
                  >
                    <span className="text-3xl mb-3 block group-hover:scale-110 transition-transform">{cat.icon}</span>
                    <h3 className="font-medium text-gray-900 dark:text-white">{cat.name}</h3>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Trending Section */}
        <TrendingSection products={featuredProducts.slice(0, 8)} loading={featuredLoading} />

        {/* Featured Products */}
        <section className="py-16 px-4 bg-white dark:bg-zinc-950">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Featured Products</h2>
                <p className="text-gray-500 dark:text-gray-400 mt-1">Handpicked for you</p>
              </div>
              <Link href="/products" className="text-indigo-600 dark:text-indigo-400 font-medium text-sm hover:text-indigo-700 dark:hover:text-indigo-300">
                View All
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredLoading ? (
                <SkeletonCard count={4} />
              ) : (
                featuredProducts.slice(0, 4).map((product, i) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1, duration: 0.5 }}
                  >
                    <ProductCard product={product} index={i} />
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </section>

        {/* Featured Banner with Parallax */}
        <ParallaxSection speed={0.1} className="py-4">
          <FeaturedBanner />
        </ParallaxSection>

        {/* Lookbook */}
        <Lookbook />

        {/* Stats */}
        <StatsBar />

        {/* Testimonials */}
        <section className="py-16 px-4 bg-white dark:bg-zinc-950">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">What Our Customers Say</h2>
              <p className="text-gray-500 dark:text-gray-400 mt-1">Trusted by thousands of happy shoppers</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {testimonials.map((t, i) => (
                <motion.div
                  key={t.name}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="p-6 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md border border-gray-200/50 dark:border-zinc-700/50 rounded-xl hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-center gap-1 mb-3">
                    {Array.from({ length: t.rating }).map((_, j) => (
                      <svg key={j} className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">&ldquo;{t.text}&rdquo;</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-sm font-semibold">
                      {t.avatar}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{t.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{t.role}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

      </div>
    </>
  );
}
