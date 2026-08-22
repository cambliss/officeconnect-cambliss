import prisma from "../../config/prisma";
import { getTierConfig, computeSellerTier, SellerTierLevel } from "./seller-tier.service";

export interface OrderHoldDecision {
	shouldHold: boolean;
	reason?: string;
	willAutoRelease: boolean;
	releaseDelay?: number; // hours
	requiresInspection: boolean;
	sellerTier: SellerTierLevel;
}

export const decideOrderHold = async (
	organizationId: string,
	storeId: string,
	totalAmount: number,
): Promise<OrderHoldDecision> => {
	// Get the store and its trust information
	const store = await prisma.store.findUnique({
		where: { id: storeId },
		select: {
			sellerTier: true,
		},
	});

	if (!store) {
		throw new Error(`Store ${storeId} not found`);
	}

	const sellerTier = (store.sellerTier || "new") as SellerTierLevel;
	const tierConfig = getTierConfig(sellerTier);

	// Elite sellers: auto-release, no inspection
	if (tierConfig.tier === "elite") {
		return {
			shouldHold: false,
			willAutoRelease: true,
			requiresInspection: false,
			sellerTier: "elite",
		};
	}

	// Premium sellers: auto-release after 1 hour unless issues detected
	if (tierConfig.tier === "premium") {
		return {
			shouldHold: false,
			willAutoRelease: true,
			releaseDelay: 1,
			requiresInspection: false,
			sellerTier: "premium",
		};
	}

	// Verified & New sellers: hold for inspection if high value or multiple recent returns
	const recentReturnRate = await getRecentReturnRate(organizationId, storeId, 7);
	const highValue = totalAmount > 5000; // ₹5000+ threshold

	if (sellerTier === "verified") {
		if (recentReturnRate > 0.15 || highValue) {
			// High return rate or high value: needs inspection
			return {
				shouldHold: true,
				reason: highValue
					? "High-value order from verified seller requires inspection"
					: `Recent return rate ${(recentReturnRate * 100).toFixed(1)}% exceeds threshold`,
				willAutoRelease: false,
				requiresInspection: true,
				sellerTier: "verified",
			};
		}
		return {
			shouldHold: false,
			willAutoRelease: true,
			releaseDelay: 4, // 4 hour inspection window
			requiresInspection: false,
			sellerTier: "verified",
		};
	}

	// New sellers: always hold for inspection
	return {
		shouldHold: true,
		reason: "New seller - order held for quality inspection",
		willAutoRelease: false,
		requiresInspection: true,
		sellerTier: "new",
	};
};

export const applyOrderHold = async (orderId: string, decision: OrderHoldDecision) => {
	if (!decision.shouldHold) {
		return null;
	}

	return prisma.order.update({
		where: { id: orderId },
		data: {
			inspectionRequired: decision.requiresInspection,
			holdReason: decision.reason,
			heldAt: new Date(),
			sellerTrustTier: decision.sellerTier,
		},
	});
};

export const releaseOrderFromHold = async (orderId: string, approvedBy?: string) => {
	return prisma.order.update({
		where: { id: orderId },
		data: {
			inspectionRequired: false,
			holdReason: null,
			autoReleasedAt: new Date(),
		},
	});
};

export const getRecentReturnRate = async (
	organizationId: string,
	storeId: string,
	days: number = 30,
): Promise<number> => {
	const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

	const totalRecentOrders = await prisma.order.count({
		where: {
			organizationId,
			storeId,
			status: "DELIVERED",
			deliveredAt: { gte: since },
		},
	});

	if (totalRecentOrders === 0) return 0;

	const returnsInPeriod = await prisma.returnRequest.count({
		where: {
			organizationId,
			order: {
				storeId,
				deliveredAt: { gte: since },
			},
		},
	});

	return returnsInPeriod / totalRecentOrders;
};

export const checkAndAutoReleaseOrders = async () => {
	// Find orders that are ready for auto-release (held but now past grace period)
	const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
	const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);

	// Release Premium tier orders after 1 hour
	await prisma.order.updateMany({
		where: {
			heldAt: { lte: oneHourAgo },
			sellerTrustTier: "premium",
			inspectionRequired: false,
			autoReleasedAt: null,
		},
		data: {
			autoReleasedAt: new Date(),
			holdReason: null,
		},
	});

	// Release Verified tier orders after 4 hours (unless flagged for inspection)
	await prisma.order.updateMany({
		where: {
			heldAt: { lte: fourHoursAgo },
			sellerTrustTier: "verified",
			inspectionRequired: false,
			autoReleasedAt: null,
		},
		data: {
			autoReleasedAt: new Date(),
			holdReason: null,
		},
	});
};
