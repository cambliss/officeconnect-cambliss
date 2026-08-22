"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { createPublicOrder } from "@/lib/api";

export default function CartPage() {
  const [storeDomain, setStoreDomain] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [productListingId, setProductListingId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [status, setStatus] = useState("");
  const [orderPlaced, setOrderPlaced] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("Placing order...");
    try {
      const result = await createPublicOrder({
        storeDomain,
        customerName,
        customerEmail,
        items: [{ productListingId, quantity: parseInt(quantity) }],
      });
      setStatus(`Order placed successfully! Order ID: ${result?.orderId || result?.id || "success"}`);
      setOrderPlaced(true);
      // Reset form
      setTimeout(() => {
        setStoreDomain("");
        setCustomerName("");
        setCustomerEmail("");
        setProductListingId("");
        setQuantity("1");
        setStatus("");
        setOrderPlaced(false);
      }, 2000);
    } catch (err: any) {
      setStatus(err?.response?.data?.message || err.message || "Failed to place order");
    }
  }

  return (
    <main className="grid" style={{ gap: 14 }}>
      <section className="card">
        <h2 style={{ marginTop: 0 }}>🛒 Checkout</h2>
        <p className="small">
          Place a customer order. Order data syncs to Office Connect backend for invoicing, GST compliance, fulfillment, and payment processing.
        </p>
      </section>

      <section className="grid grid-3">
        <article className="card" style={{ background: "#f0f4ff" }}>
          <h4 style={{ marginTop: 0 }}>1. Browse Products</h4>
          <p className="small">
            View all <Link href="/products">marketplace products</Link> from active vendors.
          </p>
        </article>
        <article className="card" style={{ background: "#f0f4ff" }}>
          <h4 style={{ marginTop: 0 }}>2. Add to Cart</h4>
          <p className="small">
            Select quantity and choose vendor store domain.
          </p>
        </article>
        <article className="card" style={{ background: "#f0f4ff" }}>
          <h4 style={{ marginTop: 0 }}>3. Complete Order</h4>
          <p className="small">
            Enter customer info and submit order.
          </p>
        </article>
      </section>

      <form className="card grid" style={{ gap: 10 }} onSubmit={onSubmit}>
        <label>
          Vendor Store Domain *
          <input
            type="text"
            value={storeDomain}
            onChange={(e) => setStoreDomain(e.target.value)}
            required
            placeholder="e.g., mystore.ocmp.in"
          />
        </label>

        <label>
          Product Listing ID *
          <input
            type="text"
            value={productListingId}
            onChange={(e) => setProductListingId(e.target.value)}
            required
            placeholder="e.g., listing-123"
          />
        </label>

        <label>
          Quantity *
          <input
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            required
          />
        </label>

        <fieldset style={{ borderTop: "1px solid #d7e0f7", paddingTop: 10 }}>
          <legend>Customer Information</legend>

          <label>
            Customer Name *
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              required
              placeholder="Full Name"
            />
          </label>

          <label>
            Customer Email *
            <input
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              required
              placeholder="customer@email.com"
            />
          </label>
        </fieldset>

        <button type="submit">Place Order</button>
        {status && (
          <p className="small" style={{ color: orderPlaced ? "#16a34a" : "#dc2626" }}>
            {status}
          </p>
        )}
      </form>

      <section className="card" style={{ background: "#f9fafb" }}>
        <h3 style={{ marginTop: 0 }}>Order Flow Architecture</h3>
        <div className="small">
          <p><strong>Customer Places Order:</strong> Marketplace frontend captures order data (customer info, product, quantity, vendor store).</p>
          <p><strong>API Call:</strong> POST /api/ecommerce/public/orders sends order to Office Connect backend.</p>
          <p><strong>Backend Processing:</strong> Office Connect creates invoice, calculates GST, initiates fulfillment, and records payment.</p>
          <p><strong>Webhook Notification:</strong> Marketplace receives order status updates via /api/webhooks/order-status</p>
          <p><strong>Dashboard Update:</strong> Vendor dashboard reflects real-time order status (pending → packed → shipped → delivered).</p>
        </div>
      </section>
    </main>
  );
}
