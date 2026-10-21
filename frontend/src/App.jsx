import { Routes, Route, useNavigate, Navigate } from "react-router-dom";
import { useState, useEffect, lazy, Suspense, useRef, Component } from "react";
import { supabase } from "./supabaseClient";

/* ── Global Error Boundary ────────────────────────────────────────────────
   Prevents entire application tree from crashing to a blank white screen
   if any unexpected runtime error occurs.
────────────────────────────────────────────────────────────────────────── */
class GlobalErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("[GlobalErrorBoundary] Unhandled error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 bg-[#F9F9FB] text-[#232B32] text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#C5A059]/15 border border-[#C5A059]/30 flex items-center justify-center mb-4 text-[#C5A059]">
            <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
            </svg>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">Something went wrong</h1>
          <p className="text-sm text-[#6B7280] max-w-md mb-6 leading-relaxed">
            The application experienced an unexpected interruption. Our technical team has been notified.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2.5 rounded-xl bg-[#C5A059] hover:bg-[#b08d47] text-[#232B32] font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
            >
              Refresh Page
            </button>
            <button
              onClick={() => {
                this.setState({ hasError: false });
                window.location.href = "/";
              }}
              className="px-6 py-2.5 rounded-xl bg-[#232B32] hover:bg-[#2A313C] text-[#F9F9FB] font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
            >
              Return to Home
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

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
const AdminModels = lazy(() => import("./pages/AdminModels"));
const AdminCabinetColors = lazy(() => import("./pages/AdminCabinetColors"));
const AdminGallery = lazy(() => import("./pages/AdminGallery"));
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

  // Prevents UI flashing (showing the Home page for a split second)
  // while Supabase is processing the Google login code in the background.
  const [isProcessingOAuth, setIsProcessingOAuth] = useState(() => {
    // Never show OAuth loader on password reset route
    if (window.location.pathname === "/reset-password") return false;
    // Explicit auth errors in URL means auth failed, don't show OAuth loader
    if (
      window.location.search.includes("error=") ||
      window.location.hash.includes("error=")
    ) {
      localStorage.removeItem("sixsigma_oauth_remember");
      return false;
    }
    const hasCodeInUrl = window.location.search.includes("code=");
    const hasOAuthPending =
      localStorage.getItem("sixsigma_oauth_remember") !== null;
    return hasCodeInUrl || hasOAuthPending;
  });

  // Safety timeout: OAuth loader should never hang indefinitely
  useEffect(() => {
    if (!isProcessingOAuth) return;
    const timeout = setTimeout(() => {
      setIsProcessingOAuth(false);
      localStorage.removeItem("sixsigma_oauth_remember");
    }, 4000);
    return () => clearTimeout(timeout);
  }, [isProcessingOAuth]);

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
        setIsProcessingOAuth(false);
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
        if (oauthPendingStr === null || !session) {
          if (isProcessingOAuth) setIsProcessingOAuth(false);
          return;
        }

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
            setIsProcessingOAuth(false);
            navigate("/dashboard", { replace: true });
          } else {
            setIsProcessingOAuth(false);
            navigate(returnTo || "/", { replace: true });
          }
        } catch {
          setIsProcessingOAuth(false);
          navigate(returnTo || "/", { replace: true });
        }
        return;
      }

      /* ── Sign Out — clean up everything ── */
      if (event === "SIGNED_OUT") {
        setIsProcessingOAuth(false);
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
      const oauthPending =
        localStorage.getItem("sixsigma_oauth_remember") !== null;
      if (hasCodeInUrl || oauthPending) return;

      // No OAuth in progress — safe to read the cached session
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      // Maintain active session state across tabs for valid Supabase sessions
      sessionStorage.setItem("sixsigma_active", "1");

      // If user is actively on reset password page, do not route away
      if (window.location.pathname === "/reset-password") return;

      // Check if current route is an admin destination
      const isCurrentAdminPath =
        window.location.pathname.startsWith("/admin/") ||
        ["/dashboard", "/analytics", "/messages"].includes(window.location.pathname);

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .single();

      if (profile?.role === "admin") {
        if (!isCurrentAdminPath && window.location.pathname === "/login") {
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

  if (isProcessingOAuth) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#F9F9FB]">
        <div className="w-8 h-8 border-4 border-[#C5A059] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <GlobalErrorBoundary>
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
          <Route path="/configurator-3d/*" element={<Configurator3D />} />
          <Route path="/configurator" element={<Configurator3D />} />
          <Route path="/configurator/*" element={<Configurator3D />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/quotation-request" element={<QuotationRequest />} />

          <Route element={<AdminLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/messages" element={<AdminMessages />} />
            <Route path="/admin/settings" element={<AdminSettings />} />
            <Route path="/admin/materials" element={<AdminMaterials />} />
            <Route path="/admin/models" element={<AdminModels />} />
            <Route
              path="/admin/cabinet-colors"
              element={<AdminCabinetColors />}
            />
            <Route path="/admin/gallery" element={<AdminGallery />} />
          </Route>
          <Route path="/admin/quotation/:id" element={<CreateQuotation />} />

          {/* Fallback route to prevent white screen on unknown URLs */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </GlobalErrorBoundary>
  );
}

export default App;
