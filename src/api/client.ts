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
  customer: {name: string; phone: string; email?: string};
  address: {
    governorate: string;
    area: string;
    block: string;
    street: string;
    building: string;
    floor?: string;
    instructions?: string;
  };
  gift?: {
    isGift: boolean;
    recipientName?: string;
    recipientPhone?: string;
    message?: string;
    anonymous?: boolean;
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

export type CancelledOrder = {publicNumber: string; status: OrderStatus};

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
  isGift: boolean;
  giftRecipientName: string | null;
  giftRecipientPhone: string | null;
  giftMessage: string | null;
  giftAnonymous: boolean;
};

export type OwnerOrderUpdate = {
  status?: Extract<OrderStatus, 'CONFIRMED' | 'REJECTED' | 'CANCELLED'>;
  fulfilmentStatus?: FulfilmentStatus;
  codStatus?: CodStatus;
  rejectionReason?: string;
};

export type Owner = {id: string; name: string; email: string | null};
export type Customer = {id: string; name: string; email: string | null};

export type CustomerOrder = {
  publicNumber: string;
  trackingToken: string;
  status: OrderStatus;
  fulfilmentStatus: FulfilmentStatus;
  codStatus: CodStatus;
  deliveryWindow: string;
  areaName: string;
  totalFils: number;
  createdAt: string;
};

