import { useState, useEffect } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { triggerDeactivatedPopup } from "../utils/deactivatedNotice";

const NAV_LINKS = [
  {
    name: "Account Access",
    path: "/super-admin",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    name: "Credentials",
    path: "/super-admin/credentials",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
  },
];

function getPageTitle(pathname) {
  if (pathname === "/super-admin/credentials") return "Credential Management";
  return "Account Access Control";
}

export default function SuperAdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [superAdminProfile, setSuperAdminProfile] = useState(null);

  useEffect(() => {
    let channel;
    let isMounted = true;

    const verifySuperAdmin = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !session) {
          navigate("/super-admin/login", { replace: true });
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("id, role, is_active, full_name, email")
          .eq("id", session.user.id)
          .single();

        if (!isMounted) return;

        if (profileError || !profile) {
          navigate("/", { replace: true });
          return;
        }

        if (profile.is_active === false) {
          await supabase.auth.signOut();
          triggerDeactivatedPopup({ role: "super_admin" });
          navigate("/login", { replace: true });
          return;
        }

        if (profile.role === "admin") {
          navigate("/dashboard", { replace: true });
          return;
        }

        if (profile.role !== "super_admin") {
          navigate("/", { replace: true });
          return;
        }

        setSuperAdminProfile({
          id: session.user.id,
          email: profile.email || session.user.email || "",
          full_name: profile.full_name || session.user.user_metadata?.full_name || "Super Admin",
          role: profile.role,
        });
        setIsVerifying(false);

        // Enforce instant sign-out if this account is deactivated or demoted in real time
        channel = supabase
          .channel(`super-admin-guard-${session.user.id}`)
          .on(
            "postgres_changes",
            {
              event: "UPDATE",
              schema: "public",
              table: "profiles",
              filter: `id=eq.${session.user.id}`,
            },
            async (payload) => {
              const updated = payload.new;
              if (updated?.is_active === false) {
                await supabase.auth.signOut();
                triggerDeactivatedPopup({ role: "super_admin" });
                navigate("/login", { replace: true });
              } else if (updated?.role === "admin") {
                navigate("/dashboard", { replace: true });
              } else if (updated?.role !== "super_admin") {
                navigate("/", { replace: true });
              } else {
                setSuperAdminProfile((prev) => ({
                  ...prev,
                  email: updated.email || prev?.email || "",
                  full_name: updated.full_name || prev?.full_name || "Super Admin",
                }));
              }
            }
          )
          .subscribe();
      } catch (err) {
        console.error("[SuperAdminLayout] Verification failed:", err);
        if (isMounted) navigate("/super-admin/login", { replace: true });
      }
    };

    verifySuperAdmin();

    return () => {
      isMounted = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("[SuperAdminLayout] Sign out error:", err);
    }
    sessionStorage.removeItem("sixsigma_active");
    localStorage.removeItem("sixsigma_remember");
    localStorage.removeItem("sixsigma_oauth_remember");
    navigate("/super-admin/login", { replace: true });
  };

  if (isVerifying) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#F9F9FB]">
        <div className="w-8 h-8 border-4 border-[#C5A059] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen w-full flex flex-col md:flex-row"
      style={{
        background: "radial-gradient(circle at top right, #FFFFFF 0%, #F9F9FB 55%, #F3F4F8 100%)",
      }}
    >
      {/* Left Sidebar (Desktop) / Top Nav (Mobile) */}
      <nav
        className={`flex flex-col shrink-0 shadow-sm md:h-screen md:sticky md:top-0 z-50 transition-all duration-300 ${
          isCollapsed ? "md:w-20" : "md:w-64"
        }`}
        style={{ backgroundColor: "#232B32", borderRight: "1px solid #1a2025" }}
      >
        <div className="p-4 md:p-6 pb-3 md:pb-6 flex justify-between items-center md:flex-col md:items-stretch border-b md:border-b-0 border-[#1a2025]">
          <div className="flex justify-between items-center">
            <button
              type="button"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden md:flex py-2 px-2.5 rounded-lg text-[#9CA3AF] hover:text-[#F9F9FB] hover:bg-[rgba(255,255,255,0.06)] transition-colors cursor-pointer"
              title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
              aria-label={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {isCollapsed ? (
                  <polyline points="13 17 18 12 13 7" />
                ) : (
                  <polyline points="15 18 9 12 15 6" />
                )}
              </svg>
            </button>

            <div className="flex items-center gap-3 md:hidden">
              <div>
                <h1 className="text-base font-light tracking-widest uppercase text-[#F9F9FB]">
                  Six Sigmaphil
                </h1>
                <p className="text-[11px] font-semibold tracking-wider uppercase text-[#C5A059]">
                  Super Admin
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 md:hidden">
            <button
              type="button"
              onClick={handleLogout}
              className="py-2 px-3 rounded-lg text-xs font-semibold uppercase tracking-wider text-[#F9F9FB] bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.12)] cursor-pointer"
            >
              Sign Out
            </button>
          </div>

          <div className={`mt-4 hidden ${isCollapsed ? "md:hidden" : "md:block"}`}>
            <h1 className="text-xl font-light tracking-widest uppercase text-[#F9F9FB]">
              Six Sigmaphil
            </h1>
            <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[rgba(197,160,89,0.14)] border border-[rgba(197,160,89,0.35)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#C5A059]" />
              <span className="text-[10px] font-bold tracking-widest uppercase text-[#C5A059]">
                Super Admin
              </span>
            </div>
          </div>

          {isCollapsed && (
            <div className="hidden md:block mt-4 text-center">
              <span className="text-lg font-semibold tracking-widest uppercase text-[#C5A059]">
                SA
              </span>
            </div>
          )}
        </div>

        {/* Navigation Links */}
        <div className="flex-1 px-4 py-2.5 md:py-4 flex flex-row md:flex-col overflow-x-auto gap-2 border-b md:border-b-0 border-[#1a2025]">
          {NAV_LINKS.map((link) => {
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.name}
                to={link.path}
                title={isCollapsed ? link.name : ""}
                className={`flex items-center ${isCollapsed ? "justify-center" : "gap-3"} py-2.5 px-4 rounded-xl transition-all duration-200 min-w-max md:min-w-0`}
                style={{
                  backgroundColor: isActive ? "#C5A059" : "transparent",
                  color: isActive ? "#FFFFFF" : "#9CA3AF",
                }}
              >
                {link.icon}
                {!isCollapsed && (
                  <span className="text-xs sm:text-sm font-semibold tracking-widest uppercase">
                    {link.name}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Account Badge & Sign Out */}
        <div className="hidden md:block p-4 mt-auto border-t border-[rgba(255,255,255,0.08)]">
          {!isCollapsed && superAdminProfile?.email && (
            <div className="mb-3 px-2">
              <p className="text-[10px] uppercase tracking-widest text-[#9CA3AF]">Signed In As</p>
              <p className="text-xs font-medium text-[#F9F9FB] truncate mt-0.5">
                {superAdminProfile.email}
              </p>
            </div>
          )}
          <button
            type="button"
            onClick={handleLogout}
            title={isCollapsed ? "Sign Out" : ""}
            className={`w-full flex items-center justify-center gap-2 font-semibold text-xs tracking-widest uppercase ${
              isCollapsed ? "py-3 px-3" : "py-2.5 px-4"
            } rounded-xl transition-all duration-200 cursor-pointer bg-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.12)] text-[#F9F9FB] border border-[rgba(255,255,255,0.12)]`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            {!isCollapsed && "Sign Out"}
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 w-full flex flex-col min-w-0">
        <header
          className="sticky top-0 z-40 border-b border-[#E2E8F0] px-4 md:px-8 py-3.5 flex items-center justify-between gap-4"
          style={{ backdropFilter: "blur(8px)", backgroundColor: "rgba(255,255,255,0.95)" }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="hidden sm:inline-block text-[11px] font-bold tracking-widest uppercase text-[#C5A059]">
              SIX SIGMAPHIL
            </span>
            <span className="hidden sm:inline-block text-[#9CA3AF] text-xs">/</span>
            <h2 className="text-sm md:text-base font-bold text-[#232B32] truncate">
              {getPageTitle(location.pathname)}
            </h2>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F9F9FB] border border-[#E2E8F0] text-xs font-semibold text-[#232B32]">
              <span className="w-2 h-2 rounded-full bg-[#C5A059]" />
              <span className="hidden sm:inline">{superAdminProfile?.email}</span>
              <span className="sm:hidden">Super Admin</span>
            </span>
          </div>
        </header>

        <div className="flex-1 w-full">
          <Outlet
            context={{
              superAdminProfile,
              setSuperAdminProfile,
            }}
          />
        </div>
      </main>
    </div>
  );
}
