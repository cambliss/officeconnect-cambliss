import Link from "next/link";

export default function HomePage() {
  return (
    <main className="grid marketplace-home" style={{ gap: 20 }}>
      <section className="hero-wrap">
        <div className="hero-glow hero-glow-left" />
        <div className="hero-glow hero-glow-right" />

        <div className="hero-main card-3d">
          <p className="hero-kicker">Office Connect Marketplace</p>
          <h1 className="hero-title">A Classy 3D Commerce Hub for Vendors, Sellers, and Smart Operations</h1>
          <p className="hero-copy">
            Launch faster with vendor onboarding, synced catalog management, and checkout that plugs directly into
            your ERP stack for GST, fulfillment, and financial tracking.
          </p>

          <div className="hero-cta-row">
            <Link className="btn-primary" href="/vendor/login">
              Vendor Login
            </Link>
            <Link className="btn-ghost" href="/vendor/onboarding">
              Start Onboarding
            </Link>
            <Link className="btn-ghost" href="/products">
              Explore Products
            </Link>
          </div>
        </div>

        <aside className="hero-metrics card-3d">
          <h3 style={{ marginTop: 0 }}>Live Marketplace Control</h3>
          <div className="metric-grid">
            <div className="metric-item">
              <p className="metric-label">Vendor Flow</p>
              <p className="metric-value">Realtime</p>
            </div>
            <div className="metric-item">
              <p className="metric-label">Catalog Sync</p>
              <p className="metric-value">API Linked</p>
            </div>
            <div className="metric-item">
              <p className="metric-label">Checkout Route</p>
              <p className="metric-value">ERP Ready</p>
            </div>
          </div>
        </aside>
      </section>

      <section>
        <h2 className="section-title" style={{ marginTop: 0 }}>What We Provide</h2>
        <div className="grid grid-3">
          <article className="card card-3d">
            <h3 style={{ marginTop: 0 }}>Vendor Ready</h3>
            <p className="small">Onboard vendors, create stores, and establish seller identity with guided setup.</p>
            <Link href="/vendor/onboarding">Start vendor onboarding</Link>
          </article>

          <article className="card card-3d">
            <h3 style={{ marginTop: 0 }}>Marketplace Catalog</h3>
            <p className="small">Serve live product listing data from your Office Connect ecommerce APIs.</p>
            <Link href="/products">View products</Link>
            <div style={{ marginTop: 8 }}>
              <Link href="/marketplace/categories/all">Explore category pages</Link>
            </div>
          </article>

          <article className="card card-3d">
            <h3 style={{ marginTop: 0 }}>Checkout Sync</h3>
            <p className="small">Push customer orders into invoice, GST, and fulfillment pipelines automatically.</p>
            <Link href="/cart">Go to checkout starter</Link>
          </article>
        </div>
      </section>

      <section className="card card-3d">
        <h2 className="section-title" style={{ marginTop: 0 }}>Everything You Can Showcase Here</h2>
        <p className="small" style={{ marginTop: 0 }}>
          This home page is designed to present the full Office Connect multi-vendor vision: onboarding, trust,
          conversion, fulfillment, and analytics.
        </p>
        <div className="showcase-grid">
          <article className="showcase-tile">
            <h3>Vendor Acquisition</h3>
            <p className="small">Guided registration, store setup, and role-safe access for operations teams.</p>
          </article>
          <article className="showcase-tile">
            <h3>Catalog Intelligence</h3>
            <p className="small">Live synced products with category discovery and pricing consistency.</p>
          </article>
          <article className="showcase-tile">
            <h3>Buyer Confidence</h3>
            <p className="small">Clear carts, quick checkout, and payment/fulfillment status transparency.</p>
          </article>
          <article className="showcase-tile">
            <h3>Operations Sync</h3>
            <p className="small">Orders flow into accounting, GST, inventory, and shipping pipelines.</p>
          </article>
        </div>
      </section>

      <section className="card card-3d how-section">
        <h2 className="section-title" style={{ marginTop: 0 }}>Platform Modules Behind Marketplace</h2>
        <div className="modules-row">
          <span className="module-pill">Accounting + Ledger</span>
          <span className="module-pill">GST + Compliance</span>
          <span className="module-pill">Inventory + Warehouse</span>
          <span className="module-pill">CRM + Lead Flow</span>
          <span className="module-pill">Marketplace + Seller Ops</span>
          <span className="module-pill">CEO + Performance Insights</span>
        </div>
      </section>

      <section className="card card-3d how-section">
        <h2 className="section-title" style={{ marginTop: 0 }}>How People Use Office Connect Marketplace</h2>
        <div className="how-grid">
          <article>
            <p className="step-chip">Step 1</p>
            <h3>Create vendor workspace</h3>
            <p className="small">Register seller identity, complete onboarding, and activate store readiness.</p>
          </article>
          <article>
            <p className="step-chip">Step 2</p>
            <h3>Publish and manage listings</h3>
            <p className="small">Upload products, tune pricing, and manage category-wise discoverability.</p>
          </article>
          <article>
            <p className="step-chip">Step 3</p>
            <h3>Capture orders and scale</h3>
            <p className="small">Track checkout, fulfillment, GST outputs, and executive visibility in one chain.</p>
          </article>
        </div>
      </section>

      <section className="card card-3d final-cta">
        <h2 className="section-title" style={{ marginTop: 0 }}>Ready to Launch Your Multi-Vendor Story?</h2>
        <p className="small" style={{ marginTop: 0 }}>
          Use this marketplace as your live demo layer to show stakeholders exactly how Office Connect powers
          onboarding, commerce, compliance, and scale from one connected platform.
        </p>
        <div className="hero-cta-row">
          <Link className="btn-primary" href="/vendor/dashboard">
            Open Vendor Dashboard
          </Link>
          <Link className="btn-ghost" href="/vendor/register">
            Create Vendor Account
          </Link>
          <Link className="btn-ghost" href="/cart">
            Test Checkout Flow
          </Link>
        </div>
      </section>
    </main>
  );
}