export type CustomerAddress = {
  id: string;
  label: string;
  governorate: string;
  areaName: string;
  block: string;
  street: string;
  building: string;
  floorOrApartment: string | null;
  deliveryInstructions: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CustomerAddressInput = {
  label: string;
  governorate: string;
  areaName: string;
  block: string;
  street: string;
  building: string;
  floorOrApartment?: string;
  deliveryInstructions?: string;
};

export type CustomerAccount = {
  customer: Customer;
  orders: CustomerOrder[];
  addresses: CustomerAddress[];
  wishlist: string[];
};

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
    // Sends the owner session cookie when the API is on another origin. Through
    // the dev proxy the request is same-origin and this changes nothing.
    credentials: 'include',
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

const patch = <T>(path: string, body: unknown) =>
  request<T>(path, {method: 'PATCH', body: JSON.stringify(body)});

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
  tagsAr: string[];
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

/**
 * The owner's view of the catalog: unpublished and archived rows included, and
 * every option whether or not it is still offered. The storefront types above
 * deliberately show only what a customer may see.
 */
export type AdminCategory = {
  id: string;
  slug: string;
  nameEn: string;
  nameAr: string;
  descriptionEn: string | null;
  descriptionAr: string | null;
  imageUrl: string | null;
  sortOrder: number;
  archivedAt: string | null;
  productCount: number;
};

export type AdminOption = {
  id: string;
  nameEn: string;
  nameAr: string;
  priceFils: number;
  capacityPoints: number;
  active: boolean;
};

export type AdminVariant = AdminOption & {leadDays: number};

export type AdminProduct = {
  id: string;
  slug: string;
  categoryId: string;
  nameEn: string;
  nameAr: string;
  descriptionEn: string;
  descriptionAr: string;
  priceFils: number;
  capacityPoints: number;
  leadDays: number;
  published: boolean;
  active: boolean;
  imageUrl: string | null;
  tags: string[];
  tagsAr: string[];
  servingsEn: string | null;
  servingsAr: string | null;
  allergens: string[];
  bestSeller: boolean;
  seasonal: boolean;
  giftable: boolean;
  cakeTextMaxLength: number | null;
  cakeTextPriceFils: number | null;
  cakeTextPoints: number | null;
  archivedAt: string | null;
  variants: AdminVariant[];
  addons: AdminOption[];
};

export type AdminArea = {
  id: string;
  nameEn: string;
  nameAr: string;
  feeFils: number;
  active: boolean;
};

export type AdminSlot = {
  id: string;
  areaId: string;
  date: string;
  windowStart: string;
  windowEnd: string;
  capacity: number;
  reserved: number;
};

export type CapacityDay = {
  id: string | null;
  date: string;
  weekday: number;
  totalPoints: number | null;
  usedPoints: number;
};

export type AdminPromotion = {
  id: string;
  code: string;
  titleEn: string;
  titleAr: string;
  descriptionEn: string | null;
  descriptionAr: string | null;
  discountType: 'PERCENT' | 'FIXED_FILS';
  discountValue: number;
  startsAt: string | null;
  endsAt: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AdminContentBlock = {
  id: string;
  key: string;
  titleEn: string;
  titleAr: string;
  bodyEn: string;
  bodyAr: string;
  active: boolean;
  updatedAt: string;
};

export type OptionInput = {
  nameEn: string;
  nameAr: string;
  priceFils: number;
  capacityPoints: number;
  leadDays?: number;
  active?: boolean;
};

export type SlotPlan = {
  areaIds: string[];
  from: string;
  to: string;
  windows: {start: string; end: string}[];
  capacity: number;
  skipWeekdays?: number[];
};

export type BulkResult = {written: number; held: number | string[]; days?: number};

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

  cancelOrder: (token: string) =>
    post<CancelledOrder>(`/tracking/${encodeURIComponent(token)}/cancel`, {}),

  trackingLookup: (orderNumber: string, phone: string) =>
    post<{trackingToken: string}>('/tracking/lookup', {orderNumber, phone}),

  customer: {
    me: () => request<CustomerAccount>('/customer/me'),
    register: (name: string, email: string, password: string) =>
      post<{customer: Customer}>('/customer/auth/register', {name, email, password}),
    login: (email: string, password: string) =>
      post<{customer: Customer}>('/customer/auth/login', {email, password}),
    logout: () => request<void>('/customer/auth/logout', {method: 'POST'}),
    syncWishlist: (slugs: string[]) => request<{wishlist: string[]}>('/customer/wishlist', {
      method: 'PUT',
      body: JSON.stringify({slugs})
    }),
    createAddress: (address: CustomerAddressInput) =>
      post<CustomerAddress>('/customer/addresses', address),
    deleteAddress: (id: string) => request<void>(`/customer/addresses/${id}`, {method: 'DELETE'}),
    cancelOrder: (publicNumber: string) =>
      post<CancelledOrder>(`/customer/orders/${encodeURIComponent(publicNumber)}/cancel`, {})
  },

  owner: {
    me: () => request<Owner>('/owner/me'),
    login: (email: string, password: string) =>
      post<{requiresTotp: boolean}>('/owner/auth/login', {email, password}),
    verifyTotp: (code: string) => post<{owner: Owner}>('/owner/auth/verify-totp', {code}),
    logout: () => request<void>('/owner/auth/logout', {method: 'POST'}),
    orders: () => request<{items: OwnerOrder[]}>('/owner/orders'),
    updateOrder: (publicNumber: string, update: OwnerOrderUpdate) =>
      patch<OwnerOrder>(`/owner/orders/${encodeURIComponent(publicNumber)}`, update),
    categories: () => request<{items: AdminCategory[]}>('/owner/categories'),
    createCategory: (data: Partial<AdminCategory>) =>
      post<AdminCategory>('/owner/categories', data),
    updateCategory: (id: string, data: Partial<AdminCategory> & {archived?: boolean}) =>
      patch<AdminCategory>(`/owner/categories/${id}`, data),

    products: () => request<{items: AdminProduct[]}>('/owner/products'),
    product: (id: string) => request<AdminProduct>(`/owner/products/${id}`),
    createProduct: (data: Partial<AdminProduct>) => post<AdminProduct>('/owner/products', data),
    updateProduct: (id: string, data: Partial<AdminProduct> & {archived?: boolean}) =>
      patch<AdminProduct>(`/owner/products/${id}`, data),

    createVariant: (productId: string, data: OptionInput) =>
      post<AdminVariant>(`/owner/products/${productId}/variants`, data),
    updateVariant: (id: string, data: Partial<OptionInput>) =>
      patch<AdminVariant>(`/owner/variants/${id}`, data),
    createAddon: (productId: string, data: OptionInput) =>
      post<AdminOption>(`/owner/products/${productId}/addons`, data),
    updateAddon: (id: string, data: Partial<OptionInput>) =>
      patch<AdminOption>(`/owner/addons/${id}`, data),

    promotions: () => request<{items: AdminPromotion[]}>('/owner/promotions'),
    createPromotion: (data: Omit<AdminPromotion, 'id' | 'createdAt' | 'updatedAt'>) =>
      post<AdminPromotion>('/owner/promotions', data),
    updatePromotion: (id: string, data: Partial<Omit<AdminPromotion, 'id' | 'createdAt' | 'updatedAt'>>) =>
      patch<AdminPromotion>(`/owner/promotions/${id}`, data),

    contentBlocks: () => request<{items: AdminContentBlock[]}>('/owner/content-blocks'),
    createContentBlock: (data: Omit<AdminContentBlock, 'id' | 'updatedAt'>) =>
      post<AdminContentBlock>('/owner/content-blocks', data),
    updateContentBlock: (id: string, data: Partial<Omit<AdminContentBlock, 'id' | 'updatedAt'>>) =>
      patch<AdminContentBlock>(`/owner/content-blocks/${id}`, data),

    areas: () => request<{items: AdminArea[]}>('/owner/delivery/areas'),
    createArea: (data: Omit<AdminArea, 'id'>) => post<AdminArea>('/owner/delivery/areas', data),
    updateArea: (id: string, data: Partial<Omit<AdminArea, 'id'>>) =>
      patch<AdminArea>(`/owner/delivery/areas/${id}`, data),

    slots: (from: string, to: string, areaId?: string) =>
      request<{items: AdminSlot[]}>(
        `/owner/delivery/slots?${new URLSearchParams({from, to, ...(areaId ? {areaId} : {})})}`
      ),
    upsertSlot: (data: Omit<AdminSlot, 'id' | 'reserved'>) =>
      post<AdminSlot>('/owner/delivery/slots', data),
    updateSlot: (id: string, capacity: number) =>
      patch<AdminSlot>(`/owner/delivery/slots/${id}`, {capacity}),
    deleteSlot: (id: string) => request<void>(`/owner/delivery/slots/${id}`, {method: 'DELETE'}),
    generateSlots: (plan: SlotPlan) => post<BulkResult>('/owner/delivery/slots/generate', plan),

    capacity: (from: string, to: string) =>
      request<{items: CapacityDay[]}>(`/owner/production-capacity?${new URLSearchParams({from, to})}`),
    setCapacity: (date: string, totalPoints: number) =>
      request<CapacityDay>('/owner/production-capacity', {
        method: 'PUT',
        body: JSON.stringify({date, totalPoints})
      }),
    setCapacityRange: (
      from: string,
      to: string,
      totalPoints: number,
      skipWeekdays: number[] = []
    ) => post<BulkResult>('/owner/production-capacity/range', {from, to, totalPoints, skipWeekdays})
  }
};
