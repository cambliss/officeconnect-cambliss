import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../../config/prisma";
import type { RoleName } from "@prisma/client";
import { getMyAccess } from "../user-management/user-management.service";
import { getOrganizationTrialReminderSnapshot } from "../subscription/subscription.service";
import { consumeVerifiedRegisterOtp, isMobileOtpEnabled } from "./mobile-otp.service";
import { isFirebaseOtpEnabled, verifyFirebasePhoneToken } from "./firebase-auth.service";

export class AuthError extends Error {
	statusCode: number;

	constructor(statusCode: number, message: string) {
		super(message);
		this.statusCode = statusCode;
		this.name = "AuthError";
	}
}

interface RegisterInput {
	email: string;
	password: string;
	firstName?: string;
	lastName?: string;
<<<<<<< HEAD
	organizationName: string;
	phone?: string;
	otpRequestId?: string;
	firebaseIdToken?: string;
=======
	organizationName?: string;
	storeName?: string;
>>>>>>> aa34278 (feat: Add Akaunting, Mercur multi-vendor engine, and WebRTC Video Connect dual party calling)
}

interface LoginInput {
	email: string;
	password: string;
}

interface UpdateOrganizationProfileInput {
	name?: string;
	legalName?: string;
	panNumber?: string;
	businessType?: string;
	supportEmail?: string;
	supportPhone?: string;
	addressLine1?: string;
	addressLine2?: string;
	city?: string;
	state?: string;
	pincode?: string;
	country?: string;
	settlementAccountHolderName?: string;
	settlementAccountNumber?: string;
	settlementIFSC?: string;
}

interface UpdateOrganizationOnboardingInput {
	profileCompleted?: boolean;
	paymentCardOnboarded?: boolean;
	preferredCurrency?: string;
	stackSelections?: Record<string, string>;
	onboardingPayload?: Record<string, unknown>;
}

type OrganizationOnboardingState = {
	organizationId: string;
	profileCompleted: boolean;
	paymentCardOnboarded: boolean;
	preferredCurrency: string;
	stackSelections: Record<string, string>;
	onboardingPayload: Record<string, unknown>;
	updatedAt: string;
};

const toSafeUser = (params: {
	id: string;
	email: string;
	firstName: string | null;
	lastName: string | null;
	organizationId: string;
	role: RoleName;
	accesses?: string[];
	phone?: string | null;
}) => {
	return {
		id: params.id,
		email: params.email,
		firstName: params.firstName,
		lastName: params.lastName,
		organizationId: params.organizationId,
		role: params.role,
		accesses: params.accesses ?? [],
		phone: params.phone ?? null,
	};
};

const PLATFORM_ORGANIZATION_ID = "platform";

const ensureOrganizationOnboardingTable = async () => {
	await prisma.$executeRawUnsafe(`
		CREATE TABLE IF NOT EXISTS "OrganizationOnboarding" (
			"organizationId" TEXT PRIMARY KEY REFERENCES "Organization"("id") ON DELETE CASCADE,
			"profileCompleted" BOOLEAN NOT NULL DEFAULT FALSE,
			"paymentCardOnboarded" BOOLEAN NOT NULL DEFAULT FALSE,
			"preferredCurrency" TEXT NOT NULL DEFAULT 'INR',
			"stackSelections" JSONB NOT NULL DEFAULT '{}'::jsonb,
			"onboardingPayload" JSONB NOT NULL DEFAULT '{}'::jsonb,
			"createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
			"updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
		);
	`);
};

const getJwtSecret = (): string => {
	const jwtSecret = process.env.JWT_SECRET;
	if (!jwtSecret) {
		throw new AuthError(500, "JWT_SECRET is not configured");
	}

	return jwtSecret;
};

const signAccessToken = (payload: {
	id: string;
	email: string;
	organizationId: string;
	role: RoleName;
}): string => {
	return jwt.sign(payload, getJwtSecret(), { expiresIn: "7d" });
};

export const generateSsoToken = (payload: {
	id: string;
	email: string;
	organizationId: string;
	role: RoleName;
}): string => {
	return signAccessToken(payload);
};

const getOrCreateRole = async (roleName: RoleName) => {
	const existing = await prisma.role.findUnique({
		where: {
			name: roleName,
		},
	});

	if (existing) {
		return existing;
	}

	return prisma.role.create({
		data: {
			name: roleName,
		},
	});
};

