"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import WorkspaceShell from "../../components/WorkspaceShell";

type AuthUser = {
	role?: string;
	accesses?: string[];
};

type ToolCard = {
	name: string;
	description: string;
	module: string;
	shortCode: string;
	href?: string;
	openInNewTab?: boolean;
	status?: "Ready" | "UI Pending";
};

const isAdminRole = (role?: string) => role === "ADMIN" || role === "SUPER_ADMIN";

const platformTools: ToolCard[] = [
	{
		name: "CRM",
		description: "Leads, contacts, deals and pipeline workflows",
		module: "CRM",
		shortCode: "CR",
		href: "/crm",
		status: "Ready",
	},
	{
		name: "HRM",
		description: "Employees, attendance, shifts and payroll",
		module: "HRM",
		shortCode: "HR",
		href: "/hrm",
		status: "Ready",
	},
	{
		name: "Inventory",
		description: "Stock, product movement and warehouse controls",
		module: "Inventory",
		shortCode: "IN",
		href: "/inventory",
		status: "Ready",
	},
	{
		name: "Ecommerce",
		description: "Seller Central onboarding, storefront setup, products and payment setup",
		module: "Ecommerce",
		shortCode: "EC",
		href: "/seller-central",
		openInNewTab: true,
		status: "Ready",
	},
	{
		name: "Mercur Marketplace",
		description: "Open-source multi-vendor marketplace engine for multi-merchant catalog, commissions & payouts",
		module: "Ecommerce",
		shortCode: "MC",
		href: "/mercur",
		status: "Ready",
	},
	{
		name: "Accounting",
		description: "Ledgers, transactions and account books",
		module: "Accounting",
		shortCode: "AC",
		href: "/accounting",
		status: "Ready",
	},
	{
		name: "Akaunting",
		description: "Open-source online accounting software for invoices, expenses, and financial tracking",
		module: "Accounting",
		shortCode: "AK",
		href: "/akaunting",
		status: "Ready",
	},
	{
		name: "Invoicing",
		description: "Invoice generation, tracking and settlement",
		module: "Invoicing",
		shortCode: "IV",
		status: "UI Pending",
	},
	{
		name: "GST",
		description: "GST configuration and tax compliance operations",
		module: "GST",
		shortCode: "GS",
		status: "UI Pending",
	},
	{
		name: "POS",
		description: "POS terminals, sessions and checkout operations",
		module: "POS",
		shortCode: "PS",
		status: "UI Pending",
	},
	{
		name: "AI Insights",
		description: "Analytics and AI-powered business insights",
		module: "AI",
		shortCode: "AI",
		status: "UI Pending",
	},
];

export default function ToolsPage() {
	const [authUser, setAuthUser] = useState<AuthUser | null>(null);

	useEffect(() => {
		const rawAuthUser = localStorage.getItem("authUser");
		if (!rawAuthUser) {
			setAuthUser(null);
			return;
		}

		try {
			setAuthUser(JSON.parse(rawAuthUser) as AuthUser);
		} catch {
			setAuthUser(null);
		}
	}, []);

	const headingText = useMemo(
		() => (isAdminRole(authUser?.role) ? "Admin Tool Stack" : "Business Tool Stack"),
		[authUser?.role],
	);

	const visibleTools = useMemo(() => {
		const accesses = Array.isArray(authUser?.accesses) ? authUser?.accesses : [];
		if (isAdminRole(authUser?.role) || accesses.length === 0) {
			return platformTools;
		}

		const moduleToAccess: Record<string, string> = {
			CRM: "CRM",
			HRM: "HRM",
			Inventory: "INVENTORY",
			Ecommerce: "ECOMMERCE",
		};

		return platformTools.filter((tool) => {
			const key = moduleToAccess[tool.module];
			if (!key) {
				return true;
			}
			return accesses.includes(key);
		});
	}, [authUser?.accesses, authUser?.role]);

	return (
		<WorkspaceShell>
			<div className="mt-5 rounded-2xl border border-zinc-200 bg-gradient-to-br from-white via-zinc-50 to-zinc-100 p-6 shadow-[0_28px_56px_-30px_rgba(0,0,0,0.85)] ring-1 ring-white/80">
				<h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Tools</h1>
				<p className="mt-1 text-sm text-zinc-600">{headingText}</p>

				<div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
					{visibleTools.map((tool) => {
						const card = (
							<div className="flex items-start gap-3">
								<div className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-900 bg-zinc-900 text-xs font-bold text-white shadow-[0_10px_24px_-14px_rgba(0,0,0,0.9)]">
									{tool.shortCode}
								</div>
								<div>
									<div className="flex items-center gap-2">
										<p className="text-sm font-semibold text-zinc-900">{tool.name}</p>
										{tool.status && (
											<span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${tool.status === "Ready" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-zinc-300 bg-white text-zinc-700"}`}>
												{tool.status}
											</span>
										)}
									</div>
									<p className="mt-1 text-xs text-zinc-600">{tool.description}</p>
									<p className="mt-2 text-[11px] font-medium text-zinc-500">Module: {tool.module}</p>
									<span className="mt-2 inline-flex rounded-full border border-zinc-300 bg-white px-2 py-0.5 text-[10px] font-semibold text-zinc-700">
										{tool.href ? (tool.openInNewTab ? "Open Seller Central" : "Open Tool") : "Tool Module"}
									</span>
								</div>
							</div>
						);

						if (tool.href) {
							return (
								<Link
									key={tool.name}
									href={tool.href}
									target={tool.openInNewTab ? "_blank" : undefined}
									rel={tool.openInNewTab ? "noreferrer" : undefined}
									className="group rounded-2xl border border-zinc-200 bg-gradient-to-br from-white via-zinc-50 to-zinc-100 p-4 shadow-[0_20px_44px_-28px_rgba(0,0,0,0.9)] transition hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-[0_24px_48px_-26px_rgba(0,0,0,0.95)]"
								>
									{card}
								</Link>
							);
						}

						return (
							<div
								key={tool.name}
								className="group rounded-2xl border border-zinc-200 bg-gradient-to-br from-white via-zinc-50 to-zinc-100 p-4 shadow-[0_20px_44px_-28px_rgba(0,0,0,0.9)] opacity-90"
							>
								{card}
							</div>
						);
					})}
					{visibleTools.length === 0 && (
						<div className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-600 md:col-span-2 xl:col-span-3">
							No tool modules are assigned to your account yet.
						</div>
					)}
				</div>
			</div>
		</WorkspaceShell>
	);
}
