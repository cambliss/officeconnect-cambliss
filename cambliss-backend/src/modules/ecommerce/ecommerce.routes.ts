import { Router } from "express";
import { authenticateJWT } from "../../middleware/auth.middleware";
import { moduleGuard } from "../../middleware/module.middleware";
import { requireActiveSubscription } from "../../middleware/subscription.middleware";
import {
	addCartItemController,
	addMarketplaceCartItemController,
	addToCartController,
	approveReturnController,
	assignOptimizedCourierController,
	cancelOrderController,
	checkoutController,
	checkoutCartController,
	checkoutMarketplaceController,
	clearCartController,
	createCategoryController,
	createOrderController,
	createPaymentOrderController,
	createPublicStoreOrderController,
	createProductListingController,
	createStoreController,
	getPublicStoreByDomainController,
	getCategoryTreeController,
	getOrCreateCartController,
	getCartController,
	getMarketplaceCartController,
	getOrderTrackingTimelineController,
	getStorePaymentSettingsController,
	getStoreByOrganizationController,
	getStoreInsightsController,
	recommendOrderLogisticsController,
	getStoreProductsController,
	getSellerCockpitRecommendationsController,
	getCategoryRankedProductsController,
	getSellerTierInfoController,
	getHeldOrdersController,
	listCategoriesController,
	listMarketplaceProductsController,
	listOrdersController,
	listProductListingsController,
	listStoresController,
	markAsDeliveredController,
	markAsPackedController,
	markAsShippedController,
	processRefundController,
	reconcileGatewayRefundController,
	requestReturnController,
	estimateDeliveryPromiseController,
	inspectReturnController,
	removeFromCartController,
	removeCartItemController,
	toggleProductListingController,
	toggleStoreStatusController,
	updateStorePaymentSettingsController,
	updateCartItemController,
	updateOrderStatusController,
	verifyPaymentWebhookController,
} from "./ecommerce.controller";

const ecommerceRouter = Router();

ecommerceRouter.get("/public/stores/:domain", getPublicStoreByDomainController);
ecommerceRouter.post("/public/orders", createPublicStoreOrderController);

ecommerceRouter.use(authenticateJWT, requireActiveSubscription, moduleGuard("ECOMMERCE"));

ecommerceRouter.post("/stores", createStoreController);
ecommerceRouter.get("/stores", listStoresController);
ecommerceRouter.get("/store", getStoreByOrganizationController);
ecommerceRouter.get("/stores/:storeId/insights", getStoreInsightsController);
ecommerceRouter.get("/stores/:storeId/recommendations", getSellerCockpitRecommendationsController);
ecommerceRouter.get("/stores/:storeId/tier-info", getSellerTierInfoController);
ecommerceRouter.patch("/stores/:storeId/toggle", toggleStoreStatusController);
ecommerceRouter.get("/stores/payment-settings", getStorePaymentSettingsController);
ecommerceRouter.put("/stores/payment-settings", updateStorePaymentSettingsController);

ecommerceRouter.post("/categories", createCategoryController);
ecommerceRouter.get("/categories", listCategoriesController);
ecommerceRouter.get("/categories/tree", getCategoryTreeController);
ecommerceRouter.get("/marketplace/categories/:categoryId/products", getCategoryRankedProductsController);

ecommerceRouter.post("/listings", createProductListingController);
ecommerceRouter.get("/listings", listProductListingsController);
ecommerceRouter.get("/products", getStoreProductsController);
ecommerceRouter.get("/marketplace/products", listMarketplaceProductsController);
ecommerceRouter.patch("/listings/:listingId/toggle", toggleProductListingController);

ecommerceRouter.get("/cart", getCartController);
ecommerceRouter.get("/cart/current", getOrCreateCartController);
ecommerceRouter.get("/marketplace/cart", getMarketplaceCartController);
ecommerceRouter.post("/cart/items", addCartItemController);
ecommerceRouter.post("/cart/add", addToCartController);
ecommerceRouter.post("/marketplace/cart/items", addMarketplaceCartItemController);
ecommerceRouter.patch("/cart/items/:cartItemId", updateCartItemController);
ecommerceRouter.delete("/cart/items/:cartItemId", removeFromCartController);
ecommerceRouter.delete("/cart/items", removeCartItemController);
ecommerceRouter.delete("/cart", clearCartController);
ecommerceRouter.post("/cart/checkout", checkoutCartController);
ecommerceRouter.post("/checkout", checkoutController);
ecommerceRouter.post("/marketplace/checkout", checkoutMarketplaceController);

ecommerceRouter.post("/orders", createOrderController);
ecommerceRouter.get("/orders", listOrdersController);
ecommerceRouter.get("/orders/held", getHeldOrdersController);
ecommerceRouter.patch("/orders/:orderId/status", updateOrderStatusController);

ecommerceRouter.post("/payment/create", createPaymentOrderController);
ecommerceRouter.post("/payment/verify", verifyPaymentWebhookController);

ecommerceRouter.post("/fulfillment/pack", markAsPackedController);
ecommerceRouter.post("/fulfillment/ship", markAsShippedController);
ecommerceRouter.post("/fulfillment/deliver", markAsDeliveredController);
ecommerceRouter.post("/fulfillment/cancel", cancelOrderController);
ecommerceRouter.get("/logistics/orders/:orderId/recommendation", recommendOrderLogisticsController);
ecommerceRouter.post("/logistics/orders/:orderId/assign", assignOptimizedCourierController);
ecommerceRouter.get("/logistics/orders/:orderId/tracking", getOrderTrackingTimelineController);
ecommerceRouter.get("/logistics/promise", estimateDeliveryPromiseController);

ecommerceRouter.post("/returns/request", requestReturnController);
ecommerceRouter.post("/returns/approve", approveReturnController);
ecommerceRouter.post("/returns/inspect", inspectReturnController);
ecommerceRouter.post("/returns/refund", processRefundController);
ecommerceRouter.post("/returns/reconcile", reconcileGatewayRefundController);

export default ecommerceRouter;
