import prisma from "../../config/prisma";
import { EcommerceError } from "./ecommerce.service";

type PartnerCode = "SHIPROCKET" | "DELHIVERY" | "BLUEDART";

type GeoPoint = {
  lat: number;
  lon: number;
};

type PartnerOption = {
  code: PartnerCode;
  displayName: string;
  baseCostPerKg: number;
  minCost: number;
  avgSpeedKmPerDay: number;
  reliabilityScore: number;
};

export type CourierRecommendation = {
  partner: PartnerCode;
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
  generatedAt: Date;
};

export type TrackingTimelineItem = {
  status: string;
  message: string;
  at: Date;
};

const PARTNER_OPTIONS: PartnerOption[] = [
  {
    code: "SHIPROCKET",
    displayName: "Shiprocket",
    baseCostPerKg: 38,
    minCost: 48,
    avgSpeedKmPerDay: 620,
    reliabilityScore: 84,
  },
  {
    code: "DELHIVERY",
    displayName: "Delhivery",
    baseCostPerKg: 42,
    minCost: 52,
    avgSpeedKmPerDay: 700,
    reliabilityScore: 88,
  },
  {
    code: "BLUEDART",
    displayName: "Blue Dart",
    baseCostPerKg: 55,
    minCost: 70,
    avgSpeedKmPerDay: 850,
    reliabilityScore: 92,
  },
];

const STATE_GEO: Record<string, GeoPoint> = {
  DELHI: { lat: 28.6139, lon: 77.209 },
  MAHARASHTRA: { lat: 19.7515, lon: 75.7139 },
  KARNATAKA: { lat: 15.3173, lon: 75.7139 },
  "TAMIL NADU": { lat: 11.1271, lon: 78.6569 },
  TELANGANA: { lat: 18.1124, lon: 79.0193 },
  GUJARAT: { lat: 22.2587, lon: 71.1924 },
  "WEST BENGAL": { lat: 22.9868, lon: 87.855 },
  "UTTAR PRADESH": { lat: 26.8467, lon: 80.9462 },
};

const DEFAULT_GEO: GeoPoint = { lat: 20.5937, lon: 78.9629 };

