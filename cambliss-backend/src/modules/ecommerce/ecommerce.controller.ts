import { Request, Response } from "express";
import { ParsedQs } from "qs";
import prisma from "../../config/prisma";
import {
	CreateCategoryInput,
	AddCartItemInput,
	CreateOrderInput,
	CreateProductListingInput,
	CreateStoreInput,
	EcommerceError,
	InspectReturnInput,
	ProcessRefundInput,
	VerifyPaymentInput,
	addCartItem,
	addMarketplaceCartItem,
	addToCart,
	cancelOrder,
	checkout,
	checkoutCart,
	checkoutMarketplace,
	clearCart,
	createCategory,
	createOrder,
	createPublicStoreOrder,
	createPaymentOrder,
	createProductListing,
	createStore,
	getPublicStoreByDomain,
	getOrCreateCart,
	getMarketplaceCart,
	getCategoryTree,
	getCart,
	getStorePaymentSettings,
	getStoreByOrganization,
	getStoreInsights,
	getStoreProducts,
	listCategories,
	listMarketplaceProducts,
	listCategoryRankedProducts,
	listOrders,
	listProductListings,
	listStores,
	markAsDelivered,
	markAsPacked,
	markAsShipped,
	MarketplaceProductFilters,
	processRefund,
	reconcileGatewayRefund,
	requestReturn,
	RequestReturnInput,
	removeCartItem,
	removeFromCart,
	toggleProductListing,
	toggleStoreStatus,
	UpdateStorePaymentSettingsInput,
	updateStorePaymentSettings,
	updateCartItem,
	updateOrderStatus,
	verifyPaymentWebhook,
	ReconcileGatewayRefundInput,
	approveReturn,
	inspectReturn,
} from "./ecommerce.service";
import { getSellerCockpitRecommendations } from "./events.service";
import { getTierConfig, getSellerTierFeatures } from "./seller-tier.service";
import {
	assignOptimizedCourier,
	estimateDeliveryPromise,
	getOrderTrackingTimeline,
	recommendOrderLogistics,
} from "./logistics.service";

const handleError = (res: Response, error: unknown): void => {
	if (error instanceof EcommerceError) {
		res.status(error.statusCode).json({ message: error.message });
		return;
	}

	if (error instanceof Error) {
		res.status(500).json({ message: error.message });
		return;
	}

	res.status(500).json({ message: "Internal server error" });
};

const getOrganizationId = (req: Request): string => {
	const organizationId = req.user?.organizationId;
	if (!organizationId) {
		throw new EcommerceError(401, "Unauthorized");
	}
	return organizationId;
};

const getActor = (req: Request) => ({
	userId: req.user?.id ?? "",
	role: req.user?.role,
});

const getRequiredQuery = (
	value: string | ParsedQs | (string | ParsedQs)[] | undefined,
	label: string,
): string => {
	const normalized = Array.isArray(value) ? value[0] : value;
	const text = typeof normalized === "string" ? normalized : undefined;
	if (!text || !text.trim()) {
		throw new EcommerceError(400, `${label} is required`);
	}
	return text;
};

const getRequiredParam = (value: string | string[] | undefined, label: string): string => {
	const normalized = Array.isArray(value) ? value[0] : value;
	if (!normalized || !normalized.trim()) {
		throw new EcommerceError(400, `${label} is required`);
	}
	return normalized;
};

export const createStoreController = async (req: Request, res: Response): Promise<void> => {
	try {
		const organizationId = getOrganizationId(req);
		const store = await createStore(organizationId, req.body as CreateStoreInput, undefined, getActor(req));
		res.status(201).json(store);
	} catch (error) {
		handleError(res, error);
	}
};

export const listStoresController = async (req: Request, res: Response): Promise<void> => {
	try {
		const organizationId = getOrganizationId(req);
		const stores = await listStores(organizationId, getActor(req));
		res.status(200).json(stores);
	} catch (error) {
		handleError(res, error);
	}
};

