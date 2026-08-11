import api from '@/lib/api';
import type {
  AdminAnalytics,
  AdminAnalyticsResponse,
  AdminCategory,
  AdminCategoryListResponse,
  AdminCategoryResponse,
  AdminCustomerListResponse,
  AdminCustomerResponse,
  AdminDashboard,
  AdminDashboardResponse,
  AdminMeta,
  AdminOrder,
  AdminOrderListResponse,
  AdminOrderResponse,
  AdminProduct,
  AdminProductListResponse,
  AdminProductResponse,
  AdminSettings,
  AdminSettingsResponse,
  AdminSimpleResponse,
  AnalyticsRange,
  OrderStatus,
  ProductStatus,
} from '@/types/admin';

export interface AdminProductQuery {
  status?: ProductStatus;
  category_id?: string;
  featured?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export interface ProductImagePayload {
  url: string;
  alt?: string;
  width?: number | null;
  height?: number | null;
}

export interface ProductVariantPayload {
  name: string;
  sku: string;
  price: number;
  sale_price?: number | null;
  stock?: number;
  options?: Record<string, string>;
  color?: string | null;
  color_hex?: string | null;
  size?: string | null;
}

export interface ProductPayload {
  name: string;
  slug?: string;
  description: string;
  long_description?: string | null;
  price: number;
  compare_at_price?: number | null;
  sku?: string;
  category_id: string;
  featured?: boolean;
  stock?: number;
  low_stock_threshold?: number;
  status?: ProductStatus;
  weight?: number | null;
  dimensions?: { length?: number | null; width?: number | null; height?: number | null } | null;
  tags?: string[];
  seo_title?: string | null;
  seo_description?: string | null;
  images?: ProductImagePayload[];
  variants?: ProductVariantPayload[];
}

export interface CategoryPayload {
  name: string;
  slug?: string;
  description?: string | null;
  image?: string | null;
  parent_id?: string | null;
  sort_order?: number;
  is_active?: boolean;
}

/** Fetch the paginated admin product list with optional filters. */
export async function fetchAdminProducts(query: AdminProductQuery = {}): Promise<AdminProductListResponse> {
  const params: Record<string, string | number | boolean> = {};
  if (query.status) params.status = query.status;
  if (query.category_id) params.category_id = query.category_id;
  if (query.featured !== undefined) params.featured = query.featured;
  if (query.search) params.search = query.search;
  if (query.page) params.page = query.page;
  if (query.limit) params.limit = query.limit;
  const { data } = await api.get<AdminProductListResponse>('/admin/products', { params });
  return data;
}

/** Fetch a single admin product. */
export async function fetchAdminProduct(id: string): Promise<AdminProductResponse> {
  const { data } = await api.get<AdminProductResponse>(`/admin/products/${id}`);
  return data;
}

/** Create a product. */
export async function createAdminProduct(payload: ProductPayload): Promise<AdminProductResponse> {
  const { data } = await api.post<AdminProductResponse>('/admin/products', payload);
  return data;
}

/** Update a product (full replace). */
export async function updateAdminProduct(id: string, payload: ProductPayload): Promise<AdminProductResponse> {
  const { data } = await api.put<AdminProductResponse>(`/admin/products/${id}`, payload);
  return data;
}

/** Hard-delete a product. */
export async function deleteAdminProduct(id: string): Promise<AdminSimpleResponse> {
  const { data } = await api.delete<AdminSimpleResponse>(`/admin/products/${id}`);
  return data;
}

/** Fetch all categories with active product counts. */
export async function fetchAdminCategories(): Promise<AdminCategoryListResponse> {
  const { data } = await api.get<AdminCategoryListResponse>('/admin/categories');
  return data;
}

/** Create a category. */
export async function createAdminCategory(payload: CategoryPayload): Promise<AdminCategoryResponse> {
  const { data } = await api.post<AdminCategoryResponse>('/admin/categories', payload);
  return data;
}

/** Update a category. */
export async function updateAdminCategory(id: string, payload: CategoryPayload): Promise<AdminCategoryResponse> {
  const { data } = await api.put<AdminCategoryResponse>(`/admin/categories/${id}`, payload);
  return data;
}

/** Delete a category (cascades to its products). */
export async function deleteAdminCategory(id: string): Promise<AdminSimpleResponse> {
  const { data } = await api.delete<AdminSimpleResponse>(`/admin/categories/${id}`);
  return data;
}

// ── Dashboard ─────────────────────────────────────────────────────────────

/** Fetch the aggregate admin dashboard (KPIs, trends, recent activity). */
export async function fetchAdminDashboard(): Promise<AdminDashboardResponse> {
  const { data } = await api.get<AdminDashboardResponse>('/admin/dashboard');
  return data;
}

// ── Analytics ─────────────────────────────────────────────────────────────

/** Fetch analytics for a range (30/90/365/all). */
export async function fetchAdminAnalytics(range: AnalyticsRange = '30'): Promise<AdminAnalyticsResponse> {
  const { data } = await api.get<AdminAnalyticsResponse>('/admin/analytics', { params: { range } });
  return data;
}

// ── Orders ────────────────────────────────────────────────────────────────

export interface AdminOrderQuery {
  status?: OrderStatus;
  search?: string;
  date_from?: string;
  date_to?: string;
  sort?: 'newest' | 'oldest' | 'total_desc' | 'total_asc';
  page?: number;
  limit?: number;
}

/** Fetch the paginated admin order list with optional filters. */
export async function fetchAdminOrders(query: AdminOrderQuery = {}): Promise<AdminOrderListResponse> {
  const params: Record<string, string | number> = {};
  if (query.status) params.status = query.status;
  if (query.search) params.search = query.search;
  if (query.date_from) params.date_from = query.date_from;
  if (query.date_to) params.date_to = query.date_to;
  if (query.sort) params.sort = query.sort;
  if (query.page) params.page = query.page;
  if (query.limit) params.limit = query.limit;
  const { data } = await api.get<AdminOrderListResponse>('/admin/orders', { params });
  return data;
}

/** Fetch a single order with items and status history. */
export async function fetchAdminOrder(id: string): Promise<AdminOrderResponse> {
  const { data } = await api.get<AdminOrderResponse>(`/admin/orders/${id}`);
  return data;
}

/** Update an order's status (records history + invalidates caches). */
export async function updateOrderStatus(id: string, status: OrderStatus): Promise<AdminOrderResponse> {
  const { data } = await api.patch<AdminOrderResponse>(`/admin/orders/${id}/status`, { status });
  return data;
}

// ── Customers ─────────────────────────────────────────────────────────────

export interface AdminCustomerQuery {
  search?: string;
  page?: number;
  limit?: number;
}

/** Fetch the paginated admin customer list. */
export async function fetchAdminCustomers(query: AdminCustomerQuery = {}): Promise<AdminCustomerListResponse> {
  const params: Record<string, string | number> = {};
  if (query.search) params.search = query.search;
  if (query.page) params.page = query.page;
  if (query.limit) params.limit = query.limit;
  const { data } = await api.get<AdminCustomerListResponse>('/admin/customers', { params });
  return data;
}

/** Fetch a single customer with KPIs and recent orders. */
export async function fetchAdminCustomer(id: string): Promise<AdminCustomerResponse> {
  const { data } = await api.get<AdminCustomerResponse>(`/admin/customers/${id}`);
  return data;
}

// ── Settings ──────────────────────────────────────────────────────────────

/** Fetch all store settings grouped by group. */
export async function fetchAdminSettings(): Promise<AdminSettingsResponse> {
  const { data } = await api.get<AdminSettingsResponse>('/admin/settings');
  return data;
}

/** Upsert settings within a single group. */
export async function updateAdminSettings(group: string, settings: Record<string, unknown>): Promise<AdminSettingsResponse> {
  const { data } = await api.put<AdminSettingsResponse>('/admin/settings', { group, settings });
  return data;
}

/** Upload an image file and return the stored absolute URL. */
export async function uploadAdminImage(file: File): Promise<{ url: string }> {
  const { data } = await api.postForm<{ success: boolean; data: { url: string } }>('/admin/uploads', { file });
  return data.data;
}

export type { AdminMeta, AdminOrder, AdminSettings, AdminDashboard, AdminAnalytics };
export type { AdminCategory, AdminProduct };
