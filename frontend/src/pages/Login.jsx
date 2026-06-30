import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";

/* ─────────────────────────────────────────
   Eye-toggle icon helpers
───────────────────────────────────────── */
function EyeIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.964-7.178Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  );
}
function EyeOffIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
    </svg>
  );
}



/* ─────────────────────────────────────────
   Shared input focus styling helper
───────────────────────────────────────── */
const inputBase = {
  backgroundColor: "#F9F9FB",
  border: "1px solid #E2E8F0",
  color: "#232B32",
};

/* ── Shared eye toggle button ── */
const EyeToggle = ({ show, onToggle }) => (
  <button
    type="button"
    onClick={onToggle}
    className="absolute inset-y-0 right-0 pr-4 flex items-center transition-colors duration-150"
    style={{ color: "#9CA3AF" }}
    onMouseEnter={(e) => (e.currentTarget.style.color = "#C5A059")}
    onMouseLeave={(e) => (e.currentTarget.style.color = "#9CA3AF")}
    tabIndex={-1}
  >
    {show ? <EyeOffIcon /> : <EyeIcon />}
  </button>
);

function Login({ modal = false }) {
  /* ── Mode: "admin" | "user" ── */
  const [mode, setMode] = useState("admin");

  /* ── User sub-mode: "signin" | "signup" ── */
  const [userView, setUserView] = useState("signin");

  /* ── Admin form state ── */
  const [adminUsername, setAdminUsername] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminShowPw, setAdminShowPw] = useState(false);
  const [adminError, setAdminError] = useState("");
  const [adminLoading, setAdminLoading] = useState(false);

  /* ── User Sign-In state ── */
  const [userEmail, setUserEmail] = useState("");
  const [userPassword, setUserPassword] = useState("");
  const [userShowPw, setUserShowPw] = useState(false);
  const [userSignInError, setUserSignInError] = useState("");
  const [userSignInLoading, setUserSignInLoading] = useState(false);

  /* ── User Sign-Up state ── */
  const [signUpName, setSignUpName] = useState("");
  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [signUpShowPw, setSignUpShowPw] = useState(false);
  const [signUpError, setSignUpError] = useState("");
  const [signUpSuccess, setSignUpSuccess] = useState("");
  const [signUpLoading, setSignUpLoading] = useState(false);

  /* ── Forgot Password state machine ── */
  // forgotStep: null | "request" | "verify"
  const [forgotStep, setForgotStep] = useState(null);
  const [resetEmail, setResetEmail] = useState("");
  const [resetPin, setResetPin] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [forgotError, setForgotError] = useState("");
  const [forgotSuccess, setForgotSuccess] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);

  const navigate = useNavigate();

  /* ── Admin Login handler ── */
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

  /* ── User Sign-In handler ── */
  const handleUserSignIn = async (e) => {
    e.preventDefault();
    setUserSignInError("");
    setUserSignInLoading(true);
    try {
      const response = await fetch("http://localhost:3000/api/auth/user-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail, password: userPassword }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Sign in failed.");
      localStorage.setItem("userToken", data.token);
      navigate("/");
    } catch (err) {
      setUserSignInError(err.message);
    } finally {
      setUserSignInLoading(false);
    }
  };

  /* ── User Sign-Up handler ── */
  const handleUserSignUp = async (e) => {
    e.preventDefault();
    setSignUpError("");
    setSignUpSuccess("");
    setSignUpLoading(true);
    try {
      const response = await fetch("http://localhost:3000/api/auth/user-register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: signUpEmail, password: signUpPassword }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Registration failed.");
      // On success: show message then switch to Sign In tab
      setSignUpSuccess("Account created! Please sign in.");
      setSignUpEmail("");
      setSignUpPassword("");
      setSignUpName("");
      setTimeout(() => {
        setSignUpSuccess("");
        switchUserView("signin");
      }, 1500);
    } catch (err) {
      setSignUpError(err.message);
    } finally {
      setSignUpLoading(false);
    }
  };

  /* ── Google login handler ── */
  const [googleError, setGoogleError] = useState("");

  const handleGoogleSuccess = async (credentialResponse) => {
    setGoogleError("");
    try {
      // Exchange ID token for our backend JWT
      const response = await fetch("http://localhost:3000/api/auth/google-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential: credentialResponse.credential }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Google login failed.");
      localStorage.setItem("userToken", data.token);
      navigate("/");
    } catch (err) {
      setGoogleError(err.message);
    }
  };

  const handleGoogleError = () => {
    setGoogleError("Google sign-in was cancelled or failed.");
  };

  /* ── Reset errors when switching modes ── */
  const switchMode = (m) => {
    setMode(m);
    setAdminError("");
    setUserSignInError("");
    setSignUpError("");
  };
  const switchUserView = (v) => {
    setUserView(v);
    setUserSignInError("");
    setSignUpError("");
    setSignUpSuccess("");
    setForgotStep(null);
    setForgotError("");
    setForgotSuccess("");
  };

  /* ── Forgot Password: request PIN ── */
  const handleForgotRequest = async (e) => {
    e.preventDefault();
    setForgotError("");
    setForgotSuccess("");
    setForgotLoading(true);
    try {
      const response = await fetch("http://localhost:3000/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resetEmail }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to send PIN.");
      setForgotSuccess(data.message);
      // Move to verify step after a short pause
      setTimeout(() => {
        setForgotSuccess("");
        setForgotStep("verify");
      }, 1200);
    } catch (err) {
      setForgotError(err.message);
    } finally {
      setForgotLoading(false);
    }
  };

  /* ── Forgot Password: verify PIN & reset ── */
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setForgotError("");
    setForgotSuccess("");
    if (newPassword !== confirmPassword) {
      setForgotError("Passwords do not match.");
      return;
    }
    setForgotLoading(true);
    try {
      const response = await fetch("http://localhost:3000/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resetEmail, pin: resetPin, newPassword }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to reset password.");
      setForgotSuccess(data.message);
      // Clear state and return to sign-in after success
      setTimeout(() => {
        setForgotStep(null);
        setResetEmail("");
        setResetPin("");
        setNewPassword("");
        setConfirmPassword("");
        setForgotSuccess("");
        setUserView("signin");
      }, 1800);
    } catch (err) {
      setForgotError(err.message);
    } finally {
      setForgotLoading(false);
    }
  };



  /* ── Shared input focus handlers ── */
  const onFocus = (e) => (e.target.style.borderColor = "#C5A059");
  const onBlur  = (e) => (e.target.style.borderColor = "#E2E8F0");

  return (
    /*
     * When rendered as a modal overlay (from Home page), the outer wrapper is a
     * fixed full-screen frosted glass panel so the Home page shows through behind.
     * When accessed directly via /login URL, it renders as a normal standalone page.
     */
    <div
      className={`${
        modal
          ? "fixed inset-0 z-50 flex items-center justify-center px-4 sm:px-6 py-6"
          : "min-h-screen w-full flex items-center justify-center px-4 sm:px-6 py-6 md:py-12"
      }`}
      style={{
        backgroundColor: modal ? "rgba(35, 43, 50, 0.65)" : "#F9F9FB",
        backdropFilter: modal ? "blur(10px)" : "none",
        WebkitBackdropFilter: modal ? "blur(10px)" : "none",
      }}
      // Clicking the backdrop (not the card) closes the modal and goes back to home
      onClick={modal ? (e) => { if (e.target === e.currentTarget) navigate("/"); } : undefined}
    >
      <div
        className="w-full max-w-md lg:max-w-lg rounded-2xl shadow-xl p-6 sm:p-8 md:p-10 relative"
        style={{ backgroundColor: "#ffffff", border: "1px solid #E2E8F0" }}
      >
        {/* ── Back Arrow Button ── */}
        <button
          id="login-back-btn"
          onClick={() => navigate("/")}
          className="inline-flex items-center gap-1.5 mb-6 text-xs font-medium tracking-wide cursor-pointer transition-colors duration-150 group"
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
            className="mx-auto mb-4 w-13 h-13 rounded-xl flex items-center justify-center shadow-sm"
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
            Premium Granite & Stone
          </p>
        </div>

        {/* ── Mode Toggle (User / Admin) ── */}
        <div
          className="flex rounded-xl p-1 mb-7"
          style={{ backgroundColor: "#F9F9FB", border: "1px solid #E2E8F0" }}
        >
          {["user", "admin"].map((m) => (
            <button
              key={m}
              onClick={() => switchMode(m)}
              className="flex-1 py-2 text-xs font-semibold tracking-widest uppercase rounded-lg transition-all duration-200 cursor-pointer"
              style={
                mode === m
                  ? { backgroundColor: "#232B32", color: "#F9F9FB", boxShadow: "0 1px 4px rgba(0,0,0,0.15)" }
                  : { backgroundColor: "transparent", color: "#9CA3AF" }
              }
            >
              {m === "user" ? "User Login" : "Admin Login"}
            </button>
          ))}
        </div>

        {/* ════════════════════════════
            ADMIN LOGIN PANEL
        ════════════════════════════ */}
        {mode === "admin" && (
          <div>
            {adminError && (
              <div className="mb-5 px-4 py-3 rounded-lg text-sm text-center" style={{ backgroundColor: "#FEF2F2", border: "1px solid #FECACA", color: "#DC2626" }}>
                {adminError}
              </div>
            )}
            <form onSubmit={handleAdminLogin} className="space-y-4">
              {/* Username */}
              <div>
                <label htmlFor="admin-username" className="block text-xs font-medium tracking-wider uppercase mb-2" style={{ color: "#232B32" }}>
                  Username
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none" style={{ color: "#9CA3AF" }}>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                    </svg>
                  </span>
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
                  <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none" style={{ color: "#9CA3AF" }}>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                    </svg>
                  </span>
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

              {/* Submit */}
              <button
                type="submit"
                disabled={adminLoading}
                className="w-full mt-1 font-semibold text-sm tracking-widest uppercase py-3.5 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                style={{ backgroundColor: "#C5A059", color: "#ffffff" }}
                onMouseEnter={(e) => !adminLoading && (e.currentTarget.style.backgroundColor = "#b08d47")}
                onMouseLeave={(e) => !adminLoading && (e.currentTarget.style.backgroundColor = "#C5A059")}
              >
                {adminLoading ? (
                  <span className="inline-flex items-center gap-2">
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Authenticating…
                  </span>
                ) : "Sign In"}
              </button>
            </form>
          </div>
        )}

        {/* ════════════════════════════
            USER LOGIN / REGISTER PANEL
        ════════════════════════════ */}
        {mode === "user" && (
          <div>
            {/* Sign In / Sign Up sub-toggle */}
            <div className="flex gap-1 mb-6 border-b" style={{ borderColor: "#E2E8F0" }}>
              {[
                { key: "signin", label: "Sign In" },
                { key: "signup", label: "Sign Up" },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => switchUserView(key)}
                  className="flex-1 pb-3 text-sm font-semibold tracking-wide transition-all duration-200 cursor-pointer"
                  style={
                    userView === key
                      ? { color: "#C5A059", borderBottom: "2px solid #C5A059" }
                      : { color: "#9CA3AF", borderBottom: "2px solid transparent" }
                  }
                >
                  {label}
                </button>
              ))}
            </div>

            {/* ── USER SIGN IN ── */}
            {userView === "signin" && !forgotStep && (
              <div>
                {userSignInError && (
                  <div className="mb-5 px-4 py-3 rounded-lg text-sm text-center" style={{ backgroundColor: "#FEF2F2", border: "1px solid #FECACA", color: "#DC2626" }}>
                    {userSignInError}
                  </div>
                )}
                <form onSubmit={handleUserSignIn} className="space-y-4">
                  {/* Email */}
                  <div>
                    <label htmlFor="user-email" className="block text-xs font-medium tracking-wider uppercase mb-2" style={{ color: "#232B32" }}>
                      Email Address
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none" style={{ color: "#9CA3AF" }}>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                        </svg>
                      </span>
                      <input
                        id="user-email"
                        type="email"
                        value={userEmail}
                        onChange={(e) => setUserEmail(e.target.value)}
                        required
                        placeholder="you@example.com"
                        className="w-full rounded-lg pl-11 pr-4 py-3 text-sm outline-none transition-all duration-200"
                        style={inputBase}
                        onFocus={onFocus}
                        onBlur={onBlur}
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label htmlFor="user-password" className="block text-xs font-medium tracking-wider uppercase" style={{ color: "#232B32" }}>
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={() => { setForgotStep("request"); setResetEmail(userEmail); setForgotError(""); setForgotSuccess(""); }}
                        className="text-xs cursor-pointer transition-colors duration-150"
                        style={{ color: "#9CA3AF" }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = "#C5A059")}
                        onMouseLeave={(e) => (e.currentTarget.style.color = "#9CA3AF")}
                      >
                        Forgot Password?
                      </button>
                    </div>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none" style={{ color: "#9CA3AF" }}>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                        </svg>
                      </span>
                      <input
                        id="user-password"
                        type={userShowPw ? "text" : "password"}
                        value={userPassword}
                        onChange={(e) => setUserPassword(e.target.value)}
                        required
                        placeholder="Enter your password"
                        className="w-full rounded-lg pl-11 pr-11 py-3 text-sm outline-none transition-all duration-200"
                        style={inputBase}
                        onFocus={onFocus}
                        onBlur={onBlur}
                      />
                      <EyeToggle show={userShowPw} onToggle={() => setUserShowPw(!userShowPw)} />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={userSignInLoading}
                    className="w-full mt-1 font-semibold text-sm tracking-widest uppercase py-3.5 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    style={{ backgroundColor: "#C5A059", color: "#ffffff" }}
                    onMouseEnter={(e) => !userSignInLoading && (e.currentTarget.style.backgroundColor = "#b08d47")}
                    onMouseLeave={(e) => !userSignInLoading && (e.currentTarget.style.backgroundColor = "#C5A059")}
                  >
                    {userSignInLoading ? (
                      <span className="inline-flex items-center gap-2">
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Signing In…
                      </span>
                    ) : "Sign In"}
                  </button>
                </form>

                {googleError && (
                  <div className="mt-4 px-4 py-3 rounded-lg text-sm text-center" style={{ backgroundColor: "#FEF2F2", border: "1px solid #FECACA", color: "#DC2626" }}>
                    {googleError}
                  </div>
                )}
                <div className="w-full flex justify-center mt-4">
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={handleGoogleError}
                    theme="outline"
                    shape="rectangular"
                    width="384px"
                  />
                </div>

                <p className="text-center text-xs mt-5" style={{ color: "#9CA3AF" }}>
                  Don't have an account?{" "}
                  <button onClick={() => switchUserView("signup")} className="font-semibold cursor-pointer transition-colors duration-150" style={{ color: "#C5A059" }}
                    onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
                    onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
                  >
                    Create one
                  </button>
                </p>
              </div>
            )}

            {/* ── FORGOT PASSWORD: REQUEST PIN ── */}
            {forgotStep === "request" && (
              <div>
                <button
                  type="button"
                  onClick={() => { setForgotStep(null); setForgotError(""); setForgotSuccess(""); }}
                  className="inline-flex items-center gap-1.5 text-xs mb-5 cursor-pointer transition-colors duration-150"
                  style={{ color: "#9CA3AF" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#C5A059")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#9CA3AF")}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                  </svg>
                  Back to Sign In
                </button>

                <h3 className="text-sm font-semibold tracking-widest uppercase mb-1" style={{ color: "#232B32" }}>Reset Password</h3>
                <p className="text-xs mb-6" style={{ color: "#9CA3AF" }}>Enter your email and we'll send you a 6-digit PIN.</p>

                {forgotError && (
                  <div className="mb-5 px-4 py-3 rounded-lg text-sm text-center" style={{ backgroundColor: "#FEF2F2", border: "1px solid #FECACA", color: "#DC2626" }}>
                    {forgotError}
                  </div>
                )}
                {forgotSuccess && (
                  <div className="mb-5 px-4 py-3 rounded-lg text-sm text-center" style={{ backgroundColor: "#F0FDF4", border: "1px solid #BBF7D0", color: "#16A34A" }}>
                    {forgotSuccess}
                  </div>
                )}

                <form onSubmit={handleForgotRequest} className="space-y-4">
                  <div>
                    <label htmlFor="reset-email" className="block text-xs font-medium tracking-wider uppercase mb-2" style={{ color: "#232B32" }}>
                      Email Address
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none" style={{ color: "#9CA3AF" }}>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                        </svg>
                      </span>
                      <input
                        id="reset-email"
                        type="email"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        required
                        placeholder="you@example.com"
                        className="w-full rounded-lg pl-11 pr-4 py-3 text-sm outline-none transition-all duration-200"
                        style={inputBase}
                        onFocus={onFocus}
                        onBlur={onBlur}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="w-full font-semibold text-sm tracking-widest uppercase py-3.5 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    style={{ backgroundColor: "#C5A059", color: "#ffffff" }}
                    onMouseEnter={(e) => !forgotLoading && (e.currentTarget.style.backgroundColor = "#b08d47")}
                    onMouseLeave={(e) => !forgotLoading && (e.currentTarget.style.backgroundColor = "#C5A059")}
                  >
                    {forgotLoading ? (
                      <span className="inline-flex items-center gap-2">
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Sending PIN…
                      </span>
                    ) : "Send Reset PIN"}
                  </button>
                </form>
              </div>
            )}

            {/* ── FORGOT PASSWORD: VERIFY PIN & RESET ── */}
            {forgotStep === "verify" && (
              <div>
                <button
                  type="button"
                  onClick={() => { setForgotStep("request"); setForgotError(""); setForgotSuccess(""); }}
                  className="inline-flex items-center gap-1.5 text-xs mb-5 cursor-pointer transition-colors duration-150"
                  style={{ color: "#9CA3AF" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#C5A059")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#9CA3AF")}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                  </svg>
                  Back
                </button>

                <h3 className="text-sm font-semibold tracking-widest uppercase mb-1" style={{ color: "#232B32" }}>Enter Your PIN</h3>
                <p className="text-xs mb-6" style={{ color: "#9CA3AF" }}>Check your inbox. Enter the 6-digit PIN and your new password.</p>

                {forgotError && (
                  <div className="mb-5 px-4 py-3 rounded-lg text-sm text-center" style={{ backgroundColor: "#FEF2F2", border: "1px solid #FECACA", color: "#DC2626" }}>
                    {forgotError}
                  </div>
                )}
                {forgotSuccess && (
                  <div className="mb-5 px-4 py-3 rounded-lg text-sm text-center" style={{ backgroundColor: "#F0FDF4", border: "1px solid #BBF7D0", color: "#16A34A" }}>
                    {forgotSuccess}
                  </div>
                )}

                <form onSubmit={handleResetPassword} className="space-y-4">
                  {/* 6-digit PIN */}
                  <div>
                    <label htmlFor="reset-pin" className="block text-xs font-medium tracking-wider uppercase mb-2" style={{ color: "#232B32" }}>
                      6-Digit PIN
                    </label>
                    <input
                      id="reset-pin"
                      type="text"
                      value={resetPin}
                      onChange={(e) => setResetPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      required
                      placeholder="••••••"
                      maxLength={6}
                      className="w-full rounded-lg px-4 py-3 text-sm outline-none transition-all duration-200 text-center tracking-widest font-bold"
                      style={inputBase}
                      onFocus={onFocus}
                      onBlur={onBlur}
                    />
                  </div>

                  {/* New Password */}
                  <div>
                    <label htmlFor="new-password" className="block text-xs font-medium tracking-wider uppercase mb-2" style={{ color: "#232B32" }}>
                      New Password
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none" style={{ color: "#9CA3AF" }}>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                        </svg>
                      </span>
                      <input
                        id="new-password"
                        type={showNewPw ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        placeholder="Enter new password"
                        className="w-full rounded-lg pl-11 pr-11 py-3 text-sm outline-none transition-all duration-200"
                        style={inputBase}
                        onFocus={onFocus}
                        onBlur={onBlur}
                      />
                      <EyeToggle show={showNewPw} onToggle={() => setShowNewPw(!showNewPw)} />
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label htmlFor="confirm-password" className="block text-xs font-medium tracking-wider uppercase mb-2" style={{ color: "#232B32" }}>
                      Confirm Password
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none" style={{ color: "#9CA3AF" }}>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                        </svg>
                      </span>
                      <input
                        id="confirm-password"
                        type={showConfirmPw ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        placeholder="Confirm new password"
                        className="w-full rounded-lg pl-11 pr-11 py-3 text-sm outline-none transition-all duration-200"
                        style={inputBase}
                        onFocus={onFocus}
                        onBlur={onBlur}
                      />
                      <EyeToggle show={showConfirmPw} onToggle={() => setShowConfirmPw(!showConfirmPw)} />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="w-full font-semibold text-sm tracking-widest uppercase py-3.5 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    style={{ backgroundColor: "#C5A059", color: "#ffffff" }}
                    onMouseEnter={(e) => !forgotLoading && (e.currentTarget.style.backgroundColor = "#b08d47")}
                    onMouseLeave={(e) => !forgotLoading && (e.currentTarget.style.backgroundColor = "#C5A059")}
                  >
                    {forgotLoading ? (
                      <span className="inline-flex items-center gap-2">
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Resetting…
                      </span>
                    ) : "Reset Password"}
                  </button>
                </form>
              </div>
            )}

            {/* ── USER SIGN UP ── */}
            {userView === "signup" && (
              <div>
                {signUpError && (
                  <div className="mb-5 px-4 py-3 rounded-lg text-sm text-center" style={{ backgroundColor: "#FEF2F2", border: "1px solid #FECACA", color: "#DC2626" }}>
                    {signUpError}
                  </div>
                )}
                {signUpSuccess && (
                  <div className="mb-5 px-4 py-3 rounded-lg text-sm text-center" style={{ backgroundColor: "#F0FDF4", border: "1px solid #BBF7D0", color: "#16A34A" }}>
                    {signUpSuccess}
                  </div>
                )}
                <form onSubmit={handleUserSignUp} className="space-y-4">
                  {/* Full Name */}
                  <div>
                    <label htmlFor="signup-name" className="block text-xs font-medium tracking-wider uppercase mb-2" style={{ color: "#232B32" }}>
                      Full Name
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none" style={{ color: "#9CA3AF" }}>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                        </svg>
                      </span>
                      <input
                        id="signup-name"
                        type="text"
                        value={signUpName}
                        onChange={(e) => setSignUpName(e.target.value)}
                        required
                        placeholder="Juan Dela Cruz"
                        className="w-full rounded-lg pl-11 pr-4 py-3 text-sm outline-none transition-all duration-200"
                        style={inputBase}
                        onFocus={onFocus}
                        onBlur={onBlur}
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label htmlFor="signup-email" className="block text-xs font-medium tracking-wider uppercase mb-2" style={{ color: "#232B32" }}>
                      Email Address
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none" style={{ color: "#9CA3AF" }}>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                        </svg>
                      </span>
                      <input
                        id="signup-email"
                        type="email"
                        value={signUpEmail}
                        onChange={(e) => setSignUpEmail(e.target.value)}
                        required
                        placeholder="you@example.com"
                        className="w-full rounded-lg pl-11 pr-4 py-3 text-sm outline-none transition-all duration-200"
                        style={inputBase}
                        onFocus={onFocus}
                        onBlur={onBlur}
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <label htmlFor="signup-password" className="block text-xs font-medium tracking-wider uppercase mb-2" style={{ color: "#232B32" }}>
                      Password
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none" style={{ color: "#9CA3AF" }}>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                        </svg>
                      </span>
                      <input
                        id="signup-password"
                        type={signUpShowPw ? "text" : "password"}
                        value={signUpPassword}
                        onChange={(e) => setSignUpPassword(e.target.value)}
                        required
                        placeholder="Create a password"
                        className="w-full rounded-lg pl-11 pr-11 py-3 text-sm outline-none transition-all duration-200"
                        style={inputBase}
                        onFocus={onFocus}
                        onBlur={onBlur}
                      />
                      <EyeToggle show={signUpShowPw} onToggle={() => setSignUpShowPw(!signUpShowPw)} />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={signUpLoading}
                    className="w-full mt-1 font-semibold text-sm tracking-widest uppercase py-3.5 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    style={{ backgroundColor: "#C5A059", color: "#ffffff" }}
                    onMouseEnter={(e) => !signUpLoading && (e.currentTarget.style.backgroundColor = "#b08d47")}
                    onMouseLeave={(e) => !signUpLoading && (e.currentTarget.style.backgroundColor = "#C5A059")}
                  >
                    {signUpLoading ? (
                      <span className="inline-flex items-center gap-2">
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Creating Account…
                      </span>
                    ) : "Create Account"}
                  </button>
                </form>

                <p className="text-center text-xs mt-5" style={{ color: "#9CA3AF" }}>
                  Already have an account?{" "}
                  <button onClick={() => switchUserView("signin")} className="font-semibold cursor-pointer transition-colors duration-150" style={{ color: "#C5A059" }}
                    onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
                    onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
                  >
                    Sign in
                  </button>
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── Footer ── */}
        <p className="text-center text-xs mt-7 tracking-wide" style={{ color: "#9CA3AF" }}>
          Secured access · Six Sigmaphil Corp.
        </p>
      </div>
    </div>
  );
}

export default Login;
