'use client';

import { useState } from 'react';
import { formatCurrency } from '@/lib/currency';

export type SupportedCurrency = 'INR' | 'USD' | 'EUR' | 'GBP';

interface CurrencySelectorProps {
  currentCurrency: SupportedCurrency;
  supportedCurrencies: SupportedCurrency[];
  onCurrencyChange: (currency: SupportedCurrency) => void;
  prices: Record<SupportedCurrency, number>;
}

const CURRENCY_CONFIG: Record<SupportedCurrency, { symbol: string; name: string; region: string }> = {
  INR: { symbol: '₹', name: 'Indian Rupee', region: 'IN' },
  USD: { symbol: '$', name: 'US Dollar', region: 'US' },
  EUR: { symbol: '€', name: 'Euro', region: 'EU' },
  GBP: { symbol: '£', name: 'British Pound', region: 'GB' },
};

/**
 * CurrencySelector - Allows users to view and select currency for pricing
 */
export function CurrencySelector({
  currentCurrency,
  supportedCurrencies,
  onCurrencyChange,
  prices,
}: CurrencySelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const config = CURRENCY_CONFIG[currentCurrency];
  const currentPrice = prices[currentCurrency];

  return (
    <div className="currency-selector">
      <div className="currency-display">
        <button
          className="currency-button"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Select currency"
        >
          <span className="currency-symbol">{config.symbol}</span>
          <span className="currency-code">{currentCurrency}</span>
          <svg
            className={`dropdown-icon ${isOpen ? 'open' : ''}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </button>
        <div className="current-price">
          {formatCurrency(currentPrice, currentCurrency)}
        </div>
      </div>

      {isOpen && (
        <div className="currency-dropdown">
          <div className="currency-list">
            {supportedCurrencies.map((currency) => (
              <button
                key={currency}
                className={`currency-option ${currency === currentCurrency ? 'active' : ''}`}
                onClick={() => {
                  onCurrencyChange(currency);
                  setIsOpen(false);
                }}
              >
                <div className="currency-info">
                  <span className="symbol">{CURRENCY_CONFIG[currency].symbol}</span>
                  <span className="code">{currency}</span>
                  <span className="name">{CURRENCY_CONFIG[currency].name}</span>
                </div>
                <div className="price">
                  {formatCurrency(prices[currency], currency)}
                </div>
                {currency === currentCurrency && (
                  <span className="checkmark">✓</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      <style jsx>{`
        .currency-selector {
          position: relative;
          display: inline-block;
        }

        .currency-display {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .currency-button {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 6px;
          background: white;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s;
        }

        .currency-button:hover {
          border-color: #999;
          background: #f9f9f9;
        }

        .currency-symbol {
          font-size: 16px;
          font-weight: 600;
        }

        .currency-code {
          color: #666;
          font-weight: 600;
        }

        .dropdown-icon {
          width: 16px;
          height: 16px;
          transition: transform 0.2s;
        }

        .dropdown-icon.open {
          transform: rotate(180deg);
        }

        .current-price {
          font-size: 16px;
          font-weight: 600;
          color: #333;
        }

        .currency-dropdown {
          position: absolute;
          top: 100%;
          left: 0;
          mt: 4px;
          background: white;
          border: 1px solid #ddd;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          z-index: 1000;
          min-width: 300px;
          margin-top: 4px;
        }

        .currency-list {
          display: flex;
          flex-direction: column;
        }

        .currency-option {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          border: none;
          background: white;
          cursor: pointer;
          font-size: 14px;
          text-align: left;
          transition: background 0.2s;
          border-bottom: 1px solid #f0f0f0;
        }

        .currency-option:last-child {
          border-bottom: none;
        }

        .currency-option:hover {
          background: #f9f9f9;
        }

        .currency-option.active {
          background: #f0f7ff;
        }

        .currency-info {
          display: flex;
          align-items: center;
          gap: 10px;
          flex: 1;
        }

        .currency-info .symbol {
          font-size: 18px;
          font-weight: 600;
          width: 24px;
          text-align: center;
        }

        .currency-info .code {
          font-weight: 600;
          color: #333;
          width: 40px;
        }

        .currency-info .name {
          color: #999;
          font-size: 12px;
        }

        .currency-option .price {
          font-weight: 600;
          color: #333;
          margin-right: 12px;
        }

        .checkmark {
          color: #4CAF50;
          font-weight: bold;
        }
      `}</style>
    </div>
  );
}

/**
 * Currency Badge - Small display of currency info
 */
export function CurrencyBadge({ currency, price }: { currency: SupportedCurrency; price: number }) {
  const config = CURRENCY_CONFIG[currency];

  return (
    <div className="currency-badge">
      <span className="badge-content">
        {config.symbol}
        {price.toFixed(2)}
      </span>
      <style jsx>{`
        .currency-badge {
          display: inline-block;
          padding: 4px 8px;
          background: #f0f7ff;
          border: 1px solid #b3d9ff;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 600;
          color: #0051a3;
        }

        .badge-content {
          display: flex;
          align-items: center;
          gap: 3px;
        }
      `}</style>
    </div>
  );
}
