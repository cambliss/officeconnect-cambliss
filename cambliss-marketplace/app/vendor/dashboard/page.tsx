"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useVendorAuth } from "@/lib/hooks/useVendorAuth";
import {
  getVendorStores,
  getVendorOrders,
  getVendorStoreInsights,
  getVendorStoreRecommendations,
  VendorOrder,
  VendorStore,
  VendorStoreInsights,
  SellerRecommendation,
} from "@/lib/api";
import { BUSINESS_TYPE_OPTIONS } from "@/lib/marketplace-taxonomy";

const businessTypeMap = Object.fromEntries(
  BUSINESS_TYPE_OPTIONS.map((item) => [item.id, item.label])
);

export default function VendorDashboardPage() {
  const router = useRouter();
  const { isAuthenticated, profile, loading } = useVendorAuth();
  const [stores, setStores] = useState<VendorStore[]>([]);
  const [orders, setOrders] = useState<VendorOrder[]>([]);
  const [storeInsights, setStoreInsights] = useState<Record<string, VendorStoreInsights>>({});
  const [recommendations, setRecommendations] = useState<Record<string, SellerRecommendation[]>>({});
  const [dataLoading, setDataLoading] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      router.push("/vendor/login");
      return;
    }

    setDataLoading(true);
    Promise.all([getVendorStores(), getVendorOrders()])
      .then(([storesData, ordersData]) => {
        setStores(storesData);
        setOrders(ordersData);

        if (storesData.length > 0) {
          Promise.all(
            storesData.map(async (store) => {
              try {
                const [insights, recs] = await Promise.all([
                  getVendorStoreInsights(store.id),
                  getVendorStoreRecommendations(store.id),
                ]);
                return [store.id, insights, recs] as const;
              } catch {
                return [store.id, undefined, [] as SellerRecommendation[]] as const;
              }
            })
          ).then((entries) => {
            const insightsMap: Record<string, VendorStoreInsights> = {};
            const recsMap: Record<string, SellerRecommendation[]> = {};
            entries.forEach(([storeId, insights, recs]) => {
              if (insights) {
                insightsMap[storeId] = insights;
              }
              recsMap[storeId] = recs;
            });
            setStoreInsights(insightsMap);
            setRecommendations(recsMap);
          });
        }
      })
      .catch((err) => console.error("Failed to load dashboard data:", err))
      .finally(() => setDataLoading(false));
  }, [isAuthenticated, loading, router]);

  if (loading || !isAuthenticated) return <div className="card">Loading...</div>;

  return (
    <main className="grid" style={{ gap: 14 }}>
      <section className="card">
        <h2 style={{ marginTop: 0 }}>Vendor Dashboard</h2>
        <p className="small">Welcome, {profile?.firstName || "Vendor"}!</p>
        <p className="small">Manage your stores, listings, and orders all in one place.</p>
      </section>

      {dataLoading && <section className="card">Loading your data...</section>}

      {!dataLoading && (
        <>
          {/* Stores Section */}
          <section className="card">
            <h3 style={{ marginTop: 0 }}>Your Stores ({stores.length})</h3>
            {stores.length === 0 ? (
              <p className="small">
                <a href="/vendor/onboarding">Create your first store</a>
              </p>
            ) : (
              <div className="grid grid-3">
                {stores.map((store) => (
                  <article key={store.id} className="card" style={{ background: "#f0f4ff" }}>
                    {storeInsights[store.id] && (
                      <div
                        style={{
                          display: "inline-flex",
                          background: "#0f172a",
                          color: "#f8fafc",
                          borderRadius: 999,
                          padding: "4px 10px",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          marginBottom: 8,
                        }}
                      >
                        Trust Score {storeInsights[store.id].trustScore}
                      </div>
                    )}
                    <h4 style={{ marginTop: 0 }}>{store.name}</h4>
                    <p className="small"><strong>Domain:</strong> {store.domain}</p>
                    <p className="small"><strong>Status:</strong> {store.isActive ? "Active" : "Inactive"}</p>
                    <p className="small"><strong>Organization:</strong> {store.organizationType || "business"}</p>
                    <p className="small"><strong>Assortment:</strong> {store.assortmentType || "single-category"}</p>
                    <p className="small" style={{ marginBottom: 6 }}><strong>Segments:</strong></p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {(store.businessTypes || []).length > 0 ? (
                        store.businessTypes?.map((type) => (
                          <span
                            key={type}
                            style={{
                              background: "#dbeafe",
                              color: "#1e3a8a",
                              borderRadius: 999,
                              padding: "3px 8px",
                              fontSize: "0.75rem",
                              fontWeight: 600,
                            }}
                          >
                            {businessTypeMap[type] || type}
                          </span>
                        ))
                      ) : (
                        <span className="small">Not classified yet</span>
                      )}
                    </div>
                    {storeInsights[store.id] && (
                      <div style={{ marginTop: 10 }}>
                        <p className="small" style={{ margin: 0 }}>
                          <strong>Profile:</strong> {storeInsights[store.id].profileScore} | <strong>Catalog:</strong> {storeInsights[store.id].catalogScore}
                        </p>
                        <p className="small" style={{ margin: "4px 0 0 0" }}>
                          <strong>Fulfillment:</strong> {storeInsights[store.id].fulfillmentScore} | <strong>Operations:</strong> {storeInsights[store.id].operationalScore}
                        </p>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>

          {/* Orders Section */}
          <section className="card">
            <h3 style={{ marginTop: 0 }}>Recent Orders ({orders.length})</h3>
            {orders.length === 0 ? (
              <p className="small">No orders yet. Customers will see your listings soon!</p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid #d7e0f7" }}>
                      <th style={{ textAlign: "left", padding: 8 }}>Order ID</th>
                      <th style={{ textAlign: "left", padding: 8 }}>Customer</th>
                      <th style={{ textAlign: "left", padding: 8 }}>Status</th>
                      <th style={{ textAlign: "right", padding: 8 }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => (
                      <tr key={order.id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                        <td style={{ padding: 8 }}>{order.orderId}</td>
                        <td style={{ padding: 8 }}>{order.customerName || "Guest"}</td>
                        <td style={{ padding: 8 }}>
                          <span style={{ background: "#dbeafe", padding: "4px 8px", borderRadius: 4 }}>
                            {order.status}
                          </span>
                        </td>
                        <td style={{ textAlign: "right", padding: 8 }}>₹{order.totalAmount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Seller Cockpit Section */}
          <section className="card">
            <h3 style={{ marginTop: 0 }}>Growth Recommendations</h3>
            {stores.length === 0 ? (
              <p className="small">Create a store to get actionable recommendations.</p>
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                {stores.map((store) => {
                  const recs = recommendations[store.id] || [];
                  return (
                    <article key={store.id} className="card" style={{ background: "#f8fafc" }}>
                      <h4 style={{ marginTop: 0, marginBottom: 8 }}>{store.name}</h4>
                      {recs.length === 0 ? (
                        <p className="small">No recommendations yet. Complete your profile and add listings to unlock insights.</p>
                      ) : (
                        <div style={{ display: "grid", gap: 10 }}>
                          {recs.slice(0, 4).map((rec: SellerRecommendation) => (
                            <div
                              key={rec.id}
                              style={{
                                border: "1px solid #dbeafe",
                                borderRadius: 12,
                                padding: 12,
                                background: "white",
                              }}
                            >
                              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                                <strong>{rec.title}</strong>
                                <span className="small" style={{ color: "#2563eb", fontWeight: 700 }}>
                                  +{rec.scoreGainPotential}%
                                </span>
                              </div>
                              <p className="small" style={{ marginBottom: 6 }}>{rec.description}</p>
                              <p className="small" style={{ marginBottom: 6 }}><strong>Action:</strong> {rec.action}</p>
                              <p className="small" style={{ margin: 0, color: "#64748b" }}>{rec.estimatedImpact}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}