export const getStoreByOrganizationController = async (req: Request, res: Response): Promise<void> => {
	try {
		const organizationId = getOrganizationId(req);
		const store = await getStoreByOrganization(organizationId);
		res.status(200).json(store);
	} catch (error) {
		handleError(res, error);
	}
};

export const getStoreInsightsController = async (req: Request, res: Response): Promise<void> => {
	try {
		const organizationId = getOrganizationId(req);
		const storeId = getRequiredParam(req.params.storeId, "storeId");
		const insights = await getStoreInsights(organizationId, storeId, getActor(req));
		res.status(200).json(insights);
	} catch (error) {
		handleError(res, error);
	}
};

export const toggleStoreStatusController = async (req: Request, res: Response): Promise<void> => {
	try {
		const organizationId = getOrganizationId(req);
		const storeId = getRequiredParam(req.params.storeId, "storeId");
		const store = await toggleStoreStatus(storeId, organizationId, getActor(req));
		res.status(200).json(store);
	} catch (error) {
		handleError(res, error);
	}
};

export const getStorePaymentSettingsController = async (req: Request, res: Response): Promise<void> => {
	try {
		const organizationId = getOrganizationId(req);
		const storeId = getRequiredQuery(req.query.storeId, "storeId");
		const settings = await getStorePaymentSettings(storeId, organizationId, getActor(req));
		res.status(200).json(settings);
	} catch (error) {
		handleError(res, error);
	}
};

export const updateStorePaymentSettingsController = async (req: Request, res: Response): Promise<void> => {
	try {
		const organizationId = getOrganizationId(req);
		const settings = await updateStorePaymentSettings(
			organizationId,
			req.body as UpdateStorePaymentSettingsInput,
			getActor(req),
		);
		res.status(200).json(settings);
	} catch (error) {
		handleError(res, error);
	}
};

export const getPublicStoreByDomainController = async (req: Request, res: Response): Promise<void> => {
	try {
		const domain = getRequiredParam(req.params.domain, "domain");
		const store = await getPublicStoreByDomain(domain);
		res.status(200).json(store);
	} catch (error) {
		handleError(res, error);
	}
};

export const createPublicStoreOrderController = async (req: Request, res: Response): Promise<void> => {
	try {
		const payload = req.body as {
			domain: string;
			customer: { firstName: string; lastName?: string; email?: string; phone?: string };
			items: Array<{ listingId: string; quantity: number }>;
		};

		const order = await createPublicStoreOrder(payload);
		res.status(201).json(order);
	} catch (error) {
		handleError(res, error);
	}
};

export const createCategoryController = async (req: Request, res: Response): Promise<void> => {
	try {
		const organizationId = getOrganizationId(req);
		const category = await createCategory(organizationId, req.body as CreateCategoryInput, undefined, getActor(req));
		res.status(201).json(category);
	} catch (error) {
		handleError(res, error);
	}
};

export const listCategoriesController = async (req: Request, res: Response): Promise<void> => {
	try {
		const organizationId = getOrganizationId(req);
		const storeId = getRequiredQuery(req.query.storeId, "storeId");
		const categories = await listCategories(organizationId, storeId, getActor(req));
		res.status(200).json(categories);
	} catch (error) {
		handleError(res, error);
	}
};

export const getCategoryTreeController = async (req: Request, res: Response): Promise<void> => {
	try {
		const organizationId = getOrganizationId(req);
		const tree = await getCategoryTree(organizationId);
		res.status(200).json(tree);
	} catch (error) {
		handleError(res, error);
	}
};

export const createProductListingController = async (req: Request, res: Response): Promise<void> => {
	try {
		const organizationId = getOrganizationId(req);
		const listing = await createProductListing(organizationId, req.body as CreateProductListingInput, undefined, undefined, undefined, undefined, getActor(req));
		res.status(201).json(listing);
	} catch (error) {
		handleError(res, error);
	}
};

export const listProductListingsController = async (req: Request, res: Response): Promise<void> => {
	try {
		const organizationId = getOrganizationId(req);
		const storeId = getRequiredQuery(req.query.storeId, "storeId");
		const listings = await listProductListings(organizationId, storeId, getActor(req));
		res.status(200).json(listings);
	} catch (error) {
		handleError(res, error);
	}
};

