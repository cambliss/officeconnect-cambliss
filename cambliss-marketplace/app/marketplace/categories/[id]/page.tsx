"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { fetchCategoryRankedProducts, RankedMarketplaceProduct } from "@/lib/api";
import { TrustBadge } from "@/components/TrustBadge";

const computeSellerTier = (trustScore: number): "new" | "verified" | "premium" | "elite" => {
	if (trustScore >= 80) return "elite";
	if (trustScore >= 60) return "premium";
	if (trustScore >= 30) return "verified";
	return "new";
};

interface CategoryInfo {
	id: string;
	name: string;
	description?: string;
	productCount: number;
}

export default function CategoryLandingPage() {
	const params = useParams();
	const categoryId = params?.id as string;

	const [products, setProducts] = useState<RankedMarketplaceProduct[]>([]);
	const [categoryInfo, setCategoryInfo] = useState<CategoryInfo | null>(null);
	const [search, setSearch] = useState("");
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");

	useEffect(() => {
		if (!categoryId) return;

		const fetchData = async () => {
			try {
				setLoading(true);

				const ranked = await fetchCategoryRankedProducts(categoryId, search);
				setProducts(ranked);
				setCategoryInfo({
					id: categoryId,
					name: ranked[0]?.category?.name || "Category",
					productCount: ranked.length,
				});

				setError("");
			} catch (err: any) {
				setError(err.response?.data?.message || "Failed to load products");
				setProducts([]);
			} finally {
				setLoading(false);
			}
		};

		const timer = setTimeout(fetchData, 300); // Debounce search
		return () => clearTimeout(timer);
	}, [categoryId, search]);

	if (!categoryId) {
		return <div className="p-8 text-center text-red-600">Category not found</div>;
	}

	return (
		<div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
			{/* Category Header */}
			<div className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
				<div className="max-w-7xl mx-auto px-6 py-8">
					<h1 className="text-4xl font-bold text-slate-900 mb-2">
						{categoryInfo?.name || "Loading..."}
					</h1>
					<p className="text-slate-600">
						{loading ? "Loading products..." : `${categoryInfo?.productCount || 0} high-quality products ranked by trust & conversion`}
					</p>

					{/* Search Bar */}
					<div className="mt-6">
						<input
							type="text"
							placeholder="Search products in this category..."
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
						/>
					</div>
				</div>
			</div>

			{/* Main Content */}
			<div className="max-w-7xl mx-auto px-6 py-12">
				{error && (
					<div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8 text-red-700">
						{error}
					</div>
				)}

				{loading ? (
					<div className="text-center py-12">
						<div className="inline-block animate-spin">⏳</div>
						<p className="text-slate-600 mt-4">Loading ranked products...</p>
					</div>
				) : products.length === 0 ? (
					<div className="text-center py-12 bg-white rounded-lg border border-slate-200">
						<p className="text-slate-600">No products found in this category</p>
					</div>
				) : (
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
						{products.map((product, idx) => (
							<div
								key={product.id}
								className="bg-white rounded-lg border border-slate-200 overflow-hidden hover:shadow-lg transition-shadow"
							>
								{/* Ranking Badge */}
								<div className="absolute top-3 left-3 z-10 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
									#{idx + 1} Ranked
								</div>

								{/* Product Image */}
								<div className="w-full h-48 bg-slate-100 relative overflow-hidden">
									{product.images && product.images[0] ? (
										<img
											src={product.images[0]}
											alt={product.name}
											className="w-full h-full object-cover"
										/>
									) : (
										<div className="w-full h-full flex items-center justify-center text-slate-400">
											No Image
										</div>
									)}
									<div className="absolute top-3 right-3 bg-white text-sm font-semibold px-2 py-1 rounded shadow-sm">
										₹{parseFloat(product.sellingPrice).toFixed(2)}
									</div>
								</div>

								{/* Product Details */}
								<div className="p-4">
									{/* Store Info */}
										<Link href={`/store/${product.store?.domain || product.store?.id || ""}`}>
										<p className="text-sm font-semibold text-blue-600 hover:text-blue-700 mb-2">
												{product.store?.name || "Store"}
										</p>
									</Link>

									{/* Product Name */}
									<h3 className="font-bold text-slate-900 mb-2 line-clamp-2">
										{product.name}
									</h3>

									{/* Description */}
									{product.description && (
										<p className="text-sm text-slate-600 line-clamp-2 mb-3">
											{product.description}
										</p>
									)}

									{/* Metrics */}
									<div className="grid grid-cols-2 gap-2 mb-4 text-xs">
										<div className="bg-blue-50 rounded p-2">
											<p className="text-blue-900 font-semibold">
												{product.trustScore.toFixed(1)}% Trust
											</p>
											<p className="text-blue-700 text-xs">Seller Score</p>
										</div>
										<div className="bg-green-50 rounded p-2">
											<p className="text-green-900 font-semibold">
												{product.conversionRate.toFixed(1)}%
											</p>
											<p className="text-green-700 text-xs">Conversion</p>
										</div>
									</div>

									{/* Tier Badge */}
									<div className="mb-3">
										<TrustBadge
											tier={computeSellerTier(product.trustScore)}
											compact={true}
										/>
									</div>

									{/* Business Type Chips */}
									{product.store?.businessTypes && product.store.businessTypes.length > 0 && (
										<div className="flex flex-wrap gap-1 mb-4">
											{product.store.businessTypes.slice(0, 2).map((type) => (
												<span
													key={type}
													className="text-xs bg-slate-200 text-slate-700 px-2 py-1 rounded-full"
												>
													{type}
												</span>
											))}
											{product.store.businessTypes.length > 2 && (
												<span className="text-xs text-slate-600">
													+{product.store.businessTypes.length - 2}
												</span>
											)}
										</div>
									)}

									{/* Add to Cart Button */}
									<button className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-all">
										Add to Cart
									</button>
								</div>
							</div>
						))}
					</div>
				)}

				{/* Ranking Algorithm Info */}
				<div className="mt-16 bg-blue-50 border-l-4 border-blue-500 rounded-lg p-6">
					<h2 className="font-bold text-blue-900 mb-3">How Products Are Ranked</h2>
					<ul className="text-sm text-blue-800 space-y-2">
						<li>
							<strong>Trust Score (40%):</strong> Based on seller profile completeness, catalog quality, delivery success rate, and order history
						</li>
						<li>
							<strong>Conversion Rate (30%):</strong> Percentage of successful orders relative to store visits
						</li>
						<li>
							<strong>Recency Bonus (30%):</strong> Recently listed products get a temporary boost to surface new inventory
						</li>
					</ul>
				</div>
			</div>
		</div>
	);
}
