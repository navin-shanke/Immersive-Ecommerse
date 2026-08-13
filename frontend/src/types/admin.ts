export type ProductStatus = 'active' | 'draft' | 'archived';

export interface AdminCategoryRef {
  _id: string;
  name: string | null;
}

export interface AdminImage {
  url: string;
  alt: string;
  width: number | null;
  height: number | null;
}

export interface AdminVariant {
  _id: string;
  name: string;
  sku: string;
  price: number;
  salePrice: number | null;
  stock: number;
  options: Record<string, string>;
  color: string | null;
  colorHex: string | null;
  size: string | null;
}

export interface AdminProduct {
  _id: string;
  name: string;
  slug: string;
  description: string;
  longDescription: string | null;
  price: number;
  compareAtPrice: number | null;
  sku: string;
  category: AdminCategoryRef;
  images: AdminImage[];
  variants: AdminVariant[];
  ratings: { average: number; count: number };
  tags: string[];
  featured: boolean;
  stock: number;
  status: ProductStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AdminPagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface AdminProductListResponse {
  success: boolean;
  data: {
    products: AdminProduct[];
    pagination: AdminPagination;
  };
}

export interface AdminProductResponse {
  success: boolean;
  data: {
    product: AdminProduct;
  };
}

export interface AdminCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  productCount: number;
}

export interface AdminCategoryListResponse {
  success: boolean;
  data: {
    categories: AdminCategory[];
  };
}

export interface AdminCategoryResponse {
  success: boolean;
  data: {
    category: AdminCategory;
  };
}

export interface AdminSimpleResponse {
  success: boolean;
  message: string;
}

// ── Orders ────────────────────────────────────────────────────────────────

export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

export interface OrderStatusOption {
  value: OrderStatus;
  label: string;
}

export const ORDER_STATUSES: OrderStatusOption[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'processing', label: 'Processing' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
];

export interface OrderCustomerRef {
  _id: string | null;
  name: string | null;
  email: string | null;
}

export interface OrderItem {
  _id: string;
  productId: string | null;
  variantId: string | null;
  name: string;
  sku: string | null;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  options: Record<string, string>;
  color: string | null;
  colorHex: string | null;
  size: string | null;
  imageUrl: string | null;
}

export interface OrderAddress {
  firstName?: string;
  lastName?: string;
  phone?: string;
  street1?: string;
  street2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  [key: string]: string | undefined;
}

export interface OrderStatusHistoryEntry {
  _id: string;
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  changedBy: string | null;
  createdAt: string;
}

export interface AdminOrder {
  _id: string;
  orderNumber: string;
  status: OrderStatus;
  subtotal: number;
  shipping: number;
  tax: number;
  discount: number;
  total: number;
  currency: string;
  shippingMethod: string | null;
  shippingAddress: OrderAddress;
  customer: OrderCustomerRef;
  items?: OrderItem[];
  itemsSummary: { count: number };
  payment: {
    razorpayOrderId: string | null;
    razorpayPaymentId: string | null;
    paidAt: string | null;
  };
  statusHistory?: OrderStatusHistoryEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface AdminMeta {
  current_page: number;
  per_page: number;
  last_page: number;
  total: number;
}

export interface AdminOrderListResponse {
  success: boolean;
  data: {
    items: AdminOrder[];
    meta: AdminMeta;
  };
}

export interface AdminOrderResponse {
  success: boolean;
  message?: string;
  data: { order: AdminOrder };
}

// ── Customers ─────────────────────────────────────────────────────────────

export interface AdminCustomer {
  _id: string;
  name: string;
  email: string;
  role: string;
  totalSpent: number;
  orderCount: number;
  avgOrderValue: number;
  lastOrderAt: string | null;
  createdAt: string;
}

export interface AdminCustomerListResponse {
  success: boolean;
  data: {
    items: AdminCustomer[];
    meta: AdminMeta;
  };
}

export interface AdminCustomerResponse {
  success: boolean;
  data: {
    customer: AdminCustomer;
    kpis: {
      totalSpent: number;
      orderCount: number;
      avgOrderValue: number;
      joinedAt: string;
      lastOrderAt: string | null;
    };
    orders: AdminOrder[];
  };
}

// ── Dashboard ─────────────────────────────────────────────────────────────

export interface AdminDashboard {
  kpis: {
    revenue: { total: number; month: number };
    orders: { total: number; today: number; month: number; pending: number };
    customers: { total: number; month: number };
    avgOrderValue: number;
    lowStock: number;
    asOf: string;
  };
  revenueTrend: { date: string; revenue: number; orders: number }[];
  recentOrders: AdminOrder[];
  recentCustomers: AdminCustomer[];
  topSellingProducts: { productId: string | null; name: string | null; unitsSold: number; revenue: number }[];
  statusBreakdown: Record<OrderStatus, number>;
  activity: {
    id: string;
    orderNumber: string | null;
    orderId: string | null;
    fromStatus: OrderStatus | null;
    toStatus: OrderStatus;
    changedBy: string | null;
    createdAt: string;
  }[];
}

export interface AdminDashboardResponse {
  success: boolean;
  data: AdminDashboard;
}

// ── Analytics ─────────────────────────────────────────────────────────────

export type AnalyticsRange = '30' | '90' | '365' | 'all';

export interface AnalyticsBucket {
  label: string;
  date: string;
  [key: string]: string | number;
}

export interface AdminAnalytics {
  range: AnalyticsRange;
  from: string;
  to: string;
  kpis: {
    revenue: number;
    orders: number;
    averageOrderValue: number;
    newCustomers: number;
    totalCustomers: number;
    refundRate: number;
  };
  revenueTrend: AnalyticsBucket[];
  orderTrend: AnalyticsBucket[];
  statusBreakdown: Record<OrderStatus, number>;
  topProducts: { productId: string | null; name: string | null; unitsSold: number; revenue: number }[];
}

export interface AdminAnalyticsResponse {
  success: boolean;
  data: AdminAnalytics;
}

// ── Settings ──────────────────────────────────────────────────────────────

export type SettingsGroup = 'store' | 'shipping' | 'tax' | 'profile' | 'security';

export interface AdminSettings {
  [group: string]: Record<string, unknown>;
}

export interface AdminSettingsResponse {
  success: boolean;
  message?: string;
  data: { settings: AdminSettings };
}