export const getStoreProductsController = async (req: Request, res: Response): Promise<void> => {
	try {
		const organizationId = getOrganizationId(req);
		const listings = await getStoreProducts(organizationId, getActor(req));
		res.status(200).json(listings);
	} catch (error) {
		handleError(res, error);
	}
};

export const toggleProductListingController = async (req: Request, res: Response): Promise<void> => {
	try {
		const listingId = getRequiredParam(req.params.listingId, "listingId");
		const listing = await toggleProductListing(listingId);
		res.status(200).json(listing);
	} catch (error) {
		handleError(res, error);
	}
};

export const createOrderController = async (req: Request, res: Response): Promise<void> => {
	try {
		const organizationId = getOrganizationId(req);
		const order = await createOrder(organizationId, req.body as CreateOrderInput, getActor(req));
		res.status(201).json(order);
	} catch (error) {
		handleError(res, error);
	}
};

export const getCartController = async (req: Request, res: Response): Promise<void> => {
	try {
		const organizationId = getOrganizationId(req);
		const customerId = getRequiredQuery(req.query.customerId, "customerId");
		const storeQuery = Array.isArray(req.query.storeId) ? req.query.storeId[0] : req.query.storeId;
		const storeId = typeof storeQuery === "string" && storeQuery.trim() ? storeQuery : undefined;

		const cart = storeId
			? await getCart(organizationId, storeId, customerId, getActor(req))
			: await getCart(organizationId, customerId, undefined, getActor(req));
		res.status(200).json(cart);
	} catch (error) {
		handleError(res, error);
	}
};

export const addCartItemController = async (req: Request, res: Response): Promise<void> => {
	try {
		const organizationId = getOrganizationId(req);
		const cart = await addCartItem(organizationId, req.body as AddCartItemInput, getActor(req));
		res.status(200).json(cart);
	} catch (error) {
		handleError(res, error);
	}
};

export const addToCartController = async (req: Request, res: Response): Promise<void> => {
	try {
		const organizationId = getOrganizationId(req);
		const { customerId, productId, quantity } = req.body as {
			customerId: string;
			productId: string;
			quantity: number;
		};

		if (!customerId?.trim() || !productId?.trim()) {
			throw new EcommerceError(400, "customerId and productId are required");
		}

		const cart = await addToCart(organizationId, customerId, productId, quantity, getActor(req));
		res.status(200).json(cart);
	} catch (error) {
		handleError(res, error);
	}
};

export const getOrCreateCartController = async (req: Request, res: Response): Promise<void> => {
	try {
		const organizationId = getOrganizationId(req);
		const customerId = getRequiredQuery(req.query.customerId, "customerId");

		const cart = await getOrCreateCart(organizationId, customerId, getActor(req));
		res.status(200).json(cart);
	} catch (error) {
		handleError(res, error);
	}
};

export const updateCartItemController = async (req: Request, res: Response): Promise<void> => {
	try {
		const organizationId = getOrganizationId(req);
		const cartItemId = getRequiredParam(req.params.cartItemId, "cartItemId");
		const { quantity } = req.body as { quantity: number };

		const cart = await updateCartItem(organizationId, { cartItemId, quantity });
		res.status(200).json(cart);
	} catch (error) {
		handleError(res, error);
	}
};

export const removeFromCartController = async (req: Request, res: Response): Promise<void> => {
	try {
		const organizationId = getOrganizationId(req);
		const cartItemId = getRequiredParam(req.params.cartItemId, "cartItemId");

		const cart = await removeFromCart(organizationId, { cartItemId });
		res.status(200).json(cart);
	} catch (error) {
		handleError(res, error);
	}
};

