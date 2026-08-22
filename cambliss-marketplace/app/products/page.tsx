"use client";

import { useEffect, useState } from "react";
import {
  fetchMarketplaceProducts,
  MarketplaceProduct,
  MarketplaceProductFilters,
} from "@/lib/api";
import { BUSINESS_TYPE_OPTIONS, ORGANIZATION_TYPE_OPTIONS } from "@/lib/marketplace-taxonomy";

export default function ProductsPage() {
  const [items, setItems] = useState<MarketplaceProduct[]>([]);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [businessTypes, setBusinessTypes] = useState<string[]>([]);
  const [organizationType, setOrganizationType] = useState<string>("");
  const [sortBy, setSortBy] = useState<"latest" | "price-low" | "price-high">("latest");

  const applyFilters = () => {
    const filters: MarketplaceProductFilters = {
      search,
      businessTypes,
      organizationType: organizationType ? (organizationType as "business" | "ngo" | "social-enterprise") : undefined,
      sortBy,
    };

    setLoading(true);
    setError("");
    fetchMarketplaceProducts(filters)
      .then((data) => setItems(data))
      .catch((err) => setError(err?.response?.data?.message || err.message || "Failed to fetch products"))
      .finally(() => setLoading(false));
  };

  const resetFilters = () => {
    setSearch("");
    setBusinessTypes([]);
    setOrganizationType("");
    setSortBy("latest");
    setLoading(true);
    fetchMarketplaceProducts()
      .then((data) => setItems(data))
      .catch((err) => setError(err?.response?.data?.message || err.message || "Failed to fetch products"))
      .finally(() => setLoading(false));
  };

  const toggleBusinessType = (id: string) => {
    setBusinessTypes((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  useEffect(() => {
    applyFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="grid" style={{ gap: 14 }}>
      <section className="card">
        <h2 style={{ marginTop: 0 }}>Marketplace Products</h2>
        <p className="small">Discover products by segment, organization profile, and ranking strategy.</p>
      </section>

      <section className="card grid" style={{ gap: 12 }}>
        <h3 style={{ margin: 0 }}>Smart Discovery Filters</h3>

        <label>
          Search Products
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by product name or SKU"
          />
        </label>

        <label>
          Organization Type
          <select value={organizationType} onChange={(e) => setOrganizationType(e.target.value)}>
            <option value="">All</option>
            {ORGANIZATION_TYPE_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          Sort By
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as "latest" | "price-low" | "price-high")}>
            <option value="latest">Latest</option>
            <option value="price-low">Price: Low to High</option>
            <option value="price-high">Price: High to Low</option>
          </select>
        </label>

        <section>
          <p style={{ margin: "0 0 8px 0", fontWeight: 700 }}>Business Types</p>
          <div className="chip-grid">
            {BUSINESS_TYPE_OPTIONS.map((item) => {
              const active = businessTypes.includes(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  className={active ? "choice-chip active" : "choice-chip"}
                  onClick={() => toggleBusinessType(item.id)}
                >
                  <strong>{item.label}</strong>
                  <span>{item.description}</span>
                </button>
              );
            })}
          </div>
        </section>

        <div style={{ display: "flex", gap: 10 }}>
          <button type="button" style={{ width: "auto", padding: "10px 16px" }} onClick={applyFilters}>
            Apply Filters
          </button>
          <button
            type="button"
            style={{ width: "auto", padding: "10px 16px", background: "#e2e8f0", color: "#0f172a" }}
            onClick={resetFilters}
          >
            Reset
          </button>
        </div>
      </section>

      {loading && <section className="card">Loading products...</section>}
      {error && <section className="card" style={{ color: "#b91c1c" }}>{error}</section>}

      <section className="grid grid-3">
        {items.map((p, idx) => {
          const title = p.title || p.name || `Product ${idx + 1}`;
          const price = p.sellingPrice ?? p.price ?? "NA";
          return (
            <article key={p.id || String(idx)} className="card">
              <h3 style={{ marginTop: 0 }}>{title}</h3>
              <p className="small">Listing ID: {p.id}</p>
              <p className="small">Store: {p.store?.name || "Unknown"}</p>
              <p><strong>Price:</strong> {String(price)}</p>
              <p><strong>Status:</strong> {p.isActive === false ? "Inactive" : "Active"}</p>
              <p className="small">
                <strong>Segments:</strong> {(p.store?.businessTypes || []).join(", ") || "Unclassified"}
              </p>
              <p className="small">
                <strong>Organization:</strong> {p.store?.organizationType || "business"}
              </p>
            </article>
          );
        })}
      </section>
    </main>
  );
}
