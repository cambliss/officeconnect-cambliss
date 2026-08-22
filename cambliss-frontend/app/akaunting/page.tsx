"use client";

import React, { useEffect, useState } from "react";
import WorkspaceShell from "../../components/WorkspaceShell";

type NavSection =
	| "dashboard"
	| "items"
	| "invoices"
	| "create-invoice"
	| "view-invoice"
	| "customers"
	| "bills"
	| "create-bill"
	| "view-bill"
	| "vendors"
	| "banking-accounts"
	| "banking-transactions"
	| "banking-transfers"
	| "banking-reconciliations"
	| "reports"
	| "switch";

interface LineItem {
	id: string;
	itemName: string;
	description: string;
	qty: number;
	price: number;
	taxRate: number;
	subtotal: number;
}

interface Invoice {
	id: string;
	number: string;
	poNumber?: string;
	customerName: string;
	customerEmail: string;
	customerAddress: string;
	date: string;
	dueDate: string;
	items: LineItem[];
	subtotal: number;
	taxTotal: number;
	discount: number;
	total: number;
	notes?: string;
	status: "PAID" | "PENDING" | "OVERDUE";
}

interface Bill {
	id: string;
	number: string;
	poNumber?: string;
	vendorName: string;
	vendorEmail: string;
	category: string;
	date: string;
	dueDate: string;
	items: LineItem[];
	subtotal: number;
	taxTotal: number;
	total: number;
	status: "PAID" | "UNPAID";
}

interface Item {
	id: string;
	name: string;
	sku: string;
	category: string;
	salePrice: number;
	purchasePrice: number;
	taxRate: string;
	description: string;
}

interface Contact {
	id: string;
	name: string;
	email: string;
	phone: string;
	type: "CUSTOMER" | "VENDOR";
	taxNumber: string;
	address: string;
	balance: number;
}

interface BankAccount {
	id: string;
	name: string;
	bankName: string;
	number: string;
	balance: number;
	currency: string;
}

interface Transaction {
	id: string;
	date: string;
	amount: number;
	type: "INCOME" | "EXPENSE";
	account: string;
	category: string;
	description: string;
	reference: string;
	reconciled: boolean;
}

interface FundTransfer {
	id: string;
	date: string;
	fromAccount: string;
	toAccount: string;
	amount: number;
	reference: string;
}