const normalizeState = (state?: string | null): string => {
  if (!state) {
    return "UNKNOWN";
  }
  return state.trim().toUpperCase();
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const toRadians = (deg: number) => (deg * Math.PI) / 180;

const haversineDistanceKm = (from: GeoPoint, to: GeoPoint) => {
  const earthRadiusKm = 6371;
  const dLat = toRadians(to.lat - from.lat);
  const dLon = toRadians(to.lon - from.lon);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(from.lat)) *
      Math.cos(toRadians(to.lat)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
};

const estimateWeightKg = (lineItems: Array<{ quantity: number }>) => {
  const units = lineItems.reduce((sum, item) => sum + item.quantity, 0);
  return Math.max(0.5, units * 0.4);
};

const estimateHandlingHours = (coveragePercent: number) => {
  if (coveragePercent >= 100) {
    return 4;
  }
  if (coveragePercent >= 70) {
    return 10;
  }
  return 18;
};

const buildCourierRecommendation = (
  partner: PartnerOption,
  distanceKm: number,
  weightKg: number,
  handlingHours: number
): CourierRecommendation => {
  const transitDays = Math.max(1, Math.ceil(distanceKm / partner.avgSpeedKmPerDay));
  const handlingDays = handlingHours / 24;
  const estimatedDeliveryDays = Math.max(1, Math.ceil(transitDays + handlingDays));

  const estimatedCost = Math.max(partner.minCost, partner.baseCostPerKg * weightKg);

  const speedScore = clamp(100 - estimatedDeliveryDays * 12, 20, 100);
  const costScore = clamp(100 - estimatedCost * 0.6, 10, 100);

  const score = speedScore * 0.35 + costScore * 0.25 + partner.reliabilityScore * 0.4;

  return {
    partner: partner.code,
    displayName: partner.displayName,
    estimatedCost: Number(estimatedCost.toFixed(2)),
    estimatedDeliveryDays,
    reliabilityScore: partner.reliabilityScore,
    score: Number(score.toFixed(2)),
  };
};

const getCustomerGeo = (state?: string | null) => {
  const normalized = normalizeState(state);
  return STATE_GEO[normalized] ?? DEFAULT_GEO;
};

const warehouseGeo = (warehouse: { latitude: number | null; longitude: number | null }) => {
  if (warehouse.latitude === null || warehouse.longitude === null) {
    return DEFAULT_GEO;
  }
  return { lat: warehouse.latitude, lon: warehouse.longitude };
};

export const recommendOrderLogistics = async (
  organizationId: string,
  orderId: string
): Promise<LogisticsRecommendationResult> => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      organizationId: true,
      customer: {
        select: {
          state: true,
        },
      },
      items: {
        select: {
          quantity: true,
          productListing: {
            select: {
              productId: true,
            },
          },
        },
      },
    },
  });

  if (!order) {
    throw new EcommerceError(404, "Order not found");
  }

  if (order.organizationId !== organizationId) {
    throw new EcommerceError(403, "Order does not belong to this organization");
  }

  const warehouses = await prisma.warehouse.findMany({
    where: { organizationId },
    select: {
      id: true,
      name: true,
      latitude: true,
      longitude: true,
      stockItems: {
        select: {
          productId: true,
          quantity: true,
        },
      },
    },
  });

  if (warehouses.length === 0) {
    throw new EcommerceError(400, "No warehouses configured for organization");
  }

  const requestedByProductId = new Map<string, number>();
  for (const item of order.items) {
    const productId = item.productListing.productId;
    requestedByProductId.set(
      productId,
      (requestedByProductId.get(productId) ?? 0) + item.quantity
    );
  }

  const customerState = order.customer?.state || "Unknown";
  const customerPoint = getCustomerGeo(order.customer?.state);
  const packageWeightKg = estimateWeightKg(order.items);

  const warehouseRecommendations: WarehouseRecommendation[] = warehouses.map((warehouse) => {
    let matchedLines = 0;
    const totalLines = requestedByProductId.size;

    for (const [productId, requestedQty] of requestedByProductId.entries()) {
      const stock = warehouse.stockItems.find((s) => s.productId === productId);
      if ((stock?.quantity ?? 0) >= requestedQty) {
        matchedLines += 1;
      }
    }

    const coveragePercent = totalLines === 0 ? 0 : Number(((matchedLines / totalLines) * 100).toFixed(2));
    const distance = haversineDistanceKm(warehouseGeo(warehouse), customerPoint);
    const estimatedDistanceKm = Number(distance.toFixed(1));
    const estimatedHandlingHours = estimateHandlingHours(coveragePercent);

    const recommendedCouriers = PARTNER_OPTIONS.map((partner) =>
      buildCourierRecommendation(partner, estimatedDistanceKm, packageWeightKg, estimatedHandlingHours)
    ).sort((a, b) => b.score - a.score);

    return {
      warehouseId: warehouse.id,
      warehouseName: warehouse.name,
      coveragePercent,
      estimatedDistanceKm,
      estimatedHandlingHours,
      recommendedCouriers,
    };
  });

  warehouseRecommendations.sort((a, b) => {
    if (b.coveragePercent !== a.coveragePercent) {
      return b.coveragePercent - a.coveragePercent;
    }
    if (a.estimatedDistanceKm !== b.estimatedDistanceKm) {
      return a.estimatedDistanceKm - b.estimatedDistanceKm;
    }
    return b.recommendedCouriers[0].score - a.recommendedCouriers[0].score;
  });

  return {
    orderId,
    customerState,
    recommendedWarehouse: warehouseRecommendations[0],
    alternateWarehouses: warehouseRecommendations.slice(1, 4),
    generatedAt: new Date(),
  };
};