const ensureUserAccessProfileTable = async () => {
	await prisma.$executeRawUnsafe(`
		CREATE TABLE IF NOT EXISTS "UserAccessProfile" (
			"userId" TEXT PRIMARY KEY REFERENCES "User"("id") ON DELETE CASCADE,
			"organizationId" TEXT NOT NULL REFERENCES "Organization"("id") ON DELETE CASCADE,
			"phone" TEXT,
			"accesses" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
			"createdBy" TEXT REFERENCES "User"("id") ON DELETE SET NULL,
			"createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
			"updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
		);
	`);

	await prisma.$executeRawUnsafe(`
		CREATE INDEX IF NOT EXISTS "UserAccessProfile_org_idx"
		ON "UserAccessProfile"("organizationId");
	`);
};

export const register = async (input: RegisterInput) => {
	const email = input.email?.trim().toLowerCase();
	const password = input.password?.trim();
<<<<<<< HEAD
	const organizationName = input.organizationName?.trim();
	const phone = input.phone?.trim() || null;
	const otpRequestId = input.otpRequestId?.trim() || null;
	const firebaseIdToken = input.firebaseIdToken?.trim() || null;
=======
	const storeName = input.storeName?.trim();
	const organizationName = input.organizationName?.trim() || storeName;
>>>>>>> aa34278 (feat: Add Akaunting, Mercur multi-vendor engine, and WebRTC Video Connect dual party calling)

	if (!email) {
		throw new AuthError(400, "email is required");
	}

	if (!password || password.length < 6) {
		throw new AuthError(400, "password must be at least 6 characters");
	}

	if (!organizationName) {
		throw new AuthError(400, "organizationName or storeName is required");
	}


	await ensureUserAccessProfileTable();

	const existingUser = await prisma.user.findUnique({
		where: { email },
		select: { id: true },
	});

	if (existingUser) {
		throw new AuthError(409, "User with this email already exists");
	}

	const passwordHash = await bcrypt.hash(password, 10);

	const result = await prisma.$transaction(async (tx) => {
		const organization = await tx.organization.create({
			data: {
				name: organizationName,
			},
		});

		const adminRole = await getOrCreateRole("ADMIN");

		const user = await tx.user.create({
			data: {
				email,
				firstName: input.firstName?.trim() || null,
				lastName: input.lastName?.trim() || null,
				passwordHash,
				organizationId: organization.id,
			},
		});

		await tx.organizationUser.create({
			data: {
				organizationId: organization.id,
				userId: user.id,
				roleId: adminRole.id,
			},
		});

<<<<<<< HEAD
		await tx.$executeRawUnsafe(
			`
			INSERT INTO "UserAccessProfile" ("userId", "organizationId", "phone", "accesses", "createdBy", "createdAt", "updatedAt")
			VALUES ($1, $2, $3, ARRAY[]::TEXT[], $4, NOW(), NOW())
			`,
			user.id,
			organization.id,
			phone,
			user.id,
		);
=======
		let createdStore = null;
		if (storeName) {
			const sanitizeDomain = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
			const baseDomain = sanitizeDomain(storeName) || "store";
			const domain = `${baseDomain}-${Math.random().toString(36).substring(2, 7)}`;
			createdStore = await tx.store.create({
				data: {
					name: storeName,
					domain,
					organizationId: organization.id,
					ownerUserId: user.id,
				},
			});
		}
>>>>>>> aa34278 (feat: Add Akaunting, Mercur multi-vendor engine, and WebRTC Video Connect dual party calling)

		return {
			user,
			organization,
			store: createdStore,
			roleName: "ADMIN" as RoleName,
		};
	});

	const token = signAccessToken({
		id: result.user.id,
		email: result.user.email,
		organizationId: result.organization.id,
		role: result.roleName,
	});

	const safeUser = toSafeUser({
		id: result.user.id,
		email: result.user.email,
		firstName: result.user.firstName,
		lastName: result.user.lastName,
		organizationId: result.organization.id,
		role: result.roleName,
	});

	return {
		id: result.user.id,
		email: result.user.email,
		storeName: result.store?.name ?? storeName,
		token,
<<<<<<< HEAD
		user: toSafeUser({
			id: result.user.id,
			email: result.user.email,
			firstName: result.user.firstName,
			lastName: result.user.lastName,
			organizationId: result.organization.id,
			role: result.roleName,
			phone,
		}),
=======
		user: safeUser,
		organization: result.organization,
>>>>>>> aa34278 (feat: Add Akaunting, Mercur multi-vendor engine, and WebRTC Video Connect dual party calling)
	};
};

