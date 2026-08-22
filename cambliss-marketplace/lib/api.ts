import axios from "axios";

const TOKEN_KEY = "marketplace_vendor_token";

export type OrganizationType = "business" | "ngo" | "social-enterprise";

export const api = axios.create({
  baseURL: "/api",
  timeout: 15000,
});

// Attach token to requests
api.interceptors.request.use((config) => {
  const token = typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const setVendorToken = (token: string) => {
  if (typeof window !== "undefined") {
    localStorage.setItem(TOKEN_KEY, token);
  }
};

export const getVendorToken = () => {
  if (typeof window !== "undefined") {
    return localStorage.getItem(TOKEN_KEY);
  }
  return null;
};

export const clearVendorToken = () => {
  if (typeof window !== "undefined") {
    localStorage.removeItem(TOKEN_KEY);
  }
};

export type MarketplaceProduct = {
  id: string;
  title?: string;
  name?: string;
  sellingPrice?: string | number;
  price?: string | number;
  isActive?: boolean;
  store?: {
    id: string;
    name: string;
    domain?: string;
    businessTypes?: string[];
    organizationType?: string;
    assortmentType?: string;
  };
  category?: {
    id: string;
    name: string;
  };
};

export type MarketplaceProductFilters = {
  search?: string;
  businessTypes?: string[];
  organizationType?: "business" | "ngo" | "social-enterprise";
  categoryId?: string;
  sortBy?: "latest" | "price-low" | "price-high";
};

export type VendorOrder = {
  id: string;
  orderId: string;
  storeId: string;
  status: string;
  totalAmount: number | string;
  customerName?: string;
  createdAt?: string;
};

export type VendorStore = {
  id: string;
  name: string;
  domain: string;
  description?: string;
  isActive?: boolean;
  businessTypes?: string[];
  organizationType?: OrganizationType;
  assortmentType?: "single-category" | "multi-category";
};

export type CreateVendorStorePayload = {
  name: string;
  domain: string;
  description?: string;
  businessTypes?: string[];
  organizationType?: OrganizationType;
  assortmentType?: "single-category" | "multi-category";
  onboardingPitch?: string;
};

export type VendorStoreInsights = {
  storeId: string;
  trustScore: number;
  profileScore: number;
  catalogScore: number;
  fulfillmentScore: number;
  operationalScore: number;
  metrics: {
    totalListings: number;
    activeListings: number;
    totalOrders: number;
    deliveredOrders: number;
    cancelledOrders: number;
    returnRequests: number;
  };
};

export type SellerRecommendation = {
  id: string;
  priority: "high" | "medium" | "low";
  title: string;
  description: string;
  action: string;
  estimatedImpact: string;
  scoreGainPotential: number;
};

export type RankedMarketplaceProduct = MarketplaceProduct & {
  sellingPrice: string;
  unitPrice: string;
  description?: string;
  images?: string[];
  trustScore: number;
  conversionRate: number;
  rank: number;
};

export type SellerTierFeatures = {
  expeditedCheckout: boolean;
  featuredPlacement: boolean;
  autoOrderRelease: boolean;
  prioritySupport: boolean;
  commissionDiscount: number;
};

export type SellerTierInfo = {
  storeId: string;
  storeName: string;
  tier: "new" | "verified" | "premium" | "elite";
  isFeatured: boolean;
  tierConfig: {
    tier: "new" | "verified" | "premium" | "elite";
    isFeatured: boolean;
    trustScoreThreshold: number;
    features: SellerTierFeatures;
  };
};

// Public endpoints
export async function fetchMarketplaceProducts(filters?: MarketplaceProductFilters) {
  const params: Record<string, string> = {};

  if (filters?.search?.trim()) params.search = filters.search.trim();
  if (filters?.businessTypes?.length) params.businessType = filters.businessTypes.join(",");
  if (filters?.organizationType) params.organizationType = filters.organizationType;
  if (filters?.categoryId) params.categoryId = filters.categoryId;
  if (filters?.sortBy) params.sortBy = filters.sortBy;

  const { data } = await api.get("/ecommerce/marketplace/products", { params });
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

export async function createPublicOrder(payload: {
  storeDomain: string;
  customerName: string;
  customerEmail: string;
  items: Array<{ productListingId: string; quantity: number }>;
}) {
  const { data } = await api.post("/ecommerce/public/orders", payload);
  return data;
}

// Vendor auth
export async function vendorRegister(payload: {
  email: string;
  password: string;
  storeName: string;
}) {
  const { data } = await api.post("/auth/register", {
    email: payload.email,
    password: payload.password,
    organizationName: payload.storeName,
  });
  if (data?.token) setVendorToken(data.token);
  return data;
}

export async function vendorLogin(email: string, password: string) {
  const { data } = await api.post("/auth/login", { email, password });
  if (data?.token) setVendorToken(data.token);
  return data;
}

export async function vendorLogout() {
  clearVendorToken();
}

export async function getVendorProfile() {
  const { data } = await api.get("/auth/me");
  return data;
}

// Vendor store operations
export async function createVendorStore(payload: {
  name: string;
  domain: string;
  description?: string;
  businessTypes?: string[];
  organizationType?: OrganizationType;
  assortmentType?: "single-category" | "multi-category";
  onboardingPitch?: string;
}) {
  try {
    const { data } = await api.post("/ecommerce/stores", payload);
    return data;
  } catch (error: any) {
    // Compatibility fallback: older backend contracts may reject additional onboarding fields.
    const status = error?.response?.status;
    if ((status === 400 || status === 422) && (payload.businessTypes || payload.organizationType || payload.assortmentType || payload.onboardingPitch)) {
      const { data } = await api.post("/ecommerce/stores", {
        name: payload.name,
        domain: payload.domain,
        description: payload.description,
      });
      return data;
    }
    throw error;
  }
}

export async function getVendorStores() {
  const { data } = await api.get("/ecommerce/stores");
  if (Array.isArray(data)) return data as VendorStore[];
  if (Array.isArray(data?.items)) return data.items as VendorStore[];
  if (Array.isArray(data?.data)) return data.data as VendorStore[];
  return [];
}

export async function getVendorStoreInsights(storeId: string) {
  const { data } = await api.get(`/ecommerce/stores/${storeId}/insights`);
  return data as VendorStoreInsights;
}

export async function getVendorStoreRecommendations(storeId: string) {
  const { data } = await api.get(`/ecommerce/stores/${storeId}/recommendations`);
  if (Array.isArray(data)) return data as SellerRecommendation[];
  return [];
}

export async function fetchCategoryRankedProducts(categoryId: string, search?: string) {
  const params: Record<string, string> = {};
  if (search?.trim()) params.search = search.trim();
  const { data } = await api.get(`/ecommerce/marketplace/categories/${categoryId}/products`, { params });
  if (Array.isArray(data)) return data as RankedMarketplaceProduct[];
  if (Array.isArray(data?.items)) return data.items as RankedMarketplaceProduct[];
  if (Array.isArray(data?.data)) return data.data as RankedMarketplaceProduct[];
  return [];
}

export async function getSellerTierInfo(storeId: string) {
  try {
    const { data } = await api.get(`/ecommerce/stores/${storeId}/tier-info`);
    return data as SellerTierInfo;
  } catch {
    return null;
  }
}

// Vendor order operations
export async function getVendorOrders() {
  const { data } = await api.get("/ecommerce/orders");
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

export async function updateOrderStatus(orderId: string, status: string) {
  const { data } = await api.patch(`/ecommerce/orders/${orderId}/status`, { status });
  return data;
}

// Multi-currency support
export type SupportedCurrency = "INR" | "USD" | "EUR" | "GBP";

export type RegionalPricingResult = {
  originalPrice: number;
  currency: string;
  regionalPrice: number;
  taxRate: number;
  taxAmount: number;
  totalPrice: number;
  discount?: number;
};

export type MultiCurrencyProduct = RankedMarketplaceProduct & {
  baseCurrency: string;
  multiCurrencyPrices: Record<SupportedCurrency, number>;
  regionalPricing?: Record<string, RegionalPricingResult>;
};

export type PaymentSummary = {
  subtotal: number;
  processingFee: number;
  tax: number;
  total: number;
  baseCurrencyTotal: number;
};

/**
 * Get product pricing in multiple currencies
 */
export async function getProductMultiCurrencyPricing(
  productListingId: string,
  currencies: SupportedCurrency[]
) {
  const params = new URLSearchParams();
  currencies.forEach((c) => params.append("currencies", c));
  const { data } = await api.get(`/ecommerce/products/${productListingId}/multi-currency`, { params });
  return data;
}

/**
 * Get regional pricing for product
 */
export async function getRegionalPricing(
  productListingId: string,
  currency: SupportedCurrency,
  region: string,
  state?: string
) {
  const { data } = await api.get(`/ecommerce/products/${productListingId}/regional-pricing`, {
    params: { currency, region, state },
  });
  return data as RegionalPricingResult;
}

/**
 * Get payment summary with fees and taxes
 */
export async function getPaymentSummary(
  amount: number,
  currency: SupportedCurrency,
  paymentMethod: string
) {
  const { data } = await api.get(`/ecommerce/payments/summary`, {
    params: { amount, currency, paymentMethod },
  });
  return data as PaymentSummary;
}

/**
 * Get available payment methods for currency
 */
export async function getAvailablePaymentMethods(currency: SupportedCurrency) {
  const { data } = await api.get(`/ecommerce/payments/methods/${currency}`);
  return (Array.isArray(data) ? data : data?.methods || []) as string[];
}

/**
 * Convert currency
 */
export async function convertCurrency(
  amount: number,
  fromCurrency: SupportedCurrency,
  toCurrency: SupportedCurrency
) {
  const { data } = await api.get(`/ecommerce/currency/convert`, {
    params: { amount, from: fromCurrency, to: toCurrency },
  });
  return data.convertedAmount as number;
}

export type CourierRecommendation = {
  partner: "SHIPROCKET" | "DELHIVERY" | "BLUEDART";
  displayName: string;
  estimatedCost: number;
  estimatedDeliveryDays: number;
  reliabilityScore: number;
  score: number;
};

export type WarehouseRecommendation = {
  warehouseId: string;
  warehouseName: string;
  coveragePercent: number;
  estimatedDistanceKm: number;
  estimatedHandlingHours: number;
  recommendedCouriers: CourierRecommendation[];
};

export type LogisticsRecommendationResult = {
  orderId: string;
  customerState: string;
  recommendedWarehouse: WarehouseRecommendation;
  alternateWarehouses: WarehouseRecommendation[];
  generatedAt: string;
};

export type TrackingTimelineItem = {
  status: string;
  message: string;
  at: string;
};

export type OrderTrackingTimeline = {
  orderId: string;
  status: string;
  timeline: TrackingTimelineItem[];
  etaDate: string | null;
};

export async function getOrderLogisticsRecommendation(orderId: string) {
  const { data } = await api.get(`/ecommerce/logistics/orders/${orderId}/recommendation`);
  return data as LogisticsRecommendationResult;
}

export async function assignOptimizedCourier(orderId: string, preferredPartner?: "SHIPROCKET" | "DELHIVERY" | "BLUEDART") {
  const { data } = await api.post(`/ecommerce/logistics/orders/${orderId}/assign`, {
    preferredPartner,
  });
  return data;
}

export async function getOrderTrackingTimeline(orderId: string) {
  const { data } = await api.get(`/ecommerce/logistics/orders/${orderId}/tracking`);
  return data as OrderTrackingTimeline;
}

export async function estimateDeliveryPromise(storeId: string, state?: string) {
  const { data } = await api.get(`/ecommerce/logistics/promise`, {
    params: { storeId, state },
  });
  return data;
}
