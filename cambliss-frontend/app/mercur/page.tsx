"use client";

import React, { useEffect, useState } from "react";
import WorkspaceShell from "../../components/WorkspaceShell";

type MercurTab = "overview" | "vendors" | "catalog" | "orders" | "payouts" | "storefronts" | "settings";

interface Vendor {
	id: string;
	storeName: string;
	ownerName: string;
	email: string;
	phone: string;
	commissionRate: number; // percentage e.g. 10%
	totalSales: number;
	payoutBalance: number;
	status: "APPROVED" | "PENDING_APPROVAL" | "SUSPENDED";
	joinedDate: string;
}

interface MarketplaceProduct {
	id: string;
	title: string;
	sku: string;
	vendorName: string;
	category: string;
	price: number;
	stock: number;
	commissionPct: number;
}

interface SplitOrder {
	id: string;
	orderNumber: string;
	customerName: string;
	vendorName: string;
	itemsCount: number;
	totalAmount: number;
	platformCommission: number;
	vendorPayoutAmount: number;
	date: string;
	fulfillmentStatus: "FULFILLED" | "PROCESSING" | "PENDING";
}

interface PayoutRecord {
	id: string;
	vendorName: string;
	amount: number;
	date: string;
	method: "BANK_WIRE" | "STRIPE_CONNECT" | "PAYPAL";
	status: "COMPLETED" | "PENDING";
	reference: string;
}