export const removeCartItemController = async (req: Request, res: Response): Promise<void> => {
	try {
		const organizationId = getOrganizationId(req);
		const { storeId, customerId, productListingId } = req.body as {
			storeId: string;
			customerId: string;
			productListingId: string;
		};

		if (!storeId?.trim() || !customerId?.trim() || !productListingId?.trim()) {
			throw new EcommerceError(400, "storeId, customerId and productListingId are required");
		}

		const cart = await removeCartItem(organizationId, { storeId, customerId, productListingId }, getActor(req));
		res.status(200).json(cart);
	} catch (error) {
		handleError(res, error);
	}
};

export const clearCartController = async (req: Request, res: Response): Promise<void> => {
	try {
		const organizationId = getOrganizationId(req);
		const { storeId, customerId } = req.body as { storeId: string; customerId: string };

		if (!storeId?.trim() || !customerId?.trim()) {
			throw new EcommerceError(400, "storeId and customerId are required");
		}

		const cart = await clearCart(organizationId, storeId, customerId, getActor(req));
		res.status(200).json(cart);
	} catch (error) {
		handleError(res, error);
	}
};

export const checkoutCartController = async (req: Request, res: Response): Promise<void> => {
	try {
		const organizationId = getOrganizationId(req);
		const { storeId, customerId, defaultWarehouseId } = req.body as {
			storeId: string;
			customerId: string;
			defaultWarehouseId: string;
		};

		if (!storeId?.trim() || !customerId?.trim() || !defaultWarehouseId?.trim()) {
			throw new EcommerceError(400, "storeId, customerId and defaultWarehouseId are required");
		}

		const order = await checkoutCart(organizationId, storeId, customerId, defaultWarehouseId, getActor(req));
		res.status(201).json(order);
	} catch (error) {
		handleError(res, error);
	}
};

export const checkoutController = async (req: Request, res: Response): Promise<void> => {
	try {
		const organizationId = getOrganizationId(req);
		const { customerId } = req.body as { customerId: string };

		if (!customerId?.trim()) {
			throw new EcommerceError(400, "customerId is required");
		}

		const order = await checkout(organizationId, customerId);
		res.status(201).json(order);
	} catch (error) {
		handleError(res, error);
	}
};

export const listOrdersController = async (req: Request, res: Response): Promise<void> => {
	try {
		const organizationId = getOrganizationId(req);
		const storeId = getRequiredQuery(req.query.storeId, "storeId");
		const orders = await listOrders(organizationId, storeId, getActor(req));
		res.status(200).json(orders);
	} catch (error) {
		handleError(res, error);
	}
};

export const updateOrderStatusController = async (req: Request, res: Response): Promise<void> => {
	try {
		const organizationId = getOrganizationId(req);
		const orderId = getRequiredParam(req.params.orderId, "orderId");
		const { status, paymentStatus } = req.body as { status: string; paymentStatus?: string };

		if (!status?.trim()) {
			throw new EcommerceError(400, "status is required");
		}

		const order = await updateOrderStatus(organizationId, orderId, status.trim(), paymentStatus?.trim());
		res.status(200).json(order);
	} catch (error) {
		handleError(res, error);
	}
};

export const createPaymentOrderController = async (req: Request, res: Response): Promise<void> => {
	try {
		const organizationId = getOrganizationId(req);
		const { orderId } = req.body as { orderId: string };

		if (!orderId?.trim()) {
			throw new EcommerceError(400, "orderId is required");
		}

		const paymentOrder = await createPaymentOrder(organizationId, orderId.trim());
		res.status(200).json(paymentOrder);
	} catch (error) {
		handleError(res, error);
	}
};

export const verifyPaymentWebhookController = async (req: Request, res: Response): Promise<void> => {
	try {
		const organizationId = getOrganizationId(req);
		const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body as {
			razorpayOrderId: string;
			razorpayPaymentId: string;
			razorpaySignature: string;
		};

		const order = await verifyPaymentWebhook(organizationId, {
			razorpayOrderId,
			razorpayPaymentId,
			razorpaySignature,
		});
		res.status(200).json(order);
	} catch (error) {
		handleError(res, error);
	}
};
// ========== FULFILLMENT CONTROLLERS ==========

