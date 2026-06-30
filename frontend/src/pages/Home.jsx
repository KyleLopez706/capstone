import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";

/* ─────────────────────────────────────────
   SVG Icon Helpers
───────────────────────────────────────── */
const CubeIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
  </svg>
);

const SparkleIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
  </svg>
);

const PaletteIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.098 19.902a3.75 3.75 0 005.304 0l6.401-6.402M6.75 21A3.75 3.75 0 013 17.25V4.125C3 3.504 3.504 3 4.125 3h5.25c.621 0 1.125.504 1.125 1.125v4.072M6.75 21a3.75 3.75 0 003.75-3.75V8.197M6.75 21h13.125c.621 0 1.125-.504 1.125-1.125v-5.25c0-.621-.504-1.125-1.125-1.125h-4.072M10.5 8.197l2.88-2.88c.438-.439 1.15-.439 1.59 0l3.712 3.713c.44.44.44 1.152 0 1.59l-2.879 2.88M6.75 17.25h.008v.008H6.75v-.008z" />
  </svg>
);

const ShieldIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.955 11.955 0 003 12c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.249-8.25-3.286z" />
  </svg>
);

const TruckIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
  </svg>
);

const HeadsetIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53L6.75 15.75H4.5a.75.75 0 01-.75-.75v-6a.75.75 0 01.75-.75h2.25z" />
  </svg>
);

const ChevronDownIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
  </svg>
);

/* ─────────────────────────────────────────
   FEATURE CARD DATA
───────────────────────────────────────── */
const FEATURES = [
  {
    id: "configurator",
    icon: <CubeIcon />,
    title: "3D Stone Configurator",
    description:
      "Visualize your custom granite and marble selections in a real-time 3D environment before committing to a design.",
  },
  {
    id: "custom-design",
    icon: <SparkleIcon />,
    title: "Custom Design Studio",
    description:
      "Work with our premium design palette to craft bespoke stone solutions tailored to your architectural vision.",
  },
  {
    id: "materials",
    icon: <PaletteIcon />,
    title: "Premium Material Library",
    description:
      "Browse our curated selection of granite, marble, quartzite, and travertine sourced from world-class quarries.",
  },
  {
    id: "quality",
    icon: <ShieldIcon />,
    title: "Quality Guaranteed",
    description:
      "Every slab is hand-inspected and certified to meet Six Sigmaphil's exacting standards for residential and commercial use.",
  },
  {
    id: "delivery",
    icon: <TruckIcon />,
    title: "White-Glove Delivery",
    description:
      "Professional installation and delivery teams handle your order with precision from our warehouse to your site.",
  },
  {
    id: "support",
    icon: <HeadsetIcon />,
    title: "Dedicated Client Support",
    description:
      "Our stone specialists are available to guide your material selections and answer every design question.",
  },
];

