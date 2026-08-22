import prisma from "../../config/prisma";

export type SellerTierLevel = "new" | "verified" | "premium" | "elite";

export interface SellerTierInfo {
	tier: SellerTierLevel;
	isFeatured: boolean;
	trustScoreThreshold: number;
	features: {
		expeditedCheckout: boolean;
		featuredPlacement: boolean;
		autoOrderRelease: boolean;
		prioritySupport: boolean;
		commissionDiscount: number; // percentage
	};
}

export const getTierConfig = (tier: SellerTierLevel): SellerTierInfo => {
	const configs: Record<SellerTierLevel, SellerTierInfo> = {
		new: {
			tier: "new",
			isFeatured: false,
			trustScoreThreshold: 0,
			features: {
				expeditedCheckout: false,
				featuredPlacement: false,
				autoOrderRelease: false,
				prioritySupport: false,
				commissionDiscount: 0,
			},
		},
		verified: {
			tier: "verified",
			isFeatured: false,
			trustScoreThreshold: 30,
			features: {
				expeditedCheckout: false,
				featuredPlacement: false,
				autoOrderRelease: false,
				prioritySupport: false,
				commissionDiscount: 0,
			},
		},
		premium: {
			tier: "premium",
			isFeatured: true,
			trustScoreThreshold: 60,
			features: {
				expeditedCheckout: true,
				featuredPlacement: true,
				autoOrderRelease: false,
				prioritySupport: true,
				commissionDiscount: 2,
			},
		},
		elite: {
			tier: "elite",
			isFeatured: true,
			trustScoreThreshold: 80,
			features: {
				expeditedCheckout: true,
				featuredPlacement: true,
				autoOrderRelease: true,
				prioritySupport: true,
				commissionDiscount: 5,
			},
		},
	};

	return configs[tier];
};

export const computeSellerTier = (trustScore: number): SellerTierLevel => {
	if (trustScore >= 80) return "elite";
	if (trustScore >= 60) return "premium";
	if (trustScore >= 30) return "verified";
	return "new";
};

export const updateSellerTier = async (organizationId: string, storeId: string) => {
	// Get current trust score for the store
	const store = await prisma.store.findUnique({
		where: { id: storeId },
		select: { id: true, organizationId: true },
	});

	if (!store) {
		throw new Error(`Store ${storeId} not found`);
	}

	if (store.organizationId !== organizationId) {
		throw new Error("Unauthorized: store does not belong to organization");
	}

	// Compute metrics to determine trust score
	const totalListings = await prisma.productListing.count({
		where: { storeId, organizationId },
	});

	const activeListings = await prisma.productListing.count({
		where: { storeId, organizationId, isActive: true },
	});

	const totalOrders = await prisma.order.count({
		where: { storeId, organizationId },
	});

	const deliveredOrders = await prisma.order.count({
		where: { storeId, organizationId, status: "DELIVERED" },
	});

	const cancelledOrders = await prisma.order.count({
		where: { storeId, organizationId, status: "CANCELLED" },
	});

	const returnRequests = await prisma.returnRequest.count({
		where: {
			organizationId,
			order: { storeId },
		},
	});

	// Compute trust score (same formula as getStoreInsights)
	const catalogScore = totalListings > 0 ? Math.min(100, (activeListings / totalListings) * 100) : 0;
	const fulfillmentScore =
		totalOrders > 0
			? Math.min(100, ((deliveredOrders - cancelledOrders * 0.5) / totalOrders) * 100)
			: 0;
	const operationalScore =
		deliveredOrders > 0
			? Math.max(0, 100 - (returnRequests / deliveredOrders) * 100)
			: 0;

	const profileScore = 50; // Simplified; in real scenario would check profile completeness
	const trustScore = profileScore * 0.25 + catalogScore * 0.25 + fulfillmentScore * 0.35 + operationalScore * 0.15;

	// Determine new tier
	const newTier = computeSellerTier(trustScore);
	const tierConfig = getTierConfig(newTier);

	// Get current tier
	const currentStore = await prisma.store.findUnique({
		where: { id: storeId },
		select: { sellerTier: true },
	});

	const oldTier = (currentStore?.sellerTier || "new") as SellerTierLevel;

	// Update store with new tier
	const updated = await prisma.store.update({
		where: { id: storeId },
		data: {
			sellerTier: newTier,
			isFeatured: tierConfig.isFeatured,
			tierUnlockedAt: oldTier !== newTier ? new Date() : undefined,
		},
		select: {
			id: true,
			sellerTier: true,
			isFeatured: true,
		},
	});

	return {
		storeId: updated.id,
		oldTier,
		newTier: updated.sellerTier,
		isFeatured: updated.isFeatured,
		tierUnlocked: oldTier !== newTier,
		trustScore,
	};
};

export const getSellerTierFeatures = (storeId: string, organizationId: string) => {
	return prisma.store
		.findUnique({
			where: { id: storeId },
			select: { sellerTier: true },
		})
		.then((store) => {
			const tier = (store?.sellerTier || "new") as SellerTierLevel;
			return getTierConfig(tier).features;
		});
};
