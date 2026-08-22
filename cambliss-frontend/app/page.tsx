<<<<<<< HEAD
import { NavBar } from "@/components/NavBar";

import { BentoGrid } from "@/components/BentoGrid";
import { TrustBar } from "@/components/TrustBar";
import { OfferBanner } from "@/components/OfferBanner";
import { ModuleDeepDives } from "@/components/ModuleDeepDives";
import { Testimonial } from "@/components/Testimonial";
import { FinalCTA } from "@/components/FinalCTA";
import { Footer } from "@/components/Footer";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function Home() {
  return (
    <main className="relative min-h-screen w-full bg-background overflow-hidden selection:bg-brand/20">
      <NavBar />

      {/* Hero Section */}
      <div className="relative pt-32 pb-20 sm:pt-40 sm:pb-24">
        <div className="mx-auto max-w-5xl px-4 text-center">
          <h1 className="text-5xl font-extrabold tracking-tight text-foreground-strong sm:text-7xl">
            The Ultimate <br className="hidden sm:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-strong to-brand">
              Unified Workspace.
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-foreground-muted sm:text-xl">
            Office Connect is your centralized hub. We bring CRM, HRM, Video Calls, Inventory, and File Sharing into one seamless platform. <br/><br/>
            Already using other tools? No problem. Connect your favorite 3rd party software via API and manage everything from a single dashboard.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/register"
              className="w-full sm:w-auto flex justify-center items-center gap-2 rounded-full bg-brand-strong px-8 py-4 text-base font-bold text-white shadow-xl hover:bg-brand-strong/90 transition-all hover:scale-105"
            >
              Start free — no card required <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="#features"
              className="w-full sm:w-auto flex justify-center items-center gap-2 rounded-full bg-white px-8 py-4 text-base font-bold text-brand-strong shadow-sm border border-line hover:border-brand hover:text-brand transition-all"
            >
              Explore the platform
            </Link>
          </div>
          <div className="mt-8 text-sm text-foreground-muted font-medium">
            CRM, HRM, Video Calls, Inventory & File Sharing included free for your first 90 days*
          </div>
        </div>
      </div>

      <OfferBanner />

      <div id="features">
        <BentoGrid />
      </div>

      <ModuleDeepDives />
      <Testimonial />
      <FinalCTA />
      <Footer />

    </main>
=======
import Image from "next/image";
import { Sora, Manrope } from "next/font/google";

const sora = Sora({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-sora",
});

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-manrope",
});

const features = [
  {
    title: "Smart Finance Core",
    desc: "Automated journals, ledgers, and real-time cash visibility across every business unit.",
    tag: "Accounting",
  },
  {
    title: "GST and Compliance",
    desc: "GSTR workflows, reconciliation checks, and tax-ready reports without manual spreadsheet chaos.",
    tag: "Compliance",
  },
  {
    title: "CRM and Pipeline",
    desc: "Track leads, stage movement, and deal velocity so your team closes with better context.",
    tag: "CRM",
  },
  {
    title: "Inventory and Orders",
    desc: "Stock intelligence, purchase flow, and fulfillment tracking from warehouse to delivery.",
    tag: "Operations",
  },
  {
    title: "Marketplace Growth",
    desc: "Seller onboarding, product listings, and buyer-ready storefront experiences in one stack.",
    tag: "Commerce",
  },
  {
    title: "Executive Intelligence",
    desc: "CEO-grade dashboards with trends, KPI alerts, and performance snapshots at a glance.",
    tag: "Insights",
  },
];

const steps = [
  {
    title: "Create your workspace",
    text: "Register your organization, define team roles, and activate the modules you need first.",
  },
  {
    title: "Connect daily operations",
    text: "Start using finance, CRM, inventory, and ecommerce flows from a single Office Connect panel.",
  },
  {
    title: "Scale with confidence",
    text: "Use analytics, automations, and reports to optimize decisions as your business grows.",
  },
];