export const login = async (input: LoginInput) => {
	const email = input.email?.trim().toLowerCase();
	const password = input.password?.trim();

	if (!email || !password) {
		throw new AuthError(400, "email and password are required");
	}

	const user = await prisma.user.findUnique({
		where: { email },
		include: {
			memberships: {
				include: {
					role: true,
				},
				orderBy: {
					createdAt: "asc",
				},
			},
		},
	});

	if (!user) {
		throw new AuthError(401, "Invalid email or password");
	}

	const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
	if (!isPasswordValid) {
		throw new AuthError(401, "Invalid email or password");
	}

	const primaryMembership = user.memberships[0];
	const role = user.isPlatformUser
		? ("SUPER_ADMIN" as RoleName)
		: ((primaryMembership?.role?.name ?? "CLIENT") as RoleName);
	const organizationId = user.organizationId ?? primaryMembership?.organizationId;

	if (!organizationId && role !== "SUPER_ADMIN") {
		throw new AuthError(403, "User is not linked to any organization");
	}

	const resolvedOrganizationId = organizationId ?? PLATFORM_ORGANIZATION_ID;
	const myAccess = role === "SUPER_ADMIN"
		? { accesses: [], phone: null }
		: await getMyAccess(resolvedOrganizationId, user.id);

	if (role !== "SUPER_ADMIN") {
		const trialSnapshot = await getOrganizationTrialReminderSnapshot(resolvedOrganizationId);
		if (trialSnapshot.status === "EXPIRED") {
			throw new AuthError(403, "Trial period expired");
		}
	}

	const token = signAccessToken({
		id: user.id,
		email: user.email,
		organizationId: resolvedOrganizationId,
		role,
	});

	return {
		token,
		user: toSafeUser({
			id: user.id,
			email: user.email,
			firstName: user.firstName,
			lastName: user.lastName,
			organizationId: resolvedOrganizationId,
			role,
			accesses: myAccess.accesses,
			phone: myAccess.phone,
		}),
	};
};

export const getMe = async (userId: string) => {
	const user = await prisma.user.findUnique({
		where: { id: userId },
		include: {
			organization: true,
			memberships: {
				include: {
					role: true,
				},
				orderBy: {
					createdAt: "asc",
				},
			},
		},
	});

	if (!user) {
		throw new AuthError(404, "User not found");
	}

	const primaryMembership = user.memberships[0];
	const role = user.isPlatformUser
		? ("SUPER_ADMIN" as RoleName)
		: ((primaryMembership?.role?.name ?? "CLIENT") as RoleName);
	const organizationId = user.organizationId ?? primaryMembership?.organizationId;

	if (!organizationId && role !== "SUPER_ADMIN") {
		throw new AuthError(403, "User is not linked to any organization");
	}

	const resolvedOrganizationId = organizationId ?? PLATFORM_ORGANIZATION_ID;
	const myAccess = role === "SUPER_ADMIN"
		? { accesses: [], phone: null }
		: await getMyAccess(resolvedOrganizationId, user.id);

	return {
		user: toSafeUser({
			id: user.id,
			email: user.email,
			firstName: user.firstName,
			lastName: user.lastName,
			organizationId: resolvedOrganizationId,
			role,
			accesses: myAccess.accesses,
			phone: myAccess.phone,
		}),
		organization: user.organization,
	};
};

export const updateOrganizationProfile = async (
	organizationId: string,
	input: UpdateOrganizationProfileInput,
) => {
	const organization = await prisma.organization.findUnique({
		where: { id: organizationId },
		select: { id: true },
	});

	if (!organization) {
		throw new AuthError(404, "Organization not found");
	}

	const normalize = (value?: string) => {
		if (value === undefined) {
			return undefined;
		}

		const trimmed = value.trim();
		return trimmed.length > 0 ? trimmed : null;
	};

	const data: Record<string, string | null | undefined> = {
		legalName: normalize(input.legalName),
		panNumber: normalize(input.panNumber),
		businessType: normalize(input.businessType),
		supportEmail: normalize(input.supportEmail),
		supportPhone: normalize(input.supportPhone),
		addressLine1: normalize(input.addressLine1),
		addressLine2: normalize(input.addressLine2),
		city: normalize(input.city),
		state: normalize(input.state),
		pincode: normalize(input.pincode),
		country: normalize(input.country),
		settlementAccountHolderName: normalize(input.settlementAccountHolderName),
		settlementAccountNumber: normalize(input.settlementAccountNumber),
		settlementIFSC: normalize(input.settlementIFSC),
	};

	if (input.name !== undefined) {
		const trimmedName = input.name.trim();
		if (trimmedName.length > 0) {
			data.name = trimmedName;
		}
	}

	return prisma.organization.update({
		where: { id: organizationId },
		data,
	});
};

