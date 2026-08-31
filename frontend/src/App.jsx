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

  // Prevents the OAuth routing block from executing more than once.
  // Both SIGNED_IN and INITIAL_SESSION can fire during the same OAuth
  // callback — only the first one that sees the flag should act.
  const oauthHandled = useRef(false);

  /* ── Auth State Listener ─────────────────────────────────────────────────
     WHY we listen for BOTH "SIGNED_IN" and "INITIAL_SESSION":

     The Supabase JS client is created at module-load time (supabaseClient.js).
     Its internal _initialize() method detects ?code= in the URL and starts
     the PKCE code exchange immediately — BEFORE React mounts any component.

     Scenario A — React mounts BEFORE the exchange finishes:
       1. useEffect runs, attaches this listener.
       2. _initialize() finishes the exchange, fires SIGNED_IN.
       3. Our listener catches SIGNED_IN with the NEW Google session. ✅

     Scenario B — Exchange finishes BEFORE React mounts (fast Vercel):
       1. _initialize() finishes, fires SIGNED_IN internally. No listener yet.
       2. useEffect runs, attaches this listener.
       3. Supabase replays INITIAL_SESSION (it always does after subscribing,
          and it waits for _initialize() to finish first). The session passed
          is the NEW Google session because _initialize() already completed.
       4. Our listener catches INITIAL_SESSION. ✅

     The oauthHandled ref prevents double-routing if both events fire.
  ────────────────────────────────────────────────────────────────────── */
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      /* ── Password Recovery ── */
      if (event === "PASSWORD_RECOVERY") {
        sessionStorage.setItem("sixsigma_active", "1");
        navigate("/reset-password", { replace: true });
        return;
      }

      /* ── OAuth completion (catches BOTH timing scenarios) ── */
      if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
        // Skip if we already handled this OAuth callback
        if (oauthHandled.current) return;

        const oauthPendingStr = localStorage.getItem("sixsigma_oauth_remember");
        // Only act when the OAuth flag exists AND we have a valid session
        if (oauthPendingStr === null || !session) return;

        // Mark as handled so the other event doesn't double-fire
        oauthHandled.current = true;

        // 1. Finalize persistence flags
        sessionStorage.setItem("sixsigma_active", "1");
        if (oauthPendingStr === "1") {
          localStorage.setItem("sixsigma_remember", "1");
        } else {
          localStorage.removeItem("sixsigma_remember");
        }
        localStorage.removeItem("sixsigma_oauth_remember");

        // 2. Read and consume the returnTo destination
        const returnTo = localStorage.getItem("sixsigma_return_to");
        localStorage.removeItem("sixsigma_return_to");
        sessionStorage.removeItem("returnTo");

        // 3. Route by role — using the session parameter directly,
        //    which is guaranteed to be the NEW Google session
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
        return;
      }

      /* ── Sign Out — clean up everything ── */
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
     Handles NON-OAuth scenarios: returning users, page refresh, new tabs.

     When an OAuth callback is in progress this function bails out
     entirely. It MUST NOT call getSession() because the Supabase SDK
     may return a stale cached session from a previously logged-in user
     before the PKCE exchange has replaced it with the new Google session.
  ────────────────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (bootRan.current) return;
    bootRan.current = true;

    const checkPersistence = async () => {
      // Bail out completely during OAuth — the listener above handles it
      const hasCodeInUrl = window.location.search.includes("code=");
      const oauthPending = localStorage.getItem("sixsigma_oauth_remember") !== null;
      if (hasCodeInUrl || oauthPending) return;

      // No OAuth in progress — safe to read the cached session
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      const rememberMe = localStorage.getItem("sixsigma_remember") === "1";
      const activeSession = sessionStorage.getItem("sixsigma_active") === "1";
      const isResetRoute = window.location.pathname === "/reset-password";

      if (!rememberMe && !activeSession && !isResetRoute) {
        await supabase.auth.signOut();
        return;
      }

      // Route by role
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
