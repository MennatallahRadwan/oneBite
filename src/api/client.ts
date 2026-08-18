export type CartLine = {
  slug: string;
  quantity: number;
  variantId?: string;
  addonIds?: string[];
  cakeText?: string;
};
export type Slot = {date: string; window: string};

export type Quote = {
  quoteId: string;
  expiresAt: string;
  subtotalFils: number;
  discountFils: number;
  deliveryFeeFils: number;
  totalFils: number;
  capacityPoints: number;
  earliestSlot: Slot | null;
  availableSlots: Slot[];
};

export type CreateOrder = {
  quoteId: string;
  selectedSlot: Slot;
  customer: {name: string; phone: string};
  address: {
    governorate: string;
    area: string;
    block: string;
    street: string;
    building: string;
    floor?: string;
    instructions?: string;
  };
};

export type CreatedOrder = {
  orderNumber: string;
  trackingToken: string;
  status: string;
  message: string;
};

export type OrderStatus = 'PENDING_CONFIRMATION' | 'CONFIRMED' | 'REJECTED' | 'CANCELLED';
export type FulfilmentStatus =
  | 'NOT_STARTED'
  | 'PREPARING'
  | 'READY'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'DELIVERY_ISSUE';
export type CodStatus = 'COD_DUE' | 'COLLECTED' | 'PARTIALLY_REFUNDED' | 'REFUNDED' | 'WAIVED';

export type TrackingOrder = {
  publicNumber: string;
  status: OrderStatus;
  fulfilmentStatus: FulfilmentStatus;
  codStatus: string;
  deliveryWindow: string;
  areaName: string;
  isDelayed: boolean;
  delayReason: string | null;
  createdAt: string;
};

export type OwnerOrder = {
  publicNumber: string;
  status: string;
  fulfilmentStatus: string;
  codStatus: string;
  customerName: string;
  customerPhone: string;
  areaName: string;
  deliveryWindow: string;
  totalFils: number;
  createdAt: string;
};

export type OwnerOrderUpdate = {
  status?: Extract<OrderStatus, 'CONFIRMED' | 'REJECTED' | 'CANCELLED'>;
  fulfilmentStatus?: FulfilmentStatus;
  codStatus?: CodStatus;
  rejectionReason?: string;
};

export type Owner = {id: string; name: string; email: string | null};

const base = import.meta.env.VITE_API_URL || '/api/v1';

/**
 * Carries the API's error code alongside its message. The message is written in
 * English server-side, so callers showing errors to customers translate from
 * the code and keep the message only as a fallback.
 */
export class ApiError extends Error {
  constructor(
    readonly code: string,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${base}${path}`, {
    headers: {'Content-Type': 'application/json', ...(init?.headers || {})},
    ...init
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(body?.error?.code || 'REQUEST_FAILED', body?.error?.message || 'Request failed');
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

const post = <T>(path: string, body: unknown) =>
  request<T>(path, {method: 'POST', body: JSON.stringify(body)});

export type ApiCategory = {
  slug: string;
  nameEn: string;
  nameAr: string;
  descriptionEn: string | null;
  descriptionAr: string | null;
  imageUrl: string | null;
  productCount: number;
};

export type ApiOption = {
  id: string;
  nameEn: string;
  nameAr: string;
  priceFils: number;
  capacityPoints: number;
};

export type ApiProduct = {
  slug: string;
  nameEn: string;
  nameAr: string;
  descriptionEn: string;
  descriptionAr: string;
  priceFils: number;
  capacityPoints: number;
  leadDays: number;
  imageUrl: string | null;
  tags: string[];
  servingsEn: string | null;
  servingsAr: string | null;
  allergens: string[];
  bestSeller: boolean;
  seasonal: boolean;
  giftable: boolean;
  cakeTextMaxLength: number | null;
  cakeTextPriceFils: number | null;
  cakeTextPoints: number | null;
  category: {slug: string};
  variants: (ApiOption & {leadDays: number})[];
  addons: ApiOption[];
};

export type DeliveryArea = {nameEn: string; nameAr: string; feeFils: number};

export const api = {
  categories: () => request<ApiCategory[]>('/catalog/categories'),

  products: () => request<{items: ApiProduct[]}>('/catalog/products'),

  product: (slug: string) => request<ApiProduct>(`/catalog/products/${encodeURIComponent(slug)}`),

  deliveryAreas: () => request<{items: DeliveryArea[]}>('/delivery/areas'),

  availability: (items: CartLine[], area: string) =>
    post<{capacityPoints: number; earliestSlot: Slot | null; availableSlots: Slot[]}>(
      '/availability/earliest',
      {items, area}
    ),

  quote: (items: CartLine[], area: string) => post<Quote>('/checkout/quote', {items, area}),

  createOrder: (order: CreateOrder) => post<CreatedOrder>('/orders', order),

  tracking: (token: string) => request<TrackingOrder>(`/tracking/${encodeURIComponent(token)}`),

  trackingLookup: (orderNumber: string, phone: string) =>
    post<{trackingToken: string}>('/tracking/lookup', {orderNumber, phone}),

  owner: {
    me: () => request<Owner>('/owner/me'),
    login: (email: string, password: string) =>
      post<{requiresTotp: boolean}>('/owner/auth/login', {email, password}),
    verifyTotp: (code: string) => post<{owner: Owner}>('/owner/auth/verify-totp', {code}),
    logout: () => request<void>('/owner/auth/logout', {method: 'POST'}),
    orders: () => request<{items: OwnerOrder[]}>('/owner/orders'),
    updateOrder: (publicNumber: string, update: OwnerOrderUpdate) =>
      request<OwnerOrder>(`/owner/orders/${encodeURIComponent(publicNumber)}`, {
        method: 'PATCH',
        body: JSON.stringify(update)
      })
  }
};
