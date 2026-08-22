import prisma from "../../config/prisma";
import { Prisma } from "@prisma/client";
import { reduceStockWithDb } from "../inventory/inventory.service";
import { createTransactionWithEntries } from "../accounting/accounting.service";
import { createInvoiceFromEcommerceOrder } from "../invoicing/invoicing.service";
import { updateSellerTier } from "./seller-tier.service";
import { decideOrderHold, applyOrderHold } from "./order-hold.service";
import { getExchangeRate } from "./currency.service";
import { calculateRegionalPrice } from "./regional-pricing.service";
import Razorpay from "razorpay";
import crypto from "crypto";

let razorpay: Razorpay | null = null;

const getRazorpay = (): Razorpay => {
	if (!razorpay) {
		const keyId = process.env.RAZORPAY_KEY_ID;
		const keySecret = process.env.RAZORPAY_KEY_SECRET;
		
		if (!keyId || !keySecret) {
			throw new EcommerceError(500, "RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be configured");
		}
		
		razorpay = new Razorpay({
			key_id: keyId,
			key_secret: keySecret,
		});
	}
	return razorpay;
};

const getRazorpayKeySecret = (): string => {
	const secret = process.env.RAZORPAY_KEY_SECRET;
	if (!secret) {
		throw new EcommerceError(500, "RAZORPAY_KEY_SECRET is not configured");
	}
	return secret;
};

export class EcommerceError extends Error {
	statusCode: number;

	constructor(statusCode: number, message: string) {
		super(message);
		this.statusCode = statusCode;
		this.name = "EcommerceError";
	}
}

const toMoney = (value: number): number => Number(value.toFixed(2));

export type EcommerceActor = {
	userId: string;
	role?: string;
};

const isAdminActor = (actor?: EcommerceActor) => actor?.role === "SUPER_ADMIN" || actor?.role === "ADMIN";

const ensureOrganization = async (organizationId: string) => {
	const org = await prisma.organization.findUnique({
		where: { id: organizationId },
		select: { id: true },
	});

	if (!org) {
		throw new EcommerceError(404, "Organization not found");
	}
};

const ensureUserInOrganization = async (userId: string, organizationId: string) => {
	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: { id: true, organizationId: true },
	});

	if (!user) {
		throw new EcommerceError(404, "User not found");
	}

	if (user.organizationId !== organizationId) {
		throw new EcommerceError(403, "User does not belong to this organization");
	}
};

const ensureStoreAccessForActor = async (
	storeId: string,
	organizationId: string,
	actor?: EcommerceActor,
	requireWriteAccess = false,
) => {
	const store = await ensureStoreBelongsToOrg(storeId, organizationId);

	if (!actor || isAdminActor(actor)) {
		return store;
	}

	const membership = await prisma.storeMember.findUnique({
		where: {
			storeId_userId: {
				storeId,
				userId: actor.userId,
			},
		},
		select: { role: true, isActive: true, organizationId: true },
	});

	if (!membership || !membership.isActive || membership.organizationId !== organizationId) {
		throw new EcommerceError(403, "You do not have access to this store");
	}

	if (requireWriteAccess && membership.role === "VIEWER") {
		throw new EcommerceError(403, "You do not have write access to this store");
	}

	return store;
};

const ensureStoreBelongsToOrg = async (storeId: string, organizationId: string) => {
	const store = await prisma.store.findUnique({
		where: { id: storeId },
		select: {
			id: true,
			organizationId: true,
			isActive: true,
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
		throw new EcommerceError(404, "Store not found");
	}

	if (store.organizationId !== organizationId) {
		throw new EcommerceError(403, "Store does not belong to this organization");
	}

	if (!store.isActive) {
		throw new EcommerceError(400, "Store is inactive");
	}

	return store;
};

const findStoreByOrganization = async (organizationId: string) => {
	return prisma.store.findFirst({
		where: { organizationId },
		orderBy: { createdAt: "asc" },
	});
};

const ensureCustomerInOrg = async (customerId: string, organizationId: string) => {
	const customer = await prisma.contact.findUnique({
		where: { id: customerId },
		select: { id: true, organizationId: true, type: true },
	});

	if (!customer) {
		throw new EcommerceError(404, "Customer not found");
	}

	if (customer.organizationId !== organizationId) {
		throw new EcommerceError(403, "Customer does not belong to this organization");
	}

	if (customer.type !== "CUSTOMER") {
		throw new EcommerceError(400, "Contact is not a customer");
	}

	return customer;
};

const getAccountingLedgers = async (organizationId: string) => {
	const ledgers = await prisma.ledgerAccount.findMany({
		where: {
			organizationId,
			name: {
				in: ["Accounts Receivable", "Revenue"],
			},
		},
		select: {
			id: true,
			name: true,
		},
	});

	const receivable = ledgers.find((x) => x.name === "Accounts Receivable");
	const revenue = ledgers.find((x) => x.name === "Revenue");

	if (!receivable || !revenue) {
		throw new EcommerceError(
			400,
			"Required accounting ledgers not found. Ensure 'Accounts Receivable' and 'Revenue' exist.",
		);
	}

	return {
		receivableLedgerId: receivable.id,
		revenueLedgerId: revenue.id,
	};
};

const getRevenueAndCashLedgers = async (
	organizationId: string,
	tx?: Prisma.TransactionClient,
) => {
	const db = tx ?? prisma;
	const ledgers = await db.ledgerAccount.findMany({
		where: {
			organizationId,
			name: {
				in: ["Revenue", "Cash"],
			},
		},
		select: {
			id: true,
			name: true,
		},
	});

	const revenue = ledgers.find((ledger) => ledger.name === "Revenue");
	const cash = ledgers.find((ledger) => ledger.name === "Cash");

	if (!revenue || !cash) {
		throw new EcommerceError(400, "Required refund ledgers 'Revenue' and 'Cash' were not found");
	}

	return {
		revenueLedgerId: revenue.id,
		cashLedgerId: cash.id,
	};
};

export interface CreateStoreInput {
	name: string;
	domain?: string;
	description?: string;
	businessTypes?: string[];
	organizationType?: string;
	assortmentType?: string;
	onboardingPitch?: string;
	isActive?: boolean;
}

const ALLOWED_BUSINESS_TYPES = new Set([
	"clothing",
	"grocery",
	"beauty",
	"bags",
	"accessories",
	"electronics",
	"home-living",
	"health-wellness",
	"ngo-impact",
	"handmade-local",
]);

const ALLOWED_ORGANIZATION_TYPES = new Set(["business", "ngo", "social-enterprise"]);
const ALLOWED_ASSORTMENT_TYPES = new Set(["single-category", "multi-category"]);

const normalizeBusinessTypes = (value?: string[]): string[] => {
	if (!value || value.length === 0) {
		return [];
	}

	const normalized = Array.from(
		new Set(
			value
				.map((item) => item.trim().toLowerCase())
				.filter(Boolean)
		),
	);

	const invalid = normalized.filter((item) => !ALLOWED_BUSINESS_TYPES.has(item));
	if (invalid.length > 0) {
		throw new EcommerceError(400, `Invalid business types: ${invalid.join(", ")}`);
	}

	return normalized;
};

const normalizeOptionalEnum = (value: string | undefined, allowed: Set<string>, fieldName: string) => {
	if (!value) {
		return undefined;
	}

	const normalized = value.trim().toLowerCase();
	if (!normalized) {
		return undefined;
	}

	if (!allowed.has(normalized)) {
		throw new EcommerceError(400, `Invalid ${fieldName}`);
	}

	return normalized;
};

export interface UpdateStorePaymentSettingsInput {
	storeId: string;
	paymentDisplayName?: string;
	paymentUpiId?: string;
	paymentBankAccountName?: string;
	paymentBankAccountNo?: string;
	paymentBankIfsc?: string;
	paymentInstructions?: string;
}

const STORE_DOMAIN_SUFFIX = process.env.STORE_DOMAIN_SUFFIX?.trim() || "shop.cambliss.local";

const slugifyStoreName = (name: string): string => {
	const base = name
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9\s-]/g, "")
		.replace(/\s+/g, "-")
		.replace(/-+/g, "-")
		.replace(/^-|-$/g, "");

	return base || "store";
};

const normalizeStoreDomain = (input: string): string => {
	const normalized = input.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");
	if (!normalized) {
		throw new EcommerceError(400, "domain cannot be empty");
	}
	return normalized;
};

const resolveStoreDomain = async (name: string, rawDomain?: string): Promise<string> => {
	if (rawDomain && rawDomain.trim()) {
		const normalized = normalizeStoreDomain(rawDomain);
		const existing = await prisma.store.findUnique({
			where: { domain: normalized },
			select: { id: true },
		});
		if (existing) {
			throw new EcommerceError(409, "Store domain already exists");
		}
		return normalized;
	}

	const slug = slugifyStoreName(name);
	let candidate = `${slug}.${STORE_DOMAIN_SUFFIX}`;
	let suffix = 1;

	while (true) {
		const existing = await prisma.store.findUnique({
			where: { domain: candidate },
			select: { id: true },
		});

		if (!existing) {
			return candidate;
		}

		suffix += 1;
		candidate = `${slug}-${suffix}.${STORE_DOMAIN_SUFFIX}`;
	}
};

export const createStore = async (
	organizationId: string,
	inputOrName: CreateStoreInput | string,
	domain?: string,
	actor?: EcommerceActor,
) => {
	await ensureOrganization(organizationId);

	if (actor?.userId) {
		await ensureUserInOrganization(actor.userId, organizationId);
	}

	const input: CreateStoreInput =
		typeof inputOrName === "string"
			? { name: inputOrName, domain }
			: inputOrName;

	if (!input.name?.trim()) {
		throw new EcommerceError(400, "name is required");
	}

	if (input.domain && !input.domain.trim()) {
		throw new EcommerceError(400, "domain cannot be empty");
	}

	const resolvedDomain = await resolveStoreDomain(input.name.trim(), input.domain);
	const businessTypes = normalizeBusinessTypes(input.businessTypes);
	const organizationType = normalizeOptionalEnum(
		input.organizationType,
		ALLOWED_ORGANIZATION_TYPES,
		"organizationType",
	);
	const assortmentType = normalizeOptionalEnum(
		input.assortmentType,
		ALLOWED_ASSORTMENT_TYPES,
		"assortmentType",
	);

	if (assortmentType === "single-category" && businessTypes.length > 1) {
		throw new EcommerceError(400, "single-category assortment supports exactly one business type");
	}

	return prisma.store.create({
		data: {
			organizationId,
			ownerUserId: actor?.userId,
			name: input.name.trim(),
			domain: resolvedDomain,
			description: input.description?.trim(),
			businessTypes,
			organizationType,
			assortmentType,
			onboardingPitch: input.onboardingPitch?.trim(),
			isActive: input.isActive ?? true,
			members: actor?.userId
				? {
					create: {
						organizationId,
						userId: actor.userId,
						role: "OWNER",
						isActive: true,
					},
				}
				: undefined,
		},
	});
};

export const updateStorePaymentSettings = async (
	organizationId: string,
	input: UpdateStorePaymentSettingsInput,
	actor?: EcommerceActor,
) => {
	await ensureOrganization(organizationId);
	await ensureStoreAccessForActor(input.storeId, organizationId, actor, true);

	return prisma.store.update({
		where: { id: input.storeId },
		data: {
			paymentDisplayName: input.paymentDisplayName?.trim() || null,
			paymentUpiId: input.paymentUpiId?.trim() || null,
			paymentBankAccountName: input.paymentBankAccountName?.trim() || null,
			paymentBankAccountNo: input.paymentBankAccountNo?.trim() || null,
			paymentBankIfsc: input.paymentBankIfsc?.trim() || null,
			paymentInstructions: input.paymentInstructions?.trim() || null,
		},
		select: {
			id: true,
			name: true,
			domain: true,
			paymentDisplayName: true,
			paymentUpiId: true,
			paymentBankAccountName: true,
			paymentBankAccountNo: true,
			paymentBankIfsc: true,
			paymentInstructions: true,
		},
	});
};

