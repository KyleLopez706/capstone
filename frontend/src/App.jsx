import { Routes, Route, useNavigate } from "react-router-dom";
import { useEffect, lazy, Suspense, useRef } from "react";
import { supabase } from "./supabaseClient";

// Lazy load all pages to split the JavaScript bundle
const Home = lazy(() => import("./pages/Home"));
const UserLogin = lazy(() => import("./pages/UserLogin"));
const Configurator3D = lazy(() => import("./pages/Configurator3D"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Analytics = lazy(() => import("./pages/Analytics"));
const QuotationRequest = lazy(() => import("./pages/QuotationRequest"));
const CreateQuotation = lazy(() => import("./pages/CreateQuotation"));
const AdminSettings = lazy(() => import("./pages/AdminSettings"));
const AdminMaterials = lazy(() => import("./pages/AdminMaterials"));
const AdminMessages = lazy(() => import("./pages/AdminMessages"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const About = lazy(() => import("./pages/About"));
const Services = lazy(() => import("./pages/Services"));
const Gallery = lazy(() => import("./pages/Gallery"));
const Contact = lazy(() => import("./pages/Contact"));

// Layout
const AdminLayout = lazy(() => import("./components/AdminLayout"));

function App() {
  const navigate = useNavigate();

  /* ── Auth State Listener ─────────────────────────────────────────────────
     onAuthStateChange is the ONLY reliable way to detect a completed
     OAuth login. When Google redirects back with ?code=, Supabase
     exchanges it in the background (PKCE). getSession() returns the
     OLD cached session during this exchange. Only when SIGNED_IN fires
     is the NEW Google session guaranteed to be ready.

     This listener handles three events:

     PASSWORD_RECOVERY — route to /reset-password immediately.

     SIGNED_IN — if sixsigma_oauth_remember exists in localStorage,
       this is an OAuth callback completing. We finalize persistence
       flags and route to the saved returnTo destination (e.g.
       /quotation-request). The session parameter is the NEW Google
       session, not a stale cache.

     SIGNED_OUT — clear all persistence flags.
  ────────────────────────────────────────────────────────────────────── */
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        sessionStorage.setItem("sixsigma_active", "1");
        navigate("/reset-password", { replace: true });
        return;
      }

      if (event === "SIGNED_IN") {
        const oauthPendingStr = localStorage.getItem("sixsigma_oauth_remember");
        // Only act if this is an OAuth callback (flag was set before redirect)
        if (oauthPendingStr !== null) {
          // 1. Finalize persistence flags
          sessionStorage.setItem("sixsigma_active", "1");
          if (oauthPendingStr === "1") {
            localStorage.setItem("sixsigma_remember", "1");
          } else {
            localStorage.removeItem("sixsigma_remember");
          }
          localStorage.removeItem("sixsigma_oauth_remember");

          // 2. Read and clear the returnTo destination
          const returnTo = localStorage.getItem("sixsigma_return_to");
          localStorage.removeItem("sixsigma_return_to");
          sessionStorage.removeItem("returnTo");

          // 3. Route based on role using the NEW session (not getSession cache)
          if (session) {
            try {
              const { data: profile } = await supabase
                .from("profiles")
                .select("role")
                .eq("id", session.user.id)
                .single();

              if (profile?.role === "admin") {
                navigate("/dashboard", { replace: true });
              } else {
                navigate(returnTo || "/", { replace: true });
              }
            } catch {
              navigate(returnTo || "/", { replace: true });
            }
          } else {
            navigate(returnTo || "/", { replace: true });
          }
        }
        return;
      }

      if (event === "SIGNED_OUT") {
        sessionStorage.removeItem("sixsigma_active");
        localStorage.removeItem("sixsigma_remember");
        localStorage.removeItem("sixsigma_oauth_remember");
        localStorage.removeItem("sixsigma-configurator");
      }
    });
    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const bootRan = useRef(false);

  /* ── Session Persistence Boot Check ─────────────────────────────────────
     Runs once on mount for NON-OAuth scenarios (page refresh, new tab).
     If an OAuth callback is in progress (?code= in URL or oauthPending
     flag set), this function bails out COMPLETELY and defers all routing
     to the onAuthStateChange SIGNED_IN handler above.

     CRITICAL: We must NOT call getSession() during an OAuth callback
     because it returns the OLD cached session (previous user), not
     the new Google session. The PKCE exchange hasn't completed yet.
  ────────────────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (bootRan.current) return;
    bootRan.current = true;

    const checkPersistence = async () => {
      // Detect OAuth callback — bail out entirely if one is in progress.
      // The onAuthStateChange SIGNED_IN handler will handle everything.
      const hasCodeInUrl = window.location.search.includes("code=");
      const oauthPending = localStorage.getItem("sixsigma_oauth_remember") !== null;
      if (hasCodeInUrl || oauthPending) return;

      // Safe to call getSession() now — no OAuth exchange is happening,
      // so the cached session (if any) is accurate.
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      const rememberMe = localStorage.getItem("sixsigma_remember") === "1";
      const activeSession = sessionStorage.getItem("sixsigma_active") === "1";
      const isResetRoute = window.location.pathname === "/reset-password";

      // If neither remember-me nor active-session is set, sign out
      // (browser was closed without "Stay signed in" checked)
      if (!rememberMe && !activeSession && !isResetRoute) {
        await supabase.auth.signOut();
        return;
      }

      // Route based on role
      const isOnAdminRoute = window.location.pathname === "/dashboard";
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .single();

      if (profile?.role === "admin") {
        if (!isOnAdminRoute) {
          navigate("/dashboard", { replace: true });
        }
        return;
      }

      // Normal user — check for pending returnTo
      const returnTo =
        localStorage.getItem("sixsigma_return_to") ||
        sessionStorage.getItem("returnTo");

      localStorage.removeItem("sixsigma_return_to");
      sessionStorage.removeItem("returnTo");

      if (returnTo) {
        if (window.location.pathname !== returnTo) {
          navigate(returnTo, { replace: true });
        }
      } else if (window.location.pathname === "/login") {
        navigate("/", { replace: true });
      }
    };

    checkPersistence();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Suspense
      fallback={
        <div className="min-h-screen w-full flex items-center justify-center bg-[#F9F9FB]">
          <div className="w-8 h-8 border-4 border-[#C5A059] border-t-transparent rounded-full animate-spin"></div>
        </div>
      }
    >
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<UserLogin />} />
        <Route path="/about" element={<About />} />
        <Route path="/services" element={<Services />} />
        <Route path="/gallery" element={<Gallery />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/configurator-3d" element={<Configurator3D />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/quotation-request" element={<QuotationRequest />} />

        <Route element={<AdminLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/messages" element={<AdminMessages />} />
          <Route path="/admin/settings" element={<AdminSettings />} />
          <Route path="/admin/materials" element={<AdminMaterials />} />
        </Route>
        <Route path="/admin/quotation/:id" element={<CreateQuotation />} />
      </Routes>
    </Suspense>
  );
}

export default App;
