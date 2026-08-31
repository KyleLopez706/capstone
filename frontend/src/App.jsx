import { Routes, Route, useNavigate } from "react-router-dom";
import { useEffect, lazy, Suspense } from "react";
import { supabase } from "./supabaseClient";

// Lazy load all pages to split the JavaScript bundle
const Home = lazy(() => import("./pages/Home"));
const UserLogin = lazy(() => import("./pages/UserLogin"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const About = lazy(() => import("./pages/About"));
const Services = lazy(() => import("./pages/Services"));
const Gallery = lazy(() => import("./pages/Gallery"));
const Contact = lazy(() => import("./pages/Contact"));
const Configurator3D = lazy(() => import("./pages/Configurator3D"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const QuotationRequest = lazy(() => import("./pages/QuotationRequest"));
const Analytics = lazy(() => import("./pages/Analytics"));
const CreateQuotation = lazy(() => import("./pages/CreateQuotation"));
const AdminMessages = lazy(() => import("./pages/AdminMessages"));
const AdminSettings = lazy(() => import("./pages/AdminSettings"));
const AdminMaterials = lazy(() => import("./pages/AdminMaterials"));
// Layouts can remain static or be lazy. AdminLayout is small enough, but let's lazy load it too
const AdminLayout = lazy(() => import("./components/AdminLayout"));

function App() {
  const navigate = useNavigate();

  /* ── Global auth-state listener ─────────────────────────────────────────
     Handles three global auth events:

     PASSWORD_RECOVERY — Supabase PKCE reset flow fires SIGNED_IN first then
       PASSWORD_RECOVERY. Intercepting here at the root routes the user to
       /reset-password before any page-level session check can redirect them
       away, preventing the "double tab" effect.

     SIGNED_IN — after a Google OAuth redirect the page re-mounts here. We
       read the sixsigma_oauth_remember flag stored before the redirect and
       set the real persistence flags accordingly.

     SIGNED_OUT — clear all persistence flags wherever sign-out was triggered.
  ────────────────────────────────────────────────────────────────────────── */
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        sessionStorage.setItem("sixsigma_active", "1");
        navigate("/reset-password", { replace: true });
      }

      if (event === "SIGNED_IN") {
        const oauthPending = localStorage.getItem("sixsigma_oauth_remember");
        if (oauthPending !== null) {
          sessionStorage.setItem("sixsigma_active", "1");
          if (oauthPending === "1") {
            localStorage.setItem("sixsigma_remember", "1");
          } else {
            localStorage.removeItem("sixsigma_remember");
          }
          localStorage.removeItem("sixsigma_oauth_remember");

          /* ── OAuth returnTo routing ──────────────────────────────────────
             This is the ONLY reliable place to route after Google OAuth.
             checkPersistence skips routing when oauthPending is set, so
             this handler is the single source of truth for post-OAuth
             navigation. We check the user's role first: admins always
             go to /dashboard regardless of returnTo.
          ────────────────────────────────────────────────────────────── */
          const returnTo = localStorage.getItem("sixsigma_return_to");
          localStorage.removeItem("sixsigma_return_to");
          sessionStorage.removeItem("returnTo");

          // Async role check — wrapped in an IIFE so we don't make the
          // callback itself async (Supabase listener doesn't await it).
          (async () => {
            try {
              const { data: { session } } = await supabase.auth.getSession();
              if (!session) {
                navigate(returnTo || "/", { replace: true });
                return;
              }
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
          })();
        }
      }

      if (event === "SIGNED_OUT") {
        sessionStorage.removeItem("sixsigma_active");
        localStorage.removeItem("sixsigma_remember");
        localStorage.removeItem("sixsigma_oauth_remember");
      }
    });
    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Session Persistence Boot Check ───────────────────────────────────── */
  useEffect(() => {
    const checkPersistence = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return; 

      const rememberMe = localStorage.getItem("sixsigma_remember") === "1";
      const activeSession = sessionStorage.getItem("sixsigma_active") === "1";
      const isResetRoute = window.location.pathname === "/reset-password";
      
      const isOAuthCallback = window.location.hash.includes("access_token");
      const oauthPending = localStorage.getItem("sixsigma_oauth_remember") !== null;

      if (!rememberMe && !activeSession && !isResetRoute && !isOAuthCallback && !oauthPending) {
        await supabase.auth.signOut();
        return;
      }

      /* If an OAuth callback is in progress, skip all routing here.
         The onAuthStateChange SIGNED_IN handler (above) is the single
         source of truth for post-OAuth routing — it fires AFTER the
         PKCE code exchange completes and will handle returnTo + role
         routing reliably. Running routing logic here too causes a race
         where both handlers consume/clear the returnTo flag and the
         loser falls through to navigate("/"). */
      if (oauthPending || isOAuthCallback) return;

      const isOnAdminRoute = window.location.pathname === "/dashboard";
      if (!isOnAdminRoute) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .single();

        if (profile?.role === "admin") {
          navigate("/dashboard", { replace: true });
        } else {
          const returnTo = localStorage.getItem("sixsigma_return_to") || sessionStorage.getItem("returnTo");
          if (returnTo) {
            localStorage.removeItem("sixsigma_return_to");
            sessionStorage.removeItem("returnTo");
            if (window.location.pathname !== returnTo) {
              navigate(returnTo, { replace: true });
            }
          } else if (window.location.pathname === "/login") {
            navigate("/", { replace: true });
          }
        }
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