export const clearOrganizationProfile = async (organizationId: string) => {
	const organization = await prisma.organization.findUnique({
		where: { id: organizationId },
		select: { id: true },
	});

	if (!organization) {
		throw new AuthError(404, "Organization not found");
	}

	return prisma.organization.update({
		where: { id: organizationId },
		data: {
			legalName: null,
			panNumber: null,
			businessType: null,
			supportEmail: null,
			supportPhone: null,
			addressLine1: null,
			addressLine2: null,
			city: null,
			state: null,
			pincode: null,
			country: null,
			settlementAccountHolderName: null,
			settlementAccountNumber: null,
			settlementIFSC: null,
		},
	});
};

const defaultOnboardingState = (organizationId: string): OrganizationOnboardingState => ({
	organizationId,
	profileCompleted: false,
	paymentCardOnboarded: false,
	preferredCurrency: "INR",
	stackSelections: {},
	onboardingPayload: {},
	updatedAt: new Date(0).toISOString(),
});

export const getOrganizationOnboarding = async (organizationId: string): Promise<OrganizationOnboardingState> => {
	const organization = await prisma.organization.findUnique({
		where: { id: organizationId },
		select: { id: true },
	});

	if (!organization) {
		throw new AuthError(404, "Organization not found");
	}

	await ensureOrganizationOnboardingTable();

	const rows = await prisma.$queryRawUnsafe<Array<{
		organizationId: string;
		profileCompleted: boolean;
		paymentCardOnboarded: boolean;
		preferredCurrency: string;
		stackSelections: unknown;
		onboardingPayload: unknown;
		updatedAt: Date;
	}>>(
		`SELECT "organizationId", "profileCompleted", "paymentCardOnboarded", "preferredCurrency", "stackSelections", "onboardingPayload", "updatedAt"
		 FROM "OrganizationOnboarding" WHERE "organizationId" = $1`,
		organizationId,
	);

	if (!rows[0]) {
		return defaultOnboardingState(organizationId);
	}

	return {
		organizationId: rows[0].organizationId,
		profileCompleted: rows[0].profileCompleted,
		paymentCardOnboarded: rows[0].paymentCardOnboarded,
		preferredCurrency: rows[0].preferredCurrency || "INR",
		stackSelections:
			typeof rows[0].stackSelections === "object" && rows[0].stackSelections
				? (rows[0].stackSelections as Record<string, string>)
				: {},
		onboardingPayload:
			typeof rows[0].onboardingPayload === "object" && rows[0].onboardingPayload
				? (rows[0].onboardingPayload as Record<string, unknown>)
				: {},
		updatedAt: rows[0].updatedAt.toISOString(),
	};
};

export const updateOrganizationOnboarding = async (
	organizationId: string,
	input: UpdateOrganizationOnboardingInput,
): Promise<OrganizationOnboardingState> => {
	const organization = await prisma.organization.findUnique({
		where: { id: organizationId },
		select: { id: true },
	});

	if (!organization) {
		throw new AuthError(404, "Organization not found");
	}

	await ensureOrganizationOnboardingTable();

	const previous = await getOrganizationOnboarding(organizationId);
	const nextProfileCompleted = input.profileCompleted ?? previous.profileCompleted;
	const nextPaymentCardOnboarded = input.paymentCardOnboarded ?? previous.paymentCardOnboarded;
	const nextPreferredCurrency = (input.preferredCurrency ?? previous.preferredCurrency ?? "INR").toUpperCase();
	const nextStackSelections = input.stackSelections ?? previous.stackSelections;
	const nextPayload = {
		...previous.onboardingPayload,
		...(input.onboardingPayload ?? {}),
	};

	await prisma.$executeRawUnsafe(
		`INSERT INTO "OrganizationOnboarding"
			("organizationId", "profileCompleted", "paymentCardOnboarded", "preferredCurrency", "stackSelections", "onboardingPayload", "updatedAt")
		 VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, NOW())
		 ON CONFLICT ("organizationId")
		 DO UPDATE SET
			"profileCompleted" = EXCLUDED."profileCompleted",
			"paymentCardOnboarded" = EXCLUDED."paymentCardOnboarded",
			"preferredCurrency" = EXCLUDED."preferredCurrency",
			"stackSelections" = EXCLUDED."stackSelections",
			"onboardingPayload" = EXCLUDED."onboardingPayload",
			"updatedAt" = NOW()`,
		organizationId,
		nextProfileCompleted,
		nextPaymentCardOnboarded,
		nextPreferredCurrency,
		JSON.stringify(nextStackSelections ?? {}),
		JSON.stringify(nextPayload ?? {}),
	);

	return getOrganizationOnboarding(organizationId);
};

