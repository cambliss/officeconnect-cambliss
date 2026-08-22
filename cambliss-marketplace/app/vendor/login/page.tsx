"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { vendorLogin } from "@/lib/api";

export default function VendorLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("Logging in...");
    try {
      await vendorLogin(email, password);
      setStatus("Login successful!");
      router.push("/vendor/dashboard");
    } catch (err: any) {
      setStatus(err?.response?.data?.message || err.message || "Login failed");
    }
  }

  return (
    <main className="grid" style={{ gap: 14 }}>
      <section className="card">
        <h2 style={{ marginTop: 0 }}>Vendor Login</h2>
        <p className="small">Sign in to your vendor account to manage orders and listings.</p>
      </section>

      <form className="card grid" style={{ gap: 10 }} onSubmit={onSubmit}>
        <label>
          Email
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
            placeholder="Password"
          />
        </label>

        <button type="submit">Login</button>
        {status && <p className="small">{status}</p>}
      </form>

      <section className="card">
        <p className="small">
          Don't have an account? <Link href="/vendor/register">Register here</Link>.
        </p>
      </section>
    </main>
  );
}