export const markAsPackedController = async (req: Request, res: Response): Promise<void> => {
	try {
		const organizationId = getOrganizationId(req);
		const { orderId } = req.body as { orderId: string };

		if (!orderId?.trim()) {
			throw new EcommerceError(400, "orderId is required");
		}

		const order = await markAsPacked(organizationId, orderId.trim());
		res.status(200).json(order);
	} catch (error) {
		handleError(res, error);
	}
};

export const markAsShippedController = async (req: Request, res: Response): Promise<void> => {
	try {
		const organizationId = getOrganizationId(req);
		const { orderId, trackingNumber, courierPartner } = req.body as {
			orderId: string;
			trackingNumber: string;
			courierPartner: string;
		};

		if (!orderId?.trim() || !trackingNumber?.trim() || !courierPartner?.trim()) {
			throw new EcommerceError(400, "orderId, trackingNumber, and courierPartner are required");
		}

		const order = await markAsShipped(organizationId, orderId.trim(), trackingNumber.trim(), courierPartner.trim());
		res.status(200).json(order);
	} catch (error) {
		handleError(res, error);
	}
};

export const recommendOrderLogisticsController = async (req: Request, res: Response): Promise<void> => {
	try {
		const organizationId = getOrganizationId(req);
		const orderId = getRequiredParam(req.params.orderId, "orderId");
		const recommendation = await recommendOrderLogistics(organizationId, orderId);
		res.status(200).json(recommendation);
	} catch (error) {
		handleError(res, error);
	}
};

export const assignOptimizedCourierController = async (req: Request, res: Response): Promise<void> => {
	try {
		const organizationId = getOrganizationId(req);
		const orderId = getRequiredParam(req.params.orderId, "orderId");
		const preferredPartnerRaw = req.body?.preferredPartner;
		const preferredPartner =
			typeof preferredPartnerRaw === "string" && preferredPartnerRaw.trim()
				? (preferredPartnerRaw.trim().toUpperCase() as "SHIPROCKET" | "DELHIVERY" | "BLUEDART")
				: undefined;

		const result = await assignOptimizedCourier(organizationId, orderId, preferredPartner);
		res.status(200).json(result);
	} catch (error) {
		handleError(res, error);
	}
};

export const getOrderTrackingTimelineController = async (req: Request, res: Response): Promise<void> => {
	try {
		const organizationId = getOrganizationId(req);
		const orderId = getRequiredParam(req.params.orderId, "orderId");
		const timeline = await getOrderTrackingTimeline(organizationId, orderId);
		res.status(200).json(timeline);
	} catch (error) {
		handleError(res, error);
	}
};

export const estimateDeliveryPromiseController = async (req: Request, res: Response): Promise<void> => {
	try {
		const organizationId = getOrganizationId(req);
		const storeId = getRequiredQuery(req.query.storeId, "storeId");
		const stateQuery = Array.isArray(req.query.state) ? req.query.state[0] : req.query.state;
		const customerState = typeof stateQuery === "string" ? stateQuery : undefined;

		const promise = await estimateDeliveryPromise(organizationId, storeId, customerState);
		res.status(200).json(promise);
	} catch (error) {
		handleError(res, error);
	}
};

export const markAsDeliveredController = async (req: Request, res: Response): Promise<void> => {
	try {
		const organizationId = getOrganizationId(req);
		const { orderId } = req.body as { orderId: string };

		if (!orderId?.trim()) {
			throw new EcommerceError(400, "orderId is required");
		}

		const order = await markAsDelivered(organizationId, orderId.trim());
		res.status(200).json(order);
	} catch (error) {
		handleError(res, error);
	}
};

export const cancelOrderController = async (req: Request, res: Response): Promise<void> => {
	try {
		const organizationId = getOrganizationId(req);
		const { orderId } = req.body as { orderId: string };

		if (!orderId?.trim()) {
			throw new EcommerceError(400, "orderId is required");
		}

		const order = await cancelOrder(organizationId, orderId.trim());
		res.status(200).json(order);
	} catch (error) {
		handleError(res, error);
	}
};

