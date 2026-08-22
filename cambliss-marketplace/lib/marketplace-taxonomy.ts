export type BusinessTypeOption = {
  id: string;
  label: string;
  description: string;
};

export const BUSINESS_TYPE_OPTIONS: BusinessTypeOption[] = [
  { id: "clothing", label: "Clothing", description: "Fashion, apparel, and lifestyle wear" },
  { id: "grocery", label: "Grocery", description: "Daily essentials, food, and household supplies" },
  { id: "beauty", label: "Beauty", description: "Skincare, cosmetics, and personal care" },
  { id: "bags", label: "Bags", description: "Handbags, luggage, and travel gear" },
  { id: "accessories", label: "Accessories", description: "Jewelry, watches, and add-ons" },
  { id: "electronics", label: "Electronics", description: "Devices, gadgets, and smart products" },
  { id: "home-living", label: "Home and Living", description: "Furniture, decor, and kitchenware" },
  { id: "health-wellness", label: "Health and Wellness", description: "Supplements, fitness, and wellness goods" },
  { id: "ngo-impact", label: "NGO and Impact", description: "Cause-based products and social impact initiatives" },
  { id: "handmade-local", label: "Handmade and Local", description: "Local crafts, artisan products, and regional brands" },
];

export const ORGANIZATION_TYPE_OPTIONS = [
  { id: "business", label: "For-Profit Business" },
  { id: "ngo", label: "NGO / Non-Profit" },
  { id: "social-enterprise", label: "Social Enterprise" },
] as const;

export type OrganizationType = (typeof ORGANIZATION_TYPE_OPTIONS)[number]["id"];