import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import TrendingSection from '../TrendingSection';

afterEach(() => cleanup());

describe('TrendingSection loading state', () => {
  it('renders skeleton cards when loading and no products', () => {
    render(<TrendingSection products={[]} loading />);
    const card = screen.queryByText("What's Hot");
    expect(card).toBeTruthy();
    // section renders shimmer skeletons instead of the empty-row map
    expect(document.querySelectorAll('[data-testid="trending-skeleton"]').length).toBe(4);
    expect(document.querySelectorAll('a[href^="/products/"]').length).toBe(0);
  });

  it('renders product cards when not loading', () => {
    const product = {
      id: 'p1', name: 'Headphones', shortDescription: 'Bass', price: 100, salePrice: 80,
      images: [{ url: '/x.jpg', alt: '' }], variants: [], averageRating: 4, reviewCount: 2,
    } as unknown as import('@/types/product').Product;
    render(<TrendingSection products={[product]} loading={false} />);
    expect(screen.getByText('Headphones')).toBeTruthy();
    expect(document.querySelectorAll('[data-testid="trending-skeleton"]').length).toBe(0);
  });
});