export const getStorePaymentSettings = async (storeId: string, organizationId: string, actor?: EcommerceActor) => {
	await ensureStoreAccessForActor(storeId, organizationId, actor);

	return prisma.store.findUnique({
		where: { id: storeId },
		select: {
			id: true,
			name: true,
			domain: true,
			paymentDisplayName: true,
			paymentUpiId: true,
			paymentBankAccountName: true,
			paymentBankAccountNo: true,
			paymentBankIfsc: true,
			paymentInstructions: true,
		},
	});
};

export const getPublicStoreByDomain = async (domain: string) => {
	const normalized = normalizeStoreDomain(domain);
	const store = await prisma.store.findFirst({
		where: {
			domain: normalized,
			isActive: true,
		},
		select: {
			id: true,
			name: true,
			domain: true,
			description: true,
			paymentDisplayName: true,
			paymentUpiId: true,
			paymentBankAccountName: true,
			paymentBankAccountNo: true,
			paymentBankIfsc: true,
			paymentInstructions: true,
			productListings: {
				where: { isActive: true },
				select: {
					id: true,
					sellingPrice: true,
					description: true,
					images: true,
					product: {
						select: {
							id: true,
							name: true,
							sku: true,
						},
					},
					category: {
						select: { id: true, name: true },
					},
				},
				orderBy: { createdAt: "desc" },
			},
		},
	});

	if (!store) {
		throw new EcommerceError(404, "Store not found");
	}

	return store;
};

export interface CreatePublicStoreOrderInput {
	domain: string;
	customer: {
		firstName: string;
		lastName?: string;
		email?: string;
		phone?: string;
	};
	items: Array<{ listingId: string; quantity: number }>;
}

export const createPublicStoreOrder = async (input: CreatePublicStoreOrderInput) => {
	const domain = normalizeStoreDomain(input.domain);
	const store = await prisma.store.findFirst({
		where: { domain, isActive: true },
		select: { id: true, organizationId: true },
	});

	if (!store) {
		throw new EcommerceError(404, "Store not found");
	}

	if (!input.customer.firstName?.trim()) {
		throw new EcommerceError(400, "customer.firstName is required");
	}

	if (!Array.isArray(input.items) || input.items.length === 0) {
		throw new EcommerceError(400, "At least one order item is required");
	}

	const listingIds = input.items.map((item) => item.listingId);
	const listingMap = new Map(
		(
			await prisma.productListing.findMany({
				where: {
					id: { in: listingIds },
					storeId: store.id,
					isActive: true,
				},
				select: {
					id: true,
					sellingPrice: true,
				},
			})
		).map((listing) => [listing.id, listing]),
	);

	for (const item of input.items) {
		if (!listingMap.has(item.listingId)) {
			throw new EcommerceError(404, `Listing not found: ${item.listingId}`);
		}
		if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
			throw new EcommerceError(400, "Quantity must be a positive number");
		}
	}

	const customerEmail = input.customer.email?.trim().toLowerCase();
	const customerPhone = input.customer.phone?.trim();

	const customer = await prisma.contact.create({
		data: {
			organizationId: store.organizationId,
			type: "CUSTOMER",
			firstName: input.customer.firstName.trim(),
			lastName: input.customer.lastName?.trim() || null,
			email: customerEmail || null,
			phone: customerPhone || null,
			companyName: null,
		},
		select: { id: true },
	});

	let totalAmount = 0;
	const items = input.items.map((item) => {
		const listing = listingMap.get(item.listingId)!;
		const lineTotal = toMoney(Number(listing.sellingPrice) * item.quantity);
		totalAmount += lineTotal;
		return {
			listing,
			quantity: item.quantity,
			lineTotal,
		};
	});

	const created = await prisma.order.create({
		data: {
			organizationId: store.organizationId,
			storeId: store.id,
			customerId: customer.id,
			status: "PENDING",
			paymentStatus: "UNPAID",
			totalAmount: toMoney(totalAmount),
			currency: "INR",
			exchangeRate: 1,
			baseCurrencyAmount: toMoney(totalAmount),
			items: {
				create: items.map((entry) => ({
					productListingId: entry.listing.id,
					quantity: entry.quantity,
					unitPrice: toMoney(Number(entry.listing.sellingPrice)),
					totalPrice: entry.lineTotal,
				})),
			},
		},
		select: {
			id: true,
			status: true,
			paymentStatus: true,
			totalAmount: true,
		},
	});

	return created;
};

export const getStoreByOrganization = async (organizationId: string) => {
	await ensureOrganization(organizationId);

	const store = await findStoreByOrganization(organizationId);
	if (!store) {
		throw new EcommerceError(404, "Store not found for this organization");
	}

	return store;
};

export const toggleStoreStatus = async (storeId: string, organizationId: string, actor?: EcommerceActor) => {
	const store = await ensureStoreAccessForActor(storeId, organizationId, actor, true);

	return prisma.store.update({
		where: { id: storeId },
		data: {
			isActive: !store.isActive,
		},
	});
};

export const listStores = async (organizationId: string, actor?: EcommerceActor) => {
	await ensureOrganization(organizationId);

	if (!actor || isAdminActor(actor)) {
		return prisma.store.findMany({
			where: { organizationId },
			orderBy: { createdAt: "desc" },
		});
	}

	return prisma.store.findMany({
		where: {
			organizationId,
			members: {
				some: {
					userId: actor.userId,
					isActive: true,
				},
			},
		},
		orderBy: { createdAt: "desc" },
	});
};

export interface StoreInsights {
	storeId: string;
	trustScore: number;
	profileScore: number;
	catalogScore: number;
	fulfillmentScore: number;
	operationalScore: number;
	metrics: {
		totalListings: number;
		activeListings: number;
		totalOrders: number;
		deliveredOrders: number;
		cancelledOrders: number;
		returnRequests: number;
	};
}

const clampScore = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

export const getStoreInsights = async (
	organizationId: string,
	storeId: string,
	actor?: EcommerceActor,
): Promise<StoreInsights> => {
	const store = await ensureStoreAccessForActor(storeId, organizationId, actor);

	const [
		totalListings,
		activeListings,
		totalOrders,
		deliveredOrders,
		cancelledOrders,
		returnRequests,
	] = await Promise.all([
		prisma.productListing.count({ where: { organizationId, storeId } }),
		prisma.productListing.count({ where: { organizationId, storeId, isActive: true } }),
		prisma.order.count({ where: { organizationId, storeId } }),
		prisma.order.count({ where: { organizationId, storeId, status: "DELIVERED" } }),
		prisma.order.count({ where: { organizationId, storeId, status: "CANCELLED" } }),
		prisma.returnRequest.count({
			where: {
				organizationId,
				order: {
					storeId,
				},
			},
		}),
	]);

	const profileSignals = [
		Boolean(store.description?.trim()),
		(store.businessTypes?.length ?? 0) > 0,
		Boolean(store.organizationType),
		Boolean(store.assortmentType),
		Boolean(store.onboardingPitch?.trim()),
		Boolean(store.paymentUpiId || store.paymentBankAccountNo),
	];
	const profileScore = clampScore((profileSignals.filter(Boolean).length / profileSignals.length) * 100);

	const activeListingRatio = totalListings > 0 ? activeListings / totalListings : 0;
	const catalogScore = clampScore(totalListings === 0 ? 20 : 35 + activeListingRatio * 65);

	const deliveredRatio = totalOrders > 0 ? deliveredOrders / totalOrders : 0;
	const cancellationRatio = totalOrders > 0 ? cancelledOrders / totalOrders : 0;
	const fulfillmentScore = clampScore(totalOrders === 0 ? 50 : deliveredRatio * 100 - cancellationRatio * 40 + 20);

	const returnRatio = deliveredOrders > 0 ? returnRequests / deliveredOrders : 0;
	const operationalScore = clampScore(100 - returnRatio * 120);

	const trustScore = clampScore(
		profileScore * 0.25 + catalogScore * 0.25 + fulfillmentScore * 0.35 + operationalScore * 0.15,
	);

	return {
		storeId,
		trustScore,
		profileScore,
		catalogScore,
		fulfillmentScore,
		operationalScore,
		metrics: {
			totalListings,
			activeListings,
			totalOrders,
			deliveredOrders,
			cancelledOrders,
			returnRequests,
		},
	};
};

export interface MarketplaceProductFilters {
	businessTypes?: string[];
	organizationType?: string;
	categoryId?: string;
	sortBy?: "latest" | "price-low" | "price-high";
}

export interface CreateCategoryInput {
	storeId?: string;
	name: string;
	description?: string;
	image?: string;
	parentId?: string;
}

const assertNoCircularParent = async (parentId: string) => {
	const visited = new Set<string>();
	let cursor: string | null = parentId;

	while (cursor) {
		if (visited.has(cursor)) {
			throw new EcommerceError(400, "Circular category hierarchy detected");
		}

		visited.add(cursor);

		const parentNode: { parentId: string | null } | null = await prisma.category.findUnique({
			where: { id: cursor },
			select: { parentId: true },
		});

		cursor = parentNode?.parentId ?? null;
	}
};

export const createCategory = async (
	organizationId: string,
	inputOrName: CreateCategoryInput | string,
	parentId?: string,
	actor?: EcommerceActor,
) => {
	await ensureOrganization(organizationId);

	const input: CreateCategoryInput =
		typeof inputOrName === "string"
			? { name: inputOrName, parentId }
			: inputOrName;

	const store = input.storeId
		? await ensureStoreAccessForActor(input.storeId, organizationId, actor, true)
		: await getStoreByOrganization(organizationId);

	if (!input.name?.trim()) {
		throw new EcommerceError(400, "name is required");
	}

	if (input.parentId && input.parentId === "self") {
		throw new EcommerceError(400, "Category cannot be parent of itself");
	}

	if (input.parentId) {
		const parent = await prisma.category.findUnique({
			where: { id: input.parentId },
			select: { id: true, organizationId: true, storeId: true },
		});

		if (!parent) {
			throw new EcommerceError(404, "Parent category not found");
		}

		if (parent.organizationId !== organizationId || parent.storeId !== store.id) {
			throw new EcommerceError(403, "Parent category must belong to the same organization and store");
		}

		await assertNoCircularParent(parent.id);
	}

	return prisma.category.create({
		data: {
			organizationId,
			storeId: store.id,
			name: input.name.trim(),
			description: input.description?.trim(),
			image: input.image,
			parentId: input.parentId,
		},
	});
};

export interface CategoryTreeNode {
	id: string;
	name: string;
	children: CategoryTreeNode[];
}

export const getCategoryTree = async (organizationId: string): Promise<CategoryTreeNode[]> => {
	await ensureOrganization(organizationId);
	const store = await getStoreByOrganization(organizationId);

	const categories = await prisma.category.findMany({
		where: {
			organizationId,
			storeId: store.id,
		},
		select: {
			id: true,
			name: true,
			parentId: true,
		},
		orderBy: { name: "asc" },
	});

	const nodeMap = new Map<string, CategoryTreeNode>();
	for (const category of categories) {
		nodeMap.set(category.id, { id: category.id, name: category.name, children: [] });
	}

	const roots: CategoryTreeNode[] = [];
	for (const category of categories) {
		const node = nodeMap.get(category.id)!;
		if (category.parentId) {
			const parent = nodeMap.get(category.parentId);
			if (parent) {
				parent.children.push(node);
			} else {
				roots.push(node);
			}
		} else {
			roots.push(node);
		}
	}

	return roots;
};