export const assignOptimizedCourier = async (
  organizationId: string,
  orderId: string,
  preferredPartner?: PartnerCode
) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      organizationId: true,
      status: true,
    },
  });

  if (!order) {
    throw new EcommerceError(404, "Order not found");
  }

  if (order.organizationId !== organizationId) {
    throw new EcommerceError(403, "Order does not belong to this organization");
  }

  if (order.status !== "PACKED") {
    throw new EcommerceError(400, `Order must be PACKED before courier assignment. Current status: ${order.status}`);
  }

  const recommendation = await recommendOrderLogistics(organizationId, orderId);

  let courier = recommendation.recommendedWarehouse.recommendedCouriers[0];
  if (preferredPartner) {
    const preferred = recommendation.recommendedWarehouse.recommendedCouriers.find(
      (item) => item.partner === preferredPartner
    );
    if (preferred) {
      courier = preferred;
    }
  }

  const trackingNumber = `TRK-${courier.partner}-${Date.now()}`;

  const updated = await prisma.order.update({
    where: { id: orderId },
    data: {
      status: "SHIPPED",
      shippedAt: new Date(),
      trackingNumber,
      courierPartner: courier.displayName,
    },
    select: {
      id: true,
      status: true,
      trackingNumber: true,
      courierPartner: true,
      shippedAt: true,
    },
  });

  return {
    ...updated,
    logistics: {
      warehouseId: recommendation.recommendedWarehouse.warehouseId,
      warehouseName: recommendation.recommendedWarehouse.warehouseName,
      estimatedCost: courier.estimatedCost,
      estimatedDeliveryDays: courier.estimatedDeliveryDays,
      partnerScore: courier.score,
    },
  };
};

export const getOrderTrackingTimeline = async (
  organizationId: string,
  orderId: string
): Promise<{ orderId: string; status: string; timeline: TrackingTimelineItem[]; etaDate: Date | null }> => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      organizationId: true,
      status: true,
      createdAt: true,
      packedAt: true,
      shippedAt: true,
      deliveredAt: true,
      trackingNumber: true,
      courierPartner: true,
    },
  });

  if (!order) {
    throw new EcommerceError(404, "Order not found");
  }

  if (order.organizationId !== organizationId) {
    throw new EcommerceError(403, "Order does not belong to this organization");
  }

  const timeline: TrackingTimelineItem[] = [
    {
      status: "ORDER_PLACED",
      message: "Order placed successfully",
      at: order.createdAt,
    },
  ];

  if (order.packedAt) {
    timeline.push({
      status: "PACKED",
      message: "Order packed and ready for dispatch",
      at: order.packedAt,
    });
  }

  if (order.shippedAt) {
    timeline.push({
      status: "SHIPPED",
      message: `Shipped via ${order.courierPartner || "logistics partner"}${order.trackingNumber ? ` (${order.trackingNumber})` : ""}`,
      at: order.shippedAt,
    });

    const inTransitAt = new Date(order.shippedAt.getTime() + 12 * 60 * 60 * 1000);
    timeline.push({
      status: "IN_TRANSIT",
      message: "Shipment is in transit to destination",
      at: inTransitAt,
    });
  }

  if (order.deliveredAt) {
    timeline.push({
      status: "DELIVERED",
      message: "Order delivered",
      at: order.deliveredAt,
    });
  }

  let etaDate: Date | null = null;
  if (order.shippedAt && !order.deliveredAt) {
    etaDate = new Date(order.shippedAt.getTime() + 3 * 24 * 60 * 60 * 1000);
  }

  return {
    orderId,
    status: order.status,
    timeline,
    etaDate,
  };
};

export const estimateDeliveryPromise = async (
  organizationId: string,
  storeId: string,
  customerState?: string
) => {
  const warehouseCount = await prisma.warehouse.count({
    where: { organizationId },
  });

  if (warehouseCount === 0) {
    throw new EcommerceError(400, "No warehouses configured for organization");
  }

  const activeListings = await prisma.productListing.count({
    where: {
      organizationId,
      storeId,
      isActive: true,
    },
  });

  const statePoint = getCustomerGeo(customerState);

  const warehouses = await prisma.warehouse.findMany({
    where: { organizationId },
    select: {
      name: true,
      latitude: true,
      longitude: true,
    },
  });

  const nearest = warehouses
    .map((warehouse) => ({
      name: warehouse.name,
      distanceKm: haversineDistanceKm(warehouseGeo(warehouse), statePoint),
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm)[0];

  const estimatedDistanceKm = Number((nearest?.distanceKm ?? 400).toFixed(1));
  const estimatedTransitDays = Math.max(1, Math.ceil(estimatedDistanceKm / 700));
  const safetyBufferDays = activeListings > 100 ? 0 : 1;
  const promisedDays = estimatedTransitDays + safetyBufferDays;

  return {
    storeId,
    customerState: customerState || "Unknown",
    nearestWarehouse: nearest?.name ?? "N/A",
    estimatedDistanceKm,
    estimatedTransitDays,
    promisedDays,
    promisedWindow: `${promisedDays}-${promisedDays + 1} days`,
    calculatedAt: new Date(),
  };
};
