import { useState, useEffect, useCallback, useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useToast, ToastNotification } from "../utils/toast";
import { EyeToggle } from "../components/FormHelpers";
import CreateStaffAccountModal from "../components/CreateStaffAccountModal";

function generateStrongPassword(length = 14) {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const nums = "23456789";
  const symbols = "!@#$%^&*_-";
  const all = upper + lower + nums + symbols;

  const pick = (pool) => {
    const arr = new Uint32Array(1);
    window.crypto.getRandomValues(arr);
    return pool[arr[0] % pool.length];
  };

  // Guarantee character class diversity
  const chars = [pick(upper), pick(lower), pick(nums), pick(symbols)];
  while (chars.length < length) chars.push(pick(all));

  // Fisher-Yates shuffle
  for (let i = chars.length - 1; i > 0; i--) {
    const arr = new Uint32Array(1);
    window.crypto.getRandomValues(arr);
    const j = arr[0] % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

function CredentialConfirmModal({ pendingAction, saving, onCancel, onConfirm }) {
  if (!pendingAction) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(35, 43, 50, 0.58)", backdropFilter: "blur(4px)" }}
      onClick={(e) => {
        if (!saving && e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="w-full max-w-md rounded-2xl bg-[#FFFFFF] border border-[#E2E8F0] shadow-2xl overflow-hidden">
        <div className="px-6 py-5 bg-[#232B32] flex items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold tracking-widest uppercase text-[#C5A059]">
              Confirm Security Update
            </p>
            <h3 className="text-lg font-semibold text-[#F9F9FB] mt-1">
              Update {pendingAction.roleLabel} Credentials
            </h3>
          </div>
          <button
            type="button"
            disabled={saving}
            onClick={onCancel}
            className="p-2 rounded-lg text-[#9CA3AF] hover:text-[#FFFFFF] disabled:opacity-40 cursor-pointer"
            aria-label="Close modal"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="p-4 rounded-xl bg-[#F9F9FB] border border-[#E2E8F0] space-y-1.5 text-xs">
            <p className="text-[#6B7280]">
              Target Account:{" "}
              <span className="font-semibold text-[#232B32]">{pendingAction.targetName}</span>
            </p>
            {pendingAction.newEmail && (
              <p className="text-[#6B7280]">
                New Email:{" "}
                <span className="font-semibold text-[#232B32]">{pendingAction.newEmail}</span>
              </p>
            )}
            <p className="text-[#6B7280]">
              Password Change:{" "}
              <span className="font-semibold text-[#232B32]">
                {pendingAction.newPassword ? "Yes (new password will apply immediately)" : "No change"}
              </span>
            </p>
          </div>

          <p className="text-sm text-[#232B32] leading-relaxed">
            {pendingAction.isSelf
              ? "Your own Super Admin credentials will be updated immediately. Make sure to keep your new sign-in details secure."
              : `Updating this ${pendingAction.roleLabel} account's credentials takes effect immediately and logs out any active sessions using old credentials.`}
          </p>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
            <button
              type="button"
              disabled={saving}
              onClick={onCancel}
              className="py-2.5 px-4 rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] hover:bg-[#F9F9FB] text-sm font-semibold text-[#232B32] disabled:opacity-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={onConfirm}
              className="py-2.5 px-5 rounded-xl bg-[#C5A059] hover:bg-[#b08d47] text-[#FFFFFF] text-sm font-semibold disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <span className="w-4 h-4 border-2 border-[#FFFFFF] border-t-transparent rounded-full animate-spin" />
                  Saving…
                </>
              ) : (
                "Save Credentials"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SuperAdminCredentials() {
  const outletContext = useOutletContext() || {};
  const { superAdminProfile, setSuperAdminProfile } = outletContext;

  const [accounts, setAccounts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // Admin credential form state
  const [selectedAdminId, setSelectedAdminId] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminConfirmPassword, setAdminConfirmPassword] = useState("");
  const [showAdminPw, setShowAdminPw] = useState(false);

  // Super Admin credential form state (supports multiple Super Admin accounts)
  const [selectedSuperId, setSelectedSuperId] = useState("");
  const [superEmail, setSuperEmail] = useState("");
  const [superPassword, setSuperPassword] = useState("");
  const [superConfirmPassword, setSuperConfirmPassword] = useState("");
  const [showSuperPw, setShowSuperPw] = useState(false);

  // Create new Admin / Super Admin account modal
  const [createModal, setCreateModal] = useState({ open: false, defaultRole: "admin" });

  const [pendingAction, setPendingAction] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const { toast, showToast, dismissToast } = useToast();

  const adminAccounts = useMemo(
    () => accounts.filter((a) => a.role === "admin"),
    [accounts]
  );

  const superAdminAccounts = useMemo(
    () => accounts.filter((a) => a.role === "super_admin"),
    [accounts]
  );

  const existingEmails = useMemo(
    () => accounts.map((a) => a.email).filter(Boolean),
    [accounts]
  );

  const selectedAdmin = useMemo(
    () => adminAccounts.find((a) => a.id === selectedAdminId) || null,
    [adminAccounts, selectedAdminId]
  );

  const selectedSuperAdmin = useMemo(
    () =>
      superAdminAccounts.find((a) => a.id === selectedSuperId) ||
      superAdminAccounts.find((a) => a.id === superAdminProfile?.id) ||
      superAdminAccounts[0] ||
      superAdminProfile ||
      null,
    [superAdminAccounts, selectedSuperId, superAdminProfile]
  );

  const applyLoadedAccounts = useCallback(
    (list) => {
      setAccounts(list);

      const admins = list.filter((a) => a.role === "admin");
      if (admins.length > 0) {
        setSelectedAdminId((prev) => {
          const stillExists = admins.find((a) => a.id === prev);
          const chosen = stillExists || admins[0];
          setAdminEmail(chosen.email || "");
          return chosen.id;
        });
      }

      const supers = list.filter((a) => a.role === "super_admin");
      if (supers.length > 0) {
        setSelectedSuperId((prev) => {
          const stillExists = supers.find((a) => a.id === prev);
          const selfAcc = supers.find((a) => a.id === superAdminProfile?.id);
          const chosen = stillExists || selfAcc || supers[0];
          setSuperEmail(chosen.email || "");
          return chosen.id;
        });
      }
    },
    [superAdminProfile?.id]
  );

  const fetchAccounts = useCallback(async () => {
    setIsLoading(true);
    setLoadError("");
    try {
      const { data, error } = await supabase.rpc("super_admin_list_accounts");
      if (error) throw error;
      const list = Array.isArray(data) ? data : [];
      applyLoadedAccounts(list);
      return list;
    } catch (err) {
      console.error("[SuperAdminCredentials] Failed to load accounts:", err);
      const msg = "Unable to load credential records. Please verify your Super Admin SQL setup and try again.";
      setLoadError(msg);
      showToast(msg, "error");
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [applyLoadedAccounts, showToast]);

  useEffect(() => {
    let isMounted = true;

    const loadInitial = async () => {
      try {
        const { data, error } = await supabase.rpc("super_admin_list_accounts");
        if (!isMounted) return;
        if (error) throw error;
        applyLoadedAccounts(Array.isArray(data) ? data : []);
      } catch (err) {
        if (!isMounted) return;
        console.error("[SuperAdminCredentials] Failed to load accounts:", err);
        const msg = "Unable to load credential records. Please verify your Super Admin SQL setup and try again.";
        setLoadError(msg);
        showToast(msg, "error");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadInitial();

    return () => {
      isMounted = false;
    };
  }, [applyLoadedAccounts, showToast]);

  const handleSelectAdmin = (id) => {
    setSelectedAdminId(id);
    const chosen = adminAccounts.find((a) => a.id === id);
    setAdminEmail(chosen?.email || "");
    setAdminPassword("");
    setAdminConfirmPassword("");
  };

  const handleSelectSuperAdmin = (id) => {
    setSelectedSuperId(id);
    const chosen = superAdminAccounts.find((a) => a.id === id);
    setSuperEmail(chosen?.email || "");
    setSuperPassword("");
    setSuperConfirmPassword("");
  };

  const validateAndPrepare = ({ mode }) => {
    const isAdminMode = mode === "admin";
    const target = isAdminMode ? selectedAdmin : selectedSuperAdmin;
    const rawEmail = (isAdminMode ? adminEmail : superEmail).trim().toLowerCase();
    const rawPw = isAdminMode ? adminPassword : superPassword;
    const rawConfirmPw = isAdminMode ? adminConfirmPassword : superConfirmPassword;

    if (!target?.id) {
      showToast(`No ${isAdminMode ? "Admin" : "Super Admin"} account found to update.`, "error");
      return;
    }

    if (!rawEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail)) {
      showToast("Please enter a valid email address.", "error");
      return;
    }

    const emailTaken = accounts.some(
      (a) => a.id !== target.id && (a.email || "").trim().toLowerCase() === rawEmail
    );
    if (emailTaken) {
      showToast("This email address is already registered to another account.", "error");
      return;
    }

    const emailChanged = rawEmail !== (target.email || "").trim().toLowerCase();
    const passwordChanged = rawPw.length > 0;

    if (!emailChanged && !passwordChanged) {
      showToast("Change the email address or enter a new password before saving.", "info");
      return;
    }

    if (passwordChanged) {
      if (rawPw.length < 8) {
        showToast("New password must be at least 8 characters long.", "error");
        return;
      }
      if (rawPw !== rawConfirmPw) {
        showToast("Password confirmation does not match.", "error");
        return;
      }
    }

    setPendingAction({
      mode,
      roleLabel: isAdminMode ? "Admin" : "Super Admin",
      targetId: target.id,
      isSelf: target.id === superAdminProfile?.id,
      targetName: `${target.full_name || target.role} (${target.email})`,
      newEmail: emailChanged ? rawEmail : null,
      newPassword: passwordChanged ? rawPw : null,
    });
  };

  const executeCredentialUpdate = async () => {
    if (!pendingAction || isSaving) return;
    setIsSaving(true);
    try {
      const { data, error } = await supabase.rpc("super_admin_update_credentials", {
        target_user_id: pendingAction.targetId,
        new_email: pendingAction.newEmail,
        new_password: pendingAction.newPassword,
      });

      if (error) throw error;

      const updatedEmail = data?.email || pendingAction.newEmail;

      if (pendingAction.mode === "admin") {
        setAdminPassword("");
        setAdminConfirmPassword("");
        if (updatedEmail) setAdminEmail(updatedEmail);
      } else {
        setSuperPassword("");
        setSuperConfirmPassword("");
        if (updatedEmail) {
          setSuperEmail(updatedEmail);
          if (pendingAction.isSelf && typeof setSuperAdminProfile === "function") {
            setSuperAdminProfile((prev) => ({ ...prev, email: updatedEmail }));
          }
        }
        // Keep current Super Admin session fresh after self credential changes
        if (pendingAction.isSelf) {
          await supabase.auth.refreshSession();
        }
      }

      await fetchAccounts();
      showToast(`${pendingAction.roleLabel} credentials updated successfully.`, "success");
      setPendingAction(null);
    } catch (err) {
      console.error("[SuperAdminCredentials] Update error:", err);
      showToast(err?.message || "Failed to update credentials. Please try again.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAccountCreated = async (created) => {
    await fetchAccounts();
    if (created?.id) {
      if (created.role === "admin") {
        setSelectedAdminId(created.id);
        setAdminEmail(created.email || "");
        setAdminPassword("");
        setAdminConfirmPassword("");
      } else if (created.role === "super_admin") {
        setSelectedSuperId(created.id);
        setSuperEmail(created.email || "");
        setSuperPassword("");
        setSuperConfirmPassword("");
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center p-8">
        <div className="w-8 h-8 border-4 border-[#C5A059] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen px-4 sm:px-6 lg:px-8 py-6 md:py-8">
      <ToastNotification toast={toast} onDismiss={dismissToast} />
      <CredentialConfirmModal
        pendingAction={pendingAction}
        saving={isSaving}
        onCancel={() => !isSaving && setPendingAction(null)}
        onConfirm={executeCredentialUpdate}
      />
      <CreateStaffAccountModal
        isOpen={createModal.open}
        defaultRole={createModal.defaultRole}
        existingEmails={existingEmails}
        onClose={() => setCreateModal((prev) => ({ ...prev, open: false }))}
        onCreated={handleAccountCreated}
        showToast={showToast}
      />

      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header Banner */}
        <div
          className="rounded-2xl p-6 md:p-8 border border-[#E2E8F0] shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4"
          style={{
            background: "linear-gradient(135deg, #FFFFFF 0%, #F9F9FB 100%)",
          }}
        >
          <div>
            <p className="text-[11px] font-bold tracking-widest uppercase text-[#C5A059]">
              Security &amp; Authentication
            </p>
            <h1 className="text-2xl md:text-3xl font-bold text-[#232B32] mt-1">
              Admin &amp; Super Admin Credentials
            </h1>
            <p className="text-sm text-[#6B7280] mt-1.5 max-w-2xl">
              Create new Admin or Super Admin accounts and manage login emails and passwords. Changes sync directly with Supabase Auth.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setCreateModal({ open: true, defaultRole: "admin" })}
            className="self-start md:self-auto py-2.5 px-5 rounded-xl bg-[#C5A059] hover:bg-[#b08d47] text-[#232B32] text-xs font-bold tracking-wider uppercase transition-colors cursor-pointer flex items-center gap-2 shrink-0"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="8.5" cy="7" r="4" />
              <line x1="20" y1="8" x2="20" y2="14" />
              <line x1="23" y1="11" x2="17" y2="11" />
            </svg>
            Create Account
          </button>
        </div>

        {loadError ? (
          <div className="rounded-2xl bg-[#FFFFFF] border border-[#E2E8F0] p-8 text-center space-y-4">
            <p className="text-sm font-medium text-[#232B32]">{loadError}</p>
            <button
              type="button"
              onClick={fetchAccounts}
              className="py-2.5 px-5 rounded-xl bg-[#C5A059] hover:bg-[#b08d47] text-[#FFFFFF] text-xs font-semibold tracking-wider uppercase cursor-pointer"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* Panel 1: Admin Account Credentials */}
            <div className="rounded-2xl bg-[#FFFFFF] border border-[#E2E8F0] shadow-xs overflow-hidden">
              <div className="px-6 py-5 bg-[#232B32] flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-bold tracking-widest uppercase text-[#C5A059]">
                    Staff Credential Control
                  </span>
                  <h2 className="text-lg font-semibold text-[#F9F9FB] mt-0.5">
                    Admin Credentials
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-[rgba(197,160,89,0.16)] text-[#C5A059] border border-[rgba(197,160,89,0.35)]">
                    {adminAccounts.length} {adminAccounts.length === 1 ? "Admin" : "Admins"}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCreateModal({ open: true, defaultRole: "admin" })}
                    className="py-1.5 px-3 rounded-lg text-[11px] font-bold uppercase tracking-wider bg-[#C5A059] hover:bg-[#b08d47] text-[#232B32] transition-colors cursor-pointer"
                  >
                    + New Admin
                  </button>
                </div>
              </div>

              <div className="p-6">
                {adminAccounts.length === 0 ? (
                  <div className="p-6 rounded-xl bg-[#F9F9FB] border border-[#E2E8F0] text-center space-y-3">
                    <p className="text-sm font-semibold text-[#232B32]">No Admin accounts found</p>
                    <p className="text-xs text-[#6B7280]">
                      Create a new Admin account right from the Super Admin portal.
                    </p>
                    <button
                      type="button"
                      onClick={() => setCreateModal({ open: true, defaultRole: "admin" })}
                      className="py-2.5 px-4 rounded-xl bg-[#C5A059] hover:bg-[#b08d47] text-[#232B32] text-xs font-bold uppercase tracking-wider cursor-pointer"
                    >
                      Create First Admin
                    </button>
                  </div>
                ) : (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      validateAndPrepare({ mode: "admin" });
                    }}
                    className="space-y-4"
                  >
                    <div>
                      <label
                        htmlFor="select-admin-account"
                        className="block text-xs font-semibold tracking-wider uppercase text-[#232B32] mb-2"
                      >
                        Select Admin Account
                      </label>
                      <select
                        id="select-admin-account"
                        value={selectedAdminId}
                        onChange={(e) => handleSelectAdmin(e.target.value)}
                        className="w-full py-2.5 px-4 rounded-xl bg-[#F9F9FB] border border-[#E2E8F0] text-sm text-[#232B32] outline-none focus:border-[#C5A059] cursor-pointer"
                      >
                        {adminAccounts.map((admin) => (
                          <option key={admin.id} value={admin.id}>
                            {admin.full_name || "Admin"} — {admin.email}{" "}
                            {admin.is_active === false ? "(Deactivated)" : "(Active)"}
                          </option>
                        ))}
                      </select>
                    </div>

                    {selectedAdmin && (
                      <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-[#F9F9FB] border border-[#E2E8F0]">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-[#232B32] truncate">
                            {selectedAdmin.full_name || "Admin Account"}
                          </p>
                          <p className="text-[11px] text-[#6B7280] truncate">{selectedAdmin.email}</p>
                        </div>
                        <span
                          className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold shrink-0"
                          style={
                            selectedAdmin.is_active !== false
                              ? { backgroundColor: "#ECFDF5", color: "#047857", border: "1px solid #A7F3D0" }
                              : { backgroundColor: "#FFF1F2", color: "#BE123C", border: "1px solid #FECDD3" }
                          }
                        >
                          {selectedAdmin.is_active !== false ? "Active" : "Deactivated"}
                        </span>
                      </div>
                    )}

                    <div>
                      <label
                        htmlFor="admin-email-input"
                        className="block text-xs font-semibold tracking-wider uppercase text-[#232B32] mb-2"
                      >
                        Admin Login Email
                      </label>
                      <input
                        id="admin-email-input"
                        type="email"
                        value={adminEmail}
                        onChange={(e) => setAdminEmail(e.target.value)}
                        required
                        placeholder="admin@sixsigmaphil.com"
                        className="w-full py-2.5 px-4 rounded-xl bg-[#FFFFFF] border border-[#E2E8F0] text-sm text-[#232B32] outline-none focus:border-[#C5A059] transition-colors"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label
                          htmlFor="admin-new-password"
                          className="block text-xs font-semibold tracking-wider uppercase text-[#232B32]"
                        >
                          New Password <span className="font-normal text-[#9CA3AF] normal-case">(Optional)</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            const pw = generateStrongPassword();
                            setAdminPassword(pw);
                            setAdminConfirmPassword(pw);
                            setShowAdminPw(true);
                          }}
                          className="text-xs font-semibold text-[#C5A059] hover:underline cursor-pointer"
                        >
                          Generate Strong Password
                        </button>
                      </div>
                      <div className="relative">
                        <input
                          id="admin-new-password"
                          type={showAdminPw ? "text" : "password"}
                          value={adminPassword}
                          onChange={(e) => setAdminPassword(e.target.value)}
                          placeholder="Leave blank to keep existing password (min. 8 chars)"
                          className="w-full py-2.5 pl-4 pr-11 rounded-xl bg-[#FFFFFF] border border-[#E2E8F0] text-sm text-[#232B32] outline-none focus:border-[#C5A059] transition-colors"
                        />
                        <EyeToggle show={showAdminPw} onToggle={() => setShowAdminPw(!showAdminPw)} />
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="admin-confirm-password"
                        className="block text-xs font-semibold tracking-wider uppercase text-[#232B32] mb-2"
                      >
                        Confirm New Password
                      </label>
                      <input
                        id="admin-confirm-password"
                        type={showAdminPw ? "text" : "password"}
                        value={adminConfirmPassword}
                        onChange={(e) => setAdminConfirmPassword(e.target.value)}
                        placeholder="Re-enter new Admin password"
                        className="w-full py-2.5 px-4 rounded-xl bg-[#FFFFFF] border border-[#E2E8F0] text-sm text-[#232B32] outline-none focus:border-[#C5A059] transition-colors"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSaving}
                      className="w-full py-2.5 px-4 rounded-xl bg-[#C5A059] hover:bg-[#b08d47] text-[#FFFFFF] text-xs font-bold tracking-widest uppercase transition-colors disabled:opacity-50 cursor-pointer mt-2"
                    >
                      Update Admin Credentials
                    </button>
                  </form>
                )}
              </div>
            </div>

            {/* Panel 2: Super Admin Credentials (supports multiple Super Admin accounts) */}
            <div className="rounded-2xl bg-[#FFFFFF] border border-[#E2E8F0] shadow-xs overflow-hidden">
              <div className="px-6 py-5 bg-[#232B32] flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-bold tracking-widest uppercase text-[#C5A059]">
                    Owner / Executive Accounts
                  </span>
                  <h2 className="text-lg font-semibold text-[#F9F9FB] mt-0.5">
                    Super Admin Credentials
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-[rgba(197,160,89,0.16)] text-[#C5A059] border border-[rgba(197,160,89,0.35)]">
                    {superAdminAccounts.length || 1}{" "}
                    {(superAdminAccounts.length || 1) === 1 ? "Super Admin" : "Super Admins"}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCreateModal({ open: true, defaultRole: "super_admin" })}
                    className="py-1.5 px-3 rounded-lg text-[11px] font-bold uppercase tracking-wider bg-[#C5A059] hover:bg-[#b08d47] text-[#232B32] transition-colors cursor-pointer"
                  >
                    + New Super Admin
                  </button>
                </div>
              </div>

              <div className="p-6">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    validateAndPrepare({ mode: "super_admin" });
                  }}
                  className="space-y-4"
                >
                  {superAdminAccounts.length > 1 && (
                    <div>
                      <label
                        htmlFor="select-superadmin-account"
                        className="block text-xs font-semibold tracking-wider uppercase text-[#232B32] mb-2"
                      >
                        Select Super Admin Account
                      </label>
                      <select
                        id="select-superadmin-account"
                        value={selectedSuperId || selectedSuperAdmin?.id || ""}
                        onChange={(e) => handleSelectSuperAdmin(e.target.value)}
                        className="w-full py-2.5 px-4 rounded-xl bg-[#F9F9FB] border border-[#E2E8F0] text-sm text-[#232B32] outline-none focus:border-[#C5A059] cursor-pointer"
                      >
                        {superAdminAccounts.map((acc) => (
                          <option key={acc.id} value={acc.id}>
                            {acc.full_name || "Super Admin"} — {acc.email}
                            {acc.id === superAdminProfile?.id ? " (You)" : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-[#F9F9FB] border border-[#E2E8F0]">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[#232B32] truncate">
                        {selectedSuperAdmin?.full_name || "Six Sigmaphil Super Admin"}
                        {selectedSuperAdmin?.id === superAdminProfile?.id ? " (Current Session)" : ""}
                      </p>
                      <p className="text-[11px] text-[#6B7280] mt-0.5 truncate">
                        Current Login: <span className="font-medium text-[#232B32]">{selectedSuperAdmin?.email}</span>
                      </p>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold shrink-0 bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0]">
                      Active
                    </span>
                  </div>

                  <div>
                    <label
                      htmlFor="superadmin-email-input"
                      className="block text-xs font-semibold tracking-wider uppercase text-[#232B32] mb-2"
                    >
                      Super Admin Login Email
                    </label>
                    <input
                      id="superadmin-email-input"
                      type="email"
                      value={superEmail}
                      onChange={(e) => setSuperEmail(e.target.value)}
                      required
                      placeholder="superadmin@sixsigmaphil.com"
                      className="w-full py-2.5 px-4 rounded-xl bg-[#FFFFFF] border border-[#E2E8F0] text-sm text-[#232B32] outline-none focus:border-[#C5A059] transition-colors"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label
                        htmlFor="superadmin-new-password"
                        className="block text-xs font-semibold tracking-wider uppercase text-[#232B32]"
                      >
                        New Password <span className="font-normal text-[#9CA3AF] normal-case">(Optional)</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const pw = generateStrongPassword();
                          setSuperPassword(pw);
                          setSuperConfirmPassword(pw);
                          setShowSuperPw(true);
                        }}
                        className="text-xs font-semibold text-[#C5A059] hover:underline cursor-pointer"
                      >
                        Generate Strong Password
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        id="superadmin-new-password"
                        type={showSuperPw ? "text" : "password"}
                        value={superPassword}
                        onChange={(e) => setSuperPassword(e.target.value)}
                        placeholder="Leave blank to keep existing password (min. 8 chars)"
                        className="w-full py-2.5 pl-4 pr-11 rounded-xl bg-[#FFFFFF] border border-[#E2E8F0] text-sm text-[#232B32] outline-none focus:border-[#C5A059] transition-colors"
                      />
                      <EyeToggle show={showSuperPw} onToggle={() => setShowSuperPw(!showSuperPw)} />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="superadmin-confirm-password"
                      className="block text-xs font-semibold tracking-wider uppercase text-[#232B32] mb-2"
                    >
                      Confirm New Password
                    </label>
                    <input
                      id="superadmin-confirm-password"
                      type={showSuperPw ? "text" : "password"}
                      value={superConfirmPassword}
                      onChange={(e) => setSuperConfirmPassword(e.target.value)}
                      placeholder="Re-enter new Super Admin password"
                      className="w-full py-2.5 px-4 rounded-xl bg-[#FFFFFF] border border-[#E2E8F0] text-sm text-[#232B32] outline-none focus:border-[#C5A059] transition-colors"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSaving}
                    className="w-full py-2.5 px-4 rounded-xl bg-[#232B32] hover:bg-[#1a2025] text-[#C5A059] border border-[#232B32] text-xs font-bold tracking-widest uppercase transition-colors disabled:opacity-50 cursor-pointer mt-2"
                  >
                    Update Super Admin Credentials
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