/* ─────────────────────────────────────────
   PROFILE DROPDOWN COMPONENT
───────────────────────────────────────── */
function ProfileDropdown({ onSignOut, navigate }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Derive initials from stored name or fallback to "U"
  const name = localStorage.getItem("userName") || "User";
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      {/* Avatar Button */}
      <button
        id="profile-avatar-btn"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-2 cursor-pointer rounded-full transition-all duration-200 focus:outline-none"
        aria-label="User menu"
        aria-expanded={open}
      >
        {/* Initials Avatar */}
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold tracking-wider select-none transition-all duration-200"
          style={{
            backgroundColor: "#232B32",
            color: "#C5A059",
            border: "2px solid #C5A059",
            boxShadow: open ? "0 0 0 3px rgba(197,160,89,0.25)" : "none",
          }}
        >
          {initials}
        </div>
        <span className="hidden sm:flex items-center gap-1 text-sm font-medium" style={{ color: "#F9F9FB" }}>
          {name.split(" ")[0]}
          <ChevronDownIcon />
        </span>
      </button>

      {/* Dropdown Menu */}
      {open && (
        <div
          className="absolute right-0 mt-3 w-52 rounded-xl shadow-xl overflow-hidden z-50"
          style={{ backgroundColor: "#ffffff", border: "1px solid #E2E8F0" }}
        >
          {/* User info header */}
          <div className="px-4 py-3" style={{ borderBottom: "1px solid #E2E8F0" }}>
            <p className="text-xs font-semibold tracking-wider uppercase truncate" style={{ color: "#232B32" }}>
              {name}
            </p>
            <p className="text-xs mt-0.5 truncate" style={{ color: "#9CA3AF" }}>
              {localStorage.getItem("userEmail") || ""}
            </p>
          </div>

          {/* Menu Items */}
          <div className="py-1">
            <button
              id="dropdown-configurator-btn"
              onClick={() => { setOpen(false); navigate("/configurator"); }}
              className="w-full text-left px-4 py-2.5 text-sm transition-colors duration-150 cursor-pointer flex items-center gap-3"
              style={{ color: "#232B32" }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#F9F9FB"; e.currentTarget.style.color = "#C5A059"; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "#232B32"; }}
            >
              <CubeIcon />
              Launch 3D Configurator
            </button>

            <div style={{ height: "1px", backgroundColor: "#E2E8F0", margin: "4px 0" }} />

            <button
              id="dropdown-signout-btn"
              onClick={() => { setOpen(false); onSignOut(); }}
              className="w-full text-left px-4 py-2.5 text-sm transition-colors duration-150 cursor-pointer"
              style={{ color: "#DC2626" }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#FEF2F2")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
            >
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────
   FEATURE CARD COMPONENT
───────────────────────────────────────── */
function FeatureCard({ icon, title, description }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="rounded-2xl p-6 transition-all duration-300 flex flex-col gap-4"
      style={{
        backgroundColor: "#ffffff",
        border: `1px solid ${hovered ? "#C5A059" : "#E2E8F0"}`,
        boxShadow: hovered ? "0 8px 30px rgba(197,160,89,0.12)" : "0 1px 4px rgba(0,0,0,0.04)",
        transform: hovered ? "translateY(-3px)" : "translateY(0)",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Icon Badge */}
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors duration-300"
        style={{
          backgroundColor: hovered ? "#C5A059" : "#232B32",
          color: hovered ? "#ffffff" : "#C5A059",
        }}
      >
        {icon}
      </div>

      {/* Text */}
      <div>
        <h3 className="text-base font-semibold mb-1.5" style={{ color: "#232B32" }}>
          {title}
        </h3>
        <p className="text-sm leading-relaxed" style={{ color: "#6B7280" }}>
          {description}
        </p>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   MAIN HOME COMPONENT
───────────────────────────────────────── */
export default function Home() {
  const navigate = useNavigate();
  const location = useLocation();

  // Reactively determine auth state
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem("token"));

  // Re-check on storage changes (e.g. sign-in in another tab)
  useEffect(() => {
    const syncAuth = () => setIsLoggedIn(!!localStorage.getItem("token"));
    window.addEventListener("storage", syncAuth);
    return () => window.removeEventListener("storage", syncAuth);
  }, []);

  const handleSignOut = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userName");
    localStorage.removeItem("userEmail");
    setIsLoggedIn(false);
    navigate("/");
  };

  return (
    <div className="min-h-screen w-full" style={{ backgroundColor: "#F9F9FB" }}>

      {/* ════════════════════════════════════════
          STICKY NAVBAR
      ════════════════════════════════════════ */}
      <header
        className="fixed top-0 left-0 right-0 z-40 w-full"
        style={{ backgroundColor: "rgba(35,43,50,0.97)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(226,232,240,0.15)" }}
      >
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">

          {/* Logo */}
          <button
            id="home-logo-btn"
            onClick={() => navigate("/")}
            className="flex items-center gap-3 cursor-pointer group focus:outline-none"
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: "#C5A059" }}
            >
              <svg className="w-4 h-4" style={{ color: "#ffffff" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125v-3.75" />
              </svg>
            </div>
            <span className="text-base sm:text-lg font-light tracking-widest uppercase transition-colors duration-200" style={{ color: "#F9F9FB" }}>
              Six Sigmaphil
            </span>
          </button>

          {/* Auth Controls */}
          <div className="flex items-center">
            {isLoggedIn ? (
              /* ── Logged-in: Avatar + Dropdown ── */
              <ProfileDropdown onSignOut={handleSignOut} navigate={navigate} />
            ) : (
              /* ── Guest: Sign In / Sign Up CTA ── */
              <button
                id="navbar-signin-btn"
                onClick={() => navigate("/login", { state: { background: location } })}
                className="font-semibold text-xs sm:text-sm tracking-widest uppercase py-2.5 px-5 sm:px-6 rounded-lg transition-all duration-200 cursor-pointer"
                style={{ backgroundColor: "#C5A059", color: "#ffffff" }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#b08d47")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#C5A059")}
              >
                Sign In
              </button>
            )}
          </div>
        </nav>
      </header>

      {/* Spacer for fixed navbar */}
      <div className="h-16" aria-hidden="true" />

      {/* ════════════════════════════════════════
          HERO SECTION
      ════════════════════════════════════════ */}
      <section className="w-full relative overflow-hidden" style={{ backgroundColor: "#F9F9FB" }}>
        {/* Subtle decorative background accent */}
        <div
          className="absolute top-0 right-0 w-1/2 h-full pointer-events-none opacity-5"
          style={{
            background: "radial-gradient(ellipse at top right, #C5A059 0%, transparent 70%)",
          }}
          aria-hidden="true"
        />
        <div
          className="absolute bottom-0 left-0 w-1/3 h-1/2 pointer-events-none opacity-5"
          style={{
            background: "radial-gradient(ellipse at bottom left, #232B32 0%, transparent 70%)",
          }}
          aria-hidden="true"
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28 lg:py-36 relative z-10">
          <div className="max-w-3xl">
            {/* Eyebrow Label */}
            <div className="inline-flex items-center gap-2 mb-6">
              <div className="w-6 h-px" style={{ backgroundColor: "#C5A059" }} />
              <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: "#C5A059" }}>
                Premium Stone & Granite Solutions
              </span>
            </div>

            {/* Headline */}
            <h1
              className="text-4xl sm:text-5xl lg:text-6xl font-light leading-tight tracking-tight mb-6"
              style={{ color: "#232B32" }}
            >
              Craft Your Perfect{" "}
              <span
                className="font-semibold"
                style={{
                  background: "linear-gradient(135deg, #C5A059 0%, #e8c97a 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                Stone Space
              </span>{" "}
              in 3D
            </h1>

            {/* Subheadline */}
            <p
              className="text-base sm:text-lg leading-relaxed mb-10 max-w-xl"
              style={{ color: "#6B7280" }}
            >
              Six Sigmaphil brings world-class granite and marble to your architecture.
              Visualize, configure, and order premium stone surfaces — all from one platform.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Primary CTA */}
              <button
                id="hero-primary-cta-btn"
                onClick={() => navigate(isLoggedIn ? "/configurator" : "/login")}
                className="inline-flex items-center justify-center gap-2.5 font-semibold text-sm tracking-widest uppercase py-3.5 px-8 rounded-xl transition-all duration-200 cursor-pointer"
                style={{ backgroundColor: "#232B32", color: "#F9F9FB" }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#C5A059"; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#232B32"; }}
              >
                <CubeIcon />
                {isLoggedIn ? "Launch 3D Configurator" : "Get Started"}
              </button>

              {/* Secondary CTA */}
              <button
                id="hero-secondary-cta-btn"
                onClick={() => {
                  document.getElementById("features-section")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="inline-flex items-center justify-center gap-2 font-semibold text-sm tracking-widest uppercase py-3.5 px-8 rounded-xl transition-all duration-200 cursor-pointer"
                style={{
                  backgroundColor: "transparent",
                  color: "#232B32",
                  border: "1.5px solid #E2E8F0",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#C5A059"; e.currentTarget.style.color = "#C5A059"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#E2E8F0"; e.currentTarget.style.color = "#232B32"; }}
              >
                Explore Services
              </button>
            </div>

            {/* Trust Badges */}
            <div className="mt-12 flex flex-wrap items-center gap-6">
              {["100% Premium Sourced", "Custom Fabrication", "Nationwide Delivery"].map((badge) => (
                <div key={badge} className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: "#C5A059" }} />
                  <span className="text-xs font-medium tracking-wide" style={{ color: "#6B7280" }}>
                    {badge}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Section divider */}
        <div className="w-full h-px" style={{ backgroundColor: "#E2E8F0" }} />
      </section>

      {/* ════════════════════════════════════════
          FEATURES / SERVICES SECTION
      ════════════════════════════════════════ */}
      <section id="features-section" className="w-full py-20 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Section Header */}
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 mb-4">
              <div className="w-6 h-px" style={{ backgroundColor: "#C5A059" }} />
              <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: "#C5A059" }}>
                What We Offer
              </span>
              <div className="w-6 h-px" style={{ backgroundColor: "#C5A059" }} />
            </div>
            <h2 className="text-3xl sm:text-4xl font-light tracking-tight" style={{ color: "#232B32" }}>
              Everything You Need,{" "}
              <span className="font-semibold" style={{ color: "#C5A059" }}>Built-In</span>
            </h2>
            <p className="mt-4 text-base max-w-xl mx-auto" style={{ color: "#6B7280" }}>
              From initial visualization to final installation, Six Sigmaphil provides an end-to-end premium stone experience.
            </p>
          </div>

          {/* Responsive Feature Grid — 1 col mobile, 2 tablet, 3 desktop */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feat) => (
              <FeatureCard
                key={feat.id}
                icon={feat.icon}
                title={feat.title}
                description={feat.description}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          CTA BANNER
      ════════════════════════════════════════ */}
      <section className="w-full py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            className="rounded-2xl px-8 sm:px-12 py-14 sm:py-16 text-center relative overflow-hidden"
            style={{ backgroundColor: "#232B32" }}
          >
            {/* Decorative glow */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ background: "radial-gradient(ellipse at center, rgba(197,160,89,0.12) 0%, transparent 70%)" }}
              aria-hidden="true"
            />

            <div className="relative z-10">
              <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: "#C5A059" }}>
                Ready to Begin?
              </span>
              <h2
                className="text-3xl sm:text-4xl font-light tracking-tight mt-3 mb-4"
                style={{ color: "#F9F9FB" }}
              >
                Start Your Premium Stone Journey
              </h2>
              <p className="text-sm sm:text-base max-w-lg mx-auto mb-8" style={{ color: "#9CA3AF" }}>
                Create your account in seconds and launch our immersive 3D configurator to design your dream space with premium stone.
              </p>
              <button
                id="cta-banner-btn"
                onClick={() => navigate(isLoggedIn ? "/configurator" : "/login")}
                className="inline-flex items-center gap-2.5 font-semibold text-sm tracking-widest uppercase py-3.5 px-10 rounded-xl transition-all duration-200 cursor-pointer"
                style={{ backgroundColor: "#C5A059", color: "#ffffff" }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#b08d47")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#C5A059")}
              >
                <CubeIcon />
                {isLoggedIn ? "Open Configurator" : "Create Free Account"}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          FOOTER
      ════════════════════════════════════════ */}
      <footer
        className="w-full"
        style={{ backgroundColor: "#232B32", borderTop: "1px solid rgba(226,232,240,0.12)" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">

          {/* Footer Main Row */}
          <div className="flex flex-col sm:flex-row items-center sm:justify-between gap-6">

            {/* Brand */}
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: "#C5A059" }}
              >
                <svg className="w-4 h-4" style={{ color: "#ffffff" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125v-3.75" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-light tracking-widest uppercase" style={{ color: "#F9F9FB" }}>
                  Six Sigmaphil
                </p>
                <p className="text-xs mt-0.5" style={{ color: "#C5A059" }}>Premium Granite & Stone</p>
              </div>
            </div>

            {/* Footer Links */}
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
              {["Home", "Services", "Contact"].map((link) => (
                <button
                  key={link}
                  className="text-xs font-medium tracking-wide uppercase cursor-pointer transition-colors duration-150"
                  style={{ color: "#9CA3AF" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#C5A059")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#9CA3AF")}
                >
                  {link}
                </button>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="mt-8 mb-6 h-px" style={{ backgroundColor: "rgba(226,232,240,0.1)" }} />

          {/* Copyright */}
          <p className="text-center text-xs" style={{ color: "#6B7280" }}>
            &copy; {new Date().getFullYear()} Six Sigmaphil. All rights reserved.
          </p>
        </div>
      </footer>

    </div>
  );
}