export const requestReturnController = async (req: Request, res: Response): Promise<void> => {
	try {
		const organizationId = getOrganizationId(req);
		const payload = req.body as RequestReturnInput;
		const returnRequest = await requestReturn(organizationId, payload);
		res.status(201).json(returnRequest);
	} catch (error) {
		handleError(res, error);
	}
};

export const approveReturnController = async (req: Request, res: Response): Promise<void> => {
	try {
		const organizationId = getOrganizationId(req);
		const { returnRequestId } = req.body as { returnRequestId: string };

		if (!returnRequestId?.trim()) {
			throw new EcommerceError(400, "returnRequestId is required");
		}

		const result = await approveReturn(organizationId, returnRequestId.trim());
		res.status(200).json(result);
	} catch (error) {
		handleError(res, error);
	}
};

export const processRefundController = async (req: Request, res: Response): Promise<void> => {
	try {
		const organizationId = getOrganizationId(req);
		const payload = req.body as ProcessRefundInput;
		const result = await processRefund(organizationId, payload);
		res.status(200).json(result);
	} catch (error) {
		handleError(res, error);
	}
};

export const inspectReturnController = async (req: Request, res: Response): Promise<void> => {
	try {
		const organizationId = getOrganizationId(req);
		const payload = req.body as InspectReturnInput;
		const result = await inspectReturn(organizationId, payload);
		res.status(200).json(result);
	} catch (error) {
		handleError(res, error);
	}
};

export const reconcileGatewayRefundController = async (req: Request, res: Response): Promise<void> => {
	try {
		const organizationId = getOrganizationId(req);
		const payload = req.body as ReconcileGatewayRefundInput;
		const result = await reconcileGatewayRefund(organizationId, payload);
		res.status(200).json(result);
	} catch (error) {
		handleError(res, error);
	}
};

export const listMarketplaceProductsController = async (req: Request, res: Response): Promise<void> => {
	try {
		const organizationId = getOrganizationId(req);
		const searchQuery = Array.isArray(req.query.search) ? req.query.search[0] : req.query.search;
		const search = typeof searchQuery === "string" ? searchQuery : undefined;

		const businessTypeQuery = Array.isArray(req.query.businessType)
			? req.query.businessType
			: typeof req.query.businessType === "string"
				? req.query.businessType.split(",")
				: [];

		const orgTypeQuery = Array.isArray(req.query.organizationType)
			? req.query.organizationType[0]
			: req.query.organizationType;

		const categoryIdQuery = Array.isArray(req.query.categoryId)
			? req.query.categoryId[0]
			: req.query.categoryId;

		const sortByQuery = Array.isArray(req.query.sortBy) ? req.query.sortBy[0] : req.query.sortBy;

		const filters: MarketplaceProductFilters = {
			businessTypes: businessTypeQuery
				.map((item) => (typeof item === "string" ? item.trim() : ""))
				.filter(Boolean),
			organizationType: typeof orgTypeQuery === "string" ? orgTypeQuery : undefined,
			categoryId: typeof categoryIdQuery === "string" ? categoryIdQuery : undefined,
			sortBy:
				typeof sortByQuery === "string" && ["latest", "price-low", "price-high"].includes(sortByQuery)
					? (sortByQuery as "latest" | "price-low" | "price-high")
					: undefined,
		};

		const listings = await listMarketplaceProducts(organizationId, search, getActor(req), filters);
		res.status(200).json(listings);
	} catch (error) {
		handleError(res, error);
	}
};

export const getMarketplaceCartController = async (req: Request, res: Response): Promise<void> => {
	try {
		const organizationId = getOrganizationId(req);
		const customerId = getRequiredQuery(req.query.customerId, "customerId");
		const cart = await getMarketplaceCart(organizationId, customerId);
		res.status(200).json(cart);
	} catch (error) {
		handleError(res, error);
	}
};

