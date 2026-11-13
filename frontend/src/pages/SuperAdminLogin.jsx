import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { friendlyAuthError } from "../utils/authErrors";
import { inputBase, onFocus, onBlur } from "../components/formConstants";
import { InputIcon, EyeToggle, SubmitButton } from "../components/FormHelpers";
import { useToast, ToastNotification } from "../utils/toast";

export default function SuperAdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { toast, showToast, dismissToast } = useToast();

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const { data: profile } = await supabase
          .from("profiles")
          .select("role, is_active")
          .eq("id", session.user.id)
          .single();

        if (profile?.is_active === false) {
          await supabase.auth.signOut();
          showToast("Your account has been deactivated. Please contact administration.", "error");
          return;
        }

        if (profile?.role === "super_admin") {
          navigate("/super-admin", { replace: true });
        } else if (profile?.role === "admin") {
          navigate("/dashboard", { replace: true });
        }
      } catch (err) {
        console.error("[SuperAdminLogin] Session check error:", err);
      }
    };

    checkSession();
  }, [navigate, showToast]);

  const handleSignIn = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      showToast("Email and password are required.", "error");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) throw error;

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role, is_active")
        .eq("id", data.user.id)
        .single();

      if (profileError || !profile) {
        await supabase.auth.signOut();
        showToast("Unable to verify Super Admin profile. Please try again.", "error");
        return;
      }

      if (profile.is_active === false) {
        await supabase.auth.signOut();
        showToast("This account has been deactivated. Please contact administration.", "error");
        return;
      }

      if (profile.role !== "super_admin") {
        await supabase.auth.signOut();
        showToast("Access restricted. Super Admin credentials are required for this portal.", "error");
        return;
      }

      sessionStorage.setItem("sixsigma_active", "1");
      if (rememberMe) {
        localStorage.setItem("sixsigma_remember", "1");
      } else {
        localStorage.removeItem("sixsigma_remember");
      }

      navigate("/super-admin", { replace: true });
    } catch (err) {
      showToast(friendlyAuthError(err), "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center px-4 sm:px-6 py-6 md:py-12"
      style={{
        background: "radial-gradient(circle at top, #FFFFFF 0%, #F9F9FB 62%, #EFEFEF 100%)",
      }}
    >
      <ToastNotification toast={toast} onDismiss={dismissToast} />

      <div className="w-full max-w-md rounded-2xl shadow-xl p-6 sm:p-8 md:p-10 bg-[#FFFFFF] border border-[#E2E8F0]">
        {/* Navigation Back */}
        <div className="flex items-center justify-between gap-3 mb-6">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-1.5 text-xs font-medium tracking-wide cursor-pointer text-[#6B7280] hover:text-[#C5A059] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
            Home
          </button>

          <button
            type="button"
            onClick={() => navigate("/login")}
            className="text-xs font-medium tracking-wide cursor-pointer text-[#6B7280] hover:text-[#C5A059] transition-colors"
          >
            Standard Sign In
          </button>
        </div>

        {/* Brand Header */}
        <div className="text-center mb-7">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#232B32] text-[#C5A059] text-[10px] font-bold tracking-widest uppercase mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-[#C5A059]" />
            Super Admin Portal
          </div>
          <h1 className="text-2xl font-light tracking-widest uppercase text-[#232B32]">
            Six Sigmaphil
          </h1>
          <p className="text-xs mt-1.5 tracking-wide text-[#6B7280]">
            Account Governance &amp; Credential Control
          </p>
        </div>

        <form onSubmit={handleSignIn} className="space-y-4">
          <div>
            <label
              htmlFor="superadmin-email"
              className="block text-xs font-medium tracking-wider uppercase mb-2 text-[#232B32]"
            >
              Super Admin Email
            </label>
            <div className="relative">
              <InputIcon icon="email" />
              <input
                id="superadmin-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="superadmin@sixsigmaphil.com"
                className="w-full rounded-lg pl-11 pr-4 py-2.5 text-sm outline-none transition-all duration-200"
                style={inputBase}
                onFocus={onFocus}
                onBlur={onBlur}
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="superadmin-password"
              className="block text-xs font-medium tracking-wider uppercase mb-2 text-[#232B32]"
            >
              Password
            </label>
            <div className="relative">
              <InputIcon icon="lock" />
              <input
                id="superadmin-password"
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Enter Super Admin password"
                className="w-full rounded-lg pl-11 pr-11 py-2.5 text-sm outline-none transition-all duration-200"
                style={inputBase}
                onFocus={onFocus}
                onBlur={onBlur}
              />
              <EyeToggle show={showPw} onToggle={() => setShowPw(!showPw)} />
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <label className="inline-flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 accent-[#C5A059] rounded cursor-pointer"
              />
              <span className="text-xs text-[#6B7280]">Stay signed in</span>
            </label>
          </div>

          <SubmitButton
            loading={loading}
            label="Access Super Admin"
            loadingLabel="Verifying Access…"
          />
        </form>

        <p className="text-center text-xs mt-7 tracking-wide text-[#9CA3AF]">
          Restricted access · Six Sigmaphil Corp.
        </p>
      </div>
    </div>
  );
}
