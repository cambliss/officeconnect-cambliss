"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Inter } from "next/font/google";
import { useVendorAuth } from "@/lib/hooks/useVendorAuth";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, profile, loading, logout } = useVendorAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased`}>
        <div className="container">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div>
              <h1 style={{ marginBottom: 0, color: "#1d419d" }}>Office Connect Marketplace</h1>
              <p className="small" style={{ marginTop: 4 }}>
                Separate deployment, shared APIs, synced inventory/orders/payments.
              </p>
            </div>
            {mounted && isAuthenticated && (
              <div style={{ textAlign: "right" }}>
                <p className="small" style={{ marginTop: 0 }}>
                  Signed in as <strong>{profile?.email || "Vendor"}</strong>
                </p>
                <button
                  onClick={() => {
                    logout();
                    window.location.href = "/";
                  }}
                  style={{ padding: "6px 12px", fontSize: "0.85rem", width: "auto" }}
                >
                  Logout
                </button>
              </div>
            )}
          </div>

          <nav className="nav">
            <Link href="/">Home</Link>
            <Link href="/products">Products</Link>
            <Link href="/cart">Cart / Checkout</Link>
            <Link href="/vendor/onboarding">Vendor Onboarding</Link>
            {mounted && isAuthenticated ? (
              <Link href="/vendor/dashboard" style={{ background: "#1d419d", color: "white", borderColor: "#1d419d" }}>
                📊 Dashboard
              </Link>
            ) : (
              <Link href="/vendor/login" style={{ background: "#eef2ff", color: "#1e3a8a" }}>
                🔐 Vendor Login
              </Link>
            )}
          </nav>
          {children}
        </div>
      </body>
    </html>
  );
}
