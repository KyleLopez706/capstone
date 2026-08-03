import { Routes, Route, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { supabase } from "./supabaseClient";
import Home from "./pages/Home";
import UserLogin from "./pages/UserLogin";
import Dashboard from "./pages/Dashboard";
import About from "./pages/About";
import Services from "./pages/Services";
import Gallery from "./pages/Gallery";
import Contact from "./pages/Contact";
import Configurator3D from "./pages/Configurator3D";
import ResetPassword from "./pages/ResetPassword";
import QuotationRequest from "./pages/QuotationRequest";
import Analytics from "./pages/Analytics";
import AdminLayout from "./components/AdminLayout";
import CreateQuotation from "./pages/CreateQuotation";

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
        // Set active session so they aren't signed out by checkPersistence
        sessionStorage.setItem("sixsigma_active", "1");
        // Replace history entry so the back button doesn't loop
        navigate("/reset-password", { replace: true });
      }

      if (event === "SIGNED_IN") {
        // Only act when returning from a Google OAuth redirect
        // (the flag is written in handleGoogleSignIn before the redirect)
        const oauthPending = localStorage.getItem("sixsigma_oauth_remember");
        if (oauthPending !== null) {
          sessionStorage.setItem("sixsigma_active", "1");
          if (oauthPending === "1") {
            localStorage.setItem("sixsigma_remember", "1");
          } else {
            localStorage.removeItem("sixsigma_remember");
          }
          localStorage.removeItem("sixsigma_oauth_remember");
        }
      }

      if (event === "SIGNED_OUT") {
        // Wipe all persistence flags so the next visit starts clean
        sessionStorage.removeItem("sixsigma_active");
        localStorage.removeItem("sixsigma_remember");
        localStorage.removeItem("sixsigma_oauth_remember");
      }
    });
    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Session Persistence Boot Check ─────────────────────────────────────
     Supabase stores the session in localStorage by default, so it survives
     page refreshes AND full browser restarts (including npm run dev reloads).
     We layer our own persistence preference on top:

     sixsigma_remember  (localStorage)  — user explicitly checked "Stay signed in"
     sixsigma_active    (sessionStorage) — user is in an active browser session
                                          (sessionStorage is cleared when the
                                          browser / tab is fully closed)

     If neither flag exists but Supabase has a stored session → sign out.
     This means: close the browser without "Stay signed in" → next visit starts
     fresh, as the user would expect.

     Admin redirect: if a valid session exists AND the profile role is "admin",
     immediately route them to /dashboard so they never land on the user-facing
     home page after a dev-server restart or tab reopen.
  ────────────────────────────────────────────────────────────────────────── */
  useEffect(() => {
    const checkPersistence = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return; // No session stored — nothing to do

      const rememberMe = localStorage.getItem("sixsigma_remember") === "1";
      const activeSession = sessionStorage.getItem("sixsigma_active") === "1";
      const isResetRoute = window.location.pathname === "/reset-password";

      if (!rememberMe && !activeSession && !isResetRoute) {
        // Supabase has a stale session in localStorage but the user never
        // opted into persistence and this is a new browser session.
        // Sign them out cleanly so the login page is shown.
        await supabase.auth.signOut();
        return;
      }

      // Valid persisted session — check if the user is an admin and redirect
      // them away from the home page back to the dashboard automatically.
      // Skip this check if they are already on the dashboard or a protected route.
      const isOnAdminRoute = window.location.pathname === "/dashboard";
      if (!isOnAdminRoute) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .single();

        if (profile?.role === "admin") {
          navigate("/dashboard", { replace: true });
        }
      }
    };
    checkPersistence();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
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
      </Route>
      <Route path="/admin/quotation/:id" element={<CreateQuotation />} />
    </Routes>
  );
}

export default App;
