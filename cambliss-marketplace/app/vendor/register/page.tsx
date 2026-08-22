"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { vendorRegister } from "@/lib/api";

export default function VendorRegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [storeName, setStoreName] = useState("");
  const [status, setStatus] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("Creating account...");
    try {
      await vendorRegister({ email, password, storeName });
      setStatus("Account created! Redirecting to dashboard...");
      setTimeout(() => router.push("/vendor/dashboard"), 1500);
    } catch (err: any) {
      setStatus(err?.response?.data?.message || err.message || "Registration failed");
    }
  }

  return (
    <main className="grid" style={{ gap: 14 }}>
      <section className="card">
        <h2 style={{ marginTop: 0 }}>Vendor Registration</h2>
        <p className="small">Create a new vendor account to sell on the Office Connect Marketplace.</p>
      </section>

      <form className="card grid" style={{ gap: 10 }} onSubmit={onSubmit}>
        <label>
          Email Address
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="vendor@email.com"
          />
        </label>

        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="Create a strong password"
          />
        </label>

        <label>
          Store Name
          <input
            type="text"
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
            required
            placeholder="Your Store Name"
          />
        </label>

        <button type="submit">Create Account</button>
        {status && <p className="small">{status}</p>}
      </form>

      <section className="card">
        <p className="small">
          Already have an account? <Link href="/vendor/login">Login here</Link>.
        </p>
      </section>
    </main>
  );
}
