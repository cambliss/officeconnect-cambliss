import prisma from "../../config/prisma";

export type MarketplaceEventType = "VIEW" | "ADD_TO_CART" | "REMOVE_FROM_CART" | "ORDER_PLACED" | "RETURN_REQUESTED";

export const captureEvent = async (
	organizationId: string,
	eventType: MarketplaceEventType,
	customerId?: string,
	storeId?: string,
	productListingId?: string,
	eventData?: Record<string, any>,
) => {
	return prisma.marketplaceEvent.create({
		data: {
			organizationId,
			eventType,
			customerId,
			storeId,
			productListingId,
			eventData: eventData ? JSON.stringify(eventData) : null,
		},
	});
};

export interface SellerCockpitRecommendation {
	id: string;
	priority: "high" | "medium" | "low";
	title: string;
	description: string;
	action: string;
	estimatedImpact: string;
	scoreGainPotential: number;
}

export const getSellerCockpitRecommendations = async (
	organizationId: string,
	storeId: string,
): Promise<SellerCockpitRecommendation[]> => {
	const store = await prisma.store.findUnique({
		where: { id: storeId },
		select: {
			id: true,
			description: true,
			businessTypes: true,
			organizationType: true,
			assortmentType: true,
			onboardingPitch: true,
			paymentUpiId: true,
			paymentBankAccountNo: true,
		},
	});

	if (!store) {
		return [];
	}

	const recommendations: SellerCockpitRecommendation[] = [];

	// Profile completeness checks
	if (!store.description?.trim()) {
		recommendations.push({
			id: "profile-description",
			priority: "high",
			title: "Add Store Description",
			description: "A compelling store description helps customers understand your brand and builds trust.",
			action: "Write a 50-100 word description about your business",
			estimatedImpact: "Improves profile score by 20%",
			scoreGainPotential: 20,
		});
	}

	if (!store.businessTypes || store.businessTypes.length === 0) {
		recommendations.push({
			id: "profile-business-type",
			priority: "high",
			title: "Classify Your Business",
			description: "Select all relevant business categories so customers can discover you by segment.",
			action: "Choose your primary and secondary business types",
			estimatedImpact: "Improves profile score by 20%",
			scoreGainPotential: 20,
		});
	}

	if (!store.onboardingPitch?.trim()) {
		recommendations.push({
			id: "profile-pitch",
			priority: "medium",
			title: "Create Your Brand Pitch",
			description: "One-line brand story that makes you memorable in competitive segments.",
			action: "Write a compelling 1-line brand story",
			estimatedImpact: "Improves profile score by 15%",
			scoreGainPotential: 15,
		});
	}

	if (!store.paymentUpiId && !store.paymentBankAccountNo) {
		recommendations.push({
			id: "payment-methods",
			priority: "high",
			title: "Set Up Payment Methods",
			description: "Add UPI or bank account so customers can pay and you can receive orders.",
			action: "Update store payment settings",
			estimatedImpact: "Enables order placement and improves profile score",
			scoreGainPotential: 25,
		});
	}

	// Catalog checks
	const listingCount = await prisma.productListing.count({
		where: { storeId, organizationId },
	});

	if (listingCount === 0) {
		recommendations.push({
			id: "catalog-empty",
			priority: "high",
			title: "Add Your First Products",
			description: "Create product listings so customers have items to purchase from your store.",
			action: "Upload at least 10 products to your catalog",
			estimatedImpact: "Improves catalog score by 50%",
			scoreGainPotential: 50,
		});
	} else if (listingCount < 5) {
		recommendations.push({
			id: "catalog-small",
			priority: "medium",
			title: "Expand Your Catalog",
			description: "More products = more discovery and higher conversion rates.",
			action: `Add ${10 - listingCount} more products to reach a strong catalog`,
			estimatedImpact: "Improves catalog score by 30%",
			scoreGainPotential: 30,
		});
	}

	const activeListings = await prisma.productListing.count({
		where: { storeId, organizationId, isActive: true },
	});

	if (activeListings < listingCount) {
		recommendations.push({
			id: "catalog-inactive",
			priority: "medium",
			title: "Activate Inactive Products",
			description: "Inactive products don't appear in search results and hurt your visibility.",
			action: `Activate ${listingCount - activeListings} inactive products`,
			estimatedImpact: "Improves catalog score by 15%",
			scoreGainPotential: 15,
		});
	}

	// Fulfillment checks
	const totalOrders = await prisma.order.count({
		where: { storeId, organizationId },
	});

	if (totalOrders === 0) {
		recommendations.push({
			id: "fulfillment-no-orders",
			priority: "medium",
			title: "Focus on Getting First Sales",
			description: "Complete these profile and catalog items above to attract your first customers.",
			action: "Build profile, add products, optimize for discovery",
			estimatedImpact: "Fulfillment score unlocks after first sales",
			scoreGainPotential: 0,
		});
	} else {
		const deliveredOrders = await prisma.order.count({
			where: { storeId, organizationId, status: "DELIVERED" },
		});
		const deliveryRate = totalOrders > 0 ? (deliveredOrders / totalOrders) * 100 : 0;

		if (deliveryRate < 80) {
			recommendations.push({
				id: "fulfillment-delivery",
				priority: "high",
				title: "Improve Delivery Success Rate",
				description: "Fast, reliable deliveries are key to customer satisfaction and trust score.",
				action: "Ensure orders are packed and shipped within 24 hours",
				estimatedImpact: `Current delivery rate: ${Math.round(deliveryRate)}%. Aim for 95%+`,
				scoreGainPotential: 25,
			});
		}

		const returnRequests = await prisma.returnRequest.count({
			where: {
				organizationId,
				order: { storeId },
			},
		});

		if (returnRequests > 0) {
			const returnRate = totalOrders > 0 ? (returnRequests / totalOrders) * 100 : 0;

			if (returnRate > 10) {
				recommendations.push({
					id: "operations-high-returns",
					priority: "high",
					title: "Address High Return Rate",
					description: `High returns (${Math.round(returnRate)}%) indicate product or fulfillment issues.`,
					action: "Review return reasons and improve product descriptions or quality checks",
					estimatedImpact: "Reducing returns to <5% improves operational score by 30%",
					scoreGainPotential: 30,
				});
			}
		}
	}

	// Sort by priority and potential impact
	return recommendations.sort((a, b) => {
		const priorityOrder = { high: 0, medium: 1, low: 2 };
		if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
			return priorityOrder[a.priority] - priorityOrder[b.priority];
		}
		return b.scoreGainPotential - a.scoreGainPotential;
	});
};
