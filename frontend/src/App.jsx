import { Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import { supabase } from "./supabaseClient";
import Home           from "./pages/Home";
import UserLogin      from "./pages/UserLogin";
import Dashboard      from "./pages/Dashboard";
import About          from "./pages/About";
import Services       from "./pages/Services";
import Gallery        from "./pages/Gallery";
import Contact        from "./pages/Contact";
import Configurator3D from "./pages/Configurator3D";

function App() {
  /* ── Phase 5: Diagnostic boot log ──
     Confirms Supabase connection status and active session on every app load.
     Remove this useEffect once the system is fully verified in production. */
  useEffect(() => {
    const runDiagnostic = async () => {
      console.group("🔷 SIX SIGMAPHIL — Supabase Boot Diagnostic");

      // 1. Check active session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error("❌ Session Error:", sessionError.message);
      } else if (session) {
        console.log("✅ Active Session Found:", session.user.email);
        console.log("   User ID:", session.user.id);
        console.log("   Role:", session.user.role);
      } else {
        console.log("ℹ️  No active session (user is not logged in).");
      }

      // 2. Verify connection by querying the profiles table
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, role")
        .limit(1);

      if (profilesError) {
        // RLS may block this if unauthenticated — that is expected and correct
        console.warn("⚠️  Profiles query:", profilesError.message, "(RLS may be active — this is expected)");
      } else {
        console.log("✅ Supabase connection confirmed. Profiles table accessible.");
        console.log("   Sample record:", profiles);
      }

      console.groupEnd();
    };

    runDiagnostic();
  }, []);

  return (
    <Routes>
      <Route path="/"               element={<Home />} />
      <Route path="/login"          element={<UserLogin />} />
      <Route path="/dashboard"      element={<Dashboard />} />
      <Route path="/about"          element={<About />} />
      <Route path="/services"       element={<Services />} />
      <Route path="/gallery"        element={<Gallery />} />
      <Route path="/contact"        element={<Contact />} />
      <Route path="/configurator-3d" element={<Configurator3D />} />
    </Routes>
  );
}

export default App;
