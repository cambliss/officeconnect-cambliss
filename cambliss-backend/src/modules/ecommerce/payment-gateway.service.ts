import prisma from "../../config/prisma";
import { getExchangeRate, getBaseCurrency } from "./currency.service";

export interface PaymentGatewayConfig {
  provider: string;
  apiKey: string;
  apiSecret: string;
  supportedCurrencies: string[];
}

export interface MultiCurrencyPaymentRequest {
  organizationId: string;
  orderId: string;
  customerId: string;
  amount: number;
  currency: string;
  paymentMethod: "razorpay" | "stripe" | "paypal";
  description: string;
  metadata?: Record<string, any>;
}

export interface PaymentProcessingResult {
  success: boolean;
  transactionId: string;
  amount: number;
  currency: string;
  baseCurrencyAmount: number;
  exchangeRate: number;
  paymentReference: string;
  timestamp: Date;
}

/**
 * Initialize payment gateway for specific currency
 */
export async function initializePaymentGateway(
  paymentMethod: string,
  currency: string
): Promise<PaymentGatewayConfig> {
  const PAYMENT_CONFIGS: Record<string, Record<string, PaymentGatewayConfig>> =
    {
      razorpay: {
        INR: {
          provider: "razorpay",
          apiKey: process.env.RAZORPAY_KEY_ID || "",
          apiSecret: process.env.RAZORPAY_KEY_SECRET || "",
          supportedCurrencies: ["INR"],
        },
        USD: {
          provider: "razorpay",
          apiKey: process.env.RAZORPAY_KEY_ID || "",
          apiSecret: process.env.RAZORPAY_KEY_SECRET || "",
          supportedCurrencies: ["USD"],
        },
      },
      stripe: {
        USD: {
          provider: "stripe",
          apiKey: process.env.STRIPE_SECRET_KEY || "",
          apiSecret: process.env.STRIPE_PUBLIC_KEY || "",
          supportedCurrencies: ["USD", "EUR", "GBP"],
        },
        EUR: {
          provider: "stripe",
          apiKey: process.env.STRIPE_SECRET_KEY || "",
          apiSecret: process.env.STRIPE_PUBLIC_KEY || "",
          supportedCurrencies: ["USD", "EUR", "GBP"],
        },
        GBP: {
          provider: "stripe",
          apiKey: process.env.STRIPE_SECRET_KEY || "",
          apiSecret: process.env.STRIPE_PUBLIC_KEY || "",
          supportedCurrencies: ["USD", "EUR", "GBP"],
        },
      },
      paypal: {
        USD: {
          provider: "paypal",
          apiKey: process.env.PAYPAL_CLIENT_ID || "",
          apiSecret: process.env.PAYPAL_CLIENT_SECRET || "",
          supportedCurrencies: ["USD", "EUR", "GBP", "INR"],
        },
        EUR: {
          provider: "paypal",
          apiKey: process.env.PAYPAL_CLIENT_ID || "",
          apiSecret: process.env.PAYPAL_CLIENT_SECRET || "",
          supportedCurrencies: ["USD", "EUR", "GBP", "INR"],
        },
        GBP: {
          provider: "paypal",
          apiKey: process.env.PAYPAL_CLIENT_ID || "",
          apiSecret: process.env.PAYPAL_CLIENT_SECRET || "",
          supportedCurrencies: ["USD", "EUR", "GBP", "INR"],
        },
        INR: {
          provider: "paypal",
          apiKey: process.env.PAYPAL_CLIENT_ID || "",
          apiSecret: process.env.PAYPAL_CLIENT_SECRET || "",
          supportedCurrencies: ["USD", "EUR", "GBP", "INR"],
        },
      },
    };

  const config = PAYMENT_CONFIGS[paymentMethod]?.[currency];
  if (!config) {
    throw new Error(
      `Payment method ${paymentMethod} not configured for currency ${currency}`
    );
  }

  return config;
}

/**
 * Process multi-currency payment (simulation)
 * In production, this would integrate with actual payment gateways
 */
