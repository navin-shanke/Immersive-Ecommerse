'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import ProductGrid from '@/components/product/ProductGrid';
import ProductFilters from '@/components/product/ProductFilters';
import { ProductFilters as FiltersType, Product } from '@/types/product';
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
  variants: { _id: string; name: string; sku: string; price: number; stock: number; options?: Record<string, string> }[];
  ratings: { average: number; count: number };
  tags: string[];
  featured: boolean;
  stock: number;
  status: string;
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
      images: [],
    })),
    reviews: [],
    averageRating: ratings?.average || 0,
    reviewCount: ratings?.count || 0,
    createdAt: '',
    updatedAt: '',
  };
}

export default function ProductsPageClient() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const [localFilters, setLocalFilters] = useState<Omit<FiltersType, 'brand' | 'category'>>({});

  const urlQuery = searchParams.get('q') ?? '';
  const urlSort = searchParams.get('sort') ?? '';
  const urlSale = searchParams.get('sale') === 'true';

  const filters: FiltersType = {
    ...localFilters,
    brand: searchParams.get('brand') ?? undefined,
    category: searchParams.get('category') ?? undefined,
  };

  useEffect(() => {
    async function fetchProducts() {
      try {
        setLoading(true);
        const params = new URLSearchParams({ limit: '50' });
        if (searchParams.get('sort') === 'newest') params.set('sort', 'newest');
        if (searchParams.get('sale') === 'true') params.set('sale', 'true');
        const q = searchParams.get('q');
        if (q) params.set('search', q);
        const response = await api.get(`/products?${params.toString()}`);
        const data = response.data;

        if (data.success && data.data?.products) {
          const transformed = data.data.products.map(transformProduct);
          setProducts(transformed);

          // Extract unique category names
          const uniqueCategories = Array.from(
            new Set(data.data.products.map((p: ApiProduct) => p.category?.name).filter(Boolean))
          ) as string[];
          setCategories(uniqueCategories);
        }
      } catch (error) {
        console.error('Failed to fetch products:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchProducts();
  }, [searchParams]);

  let filteredProducts = products.filter((product) => {
    if (filters.category && product.category !== filters.category) return false;
    if (filters.brand && product.brand !== filters.brand) return false;
    if (filters.minPrice && product.price < filters.minPrice) return false;
    if (filters.maxPrice && product.price > filters.maxPrice) return false;
    if (filters.sizes?.length) {
      const hasSize = product.variants.some((v) => v.size && filters.sizes!.includes(v.size));
      if (!hasSize) return false;
    }
    if (filters.colors?.length) {
      const hasColor = product.variants.some((v) => v.color && filters.colors!.includes(v.color));
      if (!hasColor) return false;
    }
    if (filters.rating && product.averageRating < filters.rating) return false;
    return true;
  });

  if (urlSale) {
    filteredProducts = filteredProducts.filter((p) => p.salePrice !== undefined);
  }

  if (urlQuery.trim()) {
    const term = urlQuery.trim().toLowerCase();
    filteredProducts = filteredProducts.filter((p) =>
      p.name.toLowerCase().includes(term) ||
      p.description.toLowerCase().includes(term) ||
      (p.category || '').toLowerCase().includes(term) ||
      (p.tags || []).some((t) => t.toLowerCase().includes(term))
    );
  }

  if (urlSort === 'price_asc') {
    filteredProducts = [...filteredProducts].sort((a, b) => a.price - b.price);
  } else if (urlSort === 'price_desc') {
    filteredProducts = [...filteredProducts].sort((a, b) => b.price - a.price);
  } else if (urlSort === 'newest') {
    filteredProducts = [...filteredProducts].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  } else if (urlSort === 'popular') {
    filteredProducts = [...filteredProducts].sort((a, b) => b.reviewCount - a.reviewCount);
  }

  const handleFilterChange = (newFilters: FiltersType) => {
    const { brand, category, ...rest } = newFilters;
    setLocalFilters(rest);
    const params = new URLSearchParams();
    if (brand) params.set('brand', brand);
    if (category) params.set('category', category);
    const qs = params.toString();
    router.replace(`/products${qs ? `?${qs}` : ''}`, { scroll: false });
  };

  const activeBrand = filters.brand;

  if (loading) {
    return (
      <div className="pt-24 pb-16 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <div className="h-9 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2" />
            <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>
          <div className="flex gap-8">
            <aside className="w-64 flex-shrink-0 hidden lg:block">
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                ))}
              </div>
            </aside>
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="space-y-3">
                  <div className="aspect-square bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
                  <div className="h-5 w-3/4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                  <div className="h-4 w-1/2 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-24 pb-16 px-4">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold mb-2 text-gray-900 dark:text-white">
            {activeBrand ? `${activeBrand} Products` : 'All Products'}
          </h1>
          <p className="text-gray-500 dark:text-gray-400">{filteredProducts.length} products found</p>
        </motion.div>

        <div className="flex gap-8">
          <aside className="w-64 flex-shrink-0 hidden lg:block">
            <ProductFilters
              filters={filters}
              onFilterChange={handleFilterChange}
              categories={categories}
            />
          </aside>

          <div className="flex-1">
            <ProductGrid products={filteredProducts} />
          </div>
        </div>
      </div>
    </div>
  );
}