export const listCategories = async (organizationId: string, storeId: string, actor?: EcommerceActor) => {
	await ensureOrganization(organizationId);
	await ensureStoreAccessForActor(storeId, organizationId, actor);

	return prisma.category.findMany({
		where: {
			organizationId,
			storeId,
		},
		orderBy: [{ parentId: "asc" }, { name: "asc" }],
	});
};

export interface CreateProductListingInput {
	storeId?: string;
	productId: string;
	categoryId?: string;
	sellingPrice: number;
	description?: string;
	isActive?: boolean;
	seoTitle?: string;
	seoDescription?: string;
	images?: string[];
}

export const createProductListing = async (
	organizationId: string,
	inputOrProductId: CreateProductListingInput | string,
	categoryId?: string,
	sellingPrice?: number,
	images?: string[],
	seoData?: { seoTitle?: string; seoDescription?: string },
	actor?: EcommerceActor,
) => {
	await ensureOrganization(organizationId);

	const input: CreateProductListingInput =
		typeof inputOrProductId === "string"
			? {
				productId: inputOrProductId,
				categoryId,
				sellingPrice: sellingPrice ?? 0,
				images,
				seoTitle: seoData?.seoTitle,
				seoDescription: seoData?.seoDescription,
			}
			: inputOrProductId;

	const store = input.storeId
		? await ensureStoreAccessForActor(input.storeId, organizationId, actor, true)
		: await getStoreByOrganization(organizationId);

	if (!input.productId?.trim()) {
		throw new EcommerceError(400, "productId is required");
	}

	if (!Number.isFinite(input.sellingPrice) || input.sellingPrice <= 0) {
		throw new EcommerceError(400, "sellingPrice must be a positive number");
	}

	const product = await prisma.product.findUnique({
		where: { id: input.productId },
		select: { id: true, organizationId: true, isActive: true, costPrice: true },
	});

	if (!product) {
		throw new EcommerceError(404, "Product not found");
	}

	if (product.organizationId !== organizationId) {
		throw new EcommerceError(403, "Product does not belong to this organization");
	}

	if (!product.isActive) {
		throw new EcommerceError(400, "Product is inactive");
	}

	if (product.costPrice !== null && input.sellingPrice < Number(product.costPrice)) {
		throw new EcommerceError(400, "sellingPrice cannot be lower than costPrice");
	}

	if (input.categoryId) {
		const category = await prisma.category.findUnique({
			where: { id: input.categoryId },
			select: { id: true, organizationId: true, storeId: true },
		});

		if (!category) {
			throw new EcommerceError(404, "Category not found");
		}

		if (category.organizationId !== organizationId || category.storeId !== store.id) {
			throw new EcommerceError(403, "Category must belong to same organization and store");
		}
	}

	const existing = await prisma.productListing.findFirst({
		where: {
			organizationId,
			storeId: store.id,
			productId: input.productId,
		},
		select: { id: true },
	});

	if (existing) {
		throw new EcommerceError(409, "Product is already listed in the store");
	}

	return prisma.productListing.create({
		data: {
			organizationId,
			storeId: store.id,
			productId: input.productId,
			categoryId: input.categoryId,
			sellingPrice: toMoney(input.sellingPrice),
			description: input.description?.trim(),
			isActive: input.isActive ?? true,
			seoTitle: input.seoTitle?.trim(),
			seoDescription: input.seoDescription?.trim(),
			images: input.images ?? [],
		},
		include: {
			product: {
				select: {
					id: true,
					name: true,
					sku: true,
					unitPrice: true,
				},
			},
			category: {
				select: {
					id: true,
					name: true,
				},
			},
		},
	});
};

export const getStoreProducts = async (organizationId: string, actor?: EcommerceActor) => {
	await ensureOrganization(organizationId);
	const store = await getStoreByOrganization(organizationId);

	if (actor && !isAdminActor(actor)) {
		await ensureStoreAccessForActor(store.id, organizationId, actor);
	}

	const listings = await prisma.productListing.findMany({
		where: {
			organizationId,
			storeId: store.id,
			isActive: true,
		},
		include: {
			product: {
				select: {
					id: true,
					name: true,
					sku: true,
					unitPrice: true,
					costPrice: true,
				},
			},
			category: {
				select: {
					id: true,
					name: true,
				},
			},
		},
		orderBy: { createdAt: "desc" },
	});

	const productIds = [...new Set(listings.map((listing) => listing.productId))];
	const stockSums = productIds.length
		? await prisma.stockItem.groupBy({
				by: ["productId"],
				where: {
					productId: { in: productIds },
					warehouse: { organizationId },
				},
				_sum: {
					quantity: true,
				},
			})
		: [];

	const stockMap = new Map(stockSums.map((row) => [row.productId, row._sum.quantity ?? 0]));

	return listings.map((listing) => ({
		...listing,
		stockAvailability: stockMap.get(listing.productId) ?? 0,
	}));
};

export const toggleProductListing = async (listingId: string) => {
	const listing = await prisma.productListing.findUnique({
		where: { id: listingId },
		select: { id: true, isActive: true },
	});

	if (!listing) {
		throw new EcommerceError(404, "Product listing not found");
	}

	return prisma.productListing.update({
		where: { id: listingId },
		data: {
			isActive: !listing.isActive,
		},
	});
};

export const listProductListings = async (organizationId: string, storeId: string, actor?: EcommerceActor) => {
	await ensureOrganization(organizationId);
	await ensureStoreAccessForActor(storeId, organizationId, actor);

	return prisma.productListing.findMany({
		where: {
			organizationId,
			storeId,
		},
		include: {
			product: {
				select: {
					id: true,
					name: true,
					sku: true,
					unitPrice: true,
					costPrice: true,
				},
			},
			category: {
				select: {
					id: true,
					name: true,
				},
			},
		},
		orderBy: {
			createdAt: "desc",
		},
	});
};

export const listMarketplaceProducts = async (
	organizationId: string,
	search?: string,
	actor?: EcommerceActor,
	filters?: MarketplaceProductFilters,
) => {
	await ensureOrganization(organizationId);

	const normalizedSearch = search?.trim();
	const normalizedBusinessTypes = normalizeBusinessTypes(filters?.businessTypes);
	const normalizedOrganizationType = normalizeOptionalEnum(
		filters?.organizationType,
		ALLOWED_ORGANIZATION_TYPES,
		"organizationType",
	);
	const normalizedSortBy = filters?.sortBy ?? "latest";

	const orderBy: Prisma.ProductListingOrderByWithRelationInput[] =
		normalizedSortBy === "price-low"
			? [{ sellingPrice: "asc" }, { updatedAt: "desc" }]
			: normalizedSortBy === "price-high"
				? [{ sellingPrice: "desc" }, { updatedAt: "desc" }]
				: [{ updatedAt: "desc" }, { createdAt: "desc" }];

	const accessibleStoreIds =
		actor && !isAdminActor(actor)
			? (
				await prisma.storeMember.findMany({
					where: { organizationId, userId: actor.userId, isActive: true },
					select: { storeId: true },
				})
			).map((item) => item.storeId)
			: undefined;

	return prisma.productListing.findMany({
		where: {
			organizationId,
			storeId: accessibleStoreIds ? { in: accessibleStoreIds } : undefined,
			isActive: true,
			store: {
				isActive: true,
				businessTypes: normalizedBusinessTypes.length > 0 ? { hasSome: normalizedBusinessTypes } : undefined,
				organizationType: normalizedOrganizationType,
			},
			categoryId: filters?.categoryId,
			product: {
				isActive: true,
				OR: normalizedSearch
					? [
						{ name: { contains: normalizedSearch, mode: "insensitive" } },
						{ sku: { contains: normalizedSearch, mode: "insensitive" } },
					]
					: undefined,
			},
		},
		include: {
			store: {
				select: {
					id: true,
					name: true,
					domain: true,
					businessTypes: true,
					organizationType: true,
					assortmentType: true,
				},
			},
			product: {
				select: {
					id: true,
					name: true,
					sku: true,
					unitPrice: true,
				},
			},
			category: {
				select: {
					id: true,
					name: true,
				},
			},
		},
		orderBy,
	});
};

export interface CategorizedProductResult {
	id: string;
	name: string;
	sku: string;
	unitPrice: string;
	sellingPrice: string;
	description?: string;
	images: string[];
	store: {
		id: string;
		name: string;
		domain?: string;
		businessTypes: string[];
		organizationType?: string;
	};
	category: {
		id: string;
		name: string;
	} | null;
	rank: number;
	trustScore: number;
	conversionRate: number;
}

export const listCategoryRankedProducts = async (
	organizationId: string,
	categoryId: string,
	filters?: { search?: string },
) => {
	const normalizedSearch = filters?.search?.trim();

	// Get all products in the category
	const listings = await prisma.productListing.findMany({
		where: {
			organizationId,
			categoryId,
			isActive: true,
			store: {
				isActive: true,
			},
			product: {
				isActive: true,
				OR: normalizedSearch
					? [
						{ name: { contains: normalizedSearch, mode: "insensitive" } },
						{ sku: { contains: normalizedSearch, mode: "insensitive" } },
					]
					: undefined,
			},
		},
		include: {
			store: {
				select: {
					id: true,
					name: true,
					domain: true,
					businessTypes: true,
					organizationType: true,
				},
			},
			product: {
				select: {
					id: true,
					name: true,
					sku: true,
					unitPrice: true,
				},
			},
			category: {
				select: {
					id: true,
					name: true,
				},
			},
		},
	});

	// Enrich each listing with store insights for ranking
	const enriched = await Promise.all(
		listings.map(async (listing) => {
			const insights = await getStoreInsights(organizationId, listing.storeId);

			const totalOrders = await prisma.order.count({
				where: { storeId: listing.storeId, organizationId },
			});

			const completedOrders = await prisma.order.count({
				where: { storeId: listing.storeId, organizationId, status: "DELIVERED" },
			});

			const conversionRate = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;

			// Ranking formula: trust score (40%) + conversion rate (30%) + recency bonus (30%)
			const listingAge = Date.now() - listing.createdAt.getTime();
			const recencyBonus = Math.max(0, 30 - Math.floor(listingAge / (1000 * 60 * 60 * 24)) / 10); // decreases by 1 point per day

			// Base rank
			let rank = insights.trustScore * 0.4 + conversionRate * 0.3 + recencyBonus;

			// Get store tier for featured boost
			const store = await prisma.store.findUnique({
				where: { id: listing.storeId },
				select: { isFeatured: true },
			});

			// Boost featured sellers: add 20 points to rank (ensures they appear higher)
			if (store?.isFeatured) {
				rank += 20;
			}

			return {
				id: listing.id,
				name: listing.product.name,
				sku: listing.product.sku,
				unitPrice: listing.product.unitPrice.toString(),
				sellingPrice: listing.sellingPrice.toString(),
				description: listing.description || undefined,
				images: listing.images || [],
				store: {
					id: listing.store.id,
					name: listing.store.name,
					domain: listing.store.domain || undefined,
					businessTypes: listing.store.businessTypes || [],
					organizationType: listing.store.organizationType || undefined,
				},
				category: listing.category,
				rank,
				trustScore: insights.trustScore,
				conversionRate,
			};
		}),
	);

	// Sort by rank descending
	return enriched.sort((a, b) => b.rank - a.rank);
};