export async function processMultiCurrencyPayment(
  request: MultiCurrencyPaymentRequest
): Promise<PaymentProcessingResult> {
  try {
    // Get exchange rate to base currency
    const exchangeRate = await getExchangeRate(
      request.organizationId,
      request.currency,
      "INR"
    );

    const baseCurrencyAmount = parseFloat(
      (request.amount * exchangeRate).toFixed(2)
    );

    // Initialize payment gateway
    await initializePaymentGateway(request.paymentMethod, request.currency);

    // Create transaction record
    const transactionId = `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return {
      success: true,
      transactionId,
      amount: request.amount,
      currency: request.currency,
      baseCurrencyAmount,
      exchangeRate,
      paymentReference: `${request.paymentMethod.toUpperCase()}_${transactionId}`,
      timestamp: new Date(),
    };
  } catch (error) {
    throw new Error(
      `Payment processing failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Validate currency support for payment method
 */
export async function validateCurrencySupport(
  paymentMethod: string,
  currency: string
): Promise<boolean> {
  try {
    const config = await initializePaymentGateway(paymentMethod, currency);
    return config.supportedCurrencies.includes(currency);
  } catch {
    return false;
  }
}

/**
 * Get available payment methods for currency
 */
export function getAvailablePaymentMethods(currency: string): string[] {
  const PAYMENT_CONFIGS: Record<string, string[]> = {
    INR: ["razorpay", "paypal"],
    USD: ["razorpay", "stripe", "paypal"],
    EUR: ["stripe", "paypal"],
    GBP: ["stripe", "paypal"],
  };

  return PAYMENT_CONFIGS[currency] || [];
}

/**
 * Calculate payment processing fee based on currency and method
 */
export function calculatePaymentFee(
  amount: number,
  currency: string,
  paymentMethod: string
): number {
  const FEE_STRUCTURE: Record<string, Record<string, number>> = {
    razorpay: {
      INR: 0.02, // 2% for INR
      USD: 0.025, // 2.5% for USD
    },
    stripe: {
      USD: 0.029, // 2.9% + $0.30
      EUR: 0.029,
      GBP: 0.029,
    },
    paypal: {
      USD: 0.0349, // 3.49% + $0.30
      EUR: 0.0349,
      GBP: 0.0349,
      INR: 0.02,
    },
  };

  const feeRate = FEE_STRUCTURE[paymentMethod]?.[currency] || 0.03;
  return parseFloat((amount * feeRate).toFixed(2));
}

/**
 * Get payment summary with all fees and taxes
 */
export async function getPaymentSummary(
  organizationId: string,
  amount: number,
  currency: string,
  paymentMethod: string,
  taxRate: number = 0
): Promise<{
  subtotal: number;
  processingFee: number;
  tax: number;
  total: number;
  baseCurrencyTotal: number;
}> {
  const processingFee = calculatePaymentFee(amount, currency, paymentMethod);
  const subtotal = parseFloat((amount + processingFee).toFixed(2));
  const tax = parseFloat(((subtotal * taxRate) / 100).toFixed(2));
  const total = parseFloat((subtotal + tax).toFixed(2));

  // Convert to base currency
  const exchangeRate = await getExchangeRate(organizationId, currency, "INR");
  const baseCurrencyTotal = parseFloat((total * exchangeRate).toFixed(2));

  return {
    subtotal,
    processingFee,
    tax,
    total,
    baseCurrencyTotal,
  };
}

/**
 * Get currency-specific payment form fields
 */
export function getPaymentFormFields(currency: string): Record<string, any> {
  const FIELD_CONFIG: Record<string, Record<string, any>> = {
    INR: {
      locale: "en_IN",
      prefill: {
        language: "en",
      },
    },
    USD: {
      locale: "en_US",
      prefill: {
        language: "en",
      },
    },
    EUR: {
      locale: "en_DE",
      prefill: {
        language: "de",
      },
    },
    GBP: {
      locale: "en_GB",
      prefill: {
        language: "en",
      },
    },
  };

  return FIELD_CONFIG[currency] || {};
}
