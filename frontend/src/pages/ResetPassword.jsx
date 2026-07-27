import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { inputBase, onFocus, onBlur } from "../components/formConstants";
import {
  InputIcon,
  EyeToggle,
  Alert,
  SubmitButton,
} from "../components/FormHelpers";

/* ─────────────────────────────────────────
   RESET PASSWORD PAGE
   Reached when a user clicks the password-reset
   link in their email. Supabase embeds the
   recovery tokens in the URL fragment; the
   Supabase JS client automatically exchanges them
   for a valid session and fires a PASSWORD_RECOVERY
   auth event, which we listen for here.

   Flow:
     1. Page mounts → show "Verifying…" spinner
     2. onAuthStateChange fires PASSWORD_RECOVERY
        → session is valid → show "Set New Password" form
     3. User submits new password
        → supabase.auth.updateUser() → success banner
        → redirect to /login after 2.5 s
     4. If no recovery event arrives within ~6 s
        → show "Link invalid or expired" error
─────────────────────────────────────────── */
export default function ResetPassword() {
  /* ── UI state machine ──
     "verifying" | "ready" | "success" | "expired" */
  const [stage, setStage] = useState("verifying");

  /* ── Form state ── */
  const [newPassword,     setNewPassword]     = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw,          setShowPw]          = useState(false);
  const [showConfirmPw,   setShowConfirmPw]   = useState(false);
  const [error,           setError]           = useState("");
  const [loading,         setLoading]         = useState(false);

  const navigate = useNavigate();

  /* ── Listen for the Supabase PASSWORD_RECOVERY event ──
     This fires once Supabase has exchanged the URL hash
     tokens for a live session — no manual URL parsing needed,
     which prevents the "double tab" flicker. */
  useEffect(() => {
    let expireTimer;

    // Check if the user already has a valid session on mount.
    // This protects against race conditions where the PASSWORD_RECOVERY 
    // event fired milliseconds before this component mounted.
    const checkInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setStage("ready");
      } else {
        // Only start the timer if no session is active yet
        expireTimer = setTimeout(() => {
          setStage((prev) => (prev === "verifying" ? "expired" : prev));
        }, 6000);
      }
    };
    checkInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // If they recover password OR sign in successfully, they can reset
        if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
          if (expireTimer) clearTimeout(expireTimer);
          setStage("ready");
        }
      }
    );

    return () => {
      if (expireTimer) clearTimeout(expireTimer);
      subscription.unsubscribe();
    };
  }, []);

  /* ── Handle new-password submission ── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Client-side validation
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) throw new Error(updateError.message);

      setStage("success");

      // Sign out so the user starts a fresh session after resetting
      await supabase.auth.signOut();

      // Redirect to login after a short pause
      setTimeout(() => navigate("/login"), 2500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /* ─────────────────────────────────────────
     RENDER
  ─────────────────────────────────────────── */
  return (
    <div
      className="min-h-screen w-full flex items-center justify-center px-4 sm:px-6 py-6 md:py-12"
      style={{ backgroundColor: "#F9F9FB" }}
    >
      <div
        className="w-full max-w-md lg:max-w-lg rounded-2xl shadow-xl p-6 sm:p-8 md:p-10 relative"
        style={{ backgroundColor: "#ffffff", border: "1px solid #E2E8F0" }}
      >
        {/* ── Brand Header ── */}
        <div className="text-center mb-8">
          {/* Gold lock icon */}
          <div className="flex justify-center mb-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: "#C5A059" }}
            >
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
              </svg>
            </div>
          </div>
          <h1 className="text-2xl font-light tracking-widest uppercase" style={{ color: "#232B32" }}>
            Six Sigmaphil
          </h1>
          <p className="text-xs mt-1 tracking-wide" style={{ color: "#9CA3AF" }}>
            Premium Granite &amp; Stone
          </p>
        </div>

        {/* ════════════════════════════
            STAGE: VERIFYING
        ════════════════════════════ */}
        {stage === "verifying" && (
          <div className="text-center py-6">
            <div className="flex justify-center mb-4">
              <svg
                className="w-8 h-8 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
                style={{ color: "#C5A059" }}
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
            <p className="text-sm font-medium tracking-wide" style={{ color: "#232B32" }}>
              Verifying your reset link…
            </p>
            <p className="text-xs mt-1" style={{ color: "#9CA3AF" }}>
              Please wait a moment.
            </p>
          </div>
        )}

        {/* ════════════════════════════
            STAGE: EXPIRED / INVALID LINK
        ════════════════════════════ */}
        {stage === "expired" && (
          <div className="text-center py-4">
            <div
              className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-4"
              style={{ backgroundColor: "#FEF2F2" }}
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="#DC2626" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
            </div>
            <h2 className="text-base font-semibold tracking-wide mb-2" style={{ color: "#232B32" }}>
              Link Invalid or Expired
            </h2>
            <p className="text-sm mb-6" style={{ color: "#9CA3AF" }}>
              This password reset link has expired or already been used. Please request a new one.
            </p>
            <button
              onClick={() => navigate("/login")}
              className="w-full font-semibold text-sm tracking-widest uppercase py-3.5 rounded-lg transition-all duration-200 cursor-pointer"
              style={{ backgroundColor: "#C5A059", color: "#ffffff" }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#b08d47")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#C5A059")}
            >
              Back to Sign In
            </button>
          </div>
        )}

        {/* ════════════════════════════
            STAGE: READY — SET NEW PASSWORD
        ════════════════════════════ */}
        {stage === "ready" && (
          <div>
            <div className="mb-6">
              <h2 className="text-sm font-semibold tracking-widest uppercase mb-1" style={{ color: "#232B32" }}>
                Set New Password
              </h2>
              <p className="text-xs" style={{ color: "#9CA3AF" }}>
                Choose a strong password for your account.
              </p>
            </div>

            {error && <Alert type="error" message={error} />}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* New Password */}
              <div>
                <label
                  htmlFor="new-password"
                  className="block text-xs font-medium tracking-wider uppercase mb-2"
                  style={{ color: "#232B32" }}
                >
                  New Password
                </label>
                <div className="relative">
                  <InputIcon icon="lock" />
                  <input
                    id="new-password"
                    type={showPw ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    placeholder="Min. 6 characters"
                    className="w-full rounded-lg pl-11 pr-11 py-3 text-sm outline-none transition-all duration-200"
                    style={inputBase}
                    onFocus={onFocus}
                    onBlur={onBlur}
                  />
                  <EyeToggle show={showPw} onToggle={() => setShowPw(!showPw)} />
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label
                  htmlFor="confirm-password"
                  className="block text-xs font-medium tracking-wider uppercase mb-2"
                  style={{ color: "#232B32" }}
                >
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
                    placeholder="Re-enter your new password"
                    className="w-full rounded-lg pl-11 pr-11 py-3 text-sm outline-none transition-all duration-200"
                    style={inputBase}
                    onFocus={onFocus}
                    onBlur={onBlur}
                  />
                  <EyeToggle show={showConfirmPw} onToggle={() => setShowConfirmPw(!showConfirmPw)} />
                </div>
              </div>

              <SubmitButton loading={loading} label="Update Password" loadingLabel="Updating…" />
            </form>
          </div>
        )}

        {/* ════════════════════════════
            STAGE: SUCCESS
        ════════════════════════════ */}
        {stage === "success" && (
          <div className="text-center py-4">
            <div
              className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-4"
              style={{ backgroundColor: "#F0FDF4" }}
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="#16A34A" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            </div>
            <h2 className="text-base font-semibold tracking-wide mb-2" style={{ color: "#232B32" }}>
              Password Updated!
            </h2>
            <p className="text-sm" style={{ color: "#9CA3AF" }}>
              Your password has been changed successfully. Redirecting you to Sign In…
            </p>
            {/* Gold progress bar countdown */}
            <div className="mt-5 w-full rounded-full overflow-hidden" style={{ backgroundColor: "#E2E8F0", height: "3px" }}>
              <div
                className="h-full rounded-full"
                style={{
                  backgroundColor: "#C5A059",
                  animation: "progress-bar 2.5s linear forwards",
                  width: "0%",
                }}
              />
            </div>
            <style>{`
              @keyframes progress-bar {
                from { width: 0%; }
                to   { width: 100%; }
              }
            `}</style>
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