export interface CreateOrderItemInput {
	productListingId: string;
	warehouseId: string;
	quantity: number;
}

export interface CreateOrderInput {
	storeId: string;
	customerId: string;
	items: CreateOrderItemInput[];
	currency?: string; // Optional: defaults to INR
	customerRegion?: string; // Optional: for tax calculation
	customerState?: string; // Optional: for tax calculation
}

export interface AddCartItemInput {
	storeId: string;
	customerId: string;
	productListingId: string;
	quantity: number;
}

export interface UpdateCartItemInput {
	cartItemId: string;
	quantity: number;
}

export interface RemoveFromCartInput {
	cartItemId: string;
}

export interface RemoveCartItemInput {
	storeId: string;
	customerId: string;
	productListingId: string;
}

export interface MarketplaceAddCartItemInput {
	customerId: string;
	productListingId: string;
	quantity: number;
}

const buildCrossStoreCartResponse = async (
	db: Prisma.TransactionClient | typeof prisma,
	organizationId: string,
	customerId: string,
) => {
	const carts = await db.cart.findMany({
		where: {
			organizationId,
			customerId,
		},
		include: {
			store: {
				select: {
					id: true,
					name: true,
					domain: true,
					isActive: true,
				},
			},
			items: {
				include: {
					productListing: {
						include: {
							product: {
								select: {
									id: true,
									name: true,
									sku: true,
								},
							},
						},
					},
				},
			},
		},
		orderBy: { updatedAt: "desc" },
	});

	const byStore = carts
		.filter((cart) => cart.items.length > 0)
		.map((cart) => {
			const items = cart.items.map((item) => {
				const lineTotal = toMoney(Number(item.unitPrice) * item.quantity);
				return {
					...item,
					lineTotal,
				};
			});

			const subtotal = toMoney(items.reduce((sum, item) => sum + item.lineTotal, 0));

			return {
				cartId: cart.id,
				store: cart.store,
				items,
				subtotal,
			};
		});

	const grandTotal = toMoney(byStore.reduce((sum, cart) => sum + cart.subtotal, 0));

	return {
		customerId,
		storeCount: byStore.length,
		itemsCount: byStore.reduce((sum, cart) => sum + cart.items.length, 0),
		grandTotal,
		byStore,
	};
};

const ensureCartRecord = async (
	tx: Prisma.TransactionClient,
	organizationId: string,
	storeId: string,
	customerId: string,
) => {
	const existing = await tx.cart.findFirst({
		where: {
			organizationId,
			storeId,
			customerId,
		},
	});

	if (existing) {
		return existing;
	}

	return tx.cart.create({
		data: {
			organizationId,
			storeId,
			customerId,
		},
	});
};

const getAvailableStockForProduct = async (
	db: Prisma.TransactionClient | typeof prisma,
	organizationId: string,
	productId: string,
) => {
	const stock = await db.stockItem.aggregate({
		where: {
			productId,
			warehouse: {
				organizationId,
			},
		},
		_sum: {
			quantity: true,
		},
	});

	return Number(stock._sum.quantity ?? 0);
};

const validateCartListingAndQuantity = async (
	organizationId: string,
	storeId: string,
	listingId: string,
	requestedQuantity: number,
	existingQuantity: number,
	db: Prisma.TransactionClient | typeof prisma,
) => {
	const listing = await db.productListing.findUnique({
		where: { id: listingId },
		select: {
			id: true,
			organizationId: true,
			storeId: true,
			isActive: true,
			sellingPrice: true,
			productId: true,
			product: {
				select: {
					isActive: true,
				},
			},
		},
	});

	if (!listing) {
		throw new EcommerceError(404, "Product listing not found");
	}

	if (listing.organizationId !== organizationId || listing.storeId !== storeId) {
		throw new EcommerceError(403, "Product listing does not belong to this organization/store");
	}

	if (!listing.isActive || !listing.product.isActive) {
		throw new EcommerceError(400, "Product listing is inactive");
	}

	const requestedTotalQuantity = existingQuantity + requestedQuantity;
	const availableStock = await getAvailableStockForProduct(db, organizationId, listing.productId);
	if (requestedTotalQuantity > availableStock) {
		throw new EcommerceError(400, "Insufficient stock available");
	}

	return listing;
};

const resolveWarehouseForQuantity = async (
	tx: Prisma.TransactionClient,
	organizationId: string,
	productId: string,
	quantity: number,
) => {
	const stock = await tx.stockItem.findMany({
		where: {
			productId,
			quantity: { gte: quantity },
			warehouse: {
				organizationId,
			},
		},
		select: {
			warehouseId: true,
			quantity: true,
		},
		orderBy: {
			quantity: "desc",
		},
		take: 1,
	});

	if (!stock[0]) {
		throw new EcommerceError(400, "Insufficient stock for one or more cart items");
	}

	return stock[0].warehouseId;
};

const buildCartResponse = async (
	db: Prisma.TransactionClient | typeof prisma,
	organizationId: string,
	storeId: string,
	customerId: string,
) => {
	const cart = await db.cart.findFirst({
		where: {
			organizationId,
			storeId,
			customerId,
		},
		include: {
			items: {
				include: {
					productListing: {
						include: {
							product: {
								select: {
									id: true,
									name: true,
									sku: true,
								},
							},
						},
					},
				},
			},
		},
	});

	if (!cart) {
		return {
			storeId,
			customerId,
			items: [],
			subtotal: 0,
			total: 0,
		};
	}

	const productIds = Array.from(new Set(cart.items.map((item) => item.productListing.productId)));
	const stockByProduct =
		productIds.length > 0
			? await db.stockItem.groupBy({
					by: ["productId"],
					where: {
						productId: { in: productIds },
						warehouse: {
							organizationId,
						},
					},
					_sum: {
						quantity: true,
					},
			  })
			: [];

	const stockMap = new Map(stockByProduct.map((row) => [row.productId, Number(row._sum.quantity ?? 0)]));

	const normalizedItems = cart.items.map((item) => {
		const stockAvailability = stockMap.get(item.productListing.productId) ?? 0;
		const lineTotal = toMoney(Number(item.unitPrice) * item.quantity);

		return {
			...item,
			stockAvailability,
			lineTotal,
		};
	});

	const subtotal = toMoney(normalizedItems.reduce((sum, item) => sum + item.lineTotal, 0));
	const total = subtotal;

	return {
		id: cart.id,
		storeId: cart.storeId,
		customerId: cart.customerId,
		items: normalizedItems,
		subtotal,
		total,
	};
};

export const getCart = async (
	organizationId: string,
	storeIdOrCustomerId: string,
	maybeCustomerId?: string,
	actor?: EcommerceActor,
) => {
	await ensureOrganization(organizationId);

	if (maybeCustomerId) {
		await ensureStoreAccessForActor(storeIdOrCustomerId, organizationId, actor);
		await ensureCustomerInOrg(maybeCustomerId, organizationId);
		return buildCartResponse(prisma, organizationId, storeIdOrCustomerId, maybeCustomerId);
	}

	const customerId = storeIdOrCustomerId;
	await ensureCustomerInOrg(customerId, organizationId);
	const store = await getStoreByOrganization(organizationId);

	if (actor && !isAdminActor(actor)) {
		await ensureStoreAccessForActor(store.id, organizationId, actor);
	}

	return buildCartResponse(prisma, organizationId, store.id, customerId);
};

export const addCartItem = async (organizationId: string, input: AddCartItemInput, actor?: EcommerceActor) => {
	await ensureOrganization(organizationId);
	await ensureStoreAccessForActor(input.storeId, organizationId, actor, true);
	await ensureCustomerInOrg(input.customerId, organizationId);

	if (!input.productListingId?.trim()) {
		throw new EcommerceError(400, "productListingId is required");
	}

	if (!Number.isInteger(input.quantity) || input.quantity <= 0) {
		throw new EcommerceError(400, "quantity must be a positive integer");
	}

	return prisma.$transaction(async (tx) => {
		const cart = await ensureCartRecord(tx, organizationId, input.storeId, input.customerId);

		const existingItem = await tx.cartItem.findUnique({
			where: {
				cartId_productListingId: {
					cartId: cart.id,
					productListingId: input.productListingId,
				},
			},
		});

		const listing = await validateCartListingAndQuantity(
			organizationId,
			input.storeId,
			input.productListingId,
			input.quantity,
			existingItem?.quantity ?? 0,
			tx,
		);

		if (existingItem) {
			await tx.cartItem.update({
				where: { id: existingItem.id },
				data: {
					quantity: existingItem.quantity + input.quantity,
					unitPrice: Number(listing.sellingPrice),
				},
			});
		} else {
			await tx.cartItem.create({
				data: {
					cartId: cart.id,
					productListingId: listing.id,
					quantity: input.quantity,
					unitPrice: Number(listing.sellingPrice),
				},
			});
		}

		return buildCartResponse(tx, organizationId, input.storeId, input.customerId);
	});
};

export const getOrCreateCart = async (organizationId: string, customerId: string, actor?: EcommerceActor) => {
	await ensureOrganization(organizationId);
	await ensureCustomerInOrg(customerId, organizationId);
	const store = await getStoreByOrganization(organizationId);

	if (actor && !isAdminActor(actor)) {
		await ensureStoreAccessForActor(store.id, organizationId, actor);
	}

	return prisma.$transaction(async (tx) => {
		await ensureCartRecord(tx, organizationId, store.id, customerId);
		return buildCartResponse(tx, organizationId, store.id, customerId);
	});
};

export const getMarketplaceCart = async (organizationId: string, customerId: string) => {
	await ensureOrganization(organizationId);
	await ensureCustomerInOrg(customerId, organizationId);

	return buildCrossStoreCartResponse(prisma, organizationId, customerId);
};

export const addMarketplaceCartItem = async (
	organizationId: string,
	input: MarketplaceAddCartItemInput,
) => {
	await ensureOrganization(organizationId);
	await ensureCustomerInOrg(input.customerId, organizationId);

	if (!input.productListingId?.trim()) {
		throw new EcommerceError(400, "productListingId is required");
	}

	if (!Number.isInteger(input.quantity) || input.quantity <= 0) {
		throw new EcommerceError(400, "quantity must be a positive integer");
	}

	const listing = await prisma.productListing.findUnique({
		where: { id: input.productListingId },
		select: { id: true, organizationId: true, storeId: true, isActive: true },
	});

	if (!listing) {
		throw new EcommerceError(404, "Product listing not found");
	}

	if (listing.organizationId !== organizationId) {
		throw new EcommerceError(403, "Product listing does not belong to this organization");
	}

	if (!listing.isActive) {
		throw new EcommerceError(400, "Product listing is inactive");
	}

	await addCartItem(organizationId, {
		storeId: listing.storeId,
		customerId: input.customerId,
		productListingId: input.productListingId,
		quantity: input.quantity,
	});

	return getMarketplaceCart(organizationId, input.customerId);
};

export const addToCart = async (
	organizationId: string,
	customerId: string,
	productId: string,
	quantity: number,
	actor?: EcommerceActor,
) => {
	await ensureOrganization(organizationId);
	await ensureCustomerInOrg(customerId, organizationId);
	const store = await getStoreByOrganization(organizationId);

	if (actor && !isAdminActor(actor)) {
		await ensureStoreAccessForActor(store.id, organizationId, actor);
	}

	const listing = await prisma.productListing.findFirst({
		where: {
			organizationId,
			storeId: store.id,
			productId,
			isActive: true,
		},
		select: { id: true },
	});

	if (!listing) {
		throw new EcommerceError(404, "Active product listing not found for product");
	}

	return addCartItem(organizationId, {
		storeId: store.id,
		customerId,
		productListingId: listing.id,
		quantity,
	}, actor);
};

