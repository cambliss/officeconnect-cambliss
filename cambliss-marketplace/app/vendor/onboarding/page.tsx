"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { createVendorStore, getVendorToken } from "@/lib/api";
import {
  BUSINESS_TYPE_OPTIONS,
  ORGANIZATION_TYPE_OPTIONS,
  OrganizationType,
} from "@/lib/marketplace-taxonomy";

export default function VendorOnboardingPage() {
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [description, setDescription] = useState("");
  const [businessTypes, setBusinessTypes] = useState<string[]>([]);
  const [organizationType, setOrganizationType] = useState<OrganizationType>("business");
  const [assortmentType, setAssortmentType] = useState<"single-category" | "multi-category">("single-category");
  const [onboardingPitch, setOnboardingPitch] = useState("");
  const [status, setStatus] = useState("");
  const [storeCreated, setStoreCreated] = useState(false);
  const token = getVendorToken();

  function toggleBusinessType(id: string) {
    setBusinessTypes((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (businessTypes.length === 0) {
      setStatus("Please select at least one business type to continue.");
      return;
    }

    setStatus("Creating store...");
    try {
      const store = await createVendorStore({
        name,
        domain,
        description,
        businessTypes,
        organizationType,
        assortmentType,
        onboardingPitch,
      });
      setStatus(`Store created successfully! ID: ${store.id}`);
      setStoreCreated(true);
      setName("");
      setDomain("");
      setDescription("");
      setBusinessTypes([]);
      setOrganizationType("business");
      setAssortmentType("single-category");
      setOnboardingPitch("");
    } catch (err: any) {
      setStatus(err?.response?.data?.message || err.message || "Store creation failed");
    }
  }

  return (
    <main className="grid" style={{ gap: 14 }}>
      <section className="card">
        <h2 style={{ marginTop: 0 }}>Vendor Store Onboarding</h2>
        <p className="small">
          Create your vendor store and start selling on the Office Connect Marketplace.
        </p>
        <p className="small">
          High-growth tip: complete your business profile so buyers can discover your store in the right market segments.
        </p>
      </section>

      {!token && (
        <section className="card" style={{ background: "#fef3c7", borderLeft: "4px solid #f59e0b" }}>
          <p className="small">
            <strong>New to the marketplace?</strong> <Link href="/vendor/login">Login or register as a vendor</Link> to create a store and manage your business.
          </p>
        </section>
      )}

      <form className="card grid" style={{ gap: 10 }} onSubmit={onSubmit}>
        <label>
          Store Name
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="My Awesome Store"
          />
        </label>

        <label>
          Store Domain
          <input
            type="text"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            required
            placeholder="mystore.ocmp.in"
          />
        </label>

        <label>
          Description
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Tell customers about your store..."
            rows={3}
          />
        </label>

        <section>
          <p style={{ margin: "0 0 8px 0", fontWeight: 700 }}>Business Type (choose one or more)</p>
          <p className="small" style={{ marginTop: 0 }}>
            These tags help power category pages, search ranking, and campaign visibility.
          </p>
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

        <label>
          Organization Type
          <select
            value={organizationType}
            onChange={(e) => setOrganizationType(e.target.value as OrganizationType)}
          >
            {ORGANIZATION_TYPE_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          Assortment Strategy
          <select
            value={assortmentType}
            onChange={(e) => setAssortmentType(e.target.value as "single-category" | "multi-category")}
          >
            <option value="single-category">Single Category Focus</option>
            <option value="multi-category">Multi Category Store</option>
          </select>
        </label>

        <label>
          Brand Story Pitch
          <textarea
            value={onboardingPitch}
            onChange={(e) => setOnboardingPitch(e.target.value)}
            placeholder="One-line story that makes your store memorable"
            rows={2}
          />
        </label>

        <button type="submit">Create Store</button>
        {status && (
          <p className="small" style={{ color: storeCreated ? "#16a34a" : "#dc2626" }}>
            {status}
          </p>
        )}
      </form>

      {storeCreated && token && (
        <section className="card" style={{ background: "#ecfdf5", borderLeft: "4px solid #10b981" }}>
          <p className="small">
            <strong>Store created!</strong> Go to your <Link href="/vendor/dashboard">dashboard</Link> to manage products and orders.
          </p>
        </section>
      )}
    </main>
  );
}
