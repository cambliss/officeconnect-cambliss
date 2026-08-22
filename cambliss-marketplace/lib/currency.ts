export type SupportedCurrency = 'INR' | 'USD' | 'EUR' | 'GBP';

export interface CurrencyConfig {
  code: SupportedCurrency;
  symbol: string;
  name: string;
  region: string;
  decimalPlaces: number;
}

export const CURRENCY_CONFIG: Record<SupportedCurrency, CurrencyConfig> = {
  INR: {
    code: 'INR',
    symbol: '₹',
    name: 'Indian Rupee',
    region: 'IN',
    decimalPlaces: 2,
  },
  USD: {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    region: 'US',
    decimalPlaces: 2,
  },
  EUR: {
    code: 'EUR',
    symbol: '€',
    name: 'Euro',
    region: 'EU',
    decimalPlaces: 2,
  },
  GBP: {
    code: 'GBP',
    symbol: '£',
    name: 'British Pound',
    region: 'GB',
    decimalPlaces: 2,
  },
};

/**
 * Format amount with currency
 */
export function formatCurrency(amount: number, currency: SupportedCurrency): string {
  const config = CURRENCY_CONFIG[currency];
  if (!config) {
    return amount.toFixed(2);
  }
  const formatted = amount.toFixed(config.decimalPlaces);
  return `${config.symbol}${formatted}`;
}

/**
 * Get currency symbol
 */
export function getCurrencySymbol(currency: SupportedCurrency): string {
  return CURRENCY_CONFIG[currency]?.symbol || currency;
}

/**
 * Get currency name
 */
export function getCurrencyName(currency: SupportedCurrency): string {
  return CURRENCY_CONFIG[currency]?.name || currency;
}

/**
 * Get currency region
 */
export function getCurrencyRegion(currency: SupportedCurrency): string {
  return CURRENCY_CONFIG[currency]?.region || '';
}

/**
 * Format price range
 */
export function formatPriceRange(
  minPrice: number,
  maxPrice: number,
  currency: SupportedCurrency,
): string {
  if (minPrice === maxPrice) {
    return formatCurrency(minPrice, currency);
  }
  return `${formatCurrency(minPrice, currency)} - ${formatCurrency(maxPrice, currency)}`;
}

/**
 * Parse currency from string
 */
export function parseCurrency(value: string): SupportedCurrency | null {
  const currency = value.toUpperCase();
  if (currency in CURRENCY_CONFIG) {
    return currency as SupportedCurrency;
  }
  return null;
}

/**
 * Get user's preferred currency based on locale
 */
export function getPreferredCurrency(): SupportedCurrency {
  if (typeof navigator === 'undefined') {
    return 'INR';
  }

  const locale = navigator.language || 'en-US';
  
  if (locale.startsWith('en-US')) return 'USD';
  if (locale.startsWith('en-GB')) return 'GBP';
  if (locale.startsWith('de') || locale.startsWith('fr')) return 'EUR';
  if (locale.startsWith('en-IN') || locale.startsWith('hi')) return 'INR';

  return 'INR';
}