export const updateCartItem = async (organizationId: string, input: UpdateCartItemInput) => {
	await ensureOrganization(organizationId);

	if (!input.cartItemId?.trim()) {
		throw new EcommerceError(400, "cartItemId is required");
	}

	if (!Number.isInteger(input.quantity) || input.quantity <= 0) {
		throw new EcommerceError(400, "quantity must be a positive integer");
	}

	return prisma.$transaction(async (tx) => {
		const cartItem = await tx.cartItem.findUnique({
			where: { id: input.cartItemId },
			include: {
				cart: {
					select: {
						organizationId: true,
						storeId: true,
						customerId: true,
					},
				},
				productListing: {
					select: {
						id: true,
					},
				},
			},
		});

		if (!cartItem) {
			throw new EcommerceError(404, "Cart item not found");
		}

		if (cartItem.cart.organizationId !== organizationId) {
			throw new EcommerceError(403, "Cart item does not belong to this organization");
		}

		const listing = await validateCartListingAndQuantity(
			organizationId,
			cartItem.cart.storeId,
			cartItem.productListing.id,
			input.quantity,
			0,
			tx,
		);

		await tx.cartItem.update({
			where: { id: cartItem.id },
			data: {
				quantity: input.quantity,
				unitPrice: Number(listing.sellingPrice),
			},
		});

		return buildCartResponse(
			tx,
			organizationId,
			cartItem.cart.storeId,
			cartItem.cart.customerId,
		);
	});
};

export const removeFromCart = async (organizationId: string, input: RemoveFromCartInput) => {
	await ensureOrganization(organizationId);

	if (!input.cartItemId?.trim()) {
		throw new EcommerceError(400, "cartItemId is required");
	}

	return prisma.$transaction(async (tx) => {
		const cartItem = await tx.cartItem.findUnique({
			where: { id: input.cartItemId },
			include: {
				cart: {
					select: {
						organizationId: true,
						storeId: true,
						customerId: true,
					},
				},
			},
		});

		if (!cartItem) {
			throw new EcommerceError(404, "Cart item not found");
		}

		if (cartItem.cart.organizationId !== organizationId) {
			throw new EcommerceError(403, "Cart item does not belong to this organization");
		}

		await tx.cartItem.delete({ where: { id: cartItem.id } });

		return buildCartResponse(
			tx,
			organizationId,
			cartItem.cart.storeId,
			cartItem.cart.customerId,
		);
	});
};

export const removeCartItem = async (organizationId: string, input: RemoveCartItemInput, actor?: EcommerceActor) => {
	await ensureOrganization(organizationId);
	await ensureStoreAccessForActor(input.storeId, organizationId, actor, true);
	await ensureCustomerInOrg(input.customerId, organizationId);

	const cart = await prisma.cart.findFirst({
		where: {
			organizationId,
			storeId: input.storeId,
			customerId: input.customerId,
		},
		select: { id: true },
	});

	if (!cart) {
		return {
			storeId: input.storeId,
			customerId: input.customerId,
			items: [],
			subtotal: 0,
			total: 0,
		};
	}

	await prisma.cartItem.deleteMany({
		where: {
			cartId: cart.id,
			productListingId: input.productListingId,
		},
	});

	return getCart(organizationId, input.storeId, input.customerId);
};

export const clearCart = async (organizationId: string, storeId: string, customerId: string, actor?: EcommerceActor) => {
	await ensureOrganization(organizationId);
	await ensureStoreAccessForActor(storeId, organizationId, actor, true);
	await ensureCustomerInOrg(customerId, organizationId);

	const cart = await prisma.cart.findFirst({
		where: {
			organizationId,
			storeId,
			customerId,
		},
		select: { id: true },
	});

	if (!cart) {
		return {
			storeId,
			customerId,
			items: [],
			subtotal: 0,
			total: 0,
		};
	}

	await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });

	return {
		id: cart.id,
		storeId,
		customerId,
		items: [],
		subtotal: 0,
		total: 0,
	};
};

const checkoutStoreCartInternal = async (
	tx: Prisma.TransactionClient,
	organizationId: string,
	storeId: string,
	customerId: string,
	receivableLedgerId: string,
	revenueLedgerId: string,
) => {
	const cart = await tx.cart.findFirst({
		where: {
			organizationId,
			storeId,
			customerId,
		},
		select: { id: true },
	});

	if (!cart) {
		throw new EcommerceError(400, "Cart is empty");
	}

	await tx.$executeRaw`
		SELECT id
		FROM "Cart"
		WHERE id = ${cart.id}
		FOR UPDATE
	`;

	const lockedCart = await tx.cart.findUnique({
		where: { id: cart.id },
		include: {
			items: {
				include: {
					productListing: {
						select: {
							id: true,
							productId: true,
							sellingPrice: true,
							isActive: true,
							product: {
								select: {
									isActive: true,
									name: true,
									sku: true,
								},
							},
						},
					},
				},
			},
		},
	});

	if (!lockedCart || lockedCart.items.length === 0) {
		throw new EcommerceError(400, "Cart is empty");
	}

	let totalAmount = 0;
	for (const item of lockedCart.items) {
		if (!item.productListing.isActive || !item.productListing.product.isActive) {
			throw new EcommerceError(400, "One or more products in cart are inactive");
		}

		const availableStock = await getAvailableStockForProduct(tx, organizationId, item.productListing.productId);
		if (item.quantity > availableStock) {
			throw new EcommerceError(400, "Insufficient stock for one or more cart items");
		}

		totalAmount += Number(item.unitPrice) * item.quantity;
	}

	const order = await tx.order.create({
		data: {
			organizationId,
			storeId,
			customerId,
			status: "PENDING",
			paymentStatus: "UNPAID",
			totalAmount: toMoney(totalAmount),
			currency: lockedCart.currency || "INR",
			exchangeRate: Number(lockedCart.exchangeRate || 1),
			baseCurrencyAmount: toMoney(totalAmount * Number(lockedCart.exchangeRate || 1)),
			items: {
				create: lockedCart.items.map((item) => ({
					productListingId: item.productListingId,
					quantity: item.quantity,
					unitPrice: item.unitPrice,
				})),
			},
		},
		include: {
			items: {
				include: {
					productListing: {
						include: {
							product: {
								select: {
									id: true,
									name: true,
									sku: true,
								},
							},
						},
					},
				},
			},
		},
	});

	for (const item of lockedCart.items) {
		const warehouseId = await resolveWarehouseForQuantity(tx, organizationId, item.productListing.productId, item.quantity);

		await reduceStockWithDb(
			tx,
			organizationId,
			item.productListing.productId,
			warehouseId,
			item.quantity,
			order.id,
			"D2C Checkout stock deduction",
		);
	}

	await createTransactionWithEntries(
		organizationId,
		"SALE",
		`D2C-ORDER-${order.id}`,
		[
			{ ledgerAccountId: receivableLedgerId, debit: toMoney(totalAmount) },
			{ ledgerAccountId: revenueLedgerId, credit: toMoney(totalAmount) },
		],
		{
			contactId: customerId,
			totalAmount: toMoney(totalAmount),
			status: "POSTED",
			tx,
		},
	);

	await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

	return order;
};

export const checkoutCart = async (
	organizationId: string,
	storeId: string,
	customerId: string,
	defaultWarehouseId?: string,
	actor?: EcommerceActor,
) => {
	void defaultWarehouseId;
	await ensureOrganization(organizationId);
	await ensureStoreAccessForActor(storeId, organizationId, actor, true);
	await ensureCustomerInOrg(customerId, organizationId);

	const { receivableLedgerId, revenueLedgerId } = await getAccountingLedgers(organizationId);

	return prisma.$transaction((tx) =>
		checkoutStoreCartInternal(tx, organizationId, storeId, customerId, receivableLedgerId, revenueLedgerId),
	);
};

export const checkout = async (organizationId: string, customerId: string) => {
	await ensureOrganization(organizationId);
	await ensureCustomerInOrg(customerId, organizationId);
	const store = await getStoreByOrganization(organizationId);

	const { receivableLedgerId, revenueLedgerId } = await getAccountingLedgers(organizationId);

	return prisma.$transaction((tx) =>
		checkoutStoreCartInternal(tx, organizationId, store.id, customerId, receivableLedgerId, revenueLedgerId),
	);
};

export const checkoutMarketplace = async (organizationId: string, customerId: string) => {
	await ensureOrganization(organizationId);
	await ensureCustomerInOrg(customerId, organizationId);

	const carts = await prisma.cart.findMany({
		where: {
			organizationId,
			customerId,
		},
		select: {
			storeId: true,
			items: {
				select: { id: true },
			},
		},
	});

	const targetStoreIds = carts.filter((cart) => cart.items.length > 0).map((cart) => cart.storeId);
	if (targetStoreIds.length === 0) {
		throw new EcommerceError(400, "Cart is empty");
	}

	const { receivableLedgerId, revenueLedgerId } = await getAccountingLedgers(organizationId);

	const orders = await prisma.$transaction(async (tx) => {
		const createdOrders = [];
		for (const storeId of targetStoreIds) {
			const order = await checkoutStoreCartInternal(
				tx,
				organizationId,
				storeId,
				customerId,
				receivableLedgerId,
				revenueLedgerId,
			);
			createdOrders.push(order);
		}

		return createdOrders;
	});

	return {
		customerId,
		storeCount: orders.length,
		orderCount: orders.length,
		totalAmount: toMoney(orders.reduce((sum, order) => sum + Number(order.totalAmount), 0)),
		orders,
	};
};

