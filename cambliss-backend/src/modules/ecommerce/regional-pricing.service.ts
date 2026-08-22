import prisma from "../../config/prisma";
import { convertCurrency, getBaseCurrency } from "./currency.service";

export interface RegionalPricingResult {
  originalPrice: number;
  currency: string;
  regionalPrice: number;
  taxRate: number;
  taxAmount: number;
  totalPrice: number;
  discount?: number;
}

export interface RegionalTaxConfig {
  region: string;
  state?: string;
  taxType: string;
  taxRate: number;
}

/**
 * Get applicable tax rate for a region
 */
export async function getRegionalTaxRate(
  organizationId: string,
  region: string,
  state?: string
): Promise<number> {
  const tax = await prisma.regionalTax.findFirst({
    where: {
      organizationId,
      region,
      state: state || null,
      isActive: true,
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

  return tax ? parseFloat(tax.taxRate.toString()) : 0;
}

/**
 * Calculate regional pricing including tax
 */
export async function calculateRegionalPrice(
  organizationId: string,
  basePrice: number,
  targetCurrency: string,
  region: string,
  state?: string,
  taxIncluded: boolean = false
): Promise<RegionalPricingResult> {
  try {
    const baseCurrency = await getBaseCurrency(organizationId);
    
    // Convert price to target currency
    const convertedPrice = await convertCurrency(
      organizationId,
      basePrice,
      baseCurrency,
      targetCurrency
    );

    // Get tax rate for region
    const taxRate = await getRegionalTaxRate(organizationId, region, state);
    
    let totalPrice: number;
    let taxAmount: number;

    if (taxIncluded) {
      // Price is already tax-inclusive
      taxAmount = parseFloat(
        ((convertedPrice * taxRate) / (100 + taxRate)).toFixed(2)
      );
      totalPrice = convertedPrice;
    } else {
      // Tax is additional
      taxAmount = parseFloat(((convertedPrice * taxRate) / 100).toFixed(2));
      totalPrice = parseFloat((convertedPrice + taxAmount).toFixed(2));
    }

    return {
      originalPrice: basePrice,
      currency: targetCurrency,
      regionalPrice: convertedPrice,
      taxRate,
      taxAmount,
      totalPrice,
    };
  } catch (error) {
    throw new Error(
      `Failed to calculate regional price: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Apply regional pricing with discount
 */
export async function applyRegionalPricingWithDiscount(
  organizationId: string,
  basePrice: number,
  targetCurrency: string,
  region: string,
  discountPercentage: number = 0,
  state?: string
): Promise<RegionalPricingResult> {
  const pricing = await calculateRegionalPrice(
    organizationId,
    basePrice,
    targetCurrency,
    region,
    state
  );

  if (discountPercentage > 0) {
    const discountAmount = parseFloat(
      ((pricing.totalPrice * discountPercentage) / 100).toFixed(2)
    );
    pricing.discount = discountAmount;
    pricing.totalPrice = parseFloat(
      (pricing.totalPrice - discountAmount).toFixed(2)
    );
  }

  return pricing;
}

/**
 * Get all regional tax configs for organization
 */
export async function getRegionalTaxConfigs(
  organizationId: string
): Promise<RegionalTaxConfig[]> {
  const taxes = await prisma.regionalTax.findMany({
    where: {
      organizationId,
      isActive: true,
      effectiveDate: {
        lte: new Date(),
      },
      OR: [
        { expiryDate: null },
        { expiryDate: { gte: new Date() } },
      ],
    },
    orderBy: {
      region: "asc",
    },
  });

  return taxes.map((tax) => ({
    region: tax.region,
    state: tax.state || undefined,
    taxType: tax.taxType,
    taxRate: parseFloat(tax.taxRate.toString()),
  }));
}

/**
 * Update or create regional tax config
 */
export async function upsertRegionalTax(
  organizationId: string,
  region: string,
  country: string,
  taxType: string,
  taxRate: number,
  state?: string,
  effectiveDate?: Date
): Promise<void> {
  await prisma.regionalTax.create({
    data: {
      organizationId,
      region,
      country,
      state: state || null,
      taxType,
      taxRate: taxRate.toString(),
      effectiveDate: effectiveDate || new Date(),
    },
  });
}

/**
 * Get pricing for product in multiple regions
 */
export async function getMultiRegionalPricing(
  organizationId: string,
  basePrice: number,
  regions: Array<{ region: string; currency: string; state?: string }>
): Promise<Record<string, RegionalPricingResult>> {
  const results: Record<string, RegionalPricingResult> = {};

  for (const { region, currency, state } of regions) {
    const key = `${region}_${currency}`;
    results[key] = await calculateRegionalPrice(
      organizationId,
      basePrice,
      currency,
      region,
      state
    );
  }

  return results;
}
