import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { inputBase, onFocus, onBlur } from "../components/formConstants";
import {
  InputIcon, EyeToggle,
  Alert, SubmitButton, BackButton,
} from "../components/FormHelpers";


/* ─────────────────────────────────────────
   USER LOGIN PAGE
   Handles: Sign In, Sign Up, Forgot Password,
            and Google OAuth login.
───────────────────────────────────────── */
export default function UserLogin() {
  /* ── Sub-mode: "signin" | "signup" ── */
  const [userView, setUserView] = useState("signin");

  /* ── Sign-In state ── */
  const [userEmail,         setUserEmail]         = useState("");
  const [userPassword,      setUserPassword]      = useState("");
  const [userShowPw,        setUserShowPw]        = useState(false);
  const [userSignInError,   setUserSignInError]   = useState("");
  const [userSignInLoading, setUserSignInLoading] = useState(false);

  /* ── Sign-Up state ── */
  const [signUpEmail,    setSignUpEmail]    = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [signUpShowPw,   setSignUpShowPw]   = useState(false);
  const [signUpError,    setSignUpError]    = useState("");
  const [signUpSuccess,  setSignUpSuccess]  = useState("");
  const [signUpLoading,  setSignUpLoading]  = useState(false);

  /* ── Forgot Password state machine ──
     forgotStep: null | "request" | "verify" */
  const [forgotStep,      setForgotStep]      = useState(null);
  const [resetEmail,      setResetEmail]      = useState("");
  const [resetPin,        setResetPin]        = useState("");
  const [newPassword,     setNewPassword]     = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPw,       setShowNewPw]       = useState(false);
  const [showConfirmPw,   setShowConfirmPw]   = useState(false);
  const [forgotError,     setForgotError]     = useState("");
  const [forgotSuccess,   setForgotSuccess]   = useState("");
  const [forgotLoading,   setForgotLoading]   = useState(false);

  /* ── Google error state ── */
  const [googleError, setGoogleError] = useState("");

  const navigate = useNavigate();

  /* ─── User Sign-In ─── */
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
      // Store token + identity so the Navbar can show the profile avatar
      localStorage.setItem("userToken", data.token);
      localStorage.setItem("userEmail", userEmail);
      // Derive a display name from the email prefix (e.g. "john.doe@..." → "John Doe")
      const derivedName = userEmail
        .split("@")[0]
        .replace(/[._-]/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
      localStorage.setItem("userName", derivedName);
      // Dispatch custom event so Navbar updates within the same tab
      window.dispatchEvent(new Event("userAuthChange"));
      navigate("/");
    } catch (err) {
      setUserSignInError(err.message);
    } finally {
      setUserSignInLoading(false);
    }
  };

  /* ─── User Sign-Up ─── */
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
      // Show success then switch back to Sign In tab
      setSignUpSuccess("Account created! Please sign in.");
      setSignUpEmail("");
      setSignUpPassword("");
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

  /* ─── Google Login ─── */
  const handleGoogleSuccess = async (credentialResponse) => {
    setGoogleError("");
    try {
      // Exchange Google ID token for our backend JWT
      const response = await fetch("http://localhost:3000/api/auth/google-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential: credentialResponse.credential }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Google login failed.");
      // Store token + identity from Google payload
      localStorage.setItem("userToken", data.token);
      if (data.email) {
        localStorage.setItem("userEmail", data.email);
        const derivedName = data.email
          .split("@")[0]
          .replace(/[._-]/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase());
        localStorage.setItem("userName", derivedName);
      }
      window.dispatchEvent(new Event("userAuthChange"));
      navigate("/");
    } catch (err) {
      setGoogleError(err.message);
    }
  };

  const handleGoogleError = () => {
    setGoogleError("Google sign-in was cancelled or failed.");
  };

  /* ─── Forgot Password: request PIN ─── */
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

  /* ─── Forgot Password: verify PIN & reset ─── */
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

  /* ─── Clear stale errors when switching tabs ─── */
  const switchUserView = (v) => {
    setUserView(v);
    setUserSignInError("");
    setSignUpError("");
    setSignUpSuccess("");
    setForgotStep(null);
    setForgotError("");
    setForgotSuccess("");
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
        className="w-full max-w-md lg:max-w-lg rounded-2xl shadow-xl p-6 sm:p-8 md:p-10 relative"
        style={{ backgroundColor: "#ffffff", border: "1px solid #E2E8F0" }}
      >
        {/* ── Back to Home ── */}
        <button
          id="login-back-btn"
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
            Premium Granite &amp; Stone
          </p>
        </div>

        {/* ── Sign In / Sign Up tab toggle ── */}
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

        {/* ════════════════════════════
            USER SIGN IN
        ════════════════════════════ */}
        {userView === "signin" && !forgotStep && (
          <div>
            {userSignInError && <Alert type="error" message={userSignInError} />}
            <form onSubmit={handleUserSignIn} className="space-y-4">
              {/* Email */}
              <div>
                <label htmlFor="user-email" className="block text-xs font-medium tracking-wider uppercase mb-2" style={{ color: "#232B32" }}>
                  Email Address
                </label>
                <div className="relative">
                  <InputIcon icon="email" />
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

              {/* Password + Forgot link */}
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
                  <InputIcon icon="lock" />
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

              <SubmitButton loading={userSignInLoading} label="Sign In" loadingLabel="Signing In…" />
            </form>

            {/* Google Sign-In */}
            {googleError && <Alert type="error" message={googleError} />}
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
              Don&apos;t have an account?{" "}
              <button
                onClick={() => switchUserView("signup")}
                className="font-semibold cursor-pointer transition-colors duration-150"
                style={{ color: "#C5A059" }}
                onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
                onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
              >
                Create one
              </button>
            </p>
          </div>
        )}

        {/* ════════════════════════════
            FORGOT PASSWORD — REQUEST PIN
        ════════════════════════════ */}
        {forgotStep === "request" && (
          <div>
            <BackButton
              onClick={() => { setForgotStep(null); setForgotError(""); setForgotSuccess(""); }}
              label="Back to Sign In"
            />
            <h3 className="text-sm font-semibold tracking-widest uppercase mb-1" style={{ color: "#232B32" }}>
              Reset Password
            </h3>
            <p className="text-xs mb-6" style={{ color: "#9CA3AF" }}>
              Enter your email and we&apos;ll send you a 6-digit PIN.
            </p>

            {forgotError   && <Alert type="error"   message={forgotError} />}
            {forgotSuccess && <Alert type="success" message={forgotSuccess} />}

            <form onSubmit={handleForgotRequest} className="space-y-4">
              <div>
                <label htmlFor="reset-email" className="block text-xs font-medium tracking-wider uppercase mb-2" style={{ color: "#232B32" }}>
                  Email Address
                </label>
                <div className="relative">
                  <InputIcon icon="email" />
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
              <SubmitButton loading={forgotLoading} label="Send Reset PIN" loadingLabel="Sending PIN…" />
            </form>
          </div>
        )}

        {/* ════════════════════════════
            FORGOT PASSWORD — VERIFY PIN & RESET
        ════════════════════════════ */}
        {forgotStep === "verify" && (
          <div>
            <BackButton
              onClick={() => { setForgotStep("request"); setForgotError(""); setForgotSuccess(""); }}
              label="Back"
            />
            <h3 className="text-sm font-semibold tracking-widest uppercase mb-1" style={{ color: "#232B32" }}>
              Enter Your PIN
            </h3>
            <p className="text-xs mb-6" style={{ color: "#9CA3AF" }}>
              Check your inbox. Enter the 6-digit PIN and your new password.
            </p>

            {forgotError   && <Alert type="error"   message={forgotError} />}
            {forgotSuccess && <Alert type="success" message={forgotSuccess} />}

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
                  <InputIcon icon="lock" />
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
                  <InputIcon icon="lock" />
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

              <SubmitButton loading={forgotLoading} label="Reset Password" loadingLabel="Resetting…" />
            </form>
          </div>
        )}

        {/* ════════════════════════════
            USER SIGN UP
        ════════════════════════════ */}
        {userView === "signup" && (
          <div>
            {signUpError   && <Alert type="error"   message={signUpError} />}
            {signUpSuccess && <Alert type="success" message={signUpSuccess} />}
            <form onSubmit={handleUserSignUp} className="space-y-4">
              {/* Email */}
              <div>
                <label htmlFor="signup-email" className="block text-xs font-medium tracking-wider uppercase mb-2" style={{ color: "#232B32" }}>
                  Email Address
                </label>
                <div className="relative">
                  <InputIcon icon="email" />
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
                  <InputIcon icon="lock" />
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

              <SubmitButton loading={signUpLoading} label="Create Account" loadingLabel="Creating Account…" />
            </form>

            <p className="text-center text-xs mt-5" style={{ color: "#9CA3AF" }}>
              Already have an account?{" "}
              <button
                onClick={() => switchUserView("signin")}
                className="font-semibold cursor-pointer transition-colors duration-150"
                style={{ color: "#C5A059" }}
                onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
                onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
              >
                Sign in
              </button>
            </p>
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
