"use client";

import { SellerTierInfo } from "@/lib/api";

interface TrustBadgeProps {
  tier: "new" | "verified" | "premium" | "elite";
  isFeatured?: boolean;
  compact?: boolean;
}

export function TrustBadge({ tier, isFeatured, compact = false }: TrustBadgeProps) {
  const tierConfig = {
    new: {
      label: "New Seller",
      icon: "⭐",
      color: "bg-slate-100 text-slate-700",
      description: "Building track record",
    },
    verified: {
      label: "Verified",
      icon: "✓",
      color: "bg-blue-100 text-blue-700",
      description: "Quality verified",
    },
    premium: {
      label: "Premium",
      icon: "💎",
      color: "bg-purple-100 text-purple-700",
      description: "Fast checkout eligible",
    },
    elite: {
      label: "Elite",
      icon: "👑",
      color: "bg-yellow-100 text-yellow-700",
      description: "Auto-approved orders",
    },
  };

  const config = tierConfig[tier];

  if (compact) {
    return (
      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${config.color}`}>
        {config.icon} {config.label}
      </span>
    );
  }

  return (
    <div className={`rounded-lg p-3 ${config.color}`}>
      <p className="font-semibold flex items-center gap-2">
        <span>{config.icon}</span>
        <span>{config.label}</span>
        {isFeatured && <span className="text-xs">✨ Featured</span>}
      </p>
      <p className="text-xs">{config.description}</p>
    </div>
  );
}

export function SellerTierInfoCard({ tierInfo }: { tierInfo: SellerTierInfo }) {
  const { tier, isFeatured, tierConfig } = tierInfo;
  const features = tierConfig.features;

  return (
    <div className="bg-gradient-to-br from-blue-50 to-slate-50 rounded-lg p-4 border border-blue-200">
      <TrustBadge tier={tier} isFeatured={isFeatured} />

      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
        {features.expeditedCheckout && (
          <div className="flex items-center gap-2">
            <span>⚡</span>
            <span>Expedited Checkout</span>
          </div>
        )}
        {features.autoOrderRelease && (
          <div className="flex items-center gap-2">
            <span>🚀</span>
            <span>Auto-Release Orders</span>
          </div>
        )}
        {features.prioritySupport && (
          <div className="flex items-center gap-2">
            <span>🎯</span>
            <span>Priority Support</span>
          </div>
        )}
        {features.commissionDiscount > 0 && (
          <div className="flex items-center gap-2">
            <span>💰</span>
            <span>{features.commissionDiscount}% Commission Discount</span>
          </div>
        )}
      </div>
    </div>
  );
}