export const addMarketplaceCartItemController = async (req: Request, res: Response): Promise<void> => {
	try {
		const organizationId = getOrganizationId(req);
		const { customerId, productListingId, quantity } = req.body as {
			customerId: string;
			productListingId: string;
			quantity: number;
		};

		if (!customerId?.trim() || !productListingId?.trim()) {
			throw new EcommerceError(400, "customerId and productListingId are required");
		}

		const cart = await addMarketplaceCartItem(organizationId, {
			customerId: customerId.trim(),
			productListingId: productListingId.trim(),
			quantity,
		});
		res.status(200).json(cart);
	} catch (error) {
		handleError(res, error);
	}
};

export const checkoutMarketplaceController = async (req: Request, res: Response): Promise<void> => {
	try {
		const organizationId = getOrganizationId(req);
		const { customerId } = req.body as { customerId: string };

		if (!customerId?.trim()) {
			throw new EcommerceError(400, "customerId is required");
		}

		const result = await checkoutMarketplace(organizationId, customerId.trim());
		res.status(201).json(result);
	} catch (error) {
		handleError(res, error);
	}
};

export const getSellerCockpitRecommendationsController = async (req: Request, res: Response): Promise<void> => {
	try {
		const organizationId = getOrganizationId(req);
		const storeId = Array.isArray(req.params.storeId) ? req.params.storeId[0] : req.params.storeId;

		if (!storeId?.trim()) {
			throw new EcommerceError(400, "storeId is required");
		}

		const recommendations = await getSellerCockpitRecommendations(organizationId, storeId.trim());
		res.status(200).json(recommendations);
	} catch (error) {
		handleError(res, error);
	}
};

export const getCategoryRankedProductsController = async (req: Request, res: Response): Promise<void> => {
	try {
		const organizationId = getOrganizationId(req);
		const categoryId = Array.isArray(req.params.categoryId) ? req.params.categoryId[0] : req.params.categoryId;
		const searchQuery = Array.isArray(req.query.search) ? req.query.search[0] : req.query.search;
		const search = typeof searchQuery === "string" ? searchQuery : undefined;

		if (!categoryId?.trim()) {
			throw new EcommerceError(400, "categoryId is required");
		}

		const products = await listCategoryRankedProducts(organizationId, categoryId.trim(), { search });
		res.status(200).json(products);
	} catch (error) {
		handleError(res, error);
	}
};

export const getSellerTierInfoController = async (req: Request, res: Response): Promise<void> => {
	try {
		const organizationId = getOrganizationId(req);
		const storeId = Array.isArray(req.params.storeId) ? req.params.storeId[0] : req.params.storeId;

		if (!storeId?.trim()) {
			throw new EcommerceError(400, "storeId is required");
		}

		const store = await prisma.store.findUnique({
			where: { id: storeId.trim() },
			select: {
				id: true,
				organizationId: true,
				sellerTier: true,
				isFeatured: true,
				name: true,
			},
		});

		if (!store) {
			throw new EcommerceError(404, "Store not found");
		}

		if (store.organizationId !== organizationId) {
			throw new EcommerceError(403, "Unauthorized");
		}

		const tierConfig = getTierConfig((store.sellerTier || "new") as any);

		res.status(200).json({
			storeId: store.id,
			storeName: store.name,
			tier: store.sellerTier,
			isFeatured: store.isFeatured,
			tierConfig,
		});
	} catch (error) {
		handleError(res, error);
	}
};

export const getHeldOrdersController = async (req: Request, res: Response): Promise<void> => {
	try {
		const organizationId = getOrganizationId(req);

		const heldOrders = await prisma.order.findMany({
			where: {
				organizationId,
				inspectionRequired: true,
				heldAt: { not: null },
				autoReleasedAt: null,
			},
			include: {
				store: {
					select: {
						id: true,
						name: true,
						sellerTier: true,
					},
				},
				customer: {
					select: {
						id: true,
						email: true,
					},
				},
				items: {
					include: {
						productListing: {
							select: {
								id: true,
								product: { select: { name: true } },
							},
						},
					},
				},
			},
			orderBy: {
				heldAt: "desc",
			},
		});

		res.status(200).json(heldOrders);
	} catch (error) {
		handleError(res, error);
	}
};