export const createOrder = async (organizationId: string, input: CreateOrderInput, actor?: EcommerceActor) => {
	await ensureOrganization(organizationId);
	await ensureStoreAccessForActor(input.storeId, organizationId, actor, true);
	await ensureCustomerInOrg(input.customerId, organizationId);

	const currency = input.currency || "INR";

	if (!Array.isArray(input.items) || input.items.length === 0) {
		throw new EcommerceError(400, "items must be a non-empty array");
	}

	for (const item of input.items) {
		if (!item.productListingId?.trim()) {
			throw new EcommerceError(400, "productListingId is required for each item");
		}

		if (!item.warehouseId?.trim()) {
			throw new EcommerceError(400, "warehouseId is required for each item");
		}

		if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
			throw new EcommerceError(400, "quantity must be a positive integer");
		}
	}

	const listingIds = input.items.map((x) => x.productListingId);
	const listings = await prisma.productListing.findMany({
		where: {
			id: { in: listingIds },
			organizationId,
			storeId: input.storeId,
			isActive: true,
		},
		select: {
			id: true,
			productId: true,
			sellingPrice: true,
			baseCurrency: true,
			multiCurrencyPrices: true,
			product: {
				select: {
					name: true,
					sku: true,
				},
			},
		},
	});

	if (listings.length !== input.items.length) {
		throw new EcommerceError(400, "Some product listings are invalid/inactive or do not belong to this store");
	}

	const listingMap = new Map(listings.map((x) => [x.id, x]));

	// Get exchange rate if currency is different from base
	let exchangeRate = 1;
	if (currency !== "INR") {
		try {
			exchangeRate = await getExchangeRate(organizationId, currency, "INR");
		} catch (error) {
			throw new EcommerceError(400, `Currency ${currency} is not supported`);
		}
	}

	let totalAmount = 0;
	const orderItemsData = input.items.map((item) => {
		const listing = listingMap.get(item.productListingId);
		if (!listing) {
			throw new EcommerceError(400, "Invalid product listing in order items");
		}

		let unitPrice = Number(listing.sellingPrice);
		
		// Use multi-currency price if available
		if (currency !== "INR" && listing.multiCurrencyPrices) {
			try {
				const prices = JSON.parse(listing.multiCurrencyPrices);
				if (prices[currency]) {
					unitPrice = prices[currency];
				}
			} catch (e) {
				// Fall back to conversion if parsing fails
			}
		}
		
		totalAmount += unitPrice * item.quantity;

		return {
			productListingId: listing.id,
			quantity: item.quantity,
			unitPrice: toMoney(unitPrice),
			warehouseId: item.warehouseId,
			productId: listing.productId,
		};
	});

	const { receivableLedgerId, revenueLedgerId } = await getAccountingLedgers(organizationId);

	// Calculate base currency amount
	const baseCurrencyAmount = toMoney(totalAmount * exchangeRate);

	return prisma.$transaction(async (tx) => {
		for (const item of orderItemsData) {
			await reduceStockWithDb(
				tx,
				organizationId,
				item.productId,
				item.warehouseId,
				item.quantity,
				undefined,
				`D2C Order stock deduction`,
			);
		}

		const order = await tx.order.create({
			data: {
				organizationId,
				storeId: input.storeId,
				customerId: input.customerId,
				status: "PENDING",
				paymentStatus: "UNPAID",
				totalAmount: toMoney(totalAmount),
				currency,
				exchangeRate,
				baseCurrencyAmount,
				items: {
					create: orderItemsData.map((item) => ({
						productListingId: item.productListingId,
						quantity: item.quantity,
						unitPrice: item.unitPrice,
					})),
				},
			},
			include: {
				items: {
					include: {
						productListing: {
							include: {
								product: {
									select: {
										id: true,
										name: true,
										sku: true,
									},
								},
							},
						},
					},
				},
			},
		});

		await createTransactionWithEntries(
			organizationId,
			"SALE",
			`D2C-ORDER-${order.id}`,
			[
				{ ledgerAccountId: receivableLedgerId, debit: baseCurrencyAmount },
				{ ledgerAccountId: revenueLedgerId, credit: baseCurrencyAmount },
			],
			{
				contactId: input.customerId,
				totalAmount: baseCurrencyAmount,
				status: "POSTED",
				tx,
			},
		);

		// Apply trust-based order hold/release logic
		const holdDecision = await decideOrderHold(organizationId, input.storeId, baseCurrencyAmount);
		if (holdDecision.shouldHold) {
			await applyOrderHold(order.id, holdDecision);
		} else {
			// For non-held orders, still track seller tier for future reference
			await tx.order.update({
				where: { id: order.id },
				data: { sellerTrustTier: holdDecision.sellerTier },
			});
		}

		return order;
	});
};

export const listOrders = async (organizationId: string, storeId: string, actor?: EcommerceActor) => {
	await ensureOrganization(organizationId);
	await ensureStoreAccessForActor(storeId, organizationId, actor);

	return prisma.order.findMany({
		where: {
			organizationId,
			storeId,
		},
		include: {
			customer: {
				select: {
					id: true,
					firstName: true,
					lastName: true,
					companyName: true,
					email: true,
				},
			},
			items: {
				include: {
					productListing: {
						include: {
							product: {
								select: {
									id: true,
									name: true,
									sku: true,
								},
							},
						},
					},
				},
			},
		},
		orderBy: {
			createdAt: "desc",
		},
	});
};

export const updateOrderStatus = async (
	organizationId: string,
	orderId: string,
	status: string,
	paymentStatus?: string,
) => {
	await ensureOrganization(organizationId);
	const normalizedStatus = status.trim().toUpperCase();
	const allowedStatuses = ["PENDING", "PAID", "PACKED", "SHIPPED", "DELIVERED", "CANCELLED"] as const;

	if (!allowedStatuses.includes(normalizedStatus as (typeof allowedStatuses)[number])) {
		throw new EcommerceError(400, "Invalid order status");
	}

	const order = await prisma.order.findUnique({
		where: { id: orderId },
		select: { id: true, organizationId: true, status: true, paymentStatus: true, totalAmount: true, customerId: true },
	});

	if (!order) {
		throw new EcommerceError(404, "Order not found");
	}

	if (order.organizationId !== organizationId) {
		throw new EcommerceError(403, "Order does not belong to this organization");
	}

	const transitionMap: Record<string, string[]> = {
		PENDING: ["PAID", "CANCELLED"],
		PAID: ["PACKED", "CANCELLED"],
		PACKED: ["SHIPPED", "CANCELLED"],
		SHIPPED: ["DELIVERED"],
		DELIVERED: [],
		CANCELLED: [],
	};

	const currentStatus = order.status.toUpperCase();
	if (currentStatus !== normalizedStatus && !transitionMap[currentStatus]?.includes(normalizedStatus)) {
		throw new EcommerceError(400, `Invalid status transition from ${order.status} to ${normalizedStatus}`);
	}

	if (normalizedStatus === "CANCELLED" && currentStatus !== "CANCELLED") {
		const { receivableLedgerId, revenueLedgerId } = await getAccountingLedgers(organizationId);

		return prisma.$transaction(async (tx) => {
			const saleMovements = await tx.stockMovement.findMany({
				where: {
					referenceId: order.id,
					type: "SALE",
					quantity: {
						lt: 0,
					},
				},
				select: {
					productId: true,
					warehouseId: true,
					quantity: true,
				},
			});

			if (saleMovements.length === 0) {
				throw new EcommerceError(400, "Order cannot be cancelled because no stock deduction records were found");
			}

			for (const movement of saleMovements) {
				const restoreQuantity = Math.abs(movement.quantity);

				await tx.stockItem.upsert({
					where: {
						productId_warehouseId: {
							productId: movement.productId,
							warehouseId: movement.warehouseId,
						},
					},
					update: {
						quantity: { increment: restoreQuantity },
					},
					create: {
						productId: movement.productId,
						warehouseId: movement.warehouseId,
						quantity: restoreQuantity,
					},
				});

				await tx.stockMovement.create({
					data: {
						organizationId,
						productId: movement.productId,
						warehouseId: movement.warehouseId,
						type: "ADJUSTMENT",
						quantity: restoreQuantity,
						referenceId: order.id,
						notes: "D2C order cancellation stock restore",
					},
				});
			}

			await createTransactionWithEntries(
				organizationId,
				"REFUND",
				`D2C-ORDER-CANCEL-${order.id}`,
				[
					{ ledgerAccountId: revenueLedgerId, debit: Number(order.totalAmount) },
					{ ledgerAccountId: receivableLedgerId, credit: Number(order.totalAmount) },
				],
				{
					contactId: order.customerId,
					totalAmount: Number(order.totalAmount),
					status: "POSTED",
					tx,
				},
			);

			const updatedCancelledOrder = await tx.order.update({
				where: { id: orderId },
				data: {
					status: normalizedStatus,
					paymentStatus:
						paymentStatus?.trim() ??
						(order.paymentStatus.toUpperCase() === "PAID" ? "REFUNDED" : "CANCELLED"),
				},
			});

			void notifyMarketplaceWebhook(updatedCancelledOrder);
			return updatedCancelledOrder;
		});
	}

	const updatedOrder = await prisma.order.update({
		where: { id: orderId },
		data: {
			status: normalizedStatus,
			paymentStatus: paymentStatus ?? undefined,
		},
	});

	void notifyMarketplaceWebhook(updatedOrder);
	return updatedOrder;
};

export const notifyMarketplaceWebhook = async (order: {
	id: string;
	status: string;
	storeId?: string | null;
	totalAmount?: any;
}) => {
	const webhookUrl = process.env.MARKETPLACE_WEBHOOK_URL;
	if (!webhookUrl) {
		return;
	}

	try {
		const targetUrl = `${webhookUrl.replace(/\/+$/, "")}/api/webhooks/order-status`;
		const secret = process.env.WEBHOOK_SECRET || "";

		await fetch(targetUrl, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-Webhook-Secret": secret,
			},
			body: JSON.stringify({
				orderId: order.id,
				status: order.status.toLowerCase(),
				storeId: order.storeId ?? undefined,
				totalAmount: order.totalAmount ? Number(order.totalAmount) : undefined,
				updatedAt: new Date().toISOString(),
			}),
		});
	} catch (error) {
		console.warn("Marketplace webhook notification failed:", error);
	}
};