export default function Home() {
  return (
    <div className={`${sora.variable} ${manrope.variable} relative min-h-screen overflow-hidden bg-[#e7eefb] text-[#214279]`}>
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 -top-16 h-72 w-72 rounded-full bg-[#9ab6ff]/45 blur-3xl" />
        <div className="absolute right-[-80px] top-[18%] h-80 w-80 rounded-full bg-[#69d2ff]/25 blur-3xl" />
        <div className="absolute bottom-[-120px] left-1/3 h-80 w-80 rounded-full bg-[#7b92ff]/30 blur-3xl" />
      </div>

      <main className="relative mx-auto flex w-full max-w-7xl flex-col gap-16 px-5 pb-16 pt-10 sm:px-8 lg:px-12">
        <section className="grid items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[32px] border border-white/65 bg-[linear-gradient(150deg,#ffffff_0%,#eef4ff_45%,#e5eeff_100%)] p-7 shadow-[0_40px_80px_-45px_rgba(13,38,92,0.6)] sm:p-10">
            <p className="w-fit rounded-full border border-[#b5c8fb] bg-white/75 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#2850a2]">
              Office Connect Platform
            </p>
            <h1
              className="mt-5 text-4xl font-extrabold leading-tight text-[#123a88] sm:text-5xl"
              style={{ fontFamily: "var(--font-sora), sans-serif" }}
            >
              A Stunning 3D-style ERP Experience for Modern Teams
            </h1>
            <p
              className="mt-5 max-w-2xl text-base leading-relaxed text-[#48689f] sm:text-lg"
              style={{ fontFamily: "var(--font-manrope), sans-serif" }}
            >
              Office Connect brings your finance, compliance, CRM, inventory, ecommerce, and leadership
              analytics into one beautiful control center. Your team moves faster because every workflow is
              connected.
            </p>

            <div className="mt-8 flex flex-wrap gap-3" style={{ fontFamily: "var(--font-manrope), sans-serif" }}>
              <a
                className="group rounded-xl bg-[#123f96] px-6 py-3 text-sm font-semibold text-white shadow-[0_16px_34px_-16px_rgba(18,63,150,0.95)] transition hover:-translate-y-0.5 hover:bg-[#0f357d]"
                href="/login"
              >
                Login to Workspace
              </a>
              <a
                className="rounded-xl border border-[#b8ccfc] bg-white/85 px-6 py-3 text-sm font-semibold text-[#2b4f95] transition hover:-translate-y-0.5 hover:bg-white"
                href="/register"
              >
                Create Account
              </a>
              <a
                className="rounded-xl border border-[#b8ccfc] bg-white/85 px-6 py-3 text-sm font-semibold text-[#2b4f95] transition hover:-translate-y-0.5 hover:bg-white"
                href="/dashboard"
              >
                Open Dashboard
              </a>
            </div>
          </div>

          <div className="perspective-1000 mx-auto w-full max-w-[520px]">
            <div className="relative rounded-[30px] border border-[#b9ccfb] bg-[linear-gradient(170deg,#d9e6ff_0%,#f6f9ff_40%,#d8e8ff_100%)] p-6 shadow-[0_42px_80px_-45px_rgba(12,40,102,0.8)] transition-transform duration-500 hover:rotate-y-3 sm:p-8">
              <div className="absolute -left-5 -top-5 h-16 w-16 rounded-2xl border border-[#a5bffc] bg-white/85 shadow-lg" />
              <div className="absolute -bottom-6 -right-6 h-24 w-24 rounded-3xl border border-[#a7ceff] bg-[#d9efff]/80 shadow-lg" />

              <div className="rounded-2xl border border-white/75 bg-white/75 p-4 backdrop-blur-sm">
                <Image
                  src="/officeconnectlogo.png"
                  alt="Office Connect"
                  width={470}
                  height={126}
                  priority
                  className="h-16 w-auto object-contain"
                />
              </div>

              <div
                className="mt-6 grid grid-cols-2 gap-3 text-sm"
                style={{ fontFamily: "var(--font-manrope), sans-serif" }}
              >
                <div className="rounded-xl border border-[#bfd4ff] bg-white/90 p-4 shadow-[0_8px_24px_-18px_rgba(15,57,140,0.8)]">
                  <p className="text-xs text-[#5778ae]">Live Revenue</p>
                  <p className="mt-1 text-xl font-bold text-[#173f91]">+28%</p>
                </div>
                <div className="rounded-xl border border-[#bfd4ff] bg-white/90 p-4 shadow-[0_8px_24px_-18px_rgba(15,57,140,0.8)]">
                  <p className="text-xs text-[#5778ae]">GST Ready</p>
                  <p className="mt-1 text-xl font-bold text-[#173f91]">Realtime</p>
                </div>
                <div className="col-span-2 rounded-xl border border-[#bfd4ff] bg-white/90 p-4 shadow-[0_8px_24px_-18px_rgba(15,57,140,0.8)]">
                  <p className="text-xs text-[#5778ae]">Unified Modules</p>
                  <p className="mt-1 text-base font-semibold text-[#173f91]">
                    Finance, HRM, CRM, Inventory, Marketplace, CEO Reports
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section>
          <div className="mb-6 flex items-center justify-between gap-4">
            <h2 className="text-2xl font-bold text-[#153d8d] sm:text-3xl" style={{ fontFamily: "var(--font-sora), sans-serif" }}>
              What Office Connect Gives You
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" style={{ fontFamily: "var(--font-manrope), sans-serif" }}>
            {features.map((item, index) => (
              <article
                key={item.title}
                className="group relative overflow-hidden rounded-2xl border border-[#bfd1f8] bg-[linear-gradient(165deg,#ffffff_5%,#eef4ff_100%)] p-5 shadow-[0_22px_38px_-28px_rgba(18,54,126,0.95)] transition duration-300 hover:-translate-y-1"
              >
                <div className="mb-3 w-fit rounded-full border border-[#c3d6ff] bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#2952a7]">
                  {item.tag}
                </div>
                <h3 className="text-lg font-bold text-[#173f90]">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#5776ab]">{item.desc}</p>
                <span className="absolute right-4 top-4 text-xs font-bold text-[#aac2f8]">0{index + 1}</span>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-[28px] border border-[#bcd0fc] bg-[linear-gradient(155deg,#f9fbff_0%,#edf3ff_35%,#dde9ff_100%)] p-6 shadow-[0_28px_70px_-46px_rgba(19,54,130,0.9)] sm:p-10">
          <h2 className="text-2xl font-bold text-[#123d90] sm:text-3xl" style={{ fontFamily: "var(--font-sora), sans-serif" }}>
            How People Use Office Connect
          </h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3" style={{ fontFamily: "var(--font-manrope), sans-serif" }}>
            {steps.map((step, i) => (
              <div
                key={step.title}
                className="rounded-2xl border border-white/80 bg-white/80 p-5 shadow-[0_18px_35px_-28px_rgba(21,55,129,0.9)]"
              >
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#5d7db2]">Step {i + 1}</p>
                <h3 className="mt-2 text-lg font-bold text-[#1b458f]">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#5776ab]">{step.text}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap gap-3" style={{ fontFamily: "var(--font-manrope), sans-serif" }}>
            <a href="/ecommerce" className="rounded-xl bg-[#123f96] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0f357d]">
              Explore Ecommerce
            </a>
            <a href="/seller-central" className="rounded-xl border border-[#b8ccfc] bg-white/90 px-5 py-3 text-sm font-semibold text-[#2b4f95] transition hover:bg-white">
              Visit Seller Central
            </a>
            <a href="/ceo-report" className="rounded-xl border border-[#b8ccfc] bg-white/90 px-5 py-3 text-sm font-semibold text-[#2b4f95] transition hover:bg-white">
              View CEO Report
            </a>
          </div>
        </section>
      </main>
    </div>
>>>>>>> aa34278 (feat: Add Akaunting, Mercur multi-vendor engine, and WebRTC Video Connect dual party calling)
  );
}
