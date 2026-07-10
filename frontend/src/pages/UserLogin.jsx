import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { inputBase, onFocus, onBlur } from "../components/formConstants";
import {
  InputIcon, EyeToggle,
  Alert, SubmitButton, BackButton,
} from "../components/FormHelpers";

/* ─────────────────────────────────────────
   USER LOGIN PAGE
   Handles: Sign In, Sign Up, Forgot Password,
            and Google OAuth — all via Supabase GoTrue.
   On successful login, queries the profiles table to
   check the user role and routes accordingly:
     - role === 'admin'  → /dashboard
     - role === 'user'   → /
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
  const [forgotError,     setForgotError]     = useState("");
  const [forgotSuccess,   setForgotSuccess]   = useState("");
  const [forgotLoading,   setForgotLoading]   = useState(false);

  const navigate = useNavigate();

  /* ── Role-based routing helper ──
     Queries only the 'role' column to keep the query lean (AGENTS.md §A).
     If RLS blocks the query, silently falls back to homepage (AGENTS.md §B). */
  const routeByRole = async (userId) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();

    if (error) {
      // RLS permission denial or network failure — graceful fallback
      console.error("Role check failed:", error.message);
      navigate("/");
      return;
    }

    if (data?.role === "admin") {
      navigate("/dashboard");
    } else {
      navigate("/");
    }
  };

  /* ── If already logged in, route them away from the login page ── */
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) routeByRole(session.user.id);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ─── User Sign-In via Supabase GoTrue ─── */
  const handleUserSignIn = async (e) => {
    e.preventDefault();
    setUserSignInError("");
    setUserSignInLoading(true); // Disable button immediately (rate-limit protection)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: userPassword,
      });

      if (error) throw new Error(error.message);

      await routeByRole(data.user.id);
    } catch (err) {
      setUserSignInError(err.message);
    } finally {
      setUserSignInLoading(false);
    }
  };

  /* ─── User Sign-Up via Supabase GoTrue ─── */
  const handleUserSignUp = async (e) => {
    e.preventDefault();
    setSignUpError("");
    setSignUpSuccess("");

    // Basic client-side validation before hitting the API
    if (!signUpEmail || !signUpPassword) {
      setSignUpError("Email and password are required.");
      return;
    }
    if (signUpPassword.length < 6) {
      setSignUpError("Password must be at least 6 characters.");
      return;
    }

    setSignUpLoading(true); // Disable button immediately (rate-limit protection)
    try {
      const { data, error } = await supabase.auth.signUp({
        email: signUpEmail,
        password: signUpPassword,
      });

      if (error) {
        // Supabase rate limit — translate to a human-readable message
        if (error.message.toLowerCase().includes("rate limit") || error.status === 429) {
          throw new Error("Too many sign-up attempts. Please wait a few minutes and try again.");
        }
        throw new Error(error.message);
      }

      /* Supabase intentionally returns a fake "success" when the email already
         exists to prevent email enumeration attacks. The tell-tale sign is an
         empty identities array on the returned user object. */
      if (data?.user && data.user.identities?.length === 0) {
        throw new Error("An account with this email already exists. Please sign in instead.");
      }

      setSignUpSuccess("Account created! You can now sign in.");
      setSignUpEmail("");
      setSignUpPassword("");
      // Switch to Sign In tab after a short pause
      setTimeout(() => {
        setSignUpSuccess("");
        switchUserView("signin");
      }, 2500);
    } catch (err) {
      setSignUpError(err.message);
    } finally {
      setSignUpLoading(false);
    }
  };

  /* ─── Google OAuth via Supabase GoTrue ─── */
  const handleGoogleSignIn = async () => {
    // Supabase handles the full OAuth redirect flow
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    });
    if (error) {
      setUserSignInError("Google sign-in failed. Please try again.");
      console.error("Google OAuth error:", error.message);
    }
  };

  /* ─── Forgot Password: send reset email via Supabase ─── */
  const handleForgotRequest = async (e) => {
    e.preventDefault();
    setForgotError("");
    setForgotSuccess("");

    if (!resetEmail) {
      setForgotError("Please enter your email address.");
      return;
    }

    setForgotLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw new Error(error.message);

      setForgotSuccess("Password reset email sent! Check your inbox.");
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
          <h1 className="text-2xl font-light tracking-widest uppercase" style={{ color: "#232B32" }}>
            Six Sigmaphil
          </h1>
          <p className="text-xs mt-1 tracking-wide" style={{ color: "#9CA3AF" }}>
            Premium Granite &amp; Stone
          </p>
        </div>

        {/* ── Sign In / Sign Up tab toggle ── */}
        {!forgotStep && (
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
        )}

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

            {/* ── Google Sign-In via Supabase OAuth ── */}
            <div className="mt-5">
              <div className="relative flex items-center gap-3 mb-4">
                <div className="flex-1 h-px" style={{ backgroundColor: "#E2E8F0" }} />
                <span className="text-xs tracking-wide" style={{ color: "#9CA3AF" }}>or continue with</span>
                <div className="flex-1 h-px" style={{ backgroundColor: "#E2E8F0" }} />
              </div>
              <button
                id="google-signin-btn"
                type="button"
                onClick={handleGoogleSignIn}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-lg text-sm font-medium tracking-wide transition-all duration-200 cursor-pointer"
                style={{
                  backgroundColor: "#ffffff",
                  border: "1px solid #E2E8F0",
                  color: "#232B32",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#F9F9FB")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#ffffff")}
              >
                {/* Google SVG icon */}
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </button>
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
            FORGOT PASSWORD — REQUEST EMAIL
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
              Enter your email and we&apos;ll send you a secure reset link.
            </p>

            {forgotError   && <Alert type="error"   message={forgotError} />}
            {forgotSuccess && <Alert type="success" message={forgotSuccess} />}

            {/* Only show the form if no success message yet */}
            {!forgotSuccess && (
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
                <SubmitButton loading={forgotLoading} label="Send Reset Link" loadingLabel="Sending…" />
              </form>
            )}
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
                    placeholder="Create a password (min. 6 characters)"
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