export default function MercurMarketplacePage() {
	const [activeTab, setActiveTab] = useState<MercurTab>("overview");
	const [authUser, setAuthUser] = useState<{ email?: string; role?: string; organizationName?: string } | null>(null);
	const [toastMsg, setToastMsg] = useState<string | null>(null);

	const showToast = (msg: string) => {
		setToastMsg(msg);
		setTimeout(() => setToastMsg(null), 4000);
	};

	// LocalStorage Persistence for Mercur Multi-Vendor Data
	const [vendors, setVendors] = useState<Vendor[]>(() => {
		if (typeof window !== "undefined") {
			const saved = localStorage.getItem("mercur_vendors_v1");
			if (saved) { try { return JSON.parse(saved); } catch (e) {} }
		}
		return [
			{ id: "v-101", storeName: "Acme Tech Solutions", ownerName: "John Doe", email: "vendor@acme.com", phone: "+1 (555) 111-2222", commissionRate: 10, totalSales: 24500.00, payoutBalance: 22050.00, status: "APPROVED", joinedDate: "2026-01-15" },
			{ id: "v-102", storeName: "Starlight Digital Goods", ownerName: "Sarah Jenkins", email: "sarah@starlight.io", phone: "+1 (555) 333-4444", commissionRate: 12, totalSales: 18900.50, payoutBalance: 16632.44, status: "APPROVED", joinedDate: "2026-02-01" },
			{ id: "v-103", storeName: "Apex Gear & Accessories", ownerName: "Michael Vance", email: "mvance@apexgear.com", phone: "+1 (555) 777-8888", commissionRate: 15, totalSales: 8400.00, payoutBalance: 7140.00, status: "PENDING_APPROVAL", joinedDate: "2026-08-10" },
		];
	});

	const [products, setProducts] = useState<MarketplaceProduct[]>(() => {
		if (typeof window !== "undefined") {
			const saved = localStorage.getItem("mercur_products_v1");
			if (saved) { try { return JSON.parse(saved); } catch (e) {} }
		}
		return [
			{ id: "p-1", title: "Enterprise Cloud Gateway Node", sku: "ACME-GW-01", vendorName: "Acme Tech Solutions", category: "Hardware & Networking", price: 1250.00, stock: 45, commissionPct: 10 },
			{ id: "p-2", title: "Developer Pro SDK License", sku: "STAR-SDK-99", vendorName: "Starlight Digital Goods", category: "Software Licensing", price: 499.00, stock: 120, commissionPct: 12 },
			{ id: "p-3", title: "Rugged Outdoor Sensor Pod", sku: "APEX-POD-05", vendorName: "Apex Gear & Accessories", category: "IoT Devices", price: 350.00, stock: 18, commissionPct: 15 },
		];
	});

	const [orders, setOrders] = useState<SplitOrder[]>(() => {
		if (typeof window !== "undefined") {
			const saved = localStorage.getItem("mercur_orders_v1");
			if (saved) { try { return JSON.parse(saved); } catch (e) {} }
		}
		return [
			{ id: "ord-881", orderNumber: "MRC-2026-8801", customerName: "Global Tech Corp", vendorName: "Acme Tech Solutions", itemsCount: 2, totalAmount: 2500.00, platformCommission: 250.00, vendorPayoutAmount: 2250.00, date: "2026-08-18", fulfillmentStatus: "FULFILLED" },
			{ id: "ord-882", orderNumber: "MRC-2026-8802", customerName: "Nexus Digital Solutions", vendorName: "Starlight Digital Goods", itemsCount: 1, totalAmount: 499.00, platformCommission: 59.88, vendorPayoutAmount: 439.12, date: "2026-08-19", fulfillmentStatus: "PROCESSING" },
			{ id: "ord-883", orderNumber: "MRC-2026-8803", customerName: "Vanguard Logistics", vendorName: "Acme Tech Solutions", itemsCount: 1, totalAmount: 1250.00, platformCommission: 125.00, vendorPayoutAmount: 1125.00, date: "2026-08-20", fulfillmentStatus: "PENDING" },
		];
	});

	const [payouts, setPayouts] = useState<PayoutRecord[]>(() => {
		if (typeof window !== "undefined") {
			const saved = localStorage.getItem("mercur_payouts_v1");
			if (saved) { try { return JSON.parse(saved); } catch (e) {} }
		}
		return [
			{ id: "pay-101", vendorName: "Acme Tech Solutions", amount: 15000.00, date: "2026-08-01", method: "BANK_WIRE", status: "COMPLETED", reference: "WIRE-889102" },
			{ id: "pay-102", vendorName: "Starlight Digital Goods", amount: 8000.00, date: "2026-08-05", method: "STRIPE_CONNECT", status: "COMPLETED", reference: "STRIPE-33410" },
		];
	});

	// LocalStorage Sync Effects
	useEffect(() => { if (typeof window !== "undefined") localStorage.setItem("mercur_vendors_v1", JSON.stringify(vendors)); }, [vendors]);
	useEffect(() => { if (typeof window !== "undefined") localStorage.setItem("mercur_products_v1", JSON.stringify(products)); }, [products]);
	useEffect(() => { if (typeof window !== "undefined") localStorage.setItem("mercur_orders_v1", JSON.stringify(orders)); }, [orders]);
	useEffect(() => { if (typeof window !== "undefined") localStorage.setItem("mercur_payouts_v1", JSON.stringify(payouts)); }, [payouts]);

	// Modals State
	const [showVendorModal, setShowVendorModal] = useState(false);
	const [newStoreName, setNewStoreName] = useState("");
	const [newOwnerName, setNewOwnerName] = useState("");
	const [newVendorEmail, setNewVendorEmail] = useState("");
	const [newCommission, setNewCommission] = useState("10");

	const [showProductModal, setShowProductModal] = useState(false);
	const [newProdTitle, setNewProdTitle] = useState("");
	const [newProdSku, setNewProdSku] = useState("");
	const [newProdVendor, setNewProdVendor] = useState("Acme Tech Solutions");
	const [newProdPrice, setNewProdPrice] = useState("");
	const [newProdStock, setNewProdStock] = useState("50");

	const [showPayoutModal, setShowPayoutModal] = useState(false);
	const [payoutVendor, setPayoutVendor] = useState("Acme Tech Solutions");
	const [payoutAmount, setPayoutAmount] = useState("");
	const [payoutMethod, setPayoutMethod] = useState<"BANK_WIRE" | "STRIPE_CONNECT" | "PAYPAL">("STRIPE_CONNECT");

	useEffect(() => {
		const raw = localStorage.getItem("authUser");
		if (raw) {
			try { setAuthUser(JSON.parse(raw)); } catch {}
		}
	}, []);

	// Metrics Calculations
	const grossMarketplaceVolume = orders.reduce((sum, o) => sum + o.totalAmount, 0) + vendors.reduce((sum, v) => sum + v.totalSales, 0);
	const platformCommissionEarned = orders.reduce((sum, o) => sum + o.platformCommission, 0) + (vendors.reduce((sum, v) => sum + v.totalSales, 0) * 0.10);
	const totalPendingVendorPayouts = vendors.reduce((sum, v) => sum + v.payoutBalance, 0);

	// Action Handlers
	const handleCreateVendor = (e: React.FormEvent) => {
		e.preventDefault();
		if (!newStoreName || !newVendorEmail) return;
		const rate = parseFloat(newCommission) || 10;
		const createdVendor: Vendor = {
			id: `v-${Date.now()}`,
			storeName: newStoreName,
			ownerName: newOwnerName || "Merchant Owner",
			email: newVendorEmail,
			phone: "+1 (555) 000-0000",
			commissionRate: rate,
			totalSales: 0,
			payoutBalance: 0,
			status: "APPROVED",
			joinedDate: new Date().toISOString().split("T")[0],
		};
		setVendors([createdVendor, ...vendors]);
		setNewStoreName(""); setNewOwnerName(""); setNewVendorEmail(""); setShowVendorModal(false);
		showToast(`✅ Vendor Store "${createdVendor.storeName}" onboarded successfully!`);
	};

	const handleCreateProduct = (e: React.FormEvent) => {
		e.preventDefault();
		if (!newProdTitle || !newProdPrice) return;
		const priceVal = parseFloat(newProdPrice) || 0;
		const stockVal = parseInt(newProdStock) || 0;
		const createdProd: MarketplaceProduct = {
			id: `p-${Date.now()}`,
			title: newProdTitle,
			sku: newProdSku || `SKU-${Date.now().toString().slice(-4)}`,
			vendorName: newProdVendor,
			category: "General Marketplace",
			price: priceVal,
			stock: stockVal,
			commissionPct: 10,
		};
		setProducts([createdProd, ...products]);
		setNewProdTitle(""); setNewProdSku(""); setNewProdPrice(""); setShowProductModal(false);
		showToast(`✅ Marketplace Product "${createdProd.title}" listed under ${createdProd.vendorName}!`);
	};

	const handleExecutePayout = (e: React.FormEvent) => {
		e.preventDefault();
		if (!payoutAmount) return;
		const amt = parseFloat(payoutAmount) || 0;
		const createdPay: PayoutRecord = {
			id: `pay-${Date.now()}`,
			vendorName: payoutVendor,
			amount: amt,
			date: new Date().toISOString().split("T")[0],
			method: payoutMethod,
			status: "COMPLETED",
			reference: `PO-${Math.floor(Math.random() * 90000) + 10000}`,
		};
		setPayouts([createdPay, ...payouts]);
		// Deduct vendor payout balance
		setVendors(vendors.map(v => v.storeName === payoutVendor ? { ...v, payoutBalance: Math.max(0, v.payoutBalance - amt) } : v));
		setPayoutAmount(""); setShowPayoutModal(false);
		showToast(`✅ Merchant Payout of $${amt.toFixed(2)} processed to ${payoutVendor}!`);
	};

	return (
		<WorkspaceShell>
			{/* Toast Banner */}
			{toastMsg && (
				<div className="fixed top-20 right-8 z-50 flex items-center gap-3 rounded-2xl bg-slate-900 px-5 py-3.5 text-xs font-semibold text-white shadow-2xl border border-slate-700">
					<span>{toastMsg}</span>
					<button onClick={() => setToastMsg(null)} className="text-slate-400 hover:text-white">✕</button>
				</div>
			)}

			<div className="space-y-6">
				{/* Mercur Hero Banner */}
				<div className="relative overflow-hidden rounded-3xl border border-zinc-200 bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 p-8 text-white shadow-xl">
					<div className="absolute -right-12 -top-12 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />
					<div className="relative z-10 flex flex-col justify-between gap-6 md:flex-row md:items-center">
						<div className="space-y-2">
							<div className="flex flex-wrap items-center gap-3">
								<span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-600 font-extrabold text-white text-lg shadow-lg">
									MC
								</span>
								<h1 className="text-3xl font-bold tracking-tight text-white">Mercur Multi-Vendor Engine</h1>
								<span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/20 px-3.5 py-1 text-xs font-semibold text-emerald-300">
									<span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
									SSO Active ({authUser?.email || "Authenticated"})
								</span>
							</div>
							<p className="max-w-2xl text-sm text-slate-300">
								Open-source multi-merchant marketplace engine integrated into Office Connect. Manage vendor onboarding, split order commissions, merchant storefronts, and automated payouts.
							</p>
						</div>

						<div className="flex flex-wrap items-center gap-3">
							<button
								onClick={() => setShowVendorModal(true)}
								className="rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md transition hover:bg-emerald-500"
							>
								+ Onboard Vendor
							</button>
							<button
								onClick={() => setShowPayoutModal(true)}
								className="rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-700"
							>
								+ Process Merchant Payout
							</button>
						</div>
					</div>

					{/* Navigation Tabs */}
					<div className="mt-8 flex flex-wrap border-b border-slate-800">
						{[
							{ id: "overview", label: "Overview Cockpit" },
							{ id: "vendors", label: `Vendors (${vendors.length})` },
							{ id: "catalog", label: `Products Catalog (${products.length})` },
							{ id: "orders", label: `Split Orders (${orders.length})` },
							{ id: "payouts", label: `Merchant Payouts (${payouts.length})` },
							{ id: "storefronts", label: "Multi-Storefronts" },
						].map((tab) => (
							<button
								key={tab.id}
								onClick={() => setActiveTab(tab.id as MercurTab)}
								className={`border-b-2 px-4 py-2.5 text-xs font-semibold transition ${
									activeTab === tab.id
										? "border-emerald-400 text-emerald-400 font-bold"
										: "border-transparent text-slate-400 hover:text-slate-200"
								}`}
							>
								{tab.label}
							</button>
						))}
					</div>
				</div>

				{/* Cockpit KPI Bar */}
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
					<div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
						<p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Gross Marketplace Volume (GMV)</p>
						<p className="mt-1 text-2xl font-bold text-emerald-600">${grossMarketplaceVolume.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
					</div>
					<div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
						<p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Platform Commission Earned</p>
						<p className="mt-1 text-2xl font-bold text-indigo-600">${platformCommissionEarned.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
					</div>
					<div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
						<p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Active Vendor Merchants</p>
						<p className="mt-1 text-2xl font-bold text-slate-900">{vendors.filter(v => v.status === "APPROVED").length} Sellers</p>
					</div>
					<div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
						<p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Pending Merchant Balances</p>
						<p className="mt-1 text-2xl font-bold text-amber-600">${totalPendingVendorPayouts.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
					</div>
				</div>

				{/* 1️⃣ OVERVIEW COCKPIT */}
				{activeTab === "overview" && (
					<div className="space-y-6">
						<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
							{/* Vendors Quick Feed */}
							<div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm space-y-4">
								<div className="flex items-center justify-between border-b border-zinc-100 pb-3">
									<h3 className="font-bold text-zinc-900">Registered Vendor Stores</h3>
									<button onClick={() => setActiveTab("vendors")} className="text-xs font-semibold text-emerald-600 hover:underline">View All Vendors →</button>
								</div>
								<div className="divide-y divide-zinc-100 text-xs">
									{vendors.map((v) => (
										<div key={v.id} className="flex items-center justify-between py-3">
											<div>
												<p className="font-bold text-zinc-900">{v.storeName}</p>
												<p className="text-[11px] text-zinc-500">Owner: {v.ownerName} • Commission: {v.commissionRate}%</p>
											</div>
											<div className="text-right">
												<p className="font-semibold text-zinc-900">${v.totalSales.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
												<span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${
													v.status === "APPROVED" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-amber-50 text-amber-700 border border-amber-200"
												}`}>{v.status}</span>
											</div>
										</div>
									))}
								</div>
							</div>

							{/* Split Orders Feed */}
							<div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm space-y-4">
								<div className="flex items-center justify-between border-b border-zinc-100 pb-3">
									<h3 className="font-bold text-zinc-900">Recent Split Marketplace Orders</h3>
									<button onClick={() => setActiveTab("orders")} className="text-xs font-semibold text-emerald-600 hover:underline">View Orders →</button>
								</div>
								<div className="divide-y divide-zinc-100 text-xs">
									{orders.map((o) => (
										<div key={o.id} className="flex items-center justify-between py-3">
											<div>
												<p className="font-bold text-indigo-900">{o.orderNumber}</p>
												<p className="text-[11px] text-zinc-500">Seller: {o.vendorName} • Customer: {o.customerName}</p>
											</div>
											<div className="text-right">
												<p className="font-bold text-zinc-900">${o.totalAmount.toFixed(2)}</p>
												<p className="text-[10px] text-emerald-600 font-semibold">Comm: +${o.platformCommission.toFixed(2)}</p>
											</div>
										</div>
									))}
								</div>
							</div>
						</div>
					</div>
				)}

				{/* 2️⃣ VENDORS DIRECTORY */}
				{activeTab === "vendors" && (
					<div className="space-y-4">
						<div className="flex items-center justify-between border-b border-zinc-200 pb-4">
							<div>
								<h2 className="text-xl font-bold text-zinc-900">Multi-Vendor Merchant Directory</h2>
								<p className="text-xs text-zinc-500">Onboard independent sellers, manage marketplace commission rates, and audit vendor payouts.</p>
							</div>
							<button onClick={() => setShowVendorModal(true)} className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-emerald-500">+ Onboard New Vendor</button>
						</div>

						<div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
							<table className="w-full text-left text-xs">
								<thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-600 font-semibold uppercase">
									<tr>
										<th className="p-4">Store Name</th>
										<th className="p-4">Owner / Email</th>
										<th className="p-4">Commission %</th>
										<th className="p-4">Gross Sales</th>
										<th className="p-4">Payout Balance</th>
										<th className="p-4">Status</th>
										<th className="p-4 text-right">Actions</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-zinc-100">
									{vendors.map((v) => (
										<tr key={v.id} className="hover:bg-zinc-50">
											<td className="p-4 font-bold text-zinc-900">{v.storeName}<p className="text-[11px] font-normal text-zinc-400">Joined {v.joinedDate}</p></td>
											<td className="p-4"><p className="font-medium text-zinc-900">{v.ownerName}</p><p className="text-zinc-500">{v.email}</p></td>
											<td className="p-4 font-bold text-indigo-600">{v.commissionRate}%</td>
											<td className="p-4 font-bold text-emerald-600">${v.totalSales.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
											<td className="p-4 font-bold text-amber-600">${v.payoutBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
											<td className="p-4">
												<span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
													v.status === "APPROVED" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-amber-50 text-amber-700 border border-amber-200"
												}`}>{v.status}</span>
											</td>
											<td className="p-4 text-right space-x-2">
												<button
													onClick={() => {
														setVendors(vendors.map(item => item.id === v.id ? { ...item, status: item.status === "APPROVED" ? "PENDING_APPROVAL" : "APPROVED" } : item));
														showToast(`Updated status for ${v.storeName}`);
													}}
													className="font-semibold text-indigo-600 hover:underline"
												>
													Toggle Status
												</button>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</div>
				)}

				{/* 3️⃣ MULTI-VENDOR CATALOG */}
				{activeTab === "catalog" && (
					<div className="space-y-4">
						<div className="flex items-center justify-between border-b border-zinc-200 pb-4">
							<div>
								<h2 className="text-xl font-bold text-zinc-900">Multi-Merchant Product Catalog</h2>
								<p className="text-xs text-zinc-500">Products listed across all vendor stores in the Mercur marketplace.</p>
							</div>
							<button onClick={() => setShowProductModal(true)} className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-emerald-500">+ List New Product</button>
						</div>

						<div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
							<table className="w-full text-left text-xs">
								<thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-600 font-semibold uppercase">
									<tr>
										<th className="p-4">Product Title</th>
										<th className="p-4">SKU</th>
										<th className="p-4">Vendor Merchant</th>
										<th className="p-4">Price ($)</th>
										<th className="p-4">Commission %</th>
										<th className="p-4">Stock Level</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-zinc-100">
									{products.map((p) => (
										<tr key={p.id} className="hover:bg-zinc-50">
											<td className="p-4 font-bold text-zinc-900">{p.title}<p className="text-[11px] font-normal text-zinc-400">{p.category}</p></td>
											<td className="p-4 text-zinc-500">{p.sku}</td>
											<td className="p-4 font-semibold text-indigo-900">{p.vendorName}</td>
											<td className="p-4 font-bold text-emerald-600">${p.price.toFixed(2)}</td>
											<td className="p-4 font-semibold text-slate-700">{p.commissionPct}%</td>
											<td className="p-4"><span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-[10px] font-bold text-zinc-800">{p.stock} units</span></td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</div>
				)}

				{/* 4️⃣ SPLIT ORDERS */}
				{activeTab === "orders" && (
					<div className="space-y-4">
						<div className="border-b border-zinc-200 pb-4">
							<h2 className="text-xl font-bold text-zinc-900">Split Marketplace Orders & Commissions</h2>
							<p className="text-xs text-zinc-500">Order breakdown per merchant with automatic platform commission calculation.</p>
						</div>

						<div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
							<table className="w-full text-left text-xs">
								<thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-600 font-semibold uppercase">
									<tr>
										<th className="p-4">Order #</th>
										<th className="p-4">Customer</th>
										<th className="p-4">Vendor Merchant</th>
										<th className="p-4">Date</th>
										<th className="p-4">Order Total</th>
										<th className="p-4">Platform Fee</th>
										<th className="p-4">Merchant Payout</th>
										<th className="p-4">Fulfillment</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-zinc-100">
									{orders.map((o) => (
										<tr key={o.id} className="hover:bg-zinc-50">
											<td className="p-4 font-bold text-indigo-900">{o.orderNumber}</td>
											<td className="p-4 font-medium text-zinc-900">{o.customerName}</td>
											<td className="p-4 font-semibold text-zinc-800">{o.vendorName}</td>
											<td className="p-4 text-zinc-500">{o.date}</td>
											<td className="p-4 font-bold text-zinc-900">${o.totalAmount.toFixed(2)}</td>
											<td className="p-4 font-bold text-emerald-600">+${o.platformCommission.toFixed(2)}</td>
											<td className="p-4 font-bold text-amber-600">${o.vendorPayoutAmount.toFixed(2)}</td>
											<td className="p-4">
												<span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
													o.fulfillmentStatus === "FULFILLED" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-amber-50 text-amber-700 border border-amber-200"
												}`}>{o.fulfillmentStatus}</span>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</div>
				)}

				{/* 5️⃣ MERCHANT PAYOUTS */}
				{activeTab === "payouts" && (
					<div className="space-y-4">
						<div className="flex items-center justify-between border-b border-zinc-200 pb-4">
							<div>
								<h2 className="text-xl font-bold text-zinc-900">Merchant Payouts & Settlements</h2>
								<p className="text-xs text-zinc-500">Disburse seller earnings via Bank Wire, Stripe Connect, or PayPal.</p>
							</div>
							<button onClick={() => setShowPayoutModal(true)} className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-emerald-500">+ Disburse Payout</button>
						</div>

						<div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
							<table className="w-full text-left text-xs">
								<thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-600 font-semibold uppercase">
									<tr>
										<th className="p-4">Reference</th>
										<th className="p-4">Vendor Merchant</th>
										<th className="p-4">Payout Amount</th>
										<th className="p-4">Payment Method</th>
										<th className="p-4">Date</th>
										<th className="p-4">Status</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-zinc-100">
									{payouts.map((pay) => (
										<tr key={pay.id} className="hover:bg-zinc-50">
											<td className="p-4 font-bold text-indigo-900">{pay.reference}</td>
											<td className="p-4 font-bold text-zinc-900">{pay.vendorName}</td>
											<td className="p-4 font-bold text-emerald-600">${pay.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
											<td className="p-4"><span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-[10px] font-semibold text-zinc-700">{pay.method}</span></td>
											<td className="p-4 text-zinc-500">{pay.date}</td>
											<td className="p-4"><span className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-semibold">COMPLETED</span></td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</div>
				)}

				{/* 6️⃣ MULTI-STOREFRONTS PREVIEW */}
				{activeTab === "storefronts" && (
					<div className="space-y-6">
						<div className="border-b border-zinc-200 pb-4">
							<h2 className="text-xl font-bold text-zinc-900">Multi-Vendor Storefronts Directory</h2>
							<p className="text-xs text-zinc-500">Live multi-merchant storefront pages available to buyers.</p>
						</div>

						<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
							{vendors.map((v) => (
								<div key={v.id} className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm space-y-3">
									<div className="flex items-center justify-between">
										<span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 font-bold text-indigo-600 text-sm">
											🏪
										</span>
										<span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">Active Shop</span>
									</div>
									<h3 className="text-base font-bold text-zinc-900">{v.storeName}</h3>
									<p className="text-xs text-zinc-500">Merchant: {v.ownerName} ({v.email})</p>
									<div className="pt-2 border-t border-zinc-100 flex items-center justify-between text-xs">
										<span className="text-zinc-500">Total Store GMV:</span>
										<span className="font-bold text-emerald-600">${v.totalSales.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
									</div>
								</div>
							))}
						</div>
					</div>
				)}
			</div>

			{/* Onboard Vendor Modal */}
			{showVendorModal && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
					<div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
						<h3 className="text-lg font-bold text-zinc-900">Onboard Multi-Vendor Merchant</h3>
						<form onSubmit={handleCreateVendor} className="space-y-3">
							<div><label className="block text-xs font-semibold text-zinc-700">Store Name *</label><input type="text" required value={newStoreName} onChange={(e) => setNewStoreName(e.target.value)} placeholder="e.g. Acme Tech Solutions" className="mt-1 h-9 w-full rounded-lg border px-3 text-xs" /></div>
							<div><label className="block text-xs font-semibold text-zinc-700">Owner Name</label><input type="text" value={newOwnerName} onChange={(e) => setNewOwnerName(e.target.value)} placeholder="e.g. John Doe" className="mt-1 h-9 w-full rounded-lg border px-3 text-xs" /></div>
							<div><label className="block text-xs font-semibold text-zinc-700">Merchant Email *</label><input type="email" required value={newVendorEmail} onChange={(e) => setNewVendorEmail(e.target.value)} placeholder="vendor@acme.com" className="mt-1 h-9 w-full rounded-lg border px-3 text-xs" /></div>
							<div><label className="block text-xs font-semibold text-zinc-700">Platform Commission Rate (%)</label><input type="number" value={newCommission} onChange={(e) => setNewCommission(e.target.value)} placeholder="10" className="mt-1 h-9 w-full rounded-lg border px-3 text-xs" /></div>
							<div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => setShowVendorModal(false)} className="rounded-lg border px-4 py-2 text-xs font-semibold">Cancel</button><button type="submit" className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white">Onboard Merchant</button></div>
						</form>
					</div>
				</div>
			)}

			{/* List Product Modal */}
			{showProductModal && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
					<div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
						<h3 className="text-lg font-bold text-zinc-900">List Multi-Vendor Product</h3>
						<form onSubmit={handleCreateProduct} className="space-y-3">
							<div><label className="block text-xs font-semibold text-zinc-700">Product Title *</label><input type="text" required value={newProdTitle} onChange={(e) => setNewProdTitle(e.target.value)} placeholder="e.g. Cloud Gateway Node" className="mt-1 h-9 w-full rounded-lg border px-3 text-xs" /></div>
							<div><label className="block text-xs font-semibold text-zinc-700">SKU Code</label><input type="text" value={newProdSku} onChange={(e) => setNewProdSku(e.target.value)} placeholder="ACME-GW-01" className="mt-1 h-9 w-full rounded-lg border px-3 text-xs" /></div>
							<div><label className="block text-xs font-semibold text-zinc-700">Select Merchant Vendor</label><select value={newProdVendor} onChange={(e) => setNewProdVendor(e.target.value)} className="mt-1 h-9 w-full rounded-lg border px-3 text-xs bg-white">{vendors.map(v => <option key={v.id} value={v.storeName}>{v.storeName}</option>)}</select></div>
							<div><label className="block text-xs font-semibold text-zinc-700">Price ($)</label><input type="number" step="0.01" required value={newProdPrice} onChange={(e) => setNewProdPrice(e.target.value)} placeholder="1250.00" className="mt-1 h-9 w-full rounded-lg border px-3 text-xs" /></div>
							<div><label className="block text-xs font-semibold text-zinc-700">Available Stock</label><input type="number" value={newProdStock} onChange={(e) => setNewProdStock(e.target.value)} placeholder="50" className="mt-1 h-9 w-full rounded-lg border px-3 text-xs" /></div>
							<div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => setShowProductModal(false)} className="rounded-lg border px-4 py-2 text-xs font-semibold">Cancel</button><button type="submit" className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white">List Product</button></div>
						</form>
					</div>
				</div>
			)}

			{/* Payout Modal */}
			{showPayoutModal && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
					<div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
						<h3 className="text-lg font-bold text-zinc-900">Process Merchant Payout</h3>
						<form onSubmit={handleExecutePayout} className="space-y-3">
							<div><label className="block text-xs font-semibold text-zinc-700">Select Merchant</label><select value={payoutVendor} onChange={(e) => setPayoutVendor(e.target.value)} className="mt-1 h-9 w-full rounded-lg border px-3 text-xs bg-white">{vendors.map(v => <option key={v.id} value={v.storeName}>{v.storeName} (Bal: ${v.payoutBalance.toFixed(2)})</option>)}</select></div>
							<div><label className="block text-xs font-semibold text-zinc-700">Payout Amount ($) *</label><input type="number" step="0.01" required value={payoutAmount} onChange={(e) => setPayoutAmount(e.target.value)} placeholder="5000.00" className="mt-1 h-9 w-full rounded-lg border px-3 text-xs" /></div>
							<div><label className="block text-xs font-semibold text-zinc-700">Payment Method</label><select value={payoutMethod} onChange={(e) => setPayoutMethod(e.target.value as any)} className="mt-1 h-9 w-full rounded-lg border px-3 text-xs bg-white"><option value="STRIPE_CONNECT">Stripe Connect</option><option value="BANK_WIRE">Bank Wire Transfer</option><option value="PAYPAL">PayPal Payouts</option></select></div>
							<div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => setShowPayoutModal(false)} className="rounded-lg border px-4 py-2 text-xs font-semibold">Cancel</button><button type="submit" className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white">Disburse Payout</button></div>
						</form>
					</div>
				</div>
			)}
		</WorkspaceShell>
	);
}
