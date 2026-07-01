import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { inputBase, onFocus, onBlur } from "../components/formConstants";
import {
  InputIcon, EyeToggle,
  Alert, SubmitButton,
} from "../components/FormHelpers";


/* ─────────────────────────────────────────
   ADMIN LOGIN PAGE
   Handles admin credentials only.
   On success: stores "token" and navigates
   to /dashboard.
───────────────────────────────────────── */
export default function AdminLogin() {
  const [adminUsername, setAdminUsername] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminShowPw,   setAdminShowPw]   = useState(false);
  const [adminError,    setAdminError]    = useState("");
  const [adminLoading,  setAdminLoading]  = useState(false);

  const navigate = useNavigate();

  /* ─── Admin Login handler ─── */
  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setAdminError("");
    setAdminLoading(true);
    try {
      const response = await fetch("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: adminUsername, password: adminPassword }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Login failed");
      localStorage.setItem("token", data.token);
      navigate("/dashboard");
    } catch (err) {
      setAdminError(err.message);
    } finally {
      setAdminLoading(false);
    }
  };

  /* ─────────────────────────────────────────
     RENDER
  ───────────────────────────────────────── */
  return (
    <div
      className="min-h-screen w-full flex items-center justify-center px-4 sm:px-6 py-6 md:py-12"
      style={{ backgroundColor: "#F9F9FB" }}
    >
      <div
        className="w-full max-w-md rounded-2xl shadow-xl p-6 sm:p-8 md:p-10"
        style={{ backgroundColor: "#ffffff", border: "1px solid #E2E8F0" }}
      >
        {/* ── Back to Home ── */}
        <button
          id="admin-login-back-btn"
          onClick={() => navigate("/")}
          className="inline-flex items-center gap-1.5 mb-6 text-xs font-medium tracking-wide cursor-pointer transition-colors duration-150"
          style={{ color: "#9CA3AF" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#C5A059")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#9CA3AF")}
          aria-label="Go back to home"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
          Back to Home
        </button>

        {/* ── Brand Header ── */}
        <div className="text-center mb-7">
          <div
            className="mx-auto mb-4 rounded-xl flex items-center justify-center shadow-sm"
            style={{ backgroundColor: "#232B32", width: 52, height: 52 }}
          >
            <svg className="w-7 h-7" style={{ color: "#C5A059" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125v-3.75" />
            </svg>
          </div>
          <h1 className="text-2xl font-light tracking-widest uppercase" style={{ color: "#232B32" }}>
            Six Sigmaphil
          </h1>
          <p className="text-xs mt-1 tracking-wide" style={{ color: "#9CA3AF" }}>
            Admin Portal
          </p>
        </div>

        {/* ── Admin Login Form ── */}
        {adminError && <Alert type="error" message={adminError} />}
        <form onSubmit={handleAdminLogin} className="space-y-4">
          {/* Username */}
          <div>
            <label htmlFor="admin-username" className="block text-xs font-medium tracking-wider uppercase mb-2" style={{ color: "#232B32" }}>
              Username
            </label>
            <div className="relative">
              <InputIcon icon="user" />
              <input
                id="admin-username"
                type="text"
                value={adminUsername}
                onChange={(e) => setAdminUsername(e.target.value)}
                required
                placeholder="Enter your username"
                className="w-full rounded-lg pl-11 pr-4 py-3 text-sm outline-none transition-all duration-200"
                style={inputBase}
                onFocus={onFocus}
                onBlur={onBlur}
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label htmlFor="admin-password" className="block text-xs font-medium tracking-wider uppercase mb-2" style={{ color: "#232B32" }}>
              Password
            </label>
            <div className="relative">
              <InputIcon icon="lock" />
              <input
                id="admin-password"
                type={adminShowPw ? "text" : "password"}
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                required
                placeholder="Enter your password"
                className="w-full rounded-lg pl-11 pr-11 py-3 text-sm outline-none transition-all duration-200"
                style={inputBase}
                onFocus={onFocus}
                onBlur={onBlur}
              />
              <EyeToggle show={adminShowPw} onToggle={() => setAdminShowPw(!adminShowPw)} />
            </div>
          </div>

          <SubmitButton loading={adminLoading} label="Sign In" loadingLabel="Authenticating…" />
        </form>

        {/* ── Footer ── */}
        <p className="text-center text-xs mt-7 tracking-wide" style={{ color: "#9CA3AF" }}>
          Secured access · Six Sigmaphil Corp.
        </p>
      </div>
    </div>
  );
}
