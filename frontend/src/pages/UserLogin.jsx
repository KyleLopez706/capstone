import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { friendlyAuthError } from "../utils/authErrors";
import { inputBase, onFocus, onBlur } from "../components/formConstants";
import {
  InputIcon,
  EyeToggle,
  SubmitButton,
  BackButton,
} from "../components/FormHelpers";
import { useToast, ToastNotification } from "../utils/toast";

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
  const [userEmail, setUserEmail] = useState("");
  const [userPassword, setUserPassword] = useState("");
  const [userShowPw, setUserShowPw] = useState(false);

  const [userSignInLoading, setUserSignInLoading] = useState(false);

  /* ── Sign-Up state ── */
  const [signUpName, setSignUpName] = useState("");
  const [signUpPhone, setSignUpPhone] = useState("");
  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [signUpShowPw, setSignUpShowPw] = useState(false);

  const [signUpLoading, setSignUpLoading] = useState(false);

  /* ── "Stay signed in" / Remember-me preference ──────────────────────────
     false (default) — session-only: clears when browser is fully closed
     true            — persists across browser restarts (localStorage)      */
  const [rememberMe, setRememberMe] = useState(false);

  /* ── Forgot Password state machine ──
     forgotStep: null | "request" | "verify" */
  const [forgotStep, setForgotStep] = useState(null);
  const [resetEmail, setResetEmail] = useState("");

  const [forgotLoading, setForgotLoading] = useState(false);

  const navigate = useNavigate();
  const { toast, showToast, dismissToast } = useToast();
  const isRouting = useRef(false);

  /* ── Role-based routing helper ──
     Queries only the 'role' column to keep the query lean (AGENTS.md §A).
     If RLS blocks the query, silently falls back to homepage (AGENTS.md §B). */
  const routeByRole = async (userId) => {
    if (isRouting.current) return;
    isRouting.current = true;

    const params = new URLSearchParams(window.location.search);
    const urlReturnTo = params.get("returnTo");
    const returnTo = urlReturnTo || sessionStorage.getItem("returnTo");

    const { data, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();

    if (error) {
      // RLS permission denial or profile trigger delay
      console.error("Role check failed:", error.message);
      if (returnTo) {
        sessionStorage.removeItem("returnTo");
        navigate(returnTo);
      } else {
        navigate("/");
      }
      return;
    }

    if (data?.role === "admin") {
      navigate("/dashboard");
    } else {
      if (returnTo) {
        sessionStorage.removeItem("returnTo");
        navigate(returnTo);
      } else {
        navigate("/");
      }
    }
  };

  /* ── If already logged in, route them away from the login page ──
     Exception: do NOT redirect if this is a password-recovery session —
     the global App.jsx interceptor owns that routing to /reset-password. */
  useEffect(() => {
    // Check initial session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && session.user?.aud !== "recovery") {
        routeByRole(session.user.id);
      }
    });

    // Also listen for auth state changes (crucial for catching OAuth redirects
    // if getSession fires before the URL hash is parsed)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session && session.user?.aud !== "recovery") {
        routeByRole(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ─── User Sign-In via Supabase GoTrue ─── */
  const handleUserSignIn = async (e) => {
    e.preventDefault();

    setUserSignInLoading(true); // Disable button immediately (rate-limit protection)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: userPassword,
      });

      if (error) throw new Error(error.message);

      // Write persistence flags BEFORE navigating so the boot check in
      // App.jsx doesn't race and sign the user out immediately.
      sessionStorage.setItem("sixsigma_active", "1");
      if (rememberMe) {
        localStorage.setItem("sixsigma_remember", "1");
      } else {
        localStorage.removeItem("sixsigma_remember");
      }

      await routeByRole(data.user.id);
    } catch (err) {
      showToast(friendlyAuthError(err), 'error');
    } finally {
      setUserSignInLoading(false);
    }
  };

  /* ─── User Sign-Up via Supabase GoTrue ─── */
  const handleUserSignUp = async (e) => {
    e.preventDefault();


    // Basic client-side validation before hitting the API
    if (!signUpName || !signUpEmail || !signUpPassword) {
      showToast('Name, email, and password are required.', 'error');
      return;
    }
    if (signUpPhone && !/^09\d{9}$/.test(signUpPhone)) {
      showToast('Please enter a valid Philippine mobile number (e.g., 09171234567).', 'error');
      return;
    }
    if (signUpPassword.length < 6) {
      showToast('Password must be at least 6 characters.', 'error');
      return;
    }

    setSignUpLoading(true); // Disable button immediately (rate-limit protection)
    try {
      const { data, error } = await supabase.auth.signUp({
        email: signUpEmail,
        password: signUpPassword,
        options: {
          data: {
            full_name: signUpName,
            phone_number: signUpPhone,
          }
        }
      });

      if (error) {
        throw error; // Will be caught and handled centrally by friendlyAuthError in the catch block
      }

      /* Supabase intentionally returns a fake "success" when the email already
         exists to prevent email enumeration attacks. The tell-tale sign is an
         empty identities array on the returned user object. */
      if (data?.user && data.user.identities?.length === 0) {
        throw new Error(
          "An account with this email already exists. Please sign in instead.",
        );
      }

      showToast('Account created! You can now sign in.', 'success');
      setSignUpEmail("");
      setSignUpPassword("");
      // Switch to Sign In tab after a short pause
      setTimeout(() => {
        switchUserView("signin");
      }, 2500);
    } catch (err) {
      showToast(friendlyAuthError(err), 'error');
    } finally {
      setSignUpLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    // Save the remember-me preference to localStorage before the redirect.
    // App.jsx's onAuthStateChange SIGNED_IN handler reads this flag after
    // the page re-mounts and sets the real persistence flags.
    localStorage.setItem("sixsigma_oauth_remember", rememberMe ? "1" : "0");

    // Read returnTo from sessionStorage or URL
    const params = new URLSearchParams(window.location.search);
    const urlReturnTo = params.get("returnTo");
    const returnTo = urlReturnTo || sessionStorage.getItem("returnTo") || "/";

    // Supabase handles the full OAuth redirect flow
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        // Pass the returnTo in the URL so it survives cross-origin OAuth redirects
        redirectTo: `${window.location.origin}/login?returnTo=${encodeURIComponent(returnTo)}`,
      },
    });
    if (error) {
      localStorage.removeItem("sixsigma_oauth_remember"); // Clean up if redirect fails
      showToast('Google sign-in failed. Please try again.', 'error');
      console.error("Google OAuth error:", error.message);
    }
  };

  /* ─── Forgot Password: send reset email via Supabase ─── */
  const handleForgotRequest = async (e) => {
    e.preventDefault();


    if (!resetEmail) {
      showToast('Please enter your email address.', 'error');
      return;
    }

    setForgotLoading(true);
    try {
      /* ── Step 1: Verify the email belongs to an existing account ──────────
         We call a SECURITY DEFINER Postgres function that checks auth.users.
         This prevents reset emails from being sent to addresses that have
         never registered — the user gets a clear, friendly error instead.
         The check happens server-side so auth.users is never exposed publicly.
      ────────────────────────────────────────────────────────────────────── */
      const { data: emailExists, error: checkError } = await supabase
        .rpc('check_email_exists', { email_input: resetEmail });

      if (checkError) throw new Error(checkError.message);

      if (!emailExists) {
        showToast('No account found with this email address. Please sign up first.', 'error');
        return;
      }

      /* ── Step 2: Email confirmed — safe to send the reset link ── */
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw new Error(error.message);

      showToast('Password reset email sent! Check your inbox.', 'success');
    } catch (err) {
      showToast(friendlyAuthError(err), 'error');
    } finally {
      setForgotLoading(false);
    }
  };


  /* ─── Clear stale errors when switching tabs ─── */
  const switchUserView = (v) => {
    setUserView(v);
    setForgotStep(null);
  };

  /* ─────────────────────────────────────────
     RENDER
  ───────────────────────────────────────── */
  return (
    <div
      className="min-h-screen w-full flex items-center justify-center px-4 sm:px-6 py-6 md:py-12"
      style={{ backgroundColor: "#F9F9FB" }}
    >
      <ToastNotification toast={toast} onDismiss={dismissToast} />
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
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 19.5 8.25 12l7.5-7.5"
            />
          </svg>
          Back to Home
        </button>

        {/* ── Brand Header ── */}
        <div className="text-center mb-7">
          <h1
            className="text-2xl font-light tracking-widest uppercase"
            style={{ color: "#232B32" }}
          >
            Six Sigmaphil
          </h1>
          <p
            className="text-xs mt-1 tracking-wide"
            style={{ color: "#9CA3AF" }}
          >
            Premium Granite &amp; Stone
          </p>
        </div>

        {/* ── Sign In / Sign Up tab toggle ── */}
        {!forgotStep && (
          <div
            className="flex gap-1 mb-6 border-b"
            style={{ borderColor: "#E2E8F0" }}
          >
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
                    : {
                        color: "#9CA3AF",
                        borderBottom: "2px solid transparent",
                      }
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
            <form onSubmit={handleUserSignIn} className="space-y-4">
              {/* Email */}
              <div>
                <label
                  htmlFor="user-email"
                  className="block text-xs font-medium tracking-wider uppercase mb-2"
                  style={{ color: "#232B32" }}
                >
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
                  <label
                    htmlFor="user-password"
                    className="block text-xs font-medium tracking-wider uppercase"
                    style={{ color: "#232B32" }}
                  >
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setForgotStep("request");
                      setResetEmail(userEmail);
                    }}
                    className="text-xs cursor-pointer transition-colors duration-150"
                    style={{ color: "#9CA3AF" }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.color = "#C5A059")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.color = "#9CA3AF")
                    }
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
                  <EyeToggle
                    show={userShowPw}
                    onToggle={() => setUserShowPw(!userShowPw)}
                  />
                </div>
              </div>

              {/* ── Stay signed in checkbox ── */}
              <div className="flex items-center gap-2.5 pt-1">
                <button
                  id="remember-me-toggle"
                  type="button"
                  role="checkbox"
                  aria-checked={rememberMe}
                  onClick={() => setRememberMe(!rememberMe)}
                  className="relative shrink-0 w-4 h-4 rounded transition-all duration-150 border cursor-pointer focus:outline-none"
                  style={{
                    backgroundColor: rememberMe ? "#C5A059" : "#ffffff",
                    borderColor: rememberMe ? "#C5A059" : "#D1D5DB",
                  }}
                >
                  {rememberMe && (
                    <svg
                      className="absolute inset-0 m-auto w-2.5 h-2.5"
                      viewBox="0 0 12 10"
                      fill="none"
                      stroke="#ffffff"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="1 5 4.5 8.5 11 1" />
                    </svg>
                  )}
                </button>
                <label
                  htmlFor="remember-me-toggle"
                  className="text-xs cursor-pointer select-none"
                  style={{ color: "#6B7280" }}
                  onClick={() => setRememberMe(!rememberMe)}
                >
                  Stay signed in
                </label>
              </div>

              <SubmitButton
                loading={userSignInLoading}
                label="Sign In"
                loadingLabel="Signing In…"
              />
            </form>

            {/* ── Google Sign-In via Supabase OAuth ── */}
            <div className="mt-5">
              <div className="relative flex items-center gap-3 mb-4">
                <div
                  className="flex-1 h-px"
                  style={{ backgroundColor: "#E2E8F0" }}
                />
                <span
                  className="text-xs tracking-wide"
                  style={{ color: "#9CA3AF" }}
                >
                  or continue with
                </span>
                <div
                  className="flex-1 h-px"
                  style={{ backgroundColor: "#E2E8F0" }}
                />
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
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = "#F9F9FB")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor = "#ffffff")
                }
              >
                {/* Google SVG icon */}
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Continue with Google
              </button>
            </div>

            <p
              className="text-center text-xs mt-5"
              style={{ color: "#9CA3AF" }}
            >
              Don&apos;t have an account?{" "}
              <button
                onClick={() => switchUserView("signup")}
                className="font-semibold cursor-pointer transition-colors duration-150"
                style={{ color: "#C5A059" }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.textDecoration = "underline")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.textDecoration = "none")
                }
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
              onClick={() => {
                setForgotStep(null);
              }}
              label="Back to Sign In"
            />
            <h3
              className="text-sm font-semibold tracking-widest uppercase mb-1"
              style={{ color: "#232B32" }}
            >
              Reset Password
            </h3>
            <p className="text-xs mb-6" style={{ color: "#9CA3AF" }}>
              Enter your email and we&apos;ll send you a secure reset link.
            </p>



            {/* Only show the form after sending */}
            {(
              <form onSubmit={handleForgotRequest} className="space-y-4">
                <div>
                  <label
                    htmlFor="reset-email"
                    className="block text-xs font-medium tracking-wider uppercase mb-2"
                    style={{ color: "#232B32" }}
                  >
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
                <SubmitButton
                  loading={forgotLoading}
                  label="Send Reset Link"
                  loadingLabel="Sending…"
                />
              </form>
            )}
          </div>
        )}

        {/* ════════════════════════════
            USER SIGN UP
        ════════════════════════════ */}
        {userView === "signup" && (
          <div>
            <form onSubmit={handleUserSignUp} className="space-y-4">
              
              {/* Full Name */}
              <div>
                <label
                  htmlFor="signup-name"
                  className="block text-xs font-medium tracking-wider uppercase mb-2"
                  style={{ color: "#232B32" }}
                >
                  Full Name
                </label>
                <div className="relative">
                  <InputIcon icon="user" />
                  <input
                    id="signup-name"
                    type="text"
                    value={signUpName}
                    onChange={(e) => setSignUpName(e.target.value.replace(/[^A-Za-z\s\-ñÑ]/g, ''))}
                    required
                    placeholder="Juan Dela Cruz"
                    className="w-full rounded-lg pl-11 pr-4 py-3 text-sm outline-none transition-all duration-200"
                    style={inputBase}
                    onFocus={onFocus}
                    onBlur={onBlur}
                  />
                </div>
              </div>

              {/* Phone Number */}
              <div>
                <label
                  htmlFor="signup-phone"
                  className="block text-xs font-medium tracking-wider uppercase mb-2"
                  style={{ color: "#232B32" }}
                >
                  Phone Number <span style={{ color: '#9CA3AF', textTransform: 'none', fontWeight: 400 }}>(Optional)</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#9CA3AF]">
                    <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </div>
                  <input
                    id="signup-phone"
                    type="tel"
                    value={signUpPhone}
                    onChange={(e) => setSignUpPhone(e.target.value.replace(/[^0-9]/g, ''))}
                    maxLength={11}
                    placeholder="0917 123 4567"
                    className="w-full rounded-lg pl-11 pr-4 py-3 text-sm outline-none transition-all duration-200"
                    style={inputBase}
                    onFocus={onFocus}
                    onBlur={onBlur}
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label
                  htmlFor="signup-email"
                  className="block text-xs font-medium tracking-wider uppercase mb-2"
                  style={{ color: "#232B32" }}
                >
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
                <label
                  htmlFor="signup-password"
                  className="block text-xs font-medium tracking-wider uppercase mb-2"
                  style={{ color: "#232B32" }}
                >
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
                  <EyeToggle
                    show={signUpShowPw}
                    onToggle={() => setSignUpShowPw(!signUpShowPw)}
                  />
                </div>
              </div>

              <SubmitButton
                loading={signUpLoading}
                label="Create Account"
                loadingLabel="Creating Account…"
              />
            </form>

            <p
              className="text-center text-xs mt-5"
              style={{ color: "#9CA3AF" }}
            >
              Already have an account?{" "}
              <button
                onClick={() => switchUserView("signin")}
                className="font-semibold cursor-pointer transition-colors duration-150"
                style={{ color: "#C5A059" }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.textDecoration = "underline")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.textDecoration = "none")
                }
              >
                Sign in
              </button>
            </p>
          </div>
        )}

        {/* ── Footer ── */}
        <p
          className="text-center text-xs mt-7 tracking-wide"
          style={{ color: "#9CA3AF" }}
        >
          Secured access · Six Sigmaphil Corp.
        </p>
      </div>
    </div>
  );
}