export default function AkauntingPlatformPage() {
	const [activeNav, setActiveNav] = useState<NavSection>("dashboard");
	const [salesOpen, setSalesOpen] = useState(true);
	const [purchasesOpen, setPurchasesOpen] = useState(true);
	const [bankingOpen, setBankingOpen] = useState(true);
	const [authUser, setAuthUser] = useState<{ email?: string; role?: string; organizationName?: string } | null>(null);

	// Notification Banner
	const [toastMsg, setToastMsg] = useState<string | null>(null);
	const showToast = (msg: string) => {
		setToastMsg(msg);
		setTimeout(() => setToastMsg(null), 4000);
	};

	// Selected View References
	const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
	const [selectedBill, setSelectedBill] = useState<Bill | null>(null);

	// =========================================================================
	// 📦 1. ITEMS CATALOG STATE
	// =========================================================================
	const [items, setItems] = useState<Item[]>(() => {
		if (typeof window !== "undefined") {
			const saved = localStorage.getItem("akaunting_items_v4");
			if (saved) { try { return JSON.parse(saved); } catch (e) {} }
		}
		return [
			{ id: "itm-1", name: "Cloud Infrastructure Setup", sku: "SRV-001", category: "Services", salePrice: 1500.00, purchasePrice: 800.00, taxRate: "18%", description: "AWS Multi-region setup & orchestration" },
			{ id: "itm-2", name: "SaaS Platform License", sku: "LIC-002", category: "Software", salePrice: 945.25, purchasePrice: 400.00, taxRate: "18%", description: "Annual user enterprise license" },
			{ id: "itm-3", name: "Custom API Integration", sku: "DEV-003", category: "Development", salePrice: 3200.00, purchasePrice: 1500.00, taxRate: "18%", description: "Custom webhook and REST API integration" },
		];
	});

	// =========================================================================
	// 💳 2. INVOICES STATE
	// =========================================================================
	const [invoices, setInvoices] = useState<Invoice[]>(() => {
		if (typeof window !== "undefined") {
			const saved = localStorage.getItem("akaunting_invoices_v4");
			if (saved) { try { return JSON.parse(saved); } catch (e) {} }
		}
		return [
			{
				id: "inv-101",
				number: "INV-2026-001",
				poNumber: "PO-9912",
				customerName: "Acme Global Enterprise",
				customerEmail: "billing@acme.com",
				customerAddress: "100 Innovation Way, Suite 400, San Francisco, CA",
				date: "2026-08-15",
				dueDate: "2026-08-30",
				items: [
					{ id: "li-1", itemName: "Cloud Infrastructure Setup", description: "AWS EC2 & Multi-Region Setup", qty: 1, price: 1500.00, taxRate: 18, subtotal: 1500.00 },
					{ id: "li-2", itemName: "SaaS Platform License", description: "Enterprise Tier Annual License", qty: 1, price: 950.00, taxRate: 18, subtotal: 950.00 },
				],
				subtotal: 2450.00,
				taxTotal: 441.00,
				discount: 0,
				total: 2891.00,
				notes: "Thank you for your business! Payment due within 15 days.",
				status: "PAID",
			},
			{
				id: "inv-102",
				number: "INV-2026-002",
				poNumber: "PO-4410",
				customerName: "Starlight Digital Ltd",
				customerEmail: "accounts@starlight.io",
				customerAddress: "50 Tech Park Drive, Austin, TX",
				date: "2026-08-18",
				dueDate: "2026-09-02",
				items: [
					{ id: "li-3", itemName: "SaaS Platform License", description: "Standard Tier License", qty: 2, price: 945.25, taxRate: 18, subtotal: 1890.50 },
				],
				subtotal: 1890.50,
				taxTotal: 340.29,
				discount: 50.00,
				total: 2180.79,
				notes: "Payment via wire transfer or credit card.",
				status: "PENDING",
			},
		];
	});

	// =========================================================================
	// 🛒 3. PURCHASES / BILLS STATE
	// =========================================================================
	const [bills, setBills] = useState<Bill[]>(() => {
		if (typeof window !== "undefined") {
			const saved = localStorage.getItem("akaunting_bills_v4");
			if (saved) { try { return JSON.parse(saved); } catch (e) {} }
		}
		return [
			{
				id: "b-1",
				number: "BILL-2026-01",
				poNumber: "PO-AWS-08",
				vendorName: "Amazon Web Services",
				vendorEmail: "aws-billing@amazon.com",
				category: "Software & Cloud",
				date: "2026-08-10",
				dueDate: "2026-08-25",
				items: [
					{ id: "bli-1", itemName: "EC2 & Cloud Hosting", description: "August monthly server instances", qty: 1, price: 450.00, taxRate: 18, subtotal: 450.00 },
				],
				subtotal: 450.00,
				taxTotal: 81.00,
				total: 531.00,
				status: "PAID",
			},
			{
				id: "b-2",
				number: "BILL-2026-02",
				poNumber: "PO-STAT-12",
				vendorName: "Stationery Mart Ltd",
				vendorEmail: "sales@stationery.com",
				category: "Office Supplies",
				date: "2026-08-12",
				dueDate: "2026-08-27",
				items: [
					{ id: "bli-2", itemName: "Paper & Printer Cartridges", description: "Desk stationery and office supplies", qty: 1, price: 125.50, taxRate: 18, subtotal: 125.50 },
				],
				subtotal: 125.50,
				taxTotal: 22.59,
				total: 148.09,
				status: "PAID",
			},
		];
	});

	// =========================================================================
	// 👥 4. CONTACTS STATE (CUSTOMERS & VENDORS)
	// =========================================================================
	const [contacts, setContacts] = useState<Contact[]>(() => {
		if (typeof window !== "undefined") {
			const saved = localStorage.getItem("akaunting_contacts_v4");
			if (saved) { try { return JSON.parse(saved); } catch (e) {} }
		}
		return [
			{ id: "c1", name: "Acme Global Enterprise", email: "billing@acme.com", phone: "+1 (555) 234-5678", type: "CUSTOMER", taxNumber: "GSTIN-992812", address: "100 Innovation Way, San Francisco, CA", balance: 0.00 },
			{ id: "c2", name: "Starlight Digital Ltd", email: "accounts@starlight.io", phone: "+1 (555) 987-6543", type: "CUSTOMER", taxNumber: "GSTIN-441029", address: "50 Tech Park Drive, Austin, TX", balance: 2180.79 },
			{ id: "c3", name: "Amazon Web Services", email: "aws-billing@amazon.com", phone: "+1 (800) 300-4567", type: "VENDOR", taxNumber: "US-TAX-88120", address: "410 Terry Ave N, Seattle, WA", balance: 531.00 },
			{ id: "c4", name: "Stationery Mart Ltd", email: "support@stationery.com", phone: "+1 (555) 444-1212", type: "VENDOR", taxNumber: "US-TAX-10293", address: "12 Paper St, Chicago, IL", balance: 0.00 },
		];
	});

	// =========================================================================
	// 🏦 5. BANKING & TRANSACTIONS STATE
	// =========================================================================
	const [bankAccounts, setBankAccounts] = useState<BankAccount[]>(() => {
		if (typeof window !== "undefined") {
			const saved = localStorage.getItem("akaunting_bank_accounts_v4");
			if (saved) { try { return JSON.parse(saved); } catch (e) {} }
		}
		return [
			{ id: "b1", name: "Operating Checking Account", bankName: "JPMorgan Chase Bank", number: "**** 4892", balance: 28450.00, currency: "USD" },
			{ id: "b2", name: "Tax Reserve Savings", bankName: "Bank of America", number: "**** 9012", balance: 14200.50, currency: "USD" },
			{ id: "b3", name: "Petty Cash Vault", bankName: "Office Vault", number: "CASH-01", balance: 1250.00, currency: "USD" },
		];
	});

	const [transactions, setTransactions] = useState<Transaction[]>(() => {
		if (typeof window !== "undefined") {
			const saved = localStorage.getItem("akaunting_transactions_v4");
			if (saved) { try { return JSON.parse(saved); } catch (e) {} }
		}
		return [
			{ id: "tx-1", date: "2026-08-15", amount: 2891.00, type: "INCOME", account: "Operating Checking Account", category: "Sales Revenue", description: "Customer Payment for INV-2026-001", reference: "TXN-88102", reconciled: true },
			{ id: "tx-2", date: "2026-08-10", amount: 531.00, type: "EXPENSE", account: "Operating Checking Account", category: "Cloud Hosting", description: "AWS Billing BILL-2026-01", reference: "TXN-33019", reconciled: true },
			{ id: "tx-3", date: "2026-08-12", amount: 148.09, type: "EXPENSE", account: "Petty Cash Vault", category: "Office Supplies", description: "Stationery Mart BILL-2026-02", reference: "TXN-10294", reconciled: true },
		];
	});

	const [transfers, setTransfers] = useState<FundTransfer[]>(() => {
		if (typeof window !== "undefined") {
			const saved = localStorage.getItem("akaunting_transfers_v4");
			if (saved) { try { return JSON.parse(saved); } catch (e) {} }
		}
		return [
			{ id: "tr-1", date: "2026-08-14", fromAccount: "Operating Checking Account", toAccount: "Tax Reserve Savings", amount: 2500.00, reference: "TRF-9012" },
		];
	});

	// Sync to LocalStorage
	useEffect(() => { if (typeof window !== "undefined") localStorage.setItem("akaunting_items_v4", JSON.stringify(items)); }, [items]);
	useEffect(() => { if (typeof window !== "undefined") localStorage.setItem("akaunting_invoices_v4", JSON.stringify(invoices)); }, [invoices]);
	useEffect(() => { if (typeof window !== "undefined") localStorage.setItem("akaunting_bills_v4", JSON.stringify(bills)); }, [bills]);
	useEffect(() => { if (typeof window !== "undefined") localStorage.setItem("akaunting_contacts_v4", JSON.stringify(contacts)); }, [contacts]);
	useEffect(() => { if (typeof window !== "undefined") localStorage.setItem("akaunting_bank_accounts_v4", JSON.stringify(bankAccounts)); }, [bankAccounts]);
	useEffect(() => { if (typeof window !== "undefined") localStorage.setItem("akaunting_transactions_v4", JSON.stringify(transactions)); }, [transactions]);
	useEffect(() => { if (typeof window !== "undefined") localStorage.setItem("akaunting_transfers_v4", JSON.stringify(transfers)); }, [transfers]);

	// =========================================================================
	// 🛠️ FORM BUILDER STATES
	// =========================================================================
	// Invoice Builder Form
	const [invCustomerName, setInvCustomerName] = useState("");
	const [invCustomerEmail, setInvCustomerEmail] = useState("");
	const [invCustomerAddress, setInvCustomerAddress] = useState("");
	const [invPoNumber, setInvPoNumber] = useState("");
	const [invDate, setInvDate] = useState(new Date().toISOString().split("T")[0]);
	const [invDueDate, setInvDueDate] = useState(new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0]);
	const [invDiscount, setInvDiscount] = useState("0");
	const [invNotes, setInvNotes] = useState("Thank you for your business!");
	const [invLineItems, setInvLineItems] = useState<LineItem[]>([
		{ id: "li-init", itemName: "Cloud Infrastructure Setup", description: "Standard cloud deployment", qty: 1, price: 1500.00, taxRate: 18, subtotal: 1500.00 },
	]);

	// Bill Builder Form
	const [billVendorName, setBillVendorName] = useState("");
	const [billVendorEmail, setBillVendorEmail] = useState("");
	const [billCategory, setBillCategory] = useState("Software & Cloud");
	const [billPoNumber, setBillPoNumber] = useState("");
	const [billDate, setBillDate] = useState(new Date().toISOString().split("T")[0]);
	const [billDueDate, setBillDueDate] = useState(new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0]);
	const [billLineItems, setBillLineItems] = useState<LineItem[]>([
		{ id: "bli-init", itemName: "Server Hosting", description: "Monthly cloud server hosting", qty: 1, price: 450.00, taxRate: 18, subtotal: 450.00 },
	]);

	// Fund Transfer Form
	const [trfFrom, setTrfFrom] = useState("Operating Checking Account");
	const [trfTo, setTrfTo] = useState("Tax Reserve Savings");
	const [trfAmount, setTrfAmount] = useState("");
	const [trfRef, setTrfRef] = useState("");

	// Modals State
	const [showItemModal, setShowItemModal] = useState(false);
	const [newItemName, setNewItemName] = useState("");
	const [newItemSku, setNewItemSku] = useState("");
	const [newItemCategory, setNewItemCategory] = useState("Services");
	const [newItemSalePrice, setNewItemSalePrice] = useState("");
	const [newItemCostPrice, setNewItemCostPrice] = useState("");
	const [newItemTaxRate, setNewItemTaxRate] = useState("18%");

	const [showBankModal, setShowBankModal] = useState(false);
	const [newBankName, setNewBankName] = useState("");
	const [newBankBank, setNewBankBank] = useState("");
	const [newBankNum, setNewBankNum] = useState("");
	const [newBankBalance, setNewBankBalance] = useState("");

	const [showTxModal, setShowTxModal] = useState(false);
	const [newTxAccount, setNewTxAccount] = useState("Operating Checking Account");
	const [newTxType, setNewTxType] = useState<"INCOME" | "EXPENSE">("INCOME");
	const [newTxCategory, setNewTxCategory] = useState("Sales Revenue");
	const [newTxAmount, setNewTxAmount] = useState("");
	const [newTxDesc, setNewTxDesc] = useState("");

	const [showContactModal, setShowContactModal] = useState(false);
	const [newContactName, setNewContactName] = useState("");
	const [newContactEmail, setNewContactEmail] = useState("");
	const [newContactPhone, setNewContactPhone] = useState("");
	const [newContactTax, setNewContactTax] = useState("");
	const [newContactAddress, setNewContactAddress] = useState("");
	const [newContactType, setNewContactType] = useState<"CUSTOMER" | "VENDOR">("CUSTOMER");

	useEffect(() => {
		const raw = localStorage.getItem("authUser");
		if (raw) {
			try { setAuthUser(JSON.parse(raw)); } catch {}
		}
	}, []);

	// Metrics Calculations
	const totalPaidSales = invoices.filter(i => i.status === "PAID").reduce((sum, i) => sum + i.total, 0);
	const totalPendingReceivables = invoices.filter(i => i.status !== "PAID").reduce((sum, i) => sum + i.total, 0);
	const totalPaidBills = bills.filter(b => b.status === "PAID").reduce((sum, b) => sum + b.total, 0);
	const netProfitMargin = totalPaidSales - totalPaidBills;
	const totalLiquidCapital = bankAccounts.reduce((sum, b) => sum + b.balance, 0);

	// Invoice Calculation Engine
	const invSubtotal = invLineItems.reduce((sum, item) => sum + item.qty * item.price, 0);
	const invTaxTotal = invLineItems.reduce((sum, item) => sum + (item.qty * item.price * (item.taxRate / 100)), 0);
	const invDiscountVal = parseFloat(invDiscount) || 0;
	const invGrandTotal = Math.max(0, invSubtotal + invTaxTotal - invDiscountVal);

	// Bill Calculation Engine
	const billSubtotal = billLineItems.reduce((sum, item) => sum + item.qty * item.price, 0);
	const billTaxTotal = billLineItems.reduce((sum, item) => sum + (item.qty * item.price * (item.taxRate / 100)), 0);
	const billGrandTotal = billSubtotal + billTaxTotal;

	// =========================================================================
	// 🎯 FORM & ACTION HANDLERS
	// =========================================================================
	const handleSaveInvoiceStudio = (e: React.FormEvent, markPaid: boolean = false) => {
		e.preventDefault();
		if (!invCustomerName) { showToast("⚠️ Please enter customer name."); return; }

		const newInv: Invoice = {
			id: `inv-${Date.now()}`,
			number: `INV-2026-00${invoices.length + 1}`,
			poNumber: invPoNumber || undefined,
			customerName: invCustomerName,
			customerEmail: invCustomerEmail || "billing@customer.com",
			customerAddress: invCustomerAddress || "100 Commercial Blvd",
			date: invDate,
			dueDate: invDueDate,
			items: invLineItems,
			subtotal: invSubtotal,
			taxTotal: invTaxTotal,
			discount: invDiscountVal,
			total: invGrandTotal,
			notes: invNotes,
			status: markPaid ? "PAID" : "PENDING",
		};

		setInvoices([newInv, ...invoices]);
		setActiveNav("invoices");
		showToast(`✅ Invoice "${newInv.number}" created successfully!`);
	};

	const handleSaveBillStudio = (e: React.FormEvent, markPaid: boolean = false) => {
		e.preventDefault();
		if (!billVendorName) { showToast("⚠️ Please enter vendor name."); return; }

		const newBill: Bill = {
			id: `b-${Date.now()}`,
			number: `BILL-2026-0${bills.length + 1}`,
			poNumber: billPoNumber || undefined,
			vendorName: billVendorName,
			vendorEmail: billVendorEmail || "vendor@supplier.com",
			category: billCategory,
			date: billDate,
			dueDate: billDueDate,
			items: billLineItems,
			subtotal: billSubtotal,
			taxTotal: billTaxTotal,
			total: billGrandTotal,
			status: markPaid ? "PAID" : "UNPAID",
		};

		setBills([newBill, ...bills]);
		setActiveNav("bills");
		showToast(`✅ Purchase Bill "${newBill.number}" recorded successfully!`);
	};

	const handleCreateItem = (e: React.FormEvent) => {
		e.preventDefault();
		if (!newItemName) return;
		const sPrice = parseFloat(newItemSalePrice) || 0;
		const cPrice = parseFloat(newItemCostPrice) || (sPrice * 0.6);
		const createdItem: Item = {
			id: `itm-${Date.now()}`,
			name: newItemName,
			sku: newItemSku || `SKU-${items.length + 1}`,
			category: newItemCategory,
			salePrice: sPrice,
			purchasePrice: cPrice,
			taxRate: newItemTaxRate,
			description: `${newItemCategory} item`,
		};
		setItems([createdItem, ...items]);
		setNewItemName(""); setNewItemSku(""); setNewItemSalePrice(""); setNewItemCostPrice(""); setShowItemModal(false);
		showToast(`✅ Item "${createdItem.name}" saved to Catalog!`);
	};

	const handleCreateBankAccount = (e: React.FormEvent) => {
		e.preventDefault();
		if (!newBankName) return;
		const bal = parseFloat(newBankBalance) || 0;
		const createdBank: BankAccount = {
			id: `b-${Date.now()}`,
			name: newBankName,
			bankName: newBankBank || "Commercial Bank",
			number: newBankNum || "**** 1029",
			balance: bal,
			currency: "USD",
		};
		setBankAccounts([...bankAccounts, createdBank]);
		setNewBankName(""); setNewBankBank(""); setNewBankNum(""); setNewBankBalance(""); setShowBankModal(false);
		showToast(`✅ Bank Account "${createdBank.name}" created!`);
	};

	const handleCreateTransaction = (e: React.FormEvent) => {
		e.preventDefault();
		if (!newTxAmount) return;
		const amt = parseFloat(newTxAmount) || 0;
		const createdTx: Transaction = {
			id: `tx-${Date.now()}`,
			date: new Date().toISOString().split("T")[0],
			amount: amt,
			type: newTxType,
			account: newTxAccount,
			category: newTxCategory,
			description: newTxDesc || `${newTxType} entry`,
			reference: `TXN-${Math.floor(Math.random() * 90000) + 10000}`,
			reconciled: true,
		};
		setTransactions([createdTx, ...transactions]);
		setNewTxAmount(""); setNewTxDesc(""); setShowTxModal(false);
		showToast(`✅ Journal Transaction "${createdTx.reference}" logged!`);
	};

	const handleExecuteTransfer = (e: React.FormEvent) => {
		e.preventDefault();
		if (!trfAmount) return;
		const amt = parseFloat(trfAmount) || 0;
		const newTrf: FundTransfer = {
			id: `tr-${Date.now()}`,
			date: new Date().toISOString().split("T")[0],
			fromAccount: trfFrom,
			toAccount: trfTo,
			amount: amt,
			reference: trfRef || `TRF-${Math.floor(Math.random() * 9000) + 1000}`,
		};
		setTransfers([newTrf, ...transfers]);
		setTrfAmount(""); setTrfRef("");
		showToast(`✅ Fund Transfer of $${amt.toFixed(2)} executed!`);
	};

	const handleCreateContact = (e: React.FormEvent) => {
		e.preventDefault();
		if (!newContactName) return;
		const createdCnt: Contact = {
			id: `c-${Date.now()}`,
			name: newContactName,
			email: newContactEmail || "contact@domain.com",
			phone: newContactPhone || "+1 (555) 000-0000",
			type: newContactType,
			taxNumber: newContactTax || "TAX-REGISTERED",
			address: newContactAddress || "123 Business Way",
			balance: 0.00,
		};
		setContacts([...contacts, createdCnt]);
		setNewContactName(""); setNewContactEmail(""); setNewContactPhone(""); setShowContactModal(false);
		showToast(`✅ ${createdCnt.type === "CUSTOMER" ? "Customer" : "Vendor"} "${createdCnt.name}" added!`);
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
				{/* Office Connect Hero Header */}
				<div className="relative overflow-hidden rounded-3xl border border-zinc-200 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-8 text-white shadow-xl">
					<div className="absolute -right-12 -top-12 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl" />
					<div className="relative z-10 flex flex-col justify-between gap-6 md:flex-row md:items-center">
						<div className="space-y-2">
							<div className="flex flex-wrap items-center gap-3">
								<span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600 font-extrabold text-white text-lg shadow-lg">
									AK
								</span>
								<h1 className="text-3xl font-bold tracking-tight text-white">Enterprise Akaunting Suite</h1>
								<span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/20 px-3.5 py-1 text-xs font-semibold text-emerald-300">
									<span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
									SSO Connected ({authUser?.email || "Authenticated"})
								</span>
							</div>
							<p className="max-w-2xl text-sm text-slate-300">
								Full enterprise accounting engine with complete Sales, Purchases, Banking, Reconciliations, and Financial Reporting.
							</p>
						</div>

						<div className="flex flex-wrap items-center gap-3">
							<button
								onClick={() => setActiveNav("create-invoice")}
								className="rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md transition hover:bg-indigo-500"
							>
								+ Create Invoice
							</button>
							<button
								onClick={() => setActiveNav("create-bill")}
								className="rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-700"
							>
								+ Record Purchase Bill
							</button>
						</div>
					</div>
				</div>

				{/* Main Workspace Structure */}
				<div className="flex flex-col lg:flex-row min-h-[700px] rounded-3xl border border-zinc-200 bg-white shadow-lg overflow-hidden">
					
					{/* Sidebar Navigation */}
					<aside className="w-full lg:w-64 border-r border-zinc-200 bg-zinc-50/80 p-5 flex flex-col justify-between shrink-0">
						<div className="space-y-6">
							<div className="px-2">
								<p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Ledger Modules</p>
							</div>

							<nav className="space-y-1 text-xs font-semibold text-zinc-600">
								<button
									onClick={() => setActiveNav("dashboard")}
									className={`w-full flex items-center gap-3 rounded-xl px-3.5 py-2.5 transition ${activeNav === "dashboard" ? "bg-indigo-600 text-white shadow-sm" : "hover:bg-zinc-200/60 hover:text-zinc-900"}`}
								>
									📊 Dashboard
								</button>

								<button
									onClick={() => setActiveNav("items")}
									className={`w-full flex items-center gap-3 rounded-xl px-3.5 py-2.5 transition ${activeNav === "items" ? "bg-indigo-600 text-white shadow-sm" : "hover:bg-zinc-200/60 hover:text-zinc-900"}`}
								>
									📦 Items Catalog
								</button>

								{/* Sales Group */}
								<div>
									<button onClick={() => setSalesOpen(!salesOpen)} className="w-full flex items-center justify-between rounded-xl px-3.5 py-2.5 hover:bg-zinc-200/60 hover:text-zinc-900">
										<div className="flex items-center gap-3">💳 Sales</div>
										<span className="text-[10px] text-zinc-400">{salesOpen ? "▲" : "▼"}</span>
									</button>
									{salesOpen && (
										<div className="ml-7 space-y-1 border-l-2 border-zinc-200 pl-3 pt-1">
											<button onClick={() => setActiveNav("invoices")} className={`block w-full text-left py-1.5 transition ${activeNav === "invoices" || activeNav === "create-invoice" ? "text-indigo-600 font-bold" : "hover:text-zinc-900"}`}>
												Invoices Studio
											</button>
											<button onClick={() => setActiveNav("customers")} className={`block w-full text-left py-1.5 transition ${activeNav === "customers" ? "text-indigo-600 font-bold" : "hover:text-zinc-900"}`}>
												Customers
											</button>
										</div>
									)}
								</div>

								{/* Purchases Group */}
								<div>
									<button onClick={() => setPurchasesOpen(!purchasesOpen)} className="w-full flex items-center justify-between rounded-xl px-3.5 py-2.5 hover:bg-zinc-200/60 hover:text-zinc-900">
										<div className="flex items-center gap-3">🛒 Purchases</div>
										<span className="text-[10px] text-zinc-400">{purchasesOpen ? "▲" : "▼"}</span>
									</button>
									{purchasesOpen && (
										<div className="ml-7 space-y-1 border-l-2 border-zinc-200 pl-3 pt-1">
											<button onClick={() => setActiveNav("bills")} className={`block w-full text-left py-1.5 transition ${activeNav === "bills" || activeNav === "create-bill" ? "text-indigo-600 font-bold" : "hover:text-zinc-900"}`}>
												Purchase Bills
											</button>
											<button onClick={() => setActiveNav("vendors")} className={`block w-full text-left py-1.5 transition ${activeNav === "vendors" ? "text-indigo-600 font-bold" : "hover:text-zinc-900"}`}>
												Vendors
											</button>
										</div>
									)}
								</div>

								{/* Banking Group */}
								<div>
									<button onClick={() => setBankingOpen(!bankingOpen)} className="w-full flex items-center justify-between rounded-xl px-3.5 py-2.5 hover:bg-zinc-200/60 hover:text-zinc-900">
										<div className="flex items-center gap-3">🏦 Banking</div>
										<span className="text-[10px] text-zinc-400">{bankingOpen ? "▲" : "▼"}</span>
									</button>
									{bankingOpen && (
										<div className="ml-7 space-y-1 border-l-2 border-zinc-200 pl-3 pt-1">
											<button onClick={() => setActiveNav("banking-accounts")} className={`block w-full text-left py-1.5 transition ${activeNav === "banking-accounts" ? "text-indigo-600 font-bold" : "hover:text-zinc-900"}`}>Accounts</button>
											<button onClick={() => setActiveNav("banking-transactions")} className={`block w-full text-left py-1.5 transition ${activeNav === "banking-transactions" ? "text-indigo-600 font-bold" : "hover:text-zinc-900"}`}>Transactions</button>
											<button onClick={() => setActiveNav("banking-transfers")} className={`block w-full text-left py-1.5 transition ${activeNav === "banking-transfers" ? "text-indigo-600 font-bold" : "hover:text-zinc-900"}`}>Transfers</button>
											<button onClick={() => setActiveNav("banking-reconciliations")} className={`block w-full text-left py-1.5 transition ${activeNav === "banking-reconciliations" ? "text-indigo-600 font-bold" : "hover:text-zinc-900"}`}>Reconciliations</button>
										</div>
									)}
								</div>

								<button onClick={() => setActiveNav("reports")} className={`w-full flex items-center gap-3 rounded-xl px-3.5 py-2.5 transition ${activeNav === "reports" ? "bg-indigo-600 text-white shadow-sm" : "hover:bg-zinc-200/60 hover:text-zinc-900"}`}>
									📈 Financial Reports
								</button>
							</nav>
						</div>

						<div className="pt-4 border-t border-zinc-200">
							<button onClick={() => setActiveNav("switch")} className="w-full flex items-center justify-between rounded-xl bg-white border border-zinc-200 px-3.5 py-2.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 shadow-sm">
								<div className="flex items-center gap-2"><span>🔄</span><span>Switch Company</span></div>
								<span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-600 border border-indigo-100">Active</span>
							</button>
						</div>
					</aside>

					{/* Content View Routing */}
					<main className="flex-1 p-7 overflow-y-auto bg-white">
						
						{/* 1️⃣ DASHBOARD VIEW */}
						{activeNav === "dashboard" && (
							<div className="space-y-6">
								<div className="flex items-center justify-between border-b border-zinc-200 pb-5">
									<div>
										<h2 className="text-xl font-bold text-zinc-900">Executive Cockpit</h2>
										<p className="text-xs text-zinc-500">Live operational overview of cashflows, sales, purchases, and liquid balances.</p>
									</div>
									<div className="flex items-center gap-3">
										<button onClick={() => setActiveNav("create-invoice")} className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-indigo-500">+ New Invoice</button>
										<button onClick={() => setActiveNav("create-bill")} className="rounded-xl border border-zinc-300 bg-white px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 shadow-sm">+ Add Bill</button>
									</div>
								</div>

								<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
									<div className="rounded-2xl border border-zinc-200 bg-zinc-50/50 p-5 shadow-sm">
										<p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Total Sales (Paid)</p>
										<p className="mt-1 text-2xl font-bold text-emerald-600">${totalPaidSales.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
									</div>
									<div className="rounded-2xl border border-zinc-200 bg-zinc-50/50 p-5 shadow-sm">
										<p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Open Receivables</p>
										<p className="mt-1 text-2xl font-bold text-amber-600">${totalPendingReceivables.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
									</div>
									<div className="rounded-2xl border border-zinc-200 bg-zinc-50/50 p-5 shadow-sm">
										<p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Purchases & Bills</p>
										<p className="mt-1 text-2xl font-bold text-rose-600">${totalPaidBills.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
									</div>
									<div className="rounded-2xl border border-zinc-200 bg-zinc-50/50 p-5 shadow-sm">
										<p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Net Profit</p>
										<p className={`mt-1 text-2xl font-bold ${netProfitMargin >= 0 ? "text-indigo-600" : "text-rose-600"}`}>
											${netProfitMargin.toLocaleString("en-US", { minimumFractionDigits: 2 })}
										</p>
									</div>
								</div>

								<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
									<div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm space-y-4">
										<div className="flex items-center justify-between border-b border-zinc-100 pb-3">
											<h3 className="font-semibold text-zinc-900">Recent Sales Invoices</h3>
											<button onClick={() => setActiveNav("invoices")} className="text-xs font-semibold text-indigo-600 hover:underline">View All →</button>
										</div>
										<div className="divide-y divide-zinc-100 text-xs">
											{invoices.map((inv) => (
												<div key={inv.id} className="flex items-center justify-between py-2.5">
													<div>
														<p className="font-semibold text-zinc-900">{inv.customerName}</p>
														<p className="text-[11px] text-zinc-500">{inv.number} • Due {inv.dueDate}</p>
													</div>
													<div className="text-right">
														<p className="font-semibold text-zinc-900">${inv.total.toFixed(2)}</p>
														<span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${
															inv.status === "PAID" ? "bg-emerald-50 text-emerald-700" : inv.status === "PENDING" ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700"
														}`}>{inv.status}</span>
													</div>
												</div>
											))}
										</div>
									</div>

									<div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm space-y-4">
										<div className="flex items-center justify-between border-b border-zinc-100 pb-3">
											<h3 className="font-semibold text-zinc-900">Recent Purchase Bills</h3>
											<button onClick={() => setActiveNav("bills")} className="text-xs font-semibold text-indigo-600 hover:underline">View All →</button>
										</div>
										<div className="divide-y divide-zinc-100 text-xs">
											{bills.map((b) => (
												<div key={b.id} className="flex items-center justify-between py-2.5">
													<div>
														<p className="font-semibold text-zinc-900">{b.vendorName}</p>
														<p className="text-[11px] text-zinc-500">{b.number} • {b.category}</p>
													</div>
													<div className="text-right">
														<p className="font-semibold text-rose-600">-${b.total.toFixed(2)}</p>
														<span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${
															b.status === "PAID" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
														}`}>{b.status}</span>
													</div>
												</div>
											))}
										</div>
									</div>
								</div>
							</div>
						)}

						{/* 2️⃣ ITEMS CATALOG MODULE */}
						{activeNav === "items" && (
							<div className="space-y-4">
								<div className="flex items-center justify-between border-b border-zinc-200 pb-4">
									<div>
										<h2 className="text-xl font-bold text-zinc-900">Items & Products Catalog</h2>
										<p className="text-xs text-zinc-500">Inventory items and services catalog used across Invoices & Bills.</p>
									</div>
									<button onClick={() => setShowItemModal(true)} className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-indigo-500">+ Add Catalog Item</button>
								</div>

								<div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
									<table className="w-full text-left text-xs">
										<thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-600 font-semibold uppercase">
											<tr>
												<th className="p-4">Item Name</th>
												<th className="p-4">SKU</th>
												<th className="p-4">Category</th>
												<th className="p-4">Sale Price</th>
												<th className="p-4">Purchase Price</th>
												<th className="p-4">Tax Rate</th>
											</tr>
										</thead>
										<tbody className="divide-y divide-zinc-100">
											{items.map((itm) => (
												<tr key={itm.id} className="hover:bg-zinc-50">
													<td className="p-4 font-semibold text-zinc-900">{itm.name}<p className="text-[11px] font-normal text-zinc-500">{itm.description}</p></td>
													<td className="p-4 text-zinc-500">{itm.sku}</td>
													<td className="p-4"><span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-700">{itm.category}</span></td>
													<td className="p-4 font-semibold text-emerald-600">${itm.salePrice.toFixed(2)}</td>
													<td className="p-4 font-semibold text-zinc-600">${itm.purchasePrice.toFixed(2)}</td>
													<td className="p-4 text-zinc-500">{itm.taxRate}</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							</div>
						)}

						{/* 3️⃣ SALES: INVOICES STUDIO & BUILDER */}
						{activeNav === "invoices" && (
							<div className="space-y-4">
								<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-200 pb-4">
									<div>
										<h2 className="text-xl font-bold text-zinc-900">Sales Invoices Studio</h2>
										<p className="text-xs text-zinc-500">Manage client billing, create itemized invoices, and track payments.</p>
									</div>
									<button onClick={() => setActiveNav("create-invoice")} className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow hover:bg-indigo-500">
										+ Create New Invoice
									</button>
								</div>

								<div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
									<table className="w-full text-left text-xs">
										<thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-600 font-semibold uppercase">
											<tr>
												<th className="p-4">Invoice #</th>
												<th className="p-4">Customer</th>
												<th className="p-4">Date</th>
												<th className="p-4">Due Date</th>
												<th className="p-4">Subtotal</th>
												<th className="p-4">Grand Total</th>
												<th className="p-4">Status</th>
												<th className="p-4 text-right">Actions</th>
											</tr>
										</thead>
										<tbody className="divide-y divide-zinc-100">
											{invoices.map((inv) => (
												<tr key={inv.id} className="hover:bg-zinc-50">
													<td className="p-4 font-bold text-indigo-900">{inv.number}</td>
													<td className="p-4 font-medium text-zinc-900">{inv.customerName}</td>
													<td className="p-4 text-zinc-500">{inv.date}</td>
													<td className="p-4 text-zinc-500">{inv.dueDate}</td>
													<td className="p-4 text-zinc-600">${inv.subtotal.toFixed(2)}</td>
													<td className="p-4 font-bold text-zinc-900">${inv.total.toFixed(2)}</td>
													<td className="p-4">
														<span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
															inv.status === "PAID" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : inv.status === "PENDING" ? "bg-amber-50 text-amber-700 border border-amber-200" : "bg-rose-50 text-rose-700 border border-rose-200"
														}`}>{inv.status}</span>
													</td>
													<td className="p-4 text-right space-x-2">
														<button onClick={() => { setSelectedInvoice(inv); setActiveNav("view-invoice"); }} className="font-semibold text-indigo-600 hover:underline">View / PDF</button>
														<button onClick={() => { setInvoices(invoices.map(i => i.id === inv.id ? { ...i, status: i.status === "PAID" ? "PENDING" : "PAID" } : i)); showToast(`Updated ${inv.number}`); }} className="font-semibold text-zinc-500 hover:text-zinc-900">Toggle</button>
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							</div>
						)}

						{/* 4️⃣ CREATE INVOICE STUDIO */}
						{activeNav === "create-invoice" && (
							<div className="space-y-6 max-w-4xl">
								<div className="flex items-center justify-between border-b border-zinc-200 pb-4">
									<div>
										<h2 className="text-xl font-bold text-zinc-900">Create Invoice (Akaunting Studio)</h2>
										<p className="text-xs text-zinc-500">Itemized sales invoice document generator with multi-tax & line items.</p>
									</div>
									<button onClick={() => setActiveNav("invoices")} className="text-xs font-semibold text-zinc-600 hover:underline">← Back to List</button>
								</div>

								<form onSubmit={(e) => handleSaveInvoiceStudio(e, false)} className="space-y-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
									<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
										<div><label className="block text-xs font-semibold text-zinc-700">Customer Name *</label><input type="text" required value={invCustomerName} onChange={(e) => setInvCustomerName(e.target.value)} placeholder="Acme Global Enterprise" className="mt-1 h-9 w-full rounded-xl border border-zinc-300 px-3 text-xs" /></div>
										<div><label className="block text-xs font-semibold text-zinc-700">Customer Email</label><input type="email" value={invCustomerEmail} onChange={(e) => setInvCustomerEmail(e.target.value)} placeholder="billing@customer.com" className="mt-1 h-9 w-full rounded-xl border border-zinc-300 px-3 text-xs" /></div>
										<div><label className="block text-xs font-semibold text-zinc-700">PO / Reference #</label><input type="text" value={invPoNumber} onChange={(e) => setInvPoNumber(e.target.value)} placeholder="PO-2026-99" className="mt-1 h-9 w-full rounded-xl border border-zinc-300 px-3 text-xs" /></div>
										<div><label className="block text-xs font-semibold text-zinc-700">Invoice Date</label><input type="date" value={invDate} onChange={(e) => setInvDate(e.target.value)} className="mt-1 h-9 w-full rounded-xl border border-zinc-300 px-3 text-xs" /></div>
										<div><label className="block text-xs font-semibold text-zinc-700">Due Date</label><input type="date" value={invDueDate} onChange={(e) => setInvDueDate(e.target.value)} className="mt-1 h-9 w-full rounded-xl border border-zinc-300 px-3 text-xs" /></div>
										<div><label className="block text-xs font-semibold text-zinc-700">Billing Address</label><input type="text" value={invCustomerAddress} onChange={(e) => setInvCustomerAddress(e.target.value)} placeholder="100 Commercial Blvd" className="mt-1 h-9 w-full rounded-xl border border-zinc-300 px-3 text-xs" /></div>
									</div>

									{/* Line Items */}
									<div className="space-y-3 pt-4 border-t border-zinc-200">
										<div className="flex items-center justify-between">
											<h3 className="text-sm font-bold text-zinc-900">Line Items & Services</h3>
											<button type="button" onClick={() => setInvLineItems([...invLineItems, { id: `li-${Date.now()}`, itemName: "New Item", description: "Item description", qty: 1, price: 100.00, taxRate: 18, subtotal: 100.00 }])} className="rounded-xl bg-zinc-100 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-200">+ Add Line Item</button>
										</div>

										<div className="overflow-hidden rounded-xl border border-zinc-200">
											<table className="w-full text-left text-xs">
												<thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 font-semibold uppercase">
													<tr><th className="p-3">Item</th><th className="p-3">Description</th><th className="p-3 w-20">Qty</th><th className="p-3 w-24">Price ($)</th><th className="p-3 w-20">Tax (%)</th><th className="p-3 text-right">Subtotal</th><th className="p-3 w-10"></th></tr>
												</thead>
												<tbody className="divide-y divide-zinc-100">
													{invLineItems.map((item) => (
														<tr key={item.id}>
															<td className="p-3"><input type="text" value={item.itemName} onChange={(e) => setInvLineItems(invLineItems.map(i => i.id === item.id ? { ...i, itemName: e.target.value } : i))} className="h-8 w-full rounded border px-2 text-xs" /></td>
															<td className="p-3"><input type="text" value={item.description} onChange={(e) => setInvLineItems(invLineItems.map(i => i.id === item.id ? { ...i, description: e.target.value } : i))} className="h-8 w-full rounded border px-2 text-xs" /></td>
															<td className="p-3"><input type="number" value={item.qty} onChange={(e) => setInvLineItems(invLineItems.map(i => i.id === item.id ? { ...i, qty: Number(e.target.value), subtotal: Number(e.target.value) * i.price } : i))} className="h-8 w-full rounded border px-2 text-xs" /></td>
															<td className="p-3"><input type="number" value={item.price} onChange={(e) => setInvLineItems(invLineItems.map(i => i.id === item.id ? { ...i, price: Number(e.target.value), subtotal: i.qty * Number(e.target.value) } : i))} className="h-8 w-full rounded border px-2 text-xs" /></td>
															<td className="p-3"><input type="number" value={item.taxRate} onChange={(e) => setInvLineItems(invLineItems.map(i => i.id === item.id ? { ...i, taxRate: Number(e.target.value) } : i))} className="h-8 w-full rounded border px-2 text-xs" /></td>
															<td className="p-3 text-right font-bold text-zinc-900">${item.subtotal.toFixed(2)}</td>
															<td className="p-3 text-center"><button type="button" onClick={() => setInvLineItems(invLineItems.filter(i => i.id !== item.id))} className="text-rose-600 font-bold">✕</button></td>
														</tr>
													))}
												</tbody>
											</table>
										</div>
									</div>

									{/* Calculation Summary */}
									<div className="grid grid-cols-1 gap-6 md:grid-cols-2 pt-4 border-t border-zinc-200">
										<div><label className="block text-xs font-semibold text-zinc-700">Notes & Payment Terms</label><textarea rows={4} value={invNotes} onChange={(e) => setInvNotes(e.target.value)} className="mt-1 w-full rounded-xl border p-3 text-xs" /></div>
										<div className="space-y-3 rounded-xl bg-zinc-50 p-4 border border-zinc-200 text-xs">
											<div className="flex justify-between"><span>Subtotal:</span><span className="font-semibold">${invSubtotal.toFixed(2)}</span></div>
											<div className="flex justify-between items-center"><span>Discount ($):</span><input type="number" value={invDiscount} onChange={(e) => setInvDiscount(e.target.value)} className="h-7 w-24 rounded border px-2 text-right text-xs" /></div>
											<div className="flex justify-between"><span>Tax Total:</span><span className="font-semibold">${invTaxTotal.toFixed(2)}</span></div>
											<div className="flex justify-between text-base font-bold text-zinc-900 pt-2 border-t"><span>Grand Total ($):</span><span className="text-indigo-600">${invGrandTotal.toFixed(2)}</span></div>
										</div>
									</div>

									<div className="flex justify-end gap-3 pt-4 border-t border-zinc-200">
										<button type="button" onClick={() => setActiveNav("invoices")} className="rounded-xl border px-5 py-2.5 text-xs font-semibold">Cancel</button>
										<button type="submit" className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white">Save Invoice Draft</button>
										<button type="button" onClick={(e) => handleSaveInvoiceStudio(e, true)} className="rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-semibold text-white">Save & Mark Paid</button>
									</div>
								</form>
							</div>
						)}

						{/* 5️⃣ VIEW / PRINT INVOICE DOCUMENT */}
						{activeNav === "view-invoice" && selectedInvoice && (
							<div className="space-y-6 max-w-3xl">
								<div className="flex items-center justify-between border-b border-zinc-200 pb-4">
									<button onClick={() => setActiveNav("invoices")} className="text-xs font-semibold text-indigo-600 hover:underline">← Back to Invoices List</button>
									<button onClick={() => window.print()} className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow">🖨️ Print / Save PDF</button>
								</div>

								<div className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-xl space-y-6">
									<div className="flex justify-between items-start border-b pb-6">
										<div><h1 className="text-2xl font-bold text-zinc-900">INVOICE</h1><p className="text-xs text-zinc-500">{selectedInvoice.number}</p></div>
										<span className="rounded-full bg-emerald-100 text-emerald-800 px-3 py-1 text-xs font-bold">{selectedInvoice.status}</span>
									</div>

									<div className="grid grid-cols-2 gap-6 text-xs">
										<div><p className="font-bold text-zinc-400 uppercase">Billed To:</p><p className="font-bold text-zinc-900 text-sm mt-1">{selectedInvoice.customerName}</p><p className="text-zinc-600">{selectedInvoice.customerEmail}</p></div>
										<div className="text-right"><p className="text-zinc-500">Invoice Date: <span className="font-semibold text-zinc-900">{selectedInvoice.date}</span></p><p className="text-zinc-500 mt-1">Due Date: <span className="font-semibold text-zinc-900">{selectedInvoice.dueDate}</span></p></div>
									</div>

									<div className="overflow-hidden rounded-xl border border-zinc-200">
										<table className="w-full text-left text-xs">
											<thead className="bg-zinc-50 text-zinc-600 font-semibold border-b">
												<tr><th className="p-3">Item</th><th className="p-3">Qty</th><th className="p-3">Price</th><th className="p-3 text-right">Subtotal</th></tr>
											</thead>
											<tbody className="divide-y divide-zinc-100">
												{selectedInvoice.items.map((item) => (
													<tr key={item.id}><td className="p-3 font-semibold text-zinc-900">{item.itemName}</td><td className="p-3">{item.qty}</td><td className="p-3">${item.price.toFixed(2)}</td><td className="p-3 text-right font-bold">${item.subtotal.toFixed(2)}</td></tr>
												))}
											</tbody>
										</table>
									</div>

									<div className="flex justify-end pt-2 text-xs">
										<div className="w-64 space-y-2 border-t pt-3">
											<div className="flex justify-between"><span>Subtotal:</span><span>${selectedInvoice.subtotal.toFixed(2)}</span></div>
											<div className="flex justify-between"><span>Tax:</span><span>${selectedInvoice.taxTotal.toFixed(2)}</span></div>
											<div className="flex justify-between text-base font-bold text-zinc-900 border-t pt-2"><span>Total:</span><span className="text-indigo-600">${selectedInvoice.total.toFixed(2)}</span></div>
										</div>
									</div>
								</div>
							</div>
						)}

						{/* 6️⃣ PURCHASES: BILLS LIST STUDIO */}
						{activeNav === "bills" && (
							<div className="space-y-4">
								<div className="flex items-center justify-between border-b border-zinc-200 pb-4">
									<div>
										<h2 className="text-xl font-bold text-zinc-900">Purchase Bills Studio</h2>
										<p className="text-xs text-zinc-500">Record supplier purchases, manage operational costs, and pay vendor bills.</p>
									</div>
									<button onClick={() => setActiveNav("create-bill")} className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow hover:bg-indigo-500">+ Record New Bill</button>
								</div>

								<div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
									<table className="w-full text-left text-xs">
										<thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-600 font-semibold uppercase">
											<tr>
												<th className="p-4">Bill #</th>
												<th className="p-4">Vendor</th>
												<th className="p-4">Category</th>
												<th className="p-4">Date</th>
												<th className="p-4">Due Date</th>
												<th className="p-4">Amount</th>
												<th className="p-4">Status</th>
												<th className="p-4 text-right">Actions</th>
											</tr>
										</thead>
										<tbody className="divide-y divide-zinc-100">
											{bills.map((b) => (
												<tr key={b.id} className="hover:bg-zinc-50">
													<td className="p-4 font-bold text-indigo-900">{b.number}</td>
													<td className="p-4 font-medium text-zinc-900">{b.vendorName}</td>
													<td className="p-4 text-zinc-600">{b.category}</td>
													<td className="p-4 text-zinc-500">{b.date}</td>
													<td className="p-4 text-zinc-500">{b.dueDate}</td>
													<td className="p-4 font-bold text-rose-600">-${b.total.toFixed(2)}</td>
													<td className="p-4">
														<span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
															b.status === "PAID" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-amber-50 text-amber-700 border border-amber-200"
														}`}>{b.status}</span>
													</td>
													<td className="p-4 text-right space-x-2">
														<button onClick={() => { setSelectedBill(b); setActiveNav("view-bill"); }} className="font-semibold text-indigo-600 hover:underline">View</button>
														<button onClick={() => { setBills(bills.map(item => item.id === b.id ? { ...item, status: item.status === "PAID" ? "UNPAID" : "PAID" } : item)); showToast(`Updated status for ${b.number}`); }} className="font-semibold text-zinc-500 hover:text-zinc-900">Toggle</button>
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							</div>
						)}

						{/* 7️⃣ CREATE BILL STUDIO */}
						{activeNav === "create-bill" && (
							<div className="space-y-6 max-w-4xl">
								<div className="flex items-center justify-between border-b border-zinc-200 pb-4">
									<div>
										<h2 className="text-xl font-bold text-zinc-900">Record Purchase Bill (Akaunting Studio)</h2>
										<p className="text-xs text-zinc-500">Record vendor invoice details, expense categories, and line items.</p>
									</div>
									<button onClick={() => setActiveNav("bills")} className="text-xs font-semibold text-zinc-600 hover:underline">← Back to Bills</button>
								</div>

								<form onSubmit={(e) => handleSaveBillStudio(e, false)} className="space-y-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
									<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
										<div><label className="block text-xs font-semibold text-zinc-700">Vendor Name *</label><input type="text" required value={billVendorName} onChange={(e) => setBillVendorName(e.target.value)} placeholder="Amazon Web Services" className="mt-1 h-9 w-full rounded-xl border border-zinc-300 px-3 text-xs" /></div>
										<div><label className="block text-xs font-semibold text-zinc-700">Vendor Email</label><input type="email" value={billVendorEmail} onChange={(e) => setBillVendorEmail(e.target.value)} placeholder="aws-billing@amazon.com" className="mt-1 h-9 w-full rounded-xl border border-zinc-300 px-3 text-xs" /></div>
										<div><label className="block text-xs font-semibold text-zinc-700">Expense Category</label><input type="text" value={billCategory} onChange={(e) => setBillCategory(e.target.value)} placeholder="Software & Cloud" className="mt-1 h-9 w-full rounded-xl border border-zinc-300 px-3 text-xs" /></div>
										<div><label className="block text-xs font-semibold text-zinc-700">Vendor PO / Ref #</label><input type="text" value={billPoNumber} onChange={(e) => setBillPoNumber(e.target.value)} placeholder="PO-AWS-88" className="mt-1 h-9 w-full rounded-xl border border-zinc-300 px-3 text-xs" /></div>
										<div><label className="block text-xs font-semibold text-zinc-700">Bill Date</label><input type="date" value={billDate} onChange={(e) => setBillDate(e.target.value)} className="mt-1 h-9 w-full rounded-xl border border-zinc-300 px-3 text-xs" /></div>
										<div><label className="block text-xs font-semibold text-zinc-700">Due Date</label><input type="date" value={billDueDate} onChange={(e) => setBillDueDate(e.target.value)} className="mt-1 h-9 w-full rounded-xl border border-zinc-300 px-3 text-xs" /></div>
									</div>

									{/* Line Items */}
									<div className="space-y-3 pt-4 border-t border-zinc-200">
										<div className="flex items-center justify-between">
											<h3 className="text-sm font-bold text-zinc-900">Purchased Items & Services</h3>
											<button type="button" onClick={() => setBillLineItems([...billLineItems, { id: `bli-${Date.now()}`, itemName: "Purchase Item", description: "Expense item", qty: 1, price: 100.00, taxRate: 18, subtotal: 100.00 }])} className="rounded-xl bg-zinc-100 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-200">+ Add Expense Line</button>
										</div>

										<div className="overflow-hidden rounded-xl border border-zinc-200">
											<table className="w-full text-left text-xs">
												<thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 font-semibold uppercase">
													<tr><th className="p-3">Item</th><th className="p-3">Description</th><th className="p-3 w-20">Qty</th><th className="p-3 w-24">Price ($)</th><th className="p-3 text-right">Subtotal</th><th className="p-3 w-10"></th></tr>
												</thead>
												<tbody className="divide-y divide-zinc-100">
													{billLineItems.map((item) => (
														<tr key={item.id}>
															<td className="p-3"><input type="text" value={item.itemName} onChange={(e) => setBillLineItems(billLineItems.map(i => i.id === item.id ? { ...i, itemName: e.target.value } : i))} className="h-8 w-full rounded border px-2 text-xs" /></td>
															<td className="p-3"><input type="text" value={item.description} onChange={(e) => setBillLineItems(billLineItems.map(i => i.id === item.id ? { ...i, description: e.target.value } : i))} className="h-8 w-full rounded border px-2 text-xs" /></td>
															<td className="p-3"><input type="number" value={item.qty} onChange={(e) => setBillLineItems(billLineItems.map(i => i.id === item.id ? { ...i, qty: Number(e.target.value), subtotal: Number(e.target.value) * i.price } : i))} className="h-8 w-full rounded border px-2 text-xs" /></td>
															<td className="p-3"><input type="number" value={item.price} onChange={(e) => setBillLineItems(billLineItems.map(i => i.id === item.id ? { ...i, price: Number(e.target.value), subtotal: i.qty * Number(e.target.value) } : i))} className="h-8 w-full rounded border px-2 text-xs" /></td>
															<td className="p-3 text-right font-bold text-zinc-900">${item.subtotal.toFixed(2)}</td>
															<td className="p-3 text-center"><button type="button" onClick={() => setBillLineItems(billLineItems.filter(i => i.id !== item.id))} className="text-rose-600 font-bold">✕</button></td>
														</tr>
													))}
												</tbody>
											</table>
										</div>
									</div>

									<div className="flex justify-between items-center pt-4 border-t border-zinc-200 text-xs">
										<span className="text-zinc-500">Subtotal: ${billSubtotal.toFixed(2)} • Tax: ${billTaxTotal.toFixed(2)}</span>
										<div className="text-base font-bold text-zinc-900">Total Bill ($): <span className="text-rose-600">${billGrandTotal.toFixed(2)}</span></div>
									</div>

									<div className="flex justify-end gap-3 pt-4 border-t border-zinc-200">
										<button type="button" onClick={() => setActiveNav("bills")} className="rounded-xl border px-5 py-2.5 text-xs font-semibold">Cancel</button>
										<button type="submit" className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white">Save Bill Record</button>
										<button type="button" onClick={(e) => handleSaveBillStudio(e, true)} className="rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-semibold text-white">Save & Mark Paid</button>
									</div>
								</form>
							</div>
						)}

						{/* 8️⃣ VIEW BILL DOCUMENT */}
						{activeNav === "view-bill" && selectedBill && (
							<div className="space-y-6 max-w-3xl">
								<div className="flex items-center justify-between border-b border-zinc-200 pb-4">
									<button onClick={() => setActiveNav("bills")} className="text-xs font-semibold text-indigo-600 hover:underline">← Back to Bills List</button>
									<button onClick={() => window.print()} className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow">🖨️ Print Bill Record</button>
								</div>

								<div className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-xl space-y-6">
									<div className="flex justify-between items-start border-b pb-6">
										<div><h1 className="text-2xl font-bold text-zinc-900">PURCHASE BILL</h1><p className="text-xs text-zinc-500">{selectedBill.number}</p></div>
										<span className="rounded-full bg-emerald-100 text-emerald-800 px-3 py-1 text-xs font-bold">{selectedBill.status}</span>
									</div>

									<div className="grid grid-cols-2 gap-6 text-xs">
										<div><p className="font-bold text-zinc-400 uppercase">Vendor / Supplier:</p><p className="font-bold text-zinc-900 text-sm mt-1">{selectedBill.vendorName}</p><p className="text-zinc-600">{selectedBill.vendorEmail}</p></div>
										<div className="text-right"><p className="text-zinc-500">Bill Date: <span className="font-semibold text-zinc-900">{selectedBill.date}</span></p><p className="text-zinc-500 mt-1">Due Date: <span className="font-semibold text-zinc-900">{selectedBill.dueDate}</span></p></div>
									</div>

									<div className="overflow-hidden rounded-xl border border-zinc-200">
										<table className="w-full text-left text-xs">
											<thead className="bg-zinc-50 text-zinc-600 font-semibold border-b">
												<tr><th className="p-3">Item</th><th className="p-3">Qty</th><th className="p-3">Price</th><th className="p-3 text-right">Subtotal</th></tr>
											</thead>
											<tbody className="divide-y divide-zinc-100">
												{selectedBill.items.map((item) => (
													<tr key={item.id}><td className="p-3 font-semibold text-zinc-900">{item.itemName}</td><td className="p-3">{item.qty}</td><td className="p-3">${item.price.toFixed(2)}</td><td className="p-3 text-right font-bold">${item.subtotal.toFixed(2)}</td></tr>
												))}
											</tbody>
										</table>
									</div>

									<div className="flex justify-end pt-2 text-xs">
										<div className="w-64 space-y-2 border-t pt-3">
											<div className="flex justify-between font-bold text-base text-zinc-900"><span>Grand Total:</span><span className="text-rose-600">${selectedBill.total.toFixed(2)}</span></div>
										</div>
									</div>
								</div>
							</div>
						)}

						{/* 9️⃣ CUSTOMERS DIRECTORY STUDIO */}
						{activeNav === "customers" && (
							<div className="space-y-4">
								<div className="flex items-center justify-between border-b border-zinc-200 pb-4">
									<div>
										<h2 className="text-xl font-bold text-zinc-900">Customers Directory</h2>
										<p className="text-xs text-zinc-500">Customer directory, billing addresses, and receivable ledgers.</p>
									</div>
									<button onClick={() => { setNewContactType("CUSTOMER"); setShowContactModal(true); }} className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-indigo-500">+ Add New Customer</button>
								</div>

								<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
									{contacts.filter(c => c.type === "CUSTOMER").map((cnt) => (
										<div key={cnt.id} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm space-y-2">
											<div className="flex items-center justify-between">
												<h3 className="font-semibold text-zinc-900">{cnt.name}</h3>
												<span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">{cnt.taxNumber}</span>
											</div>
											<p className="text-xs text-zinc-500">{cnt.email}</p>
											<p className="text-xs text-zinc-400">{cnt.phone}</p>
											<p className="text-xs text-zinc-400 truncate">{cnt.address}</p>
											<div className="pt-2 border-t border-zinc-100 flex items-center justify-between text-xs">
												<span className="text-zinc-500">Receivable Balance:</span>
												<span className="font-semibold text-zinc-900">${cnt.balance.toFixed(2)}</span>
											</div>
										</div>
									))}
								</div>
							</div>
						)}

						{/* 🔟 VENDORS DIRECTORY STUDIO */}
						{activeNav === "vendors" && (
							<div className="space-y-4">
								<div className="flex items-center justify-between border-b border-zinc-200 pb-4">
									<div>
										<h2 className="text-xl font-bold text-zinc-900">Vendors Directory</h2>
										<p className="text-xs text-zinc-500">Supplier contacts, tax registration numbers, and payable accounts.</p>
									</div>
									<button onClick={() => { setNewContactType("VENDOR"); setShowContactModal(true); }} className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-indigo-500">+ Add New Vendor</button>
								</div>

								<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
									{contacts.filter(c => c.type === "VENDOR").map((cnt) => (
										<div key={cnt.id} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm space-y-2">
											<div className="flex items-center justify-between">
												<h3 className="font-semibold text-zinc-900">{cnt.name}</h3>
												<span className="rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-semibold text-purple-700">{cnt.taxNumber}</span>
											</div>
											<p className="text-xs text-zinc-500">{cnt.email}</p>
											<p className="text-xs text-zinc-400">{cnt.phone}</p>
											<p className="text-xs text-zinc-400 truncate">{cnt.address}</p>
											<div className="pt-2 border-t border-zinc-100 flex items-center justify-between text-xs">
												<span className="text-zinc-500">Payable Balance:</span>
												<span className="font-semibold text-rose-600">${cnt.balance.toFixed(2)}</span>
											</div>
										</div>
									))}
								</div>
							</div>
						)}

						{/* 1️⃣1️⃣ BANKING ACCOUNTS */}
						{activeNav === "banking-accounts" && (
							<div className="space-y-4">
								<div className="flex items-center justify-between border-b border-zinc-200 pb-4">
									<div>
										<h2 className="text-xl font-bold text-zinc-900">Bank & Cash Accounts Studio</h2>
										<p className="text-xs text-zinc-500">Monitor bank checking accounts, tax reserve accounts, and petty cash.</p>
									</div>
									<button onClick={() => setShowBankModal(true)} className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-indigo-500">+ Add Bank Account</button>
								</div>
								<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
									{bankAccounts.map((acc) => (
										<div key={acc.id} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm space-y-2">
											<p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">{acc.bankName}</p>
											<h3 className="font-bold text-zinc-900">{acc.name}</h3>
											<p className="text-2xl font-bold text-indigo-950">${acc.balance.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
											<p className="text-xs text-zinc-500">Number: {acc.number} • Currency: {acc.currency}</p>
										</div>
									))}
								</div>
							</div>
						)}

						{/* 1️⃣2️⃣ BANKING TRANSACTIONS */}
						{activeNav === "banking-transactions" && (
							<div className="space-y-4">
								<div className="flex items-center justify-between border-b border-zinc-200 pb-4">
									<div>
										<h2 className="text-xl font-bold text-zinc-900">Banking Transactions Ledger</h2>
										<p className="text-xs text-zinc-500">Complete bank transactions ledger and cash journal logs.</p>
									</div>
									<button onClick={() => setShowTxModal(true)} className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-indigo-500">+ Log Journal Entry</button>
								</div>
								<div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
									<table className="w-full text-left text-xs">
										<thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-600 font-semibold uppercase">
											<tr>
												<th className="p-4">Reference</th>
												<th className="p-4">Date</th>
												<th className="p-4">Account</th>
												<th className="p-4">Category</th>
												<th className="p-4">Description</th>
												<th className="p-4">Amount</th>
												<th className="p-4">Status</th>
											</tr>
										</thead>
										<tbody className="divide-y divide-zinc-100">
											{transactions.map((tx) => (
												<tr key={tx.id} className="hover:bg-zinc-50">
													<td className="p-4 font-bold text-indigo-900">{tx.reference}</td>
													<td className="p-4 text-zinc-500">{tx.date}</td>
													<td className="p-4 font-medium text-zinc-900">{tx.account}</td>
													<td className="p-4 text-zinc-600">{tx.category}</td>
													<td className="p-4 text-zinc-600">{tx.description}</td>
													<td className={`p-4 font-bold ${tx.type === "INCOME" ? "text-emerald-600" : "text-rose-600"}`}>
														{tx.type === "INCOME" ? "+" : "-"}${tx.amount.toFixed(2)}
													</td>
													<td className="p-4"><span className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-[10px] font-semibold">RECONCILED</span></td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							</div>
						)}

						{/* 1️⃣3️⃣ BANKING TRANSFERS */}
						{activeNav === "banking-transfers" && (
							<div className="space-y-6">
								<div className="border-b border-zinc-200 pb-4">
									<h2 className="text-xl font-bold text-zinc-900">Fund Transfers Studio</h2>
									<p className="text-xs text-zinc-500">Execute internal transfers between checking, savings, and cash accounts.</p>
								</div>
								
								<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
									<form onSubmit={handleExecuteTransfer} className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm space-y-4">
										<h3 className="font-bold text-zinc-900 text-sm">Execute Internal Fund Transfer</h3>
										<div>
											<label className="block text-xs font-semibold text-zinc-600">From Account</label>
											<select value={trfFrom} onChange={(e) => setTrfFrom(e.target.value)} className="mt-1 h-9 w-full rounded-xl border border-zinc-300 px-3 text-xs bg-white">
												{bankAccounts.map(b => <option key={b.id} value={b.name}>{b.name} (${b.balance.toFixed(2)})</option>)}
											</select>
										</div>
										<div>
											<label className="block text-xs font-semibold text-zinc-600">To Account</label>
											<select value={trfTo} onChange={(e) => setTrfTo(e.target.value)} className="mt-1 h-9 w-full rounded-xl border border-zinc-300 px-3 text-xs bg-white">
												{bankAccounts.map(b => <option key={b.id} value={b.name}>{b.name} (${b.balance.toFixed(2)})</option>)}
											</select>
										</div>
										<div>
											<label className="block text-xs font-semibold text-zinc-600">Transfer Amount ($)</label>
											<input type="number" step="0.01" required value={trfAmount} onChange={(e) => setTrfAmount(e.target.value)} placeholder="1500.00" className="mt-1 h-9 w-full rounded-xl border border-zinc-300 px-3 text-xs" />
										</div>
										<div>
											<label className="block text-xs font-semibold text-zinc-600">Reference Note</label>
											<input type="text" value={trfRef} onChange={(e) => setTrfRef(e.target.value)} placeholder="TRF-88120" className="mt-1 h-9 w-full rounded-xl border border-zinc-300 px-3 text-xs" />
										</div>
										<button type="submit" className="w-full rounded-xl bg-indigo-600 py-2.5 text-xs font-semibold text-white hover:bg-indigo-500 shadow">Execute Fund Transfer</button>
									</form>

									<div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm space-y-4">
										<h3 className="font-bold text-zinc-900 text-sm">Transfers History Log</h3>
										<div className="divide-y divide-zinc-100 text-xs">
											{transfers.map((tr) => (
												<div key={tr.id} className="py-3 space-y-1">
													<div className="flex justify-between font-semibold text-zinc-900">
														<span>{tr.fromAccount} → {tr.toAccount}</span>
														<span className="text-indigo-600">${tr.amount.toFixed(2)}</span>
													</div>
													<p className="text-[11px] text-zinc-500">Ref: {tr.reference} • Date: {tr.date}</p>
												</div>
											))}
										</div>
									</div>
								</div>
							</div>
						)}

						{/* 1️⃣4️⃣ BANKING RECONCILIATIONS */}
						{activeNav === "banking-reconciliations" && (
							<div className="space-y-6">
								<div className="border-b border-zinc-200 pb-4">
									<h2 className="text-xl font-bold text-zinc-900">Bank Reconciliations Studio</h2>
									<p className="text-xs text-zinc-500">Reconcile physical bank statements against internal ledger transactions.</p>
								</div>
								
								<div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5 text-xs text-emerald-900 font-semibold flex items-center justify-between shadow-sm">
									<div>
										<p className="text-sm font-bold">✓ Bank Accounts 100% Reconciled</p>
										<p className="text-[11px] font-normal text-emerald-800">Ending Statement Balance matches Internal Ledger Balance (${totalLiquidCapital.toLocaleString("en-US", { minimumFractionDigits: 2 })}).</p>
									</div>
									<span className="rounded-full bg-emerald-600 text-white px-3.5 py-1 text-xs font-bold shadow">Cleared</span>
								</div>

								<div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm space-y-4">
									<h3 className="font-bold text-zinc-900 text-sm">Cleared Transactions Audit Log</h3>
									<div className="overflow-hidden rounded-xl border border-zinc-200">
										<table className="w-full text-left text-xs">
											<thead className="bg-zinc-50 border-b text-zinc-600 font-semibold uppercase">
												<tr><th className="p-3">Reference</th><th className="p-3">Account</th><th className="p-3">Type</th><th className="p-3">Amount</th><th className="p-3">Reconciliation State</th></tr>
											</thead>
											<tbody className="divide-y divide-zinc-100">
												{transactions.map((tx) => (
													<tr key={tx.id}>
														<td className="p-3 font-bold text-indigo-900">{tx.reference}</td>
														<td className="p-3">{tx.account}</td>
														<td className="p-3">{tx.type}</td>
														<td className="p-3 font-bold text-zinc-900">${tx.amount.toFixed(2)}</td>
														<td className="p-3"><span className="rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[10px] font-bold">MATCHED</span></td>
													</tr>
												))}
											</tbody>
										</table>
									</div>
								</div>
							</div>
						)}

						{/* 1️⃣5️⃣ REPORTS STUDIO */}
						{activeNav === "reports" && (
							<div className="space-y-6">
								<div className="border-b border-zinc-200 pb-4">
									<h2 className="text-xl font-bold text-zinc-900">Financial Reports Studio</h2>
									<p className="text-xs text-zinc-500">Automated Profit & Loss, Income Summaries, and Tax Audit Statements.</p>
								</div>

								<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
									<div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm space-y-4">
										<h3 className="font-bold text-zinc-900 text-sm">Profit & Loss Financial Statement</h3>
										<div className="divide-y divide-zinc-100 text-xs space-y-1">
											<div className="flex justify-between py-2.5"><span className="text-zinc-600">Gross Sales Income (Paid Invoices)</span><span className="font-semibold text-emerald-600">${totalPaidSales.toFixed(2)}</span></div>
											<div className="flex justify-between py-2.5"><span className="text-zinc-600">Operating Expenses & Bills</span><span className="font-semibold text-rose-600">-${totalPaidBills.toFixed(2)}</span></div>
											<div className="flex justify-between py-2.5 pt-4 font-bold text-sm"><span className="text-zinc-900">Net Profit Margin</span><span className={netProfitMargin >= 0 ? "text-indigo-600" : "text-rose-600"}>${netProfitMargin.toFixed(2)}</span></div>
										</div>
									</div>

									<div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm space-y-4">
										<h3 className="font-bold text-zinc-900 text-sm">Tax Audit Summary (GST / VAT)</h3>
										<div className="divide-y divide-zinc-100 text-xs space-y-1">
											<div className="flex justify-between py-2.5"><span className="text-zinc-600">Output Tax Collected (Sales)</span><span className="font-semibold text-emerald-600">${(totalPaidSales * 0.18).toFixed(2)}</span></div>
											<div className="flex justify-between py-2.5"><span className="text-zinc-600">Input Tax Credit (Purchases)</span><span className="font-semibold text-rose-600">-${(totalPaidBills * 0.18).toFixed(2)}</span></div>
											<div className="flex justify-between py-2.5 pt-4 font-bold text-sm"><span className="text-zinc-900">Net Tax Payable</span><span className="text-indigo-600">${((totalPaidSales - totalPaidBills) * 0.18).toFixed(2)}</span></div>
										</div>
									</div>
								</div>
							</div>
						)}

						{/* 1️⃣6️⃣ SWITCH COMPANY */}
						{activeNav === "switch" && (
							<div className="space-y-4">
								<div className="border-b border-zinc-200 pb-4">
									<h2 className="text-xl font-bold text-zinc-900">Switch Company Profile</h2>
									<p className="text-xs text-zinc-500">Multi-tenant company profile switcher.</p>
								</div>
								<div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm max-w-md space-y-3">
									<h3 className="font-semibold text-zinc-900 text-sm">Active Company Context</h3>
									<div className="rounded-xl bg-zinc-50 p-4 border border-zinc-200">
										<p className="font-bold text-indigo-900">{authUser?.organizationName || "Cambliss Enterprise Demo"}</p>
										<p className="text-xs text-zinc-500">Active Tenant ID • Admin Role</p>
									</div>
								</div>
							</div>
						)}
					</main>
				</div>
			</div>

			{/* ============================================================ */}
			{/* 🛠️ MODALS */}
			{/* ============================================================ */}
			{showItemModal && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
					<div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
						<h3 className="text-lg font-bold text-zinc-900">Add Catalog Item</h3>
						<form onSubmit={handleCreateItem} className="space-y-3">
							<div><label className="block text-xs font-semibold text-zinc-700">Item Name *</label><input type="text" required value={newItemName} onChange={(e) => setNewItemName(e.target.value)} placeholder="e.g. Cloud License" className="mt-1 h-9 w-full rounded-lg border px-3 text-xs" /></div>
							<div><label className="block text-xs font-semibold text-zinc-700">SKU Code</label><input type="text" value={newItemSku} onChange={(e) => setNewItemSku(e.target.value)} placeholder="SRV-100" className="mt-1 h-9 w-full rounded-lg border px-3 text-xs" /></div>
							<div><label className="block text-xs font-semibold text-zinc-700">Category</label><input type="text" value={newItemCategory} onChange={(e) => setNewItemCategory(e.target.value)} placeholder="Services / Software" className="mt-1 h-9 w-full rounded-lg border px-3 text-xs" /></div>
							<div><label className="block text-xs font-semibold text-zinc-700">Sale Price ($)</label><input type="number" step="0.01" required value={newItemSalePrice} onChange={(e) => setNewItemSalePrice(e.target.value)} placeholder="500.00" className="mt-1 h-9 w-full rounded-lg border px-3 text-xs" /></div>
							<div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => setShowItemModal(false)} className="rounded-lg border px-4 py-2 text-xs font-semibold">Cancel</button><button type="submit" className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white">Save Item</button></div>
						</form>
					</div>
				</div>
			)}

			{showBankModal && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
					<div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
						<h3 className="text-lg font-bold text-zinc-900">Add Bank Account</h3>
						<form onSubmit={handleCreateBankAccount} className="space-y-3">
							<div><label className="block text-xs font-semibold text-zinc-700">Account Name *</label><input type="text" required value={newBankName} onChange={(e) => setNewBankName(e.target.value)} placeholder="Operating Checking Account" className="mt-1 h-9 w-full rounded-lg border px-3 text-xs" /></div>
							<div><label className="block text-xs font-semibold text-zinc-700">Bank Name</label><input type="text" value={newBankBank} onChange={(e) => setNewBankBank(e.target.value)} placeholder="JPMorgan Chase Bank" className="mt-1 h-9 w-full rounded-lg border px-3 text-xs" /></div>
							<div><label className="block text-xs font-semibold text-zinc-700">Account Number</label><input type="text" value={newBankNum} onChange={(e) => setNewBankNum(e.target.value)} placeholder="**** 4892" className="mt-1 h-9 w-full rounded-lg border px-3 text-xs" /></div>
							<div><label className="block text-xs font-semibold text-zinc-700">Opening Balance ($)</label><input type="number" step="0.01" value={newBankBalance} onChange={(e) => setNewBankBalance(e.target.value)} placeholder="10000.00" className="mt-1 h-9 w-full rounded-lg border px-3 text-xs" /></div>
							<div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => setShowBankModal(false)} className="rounded-lg border px-4 py-2 text-xs font-semibold">Cancel</button><button type="submit" className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white">Save Account</button></div>
						</form>
					</div>
				</div>
			)}

			{showTxModal && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
					<div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
						<h3 className="text-lg font-bold text-zinc-900">Log Journal Transaction</h3>
						<form onSubmit={handleCreateTransaction} className="space-y-3">
							<div><label className="block text-xs font-semibold text-zinc-700">Account</label><select value={newTxAccount} onChange={(e) => setNewTxAccount(e.target.value)} className="mt-1 h-9 w-full rounded-lg border px-3 text-xs bg-white">{bankAccounts.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}</select></div>
							<div><label className="block text-xs font-semibold text-zinc-700">Transaction Type</label><select value={newTxType} onChange={(e) => setNewTxType(e.target.value as "INCOME" | "EXPENSE")} className="mt-1 h-9 w-full rounded-lg border px-3 text-xs bg-white"><option value="INCOME">Income (Deposit)</option><option value="EXPENSE">Expense (Withdrawal)</option></select></div>
							<div><label className="block text-xs font-semibold text-zinc-700">Amount ($)</label><input type="number" step="0.01" required value={newTxAmount} onChange={(e) => setNewTxAmount(e.target.value)} placeholder="500.00" className="mt-1 h-9 w-full rounded-lg border px-3 text-xs" /></div>
							<div><label className="block text-xs font-semibold text-zinc-700">Description</label><input type="text" value={newTxDesc} onChange={(e) => setNewTxDesc(e.target.value)} placeholder="Transaction details" className="mt-1 h-9 w-full rounded-lg border px-3 text-xs" /></div>
							<div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => setShowTxModal(false)} className="rounded-lg border px-4 py-2 text-xs font-semibold">Cancel</button><button type="submit" className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white">Log Transaction</button></div>
						</form>
					</div>
				</div>
			)}

			{showContactModal && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
					<div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
						<h3 className="text-lg font-bold text-zinc-900">Add {newContactType === "CUSTOMER" ? "Customer" : "Vendor"} Contact</h3>
						<form onSubmit={handleCreateContact} className="space-y-3">
							<div><label className="block text-xs font-semibold text-zinc-700">Contact Name *</label><input type="text" required value={newContactName} onChange={(e) => setNewContactName(e.target.value)} placeholder="e.g. Acme Corp" className="mt-1 h-9 w-full rounded-lg border px-3 text-xs" /></div>
							<div><label className="block text-xs font-semibold text-zinc-700">Email Address</label><input type="email" value={newContactEmail} onChange={(e) => setNewContactEmail(e.target.value)} placeholder="billing@acme.com" className="mt-1 h-9 w-full rounded-lg border px-3 text-xs" /></div>
							<div><label className="block text-xs font-semibold text-zinc-700">Phone Number</label><input type="text" value={newContactPhone} onChange={(e) => setNewContactPhone(e.target.value)} placeholder="+1 (555) 000-0000" className="mt-1 h-9 w-full rounded-lg border px-3 text-xs" /></div>
							<div><label className="block text-xs font-semibold text-zinc-700">Tax / GSTIN Number</label><input type="text" value={newContactTax} onChange={(e) => setNewContactTax(e.target.value)} placeholder="GSTIN-992812" className="mt-1 h-9 w-full rounded-lg border px-3 text-xs" /></div>
							<div><label className="block text-xs font-semibold text-zinc-700">Street Address</label><input type="text" value={newContactAddress} onChange={(e) => setNewContactAddress(e.target.value)} placeholder="100 Commercial Blvd" className="mt-1 h-9 w-full rounded-lg border px-3 text-xs" /></div>
							<div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => setShowContactModal(false)} className="rounded-lg border px-4 py-2 text-xs font-semibold">Cancel</button><button type="submit" className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white">Save Contact</button></div>
						</form>
					</div>
				</div>
			)}
		</WorkspaceShell>
	);
}
