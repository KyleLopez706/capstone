import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";

/* ─────────────────────────────────────────
   NAV LINKS — single source of truth shared
   across every page that imports this component
───────────────────────────────────────── */
const NAV_LINKS = [
  { label: "Home",     href: "/" },
  { label: "About",    href: "/about" },
  { label: "Services", href: "/services" },
  { label: "Gallery",  href: "/gallery" },
  { label: "Contact",  href: "/contact" },
];

/* ─────────────────────────────────────────
   PROFILE DROPDOWN
───────────────────────────────────────── */
function ProfileDropdown({ onSignOut }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const name = localStorage.getItem("userName") || "User";
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      {/* Avatar trigger */}
      <button
        id="profile-avatar-btn"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-2 cursor-pointer rounded-full transition-all duration-200 focus:outline-none"
        aria-label="User menu"
        aria-expanded={open}
      >
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
        <span
          className="hidden sm:flex items-center gap-1 text-sm font-medium"
          style={{ color: "#F9F9FB" }}
        >
          {name.split(" ")[0]}
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 8.25l-7.5 7.5-7.5-7.5"
            />
          </svg>
        </span>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          className="absolute right-0 mt-3 w-52 rounded-xl shadow-xl overflow-hidden z-50"
          style={{ backgroundColor: "#ffffff", border: "1px solid #E2E8F0" }}
        >
          {/* User info */}
          <div className="px-4 py-3" style={{ borderBottom: "1px solid #E2E8F0" }}>
            <p
              className="text-xs font-semibold tracking-wider uppercase truncate"
              style={{ color: "#232B32" }}
            >
              {name}
            </p>
            <p className="text-xs mt-0.5 truncate" style={{ color: "#9CA3AF" }}>
              {localStorage.getItem("userEmail") || ""}
            </p>
          </div>

          {/* Sign Out */}
          <div className="py-1">
            <button
              id="dropdown-signout-btn"
              onClick={() => {
                setOpen(false);
                onSignOut();
              }}
              className="w-full text-left px-4 py-2.5 text-sm transition-colors duration-150 cursor-pointer"
              style={{ color: "#DC2626" }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor = "#FEF2F2")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = "transparent")
              }
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
   NAVBAR  (default export — used by all pages)
───────────────────────────────────────── */
export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Auth state — checks for "userToken" written by Login.jsx on sign-in
  const [isLoggedIn, setIsLoggedIn] = useState(
    !!localStorage.getItem("userToken")
  );

  // Sync auth across tabs ("storage") and within the same tab ("userAuthChange")
  useEffect(() => {
    const sync = () => setIsLoggedIn(!!localStorage.getItem("userToken"));
    window.addEventListener("storage", sync);
    window.addEventListener("userAuthChange", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("userAuthChange", sync);
    };
  }, []);

  const handleSignOut = () => {
    localStorage.removeItem("userToken");
    localStorage.removeItem("userName");
    localStorage.removeItem("userEmail");
    setIsLoggedIn(false);
    navigate("/");
  };

  return (
    <header
      className="fixed top-0 left-0 right-0 z-40 w-full"
      style={{
        backgroundColor: "rgba(35,43,50,0.97)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(226,232,240,0.15)",
      }}
    >
      {/* ── Main navbar row ── */}
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <button
          id="home-logo-btn"
          onClick={() => navigate("/")}
          className="flex items-center gap-3 cursor-pointer group focus:outline-none shrink-0"
        >
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ backgroundColor: "#C5A059" }}
          >
            <svg
              className="w-4 h-4"
              style={{ color: "#ffffff" }}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125v-3.75"
              />
            </svg>
          </div>
          <span
            className="text-base sm:text-lg font-light tracking-widest uppercase"
            style={{ color: "#F9F9FB" }}
          >
            Six Sigmaphil
          </span>
        </button>

        {/* ── Centered desktop nav links ── */}
        <div className="hidden lg:flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
          {NAV_LINKS.map((link) => {
            // Highlight the active page link
            const isActive = location.pathname === link.href;
            return (
              <button
                key={link.label}
                onClick={() => navigate(link.href)}
                className="relative px-4 py-2 text-sm font-medium tracking-wide cursor-pointer transition-colors duration-200 rounded-lg group"
                style={{ color: isActive ? "#C5A059" : "#D1D5DB" }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.color = "#C5A059")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.color = isActive ? "#C5A059" : "#D1D5DB")
                }
              >
                {link.label}
                {/* Underline — always visible for active, slides in on hover for others */}
                <span
                  className="absolute bottom-1 left-4 right-4 h-px rounded-full transition-transform duration-200 origin-center"
                  style={{
                    backgroundColor: "#C5A059",
                    transform: isActive ? "scaleX(1)" : "scaleX(0)",
                  }}
                  // CSS group-hover handles the hover scale via Tailwind group
                />
              </button>
            );
          })}
        </div>

        {/* ── Right side: auth controls + hamburger ── */}
        <div className="flex items-center gap-3">
          {/* Auth */}
          {isLoggedIn ? (
            <ProfileDropdown onSignOut={handleSignOut} />
          ) : (
            <button
              id="navbar-signin-btn"
              onClick={() => navigate("/login")}
              className="font-semibold text-xs sm:text-sm tracking-widest uppercase py-2 px-4 rounded-lg transition-all duration-200 cursor-pointer"
              style={{ backgroundColor: "#C5A059", color: "#ffffff" }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor = "#b08d47")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = "#C5A059")
              }
            >
              Sign In
            </button>
          )}

          {/* Hamburger — visible below lg */}
          <button
            id="mobile-menu-btn"
            className="lg:hidden flex flex-col justify-center items-center w-9 h-9 gap-1.5 rounded-lg cursor-pointer focus:outline-none"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            <span
              className="block w-5 h-px rounded-full transition-all duration-300"
              style={{
                backgroundColor: "#F9F9FB",
                transform: mobileMenuOpen
                  ? "translateY(4px) rotate(45deg)"
                  : "none",
              }}
            />
            <span
              className="block w-5 h-px rounded-full transition-all duration-300"
              style={{
                backgroundColor: "#F9F9FB",
                opacity: mobileMenuOpen ? 0 : 1,
              }}
            />
            <span
              className="block w-5 h-px rounded-full transition-all duration-300"
              style={{
                backgroundColor: "#F9F9FB",
                transform: mobileMenuOpen
                  ? "translateY(-4px) rotate(-45deg)"
                  : "none",
              }}
            />
          </button>
        </div>
      </nav>

      {/* ── Mobile nav drawer ── */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden w-full px-4 pb-4 flex flex-col gap-1"
          style={{ borderTop: "1px solid rgba(226,232,240,0.12)" }}
        >
          {NAV_LINKS.map((link) => {
            const isActive = location.pathname === link.href;
            return (
              <button
                key={link.label}
                onClick={() => navigate(link.href)}
                className="w-full text-left px-4 py-3 text-sm font-medium tracking-wide rounded-lg cursor-pointer transition-colors duration-150"
                style={{
                  color: isActive ? "#C5A059" : "#D1D5DB",
                  backgroundColor: isActive
                    ? "rgba(197,160,89,0.08)"
                    : "transparent",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor =
                    "rgba(197,160,89,0.1)";
                  e.currentTarget.style.color = "#C5A059";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = isActive
                    ? "rgba(197,160,89,0.08)"
                    : "transparent";
                  e.currentTarget.style.color = isActive
                    ? "#C5A059"
                    : "#D1D5DB";
                }}
              >
                {link.label}
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
}
