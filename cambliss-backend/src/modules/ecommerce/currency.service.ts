import prisma from "../../config/prisma";

export type SupportedCurrency = "INR" | "USD" | "EUR" | "GBP";

export interface CurrencyConfig {
  code: SupportedCurrency;
  symbol: string;
  name: string;
  decimalPlaces: number;
  region: string;
}

const CURRENCY_CONFIG: Record<SupportedCurrency, CurrencyConfig> = {
  INR: {
    code: "INR",
    symbol: "₹",
    name: "Indian Rupee",
    decimalPlaces: 2,
    region: "IN",
  },
  USD: {
    code: "USD",
    symbol: "$",
    name: "US Dollar",
    decimalPlaces: 2,
    region: "US",
  },
  EUR: {
    code: "EUR",
    symbol: "€",
    name: "Euro",
    decimalPlaces: 2,
    region: "EU",
  },
  GBP: {
    code: "GBP",
    symbol: "£",
    name: "British Pound",
    decimalPlaces: 2,
    region: "GB",
  },
};

/**
 * Get current exchange rate from one currency to another
 */
export async function getExchangeRate(
  organizationId: string,
  fromCurrency: string,
  toCurrency: string
): Promise<number> {
  if (fromCurrency === toCurrency) {
    return 1;
  }

  const rate = await prisma.currencyExchangeRate.findFirst({
    where: {
      organizationId,
      fromCurrency,
      toCurrency,
      effectiveDate: {
        lte: new Date(),
      },
      OR: [
        { expiryDate: null },
        { expiryDate: { gte: new Date() } },
      ],
    },
    orderBy: {
      effectiveDate: "desc",
    },
  });

  if (!rate) {
    throw new Error(
      `No exchange rate found for ${fromCurrency} to ${toCurrency}`
    );
  }

  return parseFloat(rate.rate.toString());
}

/**
 * Convert amount from one currency to another
 */
export async function convertCurrency(
  organizationId: string,
  amount: number,
  fromCurrency: string,
  toCurrency: string
): Promise<number> {
  if (fromCurrency === toCurrency) {
    return amount;
  }

  const rate = await getExchangeRate(
    organizationId,
    fromCurrency,
    toCurrency
  );
  return parseFloat((amount * rate).toFixed(2));
}

/**
 * Update exchange rates for a currency pair
 */
export async function updateExchangeRate(
  organizationId: string,
  fromCurrency: string,
  toCurrency: string,
  rate: number,
  effectiveDate?: Date
): Promise<void> {
  await prisma.currencyExchangeRate.create({
    data: {
      organizationId,
      fromCurrency,
      toCurrency,
      rate: rate.toString(),
      effectiveDate: effectiveDate || new Date(),
    },
  });
}

/**
 * Get list of supported currencies for an organization
 */
export async function getSupportedCurrencies(
  organizationId: string
): Promise<SupportedCurrency[]> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { supportedCurrencies: true },
  });

  if (!org) {
    throw new Error(`Organization ${organizationId} not found`);
  }

  return org.supportedCurrencies as SupportedCurrency[];
}

/**
 * Get currency configuration details
 */
export function getCurrencyConfig(
  currency: SupportedCurrency
): CurrencyConfig {
  const config = CURRENCY_CONFIG[currency];
  if (!config) {
    throw new Error(`Unsupported currency: ${currency}`);
  }
  return config;
}

/**
 * Format amount with currency symbol and decimal places
 */
export function formatCurrency(
  amount: number,
  currency: SupportedCurrency
): string {
  const config = getCurrencyConfig(currency);
  const formatted = amount.toFixed(config.decimalPlaces);
  return `${config.symbol}${formatted}`;
}

/**
 * Get base currency for organization
 */
export async function getBaseCurrency(
  organizationId: string
): Promise<SupportedCurrency> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { baseCurrency: true },
  });

  if (!org) {
    throw new Error(`Organization ${organizationId} not found`);
  }

  return org.baseCurrency as SupportedCurrency;
}

/**
 * Batch convert multiple amounts
 */
export async function convertMultipleCurrencies(
  organizationId: string,
  amount: number,
  fromCurrency: string,
  toCurrencies: string[]
): Promise<Record<string, number>> {
  const results: Record<string, number> = {};

  for (const toCurrency of toCurrencies) {
    results[toCurrency] = await convertCurrency(
      organizationId,
      amount,
      fromCurrency,
      toCurrency
    );
  }

  return results;
}