export const createPaymentOrder = async (organizationId: string, orderId: string) => {
	await ensureOrganization(organizationId);

	const order = await prisma.order.findUnique({
		where: { id: orderId },
		select: {
			id: true,
			organizationId: true,
			totalAmount: true,
			paymentStatus: true,
			customerId: true,
			customer: {
				select: {
					email: true,
					firstName: true,
					lastName: true,
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

	if (order.paymentStatus !== "UNPAID") {
		throw new EcommerceError(400, "Order payment already processed or not in correct state");
	}

	try {
		const razorpayOrder = (await (getRazorpay().orders.create as any)({
			amount: Math.round(Number(order.totalAmount) * 100),
			currency: "INR",
			receipt: order.id,
		})) as any;

		await prisma.order.update({
			where: { id: orderId },
			data: {
				razorpayOrderId: razorpayOrder.id,
			},
		});

		return {
			orderId: order.id,
			razorpayOrderId: razorpayOrder.id,
			amount: Number(order.totalAmount),
			currency: "INR",
			customerName: `${order.customer.firstName} ${order.customer.lastName}`.trim(),
			customerEmail: order.customer.email,
			description: `Payment for Order ${order.id}`,
		};
	} catch (error: any) {
		throw new EcommerceError(500, `Razorpay error: ${error.message}`);
	}
};

export interface VerifyPaymentInput {
	razorpayOrderId: string;
	razorpayPaymentId: string;
	razorpaySignature: string;
}

export const verifyPaymentWebhook = async (
	organizationId: string,
	input: VerifyPaymentInput,
) => {
	await ensureOrganization(organizationId);

	const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = input;

	if (!razorpayOrderId?.trim() || !razorpayPaymentId?.trim() || !razorpaySignature?.trim()) {
		throw new EcommerceError(400, "Payment verification parameters missing");
	}

	const keySecret = getRazorpayKeySecret();
	const hmac = crypto.createHmac("sha256", keySecret);
	hmac.update(`${razorpayOrderId}|${razorpayPaymentId}`);
	const generatedSignature = hmac.digest("hex");

	if (generatedSignature !== razorpaySignature) {
		throw new EcommerceError(401, "Payment signature verification failed");
	}

	const order = await prisma.order.findFirst({
		where: {
			organizationId,
			razorpayOrderId,
			paymentStatus: "UNPAID",
		},
		select: {
			id: true,
			totalAmount: true,
			customerId: true,
		},
	});

	if (!order) {
		throw new EcommerceError(404, "Order not found or already processed");
	}

	const existingPayment = await prisma.order.findFirst({
		where: {
			razorpayPaymentId,
			paymentStatus: "PAID",
		},
		select: { id: true },
	});

	if (existingPayment) {
		throw new EcommerceError(409, "Payment already processed (replay attack prevented)");
	}

	const { receivableLedgerId } = await getAccountingLedgers(organizationId);
	const cashLedger = await prisma.ledgerAccount.findFirst({
		where: {
			organizationId,
			name: "Cash",
		},
		select: { id: true },
	});

	if (!cashLedger) {
		throw new EcommerceError(500, "Cash ledger account not found");
	}

	return prisma.$transaction(async (tx) => {
		const updatedOrder = await tx.order.update({
			where: { id: order.id },
			data: {
				paymentStatus: "PAID",
				status: "PAID",
				razorpayPaymentId,
			},
			include: {
				items: {
					include: {
						productListing: {
							include: {
								product: {
									select: {
										id: true,
										name: true,
										sku: true,
									},
								},
							},
						},
					},
				},
			},
		});

		await createTransactionWithEntries(
			organizationId,
			"PAYMENT",
			`D2C-PAYMENT-${order.id}`,
			[
				{
					ledgerAccountId: cashLedger.id,
					debit: Number(order.totalAmount),
				},
				{
					ledgerAccountId: receivableLedgerId,
					credit: Number(order.totalAmount),
				},
			],
			{
				contactId: order.customerId,
				totalAmount: Number(order.totalAmount),
				status: "POSTED",
				tx,
			},
		);

		// Auto-create invoice for ecommerce order
		try {
			await createInvoiceFromEcommerceOrder(organizationId, order.id, { tx });
		} catch (invoiceError: any) {
			// Log but don't fail the order if invoice creation fails
			console.error(`Failed to create invoice for order ${order.id}:`, invoiceError.message);
		}

		return updatedOrder;
	});
};
// ========== FULFILLMENT ENGINE ==========

export const markAsPacked = async (organizationId: string, orderId: string) => {
	const order = await prisma.order.findUnique({
		where: { id: orderId },
		select: {
			id: true,
			organizationId: true,
			status: true,
			paymentStatus: true,
			totalAmount: true,
			items: true,
		},
	});

	if (!order) {
		throw new EcommerceError(404, "Order not found");
	}

	if (order.organizationId !== organizationId) {
		throw new EcommerceError(403, "Order does not belong to this organization");
	}

	if (order.paymentStatus !== "PAID") {
		throw new EcommerceError(400, "Order payment not completed. Cannot pack unpaid order.");
	}

	if (order.status !== "PAID") {
		throw new EcommerceError(400, `Order status must be PAID to pack. Current status: ${order.status}`);
	}

	const packed = await prisma.order.update({
		where: { id: orderId },
		data: {
			status: "PACKED",
			packedAt: new Date(),
		},
		include: { items: true },
	});

	return packed;
};

export const markAsShipped = async (
	organizationId: string,
	orderId: string,
	trackingNumber: string,
	courierPartner: string,
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
		throw new EcommerceError(400, `Order must be PACKED to ship. Current status: ${order.status}`);
	}

	const shipped = await prisma.order.update({
		where: { id: orderId },
		data: {
			status: "SHIPPED",
			shippedAt: new Date(),
			trackingNumber,
			courierPartner,
		},
		include: { items: true },
	});

	return shipped;
};

export const markAsDelivered = async (organizationId: string, orderId: string) => {
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

	if (order.status !== "SHIPPED") {
		throw new EcommerceError(400, `Order must be SHIPPED to deliver. Current status: ${order.status}`);
	}

	const delivered = await prisma.order.update({
		where: { id: orderId },
		data: {
			status: "DELIVERED",
			deliveredAt: new Date(),
		},
		include: { items: true },
	});

	return delivered;
};

export const cancelOrder = async (organizationId: string, orderId: string) => {
	const order = await prisma.order.findUnique({
		where: { id: orderId },
		include: {
			items: {
				include: {
					productListing: {
						include: {
							product: true,
						},
					},
				},
			},
			store: true,
			customer: true,
		},
	});

	if (!order) {
		throw new EcommerceError(404, "Order not found");
	}

	if (order.organizationId !== organizationId) {
		throw new EcommerceError(403, "Order does not belong to this organization");
	}

	// Business rules: Cannot cancel if already shipped
	if (order.status === "SHIPPED" || order.status === "DELIVERED") {
		throw new EcommerceError(
			400,
			`Cannot cancel order in ${order.status} state. Use return flow instead.`,
		);
	}

	// If order is already cancelled or returned, cannot cancel again
	if (order.status === "CANCELLED" || order.status === "REFUNDED") {
		throw new EcommerceError(400, `Order already in ${order.status} state`);
	}

	return await prisma.$transaction(async (tx) => {
		// 1. Restore stock for all items
		for (const item of order.items) {
			const warehouse = await tx.warehouse.findFirst({
				where: { organizationId },
				select: { id: true },
			});

			if (warehouse) {
				await tx.stockItem.upsert({
					where: {
						productId_warehouseId: {
							productId: item.productListing.product.id,
							warehouseId: warehouse.id,
						},
					},
					update: {
						quantity: {
							increment: item.quantity,
						},
					},
					create: {
						productId: item.productListing.product.id,
						warehouseId: warehouse.id,
						quantity: item.quantity,
					},
				});
			}
		}

		// 2. If order was PAID, reverse accounting entries
		if (order.paymentStatus === "PAID") {
			// Find the original SALE transaction
			const originalSale = await tx.transaction.findFirst({
				where: {
					organizationId,
					type: "SALE",
					referenceNumber: `D2C-ORDER-${order.id}`,
				},
				include: {
					journalEntries: {
						include: {
							ledgerAccount: true,
						},
					},
				},
			});

			if (originalSale) {
				// Get Revenue and AR ledgers
				const revenueLedger = await tx.ledgerAccount.findFirst({
					where: { organizationId, name: "Revenue" },
					select: { id: true },
				});

				const arLedger = await tx.ledgerAccount.findFirst({
					where: { organizationId, name: "Accounts Receivable" },
					select: { id: true },
				});

				if (revenueLedger && arLedger) {
					// Create reversal transaction: Dr AR / Cr Revenue
					await tx.transaction.create({
						data: {
							organizationId,
							type: "REFUND",
							referenceNumber: `D2C-CANCEL-${order.id}`,
							totalAmount: Number(order.totalAmount),
							status: "POSTED",
							transactionDate: new Date(),
							journalEntries: {
								create: [
									{
										ledgerAccountId: arLedger.id,
										debit: Number(order.totalAmount),
										credit: null,
									},
									{
										ledgerAccountId: revenueLedger.id,
										debit: null,
										credit: Number(order.totalAmount),
									},
								],
							},
						},
					});
				}
			}
		}

		// 3. Mark order as CANCELLED and mark refunded if it was paid
		const cancelled = await tx.order.update({
			where: { id: orderId },
			data: {
				status: "CANCELLED",
				isRefunded: order.paymentStatus === "PAID",
			},
			include: { items: true },
		});

		return cancelled;
	});
};

export interface ReturnRequestItemInput {
	orderItemId: string;
	quantity: number;
}

export interface RequestReturnInput {
	orderId: string;
	items: ReturnRequestItemInput[];
	reason?: string;
}

const RETURN_WINDOW_DAYS = 7;

const computeRefundAmount = (
	items: Array<{ quantity: number; orderItem: { unitPrice: Prisma.Decimal | number } }>,
) => {
	const amount = items.reduce((total, item) => {
		return total + Number(item.orderItem.unitPrice) * item.quantity;
	}, 0);

	return toMoney(amount);
};

export const requestReturn = async (organizationId: string, input: RequestReturnInput) => {
	if (!input.orderId?.trim()) {
		throw new EcommerceError(400, "orderId is required");
	}

	if (!Array.isArray(input.items) || input.items.length === 0) {
		throw new EcommerceError(400, "At least one return item is required");
	}

	const normalizedItems = new Map<string, number>();
	for (const item of input.items) {
		if (!item.orderItemId?.trim() || !Number.isInteger(item.quantity) || item.quantity <= 0) {
			throw new EcommerceError(400, "Each return item must include a valid orderItemId and quantity > 0");
		}

		normalizedItems.set(
			item.orderItemId.trim(),
			(normalizedItems.get(item.orderItemId.trim()) ?? 0) + item.quantity,
		);
	}

	const order = await prisma.order.findUnique({
		where: { id: input.orderId.trim() },
		select: {
			id: true,
			organizationId: true,
			status: true,
			paymentStatus: true,
			deliveredAt: true,
			items: {
				select: {
					id: true,
					quantity: true,
				},
			},
			returnRequests: {
				select: {
					id: true,
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

	if (order.status !== "DELIVERED") {
		throw new EcommerceError(400, `Only DELIVERED orders can be returned. Current status: ${order.status}`);
	}

	if (order.paymentStatus !== "PAID") {
		throw new EcommerceError(400, "Only PAID orders are eligible for returns");
	}

	if (!order.deliveredAt) {
		throw new EcommerceError(400, "deliveredAt is missing for this order");
	}

	const returnWindowStart = new Date();
	returnWindowStart.setDate(returnWindowStart.getDate() - RETURN_WINDOW_DAYS);
	if (order.deliveredAt < returnWindowStart) {
		throw new EcommerceError(400, `Return window exceeded. Allowed within ${RETURN_WINDOW_DAYS} days`);
	}

	if (order.returnRequests.length > 0) {
		throw new EcommerceError(409, "Return request already exists for this order");
	}

	const orderItemsById = new Map(order.items.map((item) => [item.id, item]));
	for (const [orderItemId, quantity] of normalizedItems.entries()) {
		const orderItem = orderItemsById.get(orderItemId);
		if (!orderItem) {
			throw new EcommerceError(400, `orderItemId ${orderItemId} does not belong to this order`);
		}

		if (quantity > orderItem.quantity) {
			throw new EcommerceError(
				400,
				`Return quantity exceeds delivered quantity for order item ${orderItemId}`,
			);
		}
	}

	return prisma.$transaction(async (tx) => {
		const returnRequest = await tx.returnRequest.create({
			data: {
				organizationId,
				orderId: order.id,
				reason: input.reason?.trim(),
				status: "REQUESTED",
				items: {
					create: Array.from(normalizedItems.entries()).map(([orderItemId, quantity]) => ({
						orderItemId,
						quantity,
					})),
				},
			},
			include: {
				items: true,
			},
		});

		await tx.order.update({
			where: { id: order.id },
			data: {
				status: "RETURN_REQUESTED",
			},
		});

		return returnRequest;
	});
};

export interface InspectReturnInput {
	returnRequestId: string;
	outcome: "APPROVE" | "REJECT";
	notes?: string;
	rejectionReason?: string;
}

export const inspectReturn = async (organizationId: string, input: InspectReturnInput) => {
	if (!input.returnRequestId?.trim()) {
		throw new EcommerceError(400, "returnRequestId is required");
	}

	if (!["APPROVE", "REJECT"].includes(input.outcome)) {
		throw new EcommerceError(400, "outcome must be APPROVE or REJECT");
	}

	if (input.outcome === "REJECT" && !input.rejectionReason?.trim()) {
		throw new EcommerceError(400, "rejectionReason is required for rejected inspections");
	}

	const returnRequest = await prisma.returnRequest.findUnique({
		where: { id: input.returnRequestId.trim() },
		include: {
			order: {
				select: {
					id: true,
					organizationId: true,
					paymentStatus: true,
				},
			},
			items: {
				include: {
					orderItem: {
						include: {
							productListing: {
								select: {
									productId: true,
								},
							},
						},
					},
				},
			},
		},
	});

	if (!returnRequest) {
		throw new EcommerceError(404, "Return request not found");
	}

	if (returnRequest.organizationId !== organizationId || returnRequest.order.organizationId !== organizationId) {
		throw new EcommerceError(403, "Return request does not belong to this organization");
	}

	if (returnRequest.status !== "REQUESTED") {
		throw new EcommerceError(
			400,
			`Only REQUESTED returns can be inspected. Current status: ${returnRequest.status}`,
		);
	}

	if (returnRequest.order.paymentStatus !== "PAID") {
		throw new EcommerceError(400, "Only PAID orders are eligible for inspection and refund");
	}

	const expectedRefundAmount = computeRefundAmount(returnRequest.items);

	return prisma.$transaction(async (tx) => {
		if (input.outcome === "REJECT") {
			const rejected = await tx.returnRequest.update({
				where: { id: returnRequest.id },
				data: {
					status: "RETURN_REJECTED",
					inspectedAt: new Date(),
					inspectionOutcome: "REJECTED",
					inspectionNotes: input.notes?.trim(),
					rejectedAt: new Date(),
					rejectionReason: input.rejectionReason?.trim(),
				},
				include: {
					items: true,
				},
			});

			await tx.order.update({
				where: { id: returnRequest.orderId },
				data: {
					status: "DELIVERED",
				},
			});

			return {
				returnRequest: rejected,
				expectedRefundAmount,
			};
		}

		const warehouse = await tx.warehouse.findFirst({
			where: { organizationId },
			select: { id: true },
		});

		if (!warehouse) {
			throw new EcommerceError(400, "No warehouse found for inventory restock");
		}

		for (const item of returnRequest.items) {
			await tx.stockItem.upsert({
				where: {
					productId_warehouseId: {
						productId: item.orderItem.productListing.productId,
						warehouseId: warehouse.id,
					},
				},
				update: {
					quantity: {
						increment: item.quantity,
					},
				},
				create: {
					productId: item.orderItem.productListing.productId,
					warehouseId: warehouse.id,
					quantity: item.quantity,
				},
			});
		}

		const approved = await tx.returnRequest.update({
			where: { id: returnRequest.id },
			data: {
				status: "RETURN_APPROVED",
				approvedAt: new Date(),
				inspectedAt: new Date(),
				inspectionOutcome: "APPROVED",
				inspectionNotes: input.notes?.trim(),
			},
			include: {
				items: {
					include: {
						orderItem: true,
					},
				},
			},
		});

		await tx.order.update({
			where: { id: returnRequest.orderId },
			data: {
				status: "RETURN_APPROVED",
			},
		});

		return {
			returnRequest: approved,
			expectedRefundAmount,
		};
	});
};

export const approveReturn = async (organizationId: string, returnRequestId: string) => {
	if (!returnRequestId?.trim()) {
		throw new EcommerceError(400, "returnRequestId is required");
	}

	return inspectReturn(organizationId, {
		returnRequestId,
		outcome: "APPROVE",
	});
};

export interface ProcessRefundInput {
	returnRequestId: string;
	refundAmount?: number;
}

const getRefundedAmountForOrder = async (
	orderId: string,
	excludeReturnRequestId?: string,
) => {
	const requests = await prisma.returnRequest.findMany({
		where: {
			orderId,
			status: "REFUNDED",
			...(excludeReturnRequestId
				? {
					NOT: {
						id: excludeReturnRequestId,
					},
				}
				: {}),
		},
		select: {
			refundAmount: true,
		},
	});

	return toMoney(requests.reduce((sum, request) => sum + Number(request.refundAmount ?? 0), 0));
};

export const processRefund = async (organizationId: string, input: ProcessRefundInput | string) => {
	const payload: ProcessRefundInput =
		typeof input === "string" ? { returnRequestId: input } : input;

	if (!payload.returnRequestId?.trim()) {
		throw new EcommerceError(400, "returnRequestId is required");
	}

	const returnRequest = await prisma.returnRequest.findUnique({
		where: { id: payload.returnRequestId.trim() },
		include: {
			order: {
				select: {
					id: true,
					organizationId: true,
					customerId: true,
					paymentStatus: true,
					totalAmount: true,
					isRefunded: true,
					razorpayPaymentId: true,
				},
			},
			items: {
				include: {
					orderItem: {
						select: {
							unitPrice: true,
						},
					},
				},
			},
		},
	});

	if (!returnRequest) {
		throw new EcommerceError(404, "Return request not found");
	}

	if (returnRequest.organizationId !== organizationId || returnRequest.order.organizationId !== organizationId) {
		throw new EcommerceError(403, "Return request does not belong to this organization");
	}

	if (returnRequest.status === "REFUNDED" || returnRequest.refundedAt) {
		throw new EcommerceError(409, "This return request is already refunded");
	}

	if (returnRequest.status !== "RETURN_APPROVED" && returnRequest.status !== "RETURNED") {
		throw new EcommerceError(
			400,
			`Refund allowed only for RETURN_APPROVED/RETURNED requests. Current status: ${returnRequest.status}`,
		);
	}

	if (returnRequest.order.paymentStatus !== "PAID") {
		throw new EcommerceError(400, "Only PAID orders are refundable");
	}

	const maxRefundForRequest = computeRefundAmount(returnRequest.items);
	const refundAmount =
		typeof payload.refundAmount === "number" ? toMoney(payload.refundAmount) : maxRefundForRequest;

	if (refundAmount <= 0) {
		throw new EcommerceError(400, "Refund amount must be greater than 0");
	}

	if (refundAmount > maxRefundForRequest) {
		throw new EcommerceError(400, "Refund amount cannot exceed approved return amount");
	}

	if (refundAmount > Number(returnRequest.order.totalAmount)) {
		throw new EcommerceError(400, "Refund amount cannot exceed order value");
	}

	const alreadyRefundedAmount = await getRefundedAmountForOrder(returnRequest.orderId, returnRequest.id);

	if (toMoney(alreadyRefundedAmount + refundAmount) > Number(returnRequest.order.totalAmount)) {
		throw new EcommerceError(400, "Cumulative refund cannot exceed order value");
	}

	let gatewayRefundId: string | null = null;
	let gatewayRefundStatus = "MANUAL";
	if (returnRequest.order.razorpayPaymentId) {
		const refundResponse = await (getRazorpay().payments.refund as any)(
			returnRequest.order.razorpayPaymentId,
			{
				amount: Math.round(refundAmount * 100),
				notes: {
					returnRequestId: returnRequest.id,
					orderId: returnRequest.order.id,
				},
			},
		);
		gatewayRefundId = refundResponse?.id ?? null;
		gatewayRefundStatus = refundResponse?.status ?? "PROCESSED";
	}

	const totalRefundedAfterThis = toMoney(alreadyRefundedAmount + refundAmount);
	const isFullRefund = totalRefundedAfterThis >= Number(returnRequest.order.totalAmount);

	return prisma.$transaction(async (tx) => {
		const { revenueLedgerId, cashLedgerId } = await getRevenueAndCashLedgers(organizationId, tx);

		await createTransactionWithEntries(
			organizationId,
			"REFUND",
			`D2C-RETURN-REFUND-${returnRequest.id}`,
			[
				{
					ledgerAccountId: revenueLedgerId,
					debit: refundAmount,
				},
				{
					ledgerAccountId: cashLedgerId,
					credit: refundAmount,
				},
			],
			{
				contactId: returnRequest.order.customerId,
				totalAmount: refundAmount,
				status: "POSTED",
				tx,
			},
		);

		const refundedRequest = await tx.returnRequest.update({
			where: { id: returnRequest.id },
			data: {
				status: "REFUNDED",
				refundedAt: new Date(),
				refundAmount,
				gatewayRefundId,
				gatewayRefundStatus,
			},
			include: {
				items: {
					include: {
						orderItem: true,
					},
				},
			},
		});

		const order = await tx.order.update({
			where: { id: returnRequest.orderId },
			data: {
				status: isFullRefund ? "REFUNDED" : "RETURNED",
				paymentStatus: isFullRefund ? "REFUNDED" : "PAID",
				isRefunded: totalRefundedAfterThis > 0,
			},
		});

		return {
			returnRequest: refundedRequest,
			order,
			refundAmount,
			maxRefundForRequest,
			gatewayRefundId,
			gatewayRefundStatus,
		};
	});
};

export interface ReconcileGatewayRefundInput {
	returnRequestId: string;
	settledAmount: number;
	gatewayRefundId?: string;
	gatewayRefundStatus?: string;
}

export const reconcileGatewayRefund = async (
	organizationId: string,
	input: ReconcileGatewayRefundInput,
) => {
	if (!input.returnRequestId?.trim()) {
		throw new EcommerceError(400, "returnRequestId is required");
	}

	if (typeof input.settledAmount !== "number" || input.settledAmount <= 0) {
		throw new EcommerceError(400, "settledAmount must be greater than 0");
	}

	const returnRequest = await prisma.returnRequest.findUnique({
		where: { id: input.returnRequestId.trim() },
		include: {
			order: {
				select: {
					id: true,
					organizationId: true,
					customerId: true,
					totalAmount: true,
				},
			},
		},
	});

	if (!returnRequest) {
		throw new EcommerceError(404, "Return request not found");
	}

	if (returnRequest.organizationId !== organizationId || returnRequest.order.organizationId !== organizationId) {
		throw new EcommerceError(403, "Return request does not belong to this organization");
	}

	if (returnRequest.status !== "REFUNDED") {
		throw new EcommerceError(400, "Only REFUNDED requests can be reconciled");
	}

	const bookedAmount = Number(returnRequest.refundAmount ?? 0);
	if (bookedAmount <= 0) {
		throw new EcommerceError(400, "No booked refund amount found for reconciliation");
	}

	const settledAmount = toMoney(input.settledAmount);
	const alreadyRefundedOther = await getRefundedAmountForOrder(returnRequest.orderId, returnRequest.id);
	if (toMoney(alreadyRefundedOther + settledAmount) > Number(returnRequest.order.totalAmount)) {
		throw new EcommerceError(400, "Cumulative reconciled refund cannot exceed order value");
	}

	const delta = toMoney(settledAmount - bookedAmount);

	return prisma.$transaction(async (tx) => {
		const { revenueLedgerId, cashLedgerId } = await getRevenueAndCashLedgers(organizationId, tx);

		if (delta !== 0) {
			const absDelta = Math.abs(delta);
			const isAdditionalRefund = delta > 0;

			await createTransactionWithEntries(
				organizationId,
				"REFUND",
				`D2C-RETURN-RECON-${returnRequest.id}-${Date.now()}`,
				isAdditionalRefund
					? [
							{ ledgerAccountId: revenueLedgerId, debit: absDelta },
							{ ledgerAccountId: cashLedgerId, credit: absDelta },
						]
					: [
							{ ledgerAccountId: cashLedgerId, debit: absDelta },
							{ ledgerAccountId: revenueLedgerId, credit: absDelta },
						],
				{
					contactId: returnRequest.order.customerId,
					totalAmount: absDelta,
					status: "POSTED",
					tx,
				},
			);
		}

		const reconciledRequest = await tx.returnRequest.update({
			where: { id: returnRequest.id },
			data: {
				refundAmount: settledAmount,
				gatewayRefundId: input.gatewayRefundId?.trim() || returnRequest.gatewayRefundId,
				gatewayRefundStatus: input.gatewayRefundStatus?.trim() || "RECONCILED",
			},
		});

		const totalRefundedAfterReconciliation = toMoney(alreadyRefundedOther + settledAmount);
		const isFullRefund = totalRefundedAfterReconciliation >= Number(returnRequest.order.totalAmount);

		const order = await tx.order.update({
			where: { id: returnRequest.orderId },
			data: {
				status: isFullRefund ? "REFUNDED" : "RETURNED",
				paymentStatus: isFullRefund ? "REFUNDED" : "PAID",
				isRefunded: totalRefundedAfterReconciliation > 0,
			},
		});

		return {
			returnRequest: reconciledRequest,
			order,
			bookedAmount,
			settledAmount,
			delta,
		};
	});
};