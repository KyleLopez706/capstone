import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { EyeToggle } from "./FormHelpers";

function generateReadablePassword(length = 12) {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const nums = "23456789";
  const symbols = "!@#$%&*-";
  const all = upper + lower + nums + symbols;

  const pick = (pool) => {
    const arr = new Uint32Array(1);
    window.crypto.getRandomValues(arr);
    return pool[arr[0] % pool.length];
  };

  const chars = [pick(upper), pick(lower), pick(nums), pick(symbols)];
  while (chars.length < length) chars.push(pick(all));

  for (let i = chars.length - 1; i > 0; i--) {
    const arr = new Uint32Array(1);
    window.crypto.getRandomValues(arr);
    const j = arr[0] % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

/**
 * Modal allowing an active Super Admin to create a new Admin or Super Admin account
 * with distinct email credentials and save it directly into Supabase Auth + profiles.
 */
export default function CreateStaffAccountModal({ isOpen, defaultRole = "admin", ...props }) {
  if (!isOpen) return null;
  const resolvedDefaultRole = defaultRole === "super_admin" ? "super_admin" : "admin";
  return <CreateStaffAccountDialog key={resolvedDefaultRole} defaultRole={resolvedDefaultRole} {...props} />;
}

function CreateStaffAccountDialog({
  defaultRole,
  existingEmails = [],
  onClose,
  onCreated,
  showToast,
}) {
  const [role, setRole] = useState(defaultRole);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [createdSummary, setCreatedSummary] = useState(null);
  const [copiedSummary, setCopiedSummary] = useState(false);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape" && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isSubmitting, onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setFormError("");

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = fullName.trim();

    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setFormError("Please enter a valid email address.");
      return;
    }

    const emailSet = new Set(
      (Array.isArray(existingEmails) ? existingEmails : [])
        .filter(Boolean)
        .map((item) => String(item).trim().toLowerCase())
    );
    if (emailSet.has(cleanEmail)) {
      setFormError("This email address is already used by an existing account. Please choose another email.");
      return;
    }

    if (!password || password.length < 8) {
      setFormError("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setFormError("Password confirmation does not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.rpc("super_admin_create_account", {
        new_email: cleanEmail,
        new_password: password,
        target_role: role,
        new_full_name: cleanName || null,
      });

      if (error) throw error;

      const created = data || {
        email: cleanEmail,
        role,
        full_name: cleanName || cleanEmail.split("@")[0],
      };

      setCreatedSummary({
        ...created,
        password,
      });

      if (typeof onCreated === "function") {
        await onCreated(created);
      }

      if (typeof showToast === "function") {
        showToast(
          `New ${created.role === "super_admin" ? "Super Admin" : "Admin"} account (${created.email}) created successfully.`,
          "success"
        );
      }
    } catch (err) {
      console.error("[CreateStaffAccountModal] Create account error:", err);
      const message =
        err?.message || "Unable to create account. Please verify your Super Admin SQL setup and try again.";
      setFormError(message);
      if (typeof showToast === "function") {
        showToast(message, "error");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyCredentials = async () => {
    if (!createdSummary) return;
    const roleLabel = createdSummary.role === "super_admin" ? "Super Admin" : "Admin";
    const text = `SIX SIGMAPHIL (${roleLabel})\nEmail: ${createdSummary.email}\nPassword: ${createdSummary.password}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSummary(true);
      setTimeout(() => setCopiedSummary(false), 2000);
    } catch (err) {
      console.error("[CreateStaffAccountModal] Clipboard error:", err);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
      style={{ backgroundColor: "rgba(35, 43, 50, 0.62)", backdropFilter: "blur(4px)" }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-staff-modal-title"
      onClick={(e) => {
        if (!isSubmitting && e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg rounded-2xl bg-[#FFFFFF] border border-[#E2E8F0] shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="px-6 py-5 bg-[#232B32] flex items-center justify-between gap-4 border-b border-[#C5A059]/30">
          <div>
            <p className="text-[11px] font-bold tracking-widest uppercase text-[#C5A059]">
              SIX SIGMAPHIL • Provision Access
            </p>
            <h2 id="create-staff-modal-title" className="text-lg font-semibold text-[#F9F9FB] mt-0.5">
              {createdSummary ? "Account Created in Supabase" : "Create Admin / Super Admin"}
            </h2>
          </div>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            aria-label="Close modal"
            className="p-2 rounded-lg text-[#9CA3AF] hover:text-[#FFFFFF] disabled:opacity-40 cursor-pointer transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        {createdSummary ? (
          <div className="p-6 space-y-5">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] text-[#047857] flex items-center justify-center shrink-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-[#232B32]">
                  {createdSummary.role === "super_admin" ? "New Super Admin" : "New Admin"} Ready to Sign In
                </h3>
                <p className="text-xs text-[#6B7280] mt-1">
                  The account has been saved in Supabase Authentication and profile records and can sign in immediately.
                </p>
              </div>
            </div>

            <div className="rounded-xl bg-[#F9F9FB] border border-[#E2E8F0] p-4 space-y-2 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[#6B7280]">Role</span>
                <span className="font-bold uppercase tracking-wider text-[#232B32]">
                  {createdSummary.role === "super_admin" ? "Super Admin" : "Admin"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[#6B7280]">Name</span>
                <span className="font-semibold text-[#232B32]">{createdSummary.full_name}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[#6B7280]">Email</span>
                <span className="font-semibold text-[#232B32] break-all">{createdSummary.email}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[#6B7280]">Password</span>
                <span className="font-mono font-semibold text-[#232B32]">{createdSummary.password}</span>
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
              <button
                type="button"
                onClick={() => {
                  setCreatedSummary(null);
                  setFullName("");
                  setEmail("");
                  setPassword("");
                  setConfirmPassword("");
                  setFormError("");
                }}
                className="py-2.5 px-4 rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] hover:bg-[#F9F9FB] text-xs font-semibold uppercase tracking-wider text-[#232B32] cursor-pointer"
              >
                Create Another
              </button>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleCopyCredentials}
                  className="py-2.5 px-4 rounded-xl border border-[#C5A059] bg-[#FFFFFF] hover:bg-[#F9F9FB] text-xs font-semibold uppercase tracking-wider text-[#232B32] cursor-pointer"
                >
                  {copiedSummary ? "Copied Credentials" : "Copy Credentials"}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="py-2.5 px-5 rounded-xl bg-[#C5A059] hover:bg-[#b08d47] text-[#232B32] text-xs font-bold uppercase tracking-wider cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {formError && (
              <div className="px-4 py-3 rounded-xl bg-[#FFF1F2] border border-[#FECDD3] text-xs font-medium text-[#BE123C]">
                {formError}
              </div>
            )}

            {/* Account Role */}
            <div>
              <label className="block text-xs font-semibold tracking-wider uppercase text-[#232B32] mb-2">
                Account Role
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  {
                    value: "admin",
                    title: "Admin",
                    desc: "Manages quotations, materials, models & studio content.",
                  },
                  {
                    value: "super_admin",
                    title: "Super Admin",
                    desc: "Full access control, credential management & governance.",
                  },
                ].map((opt) => {
                  const selected = role === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => setRole(opt.value)}
                      className="text-left p-3.5 rounded-xl border transition-all cursor-pointer disabled:opacity-50"
                      style={
                        selected
                          ? {
                              backgroundColor: "#232B32",
                              borderColor: "#C5A059",
                              color: "#F9F9FB",
                            }
                          : {
                              backgroundColor: "#F9F9FB",
                              borderColor: "#E2E8F0",
                              color: "#232B32",
                            }
                      }
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className="text-xs font-bold tracking-wider uppercase"
                          style={{ color: selected ? "#C5A059" : "#232B32" }}
                        >
                          {opt.title}
                        </span>
                        <span
                          className="w-3.5 h-3.5 rounded-full border flex items-center justify-center"
                          style={{ borderColor: selected ? "#C5A059" : "#9CA3AF" }}
                        >
                          {selected && <span className="w-2 h-2 rounded-full bg-[#C5A059]" />}
                        </span>
                      </div>
                      <p
                        className="text-[11px] mt-1 leading-snug"
                        style={{ color: selected ? "#D1D5DB" : "#6B7280" }}
                      >
                        {opt.desc}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Full Name */}
            <div>
              <label
                htmlFor="new-staff-name"
                className="block text-xs font-semibold tracking-wider uppercase text-[#232B32] mb-2"
              >
                Full Name <span className="font-normal text-[#9CA3AF] normal-case">(Optional)</span>
              </label>
              <input
                id="new-staff-name"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={isSubmitting}
                placeholder={role === "super_admin" ? "e.g., Executive Super Admin" : "e.g., Operations Admin"}
                className="w-full py-2.5 px-4 rounded-xl bg-[#FFFFFF] border border-[#E2E8F0] text-sm text-[#232B32] outline-none focus:border-[#C5A059] transition-colors disabled:opacity-60"
              />
            </div>

            {/* Unique Email */}
            <div>
              <label
                htmlFor="new-staff-email"
                className="block text-xs font-semibold tracking-wider uppercase text-[#232B32] mb-2"
              >
                Login Email Address <span className="text-[#BE123C]">*</span>
              </label>
              <input
                id="new-staff-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSubmitting}
                placeholder={role === "super_admin" ? "newsuperadmin@sixsigmaphil.com" : "newadmin@sixsigmaphil.com"}
                className="w-full py-2.5 px-4 rounded-xl bg-[#FFFFFF] border border-[#E2E8F0] text-sm text-[#232B32] outline-none focus:border-[#C5A059] transition-colors disabled:opacity-60"
              />
              <p className="text-[11px] text-[#6B7280] mt-1">
                Must be unique. Passwords may match other accounts if desired.
              </p>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label
                  htmlFor="new-staff-password"
                  className="block text-xs font-semibold tracking-wider uppercase text-[#232B32]"
                >
                  Password <span className="text-[#BE123C]">*</span>
                </label>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => {
                    const pw = generateReadablePassword();
                    setPassword(pw);
                    setConfirmPassword(pw);
                    setShowPassword(true);
                  }}
                  className="text-xs font-semibold text-[#C5A059] hover:underline cursor-pointer disabled:opacity-50"
                >
                  Generate Strong Password
                </button>
              </div>
              <div className="relative">
                <input
                  id="new-staff-password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isSubmitting}
                  placeholder="Minimum 8 characters"
                  className="w-full py-2.5 pl-4 pr-11 rounded-xl bg-[#FFFFFF] border border-[#E2E8F0] text-sm text-[#232B32] outline-none focus:border-[#C5A059] transition-colors disabled:opacity-60"
                />
                <EyeToggle show={showPassword} onToggle={() => setShowPassword((prev) => !prev)} />
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label
                htmlFor="new-staff-confirm-password"
                className="block text-xs font-semibold tracking-wider uppercase text-[#232B32] mb-2"
              >
                Confirm Password <span className="text-[#BE123C]">*</span>
              </label>
              <input
                id="new-staff-confirm-password"
                type={showPassword ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isSubmitting}
                placeholder="Re-enter password"
                className="w-full py-2.5 px-4 rounded-xl bg-[#FFFFFF] border border-[#E2E8F0] text-sm text-[#232B32] outline-none focus:border-[#C5A059] transition-colors disabled:opacity-60"
              />
            </div>

            {/* Footer Actions */}
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={onClose}
                className="py-2.5 px-4 rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] hover:bg-[#F9F9FB] text-sm font-semibold text-[#232B32] disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="py-2.5 px-5 rounded-xl bg-[#C5A059] hover:bg-[#b08d47] text-[#232B32] text-sm font-bold disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 transition-colors"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-[#232B32] border-t-transparent rounded-full animate-spin" />
                    Creating Account…
                  </>
                ) : role === "super_admin" ? (
                  "Create Super Admin Account"
                ) : (
                  "Create Admin Account"
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
