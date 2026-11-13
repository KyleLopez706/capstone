import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { supabase } from "../supabaseClient";
import { useToast, ToastNotification } from "../utils/toast";

function formatDate(iso) {
  if (!iso) return "Never";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function StatusConfirmationModal({ target, submitting, onCancel, onConfirm }) {
  if (!target) return null;
  const willActivate = !target.is_active;
  const isAdminTarget = target.role === "admin";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(35, 43, 50, 0.58)", backdropFilter: "blur(4px)" }}
      onClick={(e) => {
        if (!submitting && e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="w-full max-w-md rounded-2xl bg-[#FFFFFF] border border-[#E2E8F0] shadow-2xl overflow-hidden">
        <div className="px-6 py-5 bg-[#232B32] flex items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold tracking-widest uppercase text-[#C5A059]">
              Confirm Account Action
            </p>
            <h3 className="text-lg font-semibold text-[#F9F9FB] mt-1">
              {willActivate ? "Activate Account" : "Deactivate Account"}
            </h3>
          </div>
          <button
            type="button"
            disabled={submitting}
            onClick={onCancel}
            className="p-2 rounded-lg text-[#9CA3AF] hover:text-[#FFFFFF] disabled:opacity-40 cursor-pointer"
            aria-label="Close confirmation dialog"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="p-4 rounded-xl bg-[#F9F9FB] border border-[#E2E8F0]">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-bold text-[#232B32] truncate">{target.full_name || "Unnamed User"}</p>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider bg-[#232B32] text-[#C5A059] shrink-0">
                {target.role}
              </span>
            </div>
            <p className="text-xs text-[#6B7280] mt-1 truncate">{target.email}</p>
          </div>

          <p className="text-sm leading-relaxed text-[#232B32]">
            {willActivate ? (
              <>
                Restoring this <strong>{isAdminTarget ? "Admin" : "User"}</strong> account will allow them to sign in again
                {isAdminTarget
                  ? " and regain access to the Admin Panel."
                  : " and submit quotation requests."}
              </>
            ) : (
              <>
                Deactivating this <strong>{isAdminTarget ? "Admin" : "User"}</strong> account will immediately sign them out, block future logins, and{" "}
                {isAdminTarget
                  ? "revoke access to all Admin tools and catalog updates."
                  : "block new quotation submissions."}
              </>
            )}
          </p>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
            <button
              type="button"
              disabled={submitting}
              onClick={onCancel}
              className="py-2.5 px-4 rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] hover:bg-[#F9F9FB] text-sm font-semibold text-[#232B32] transition-colors disabled:opacity-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={onConfirm}
              className="py-2.5 px-5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              style={{
                backgroundColor: willActivate ? "#C5A059" : "#BE123C",
                color: "#FFFFFF",
              }}
            >
              {submitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-[#FFFFFF] border-t-transparent rounded-full animate-spin" />
                  Updating…
                </>
              ) : willActivate ? (
                "Confirm Activate"
              ) : (
                "Confirm Deactivate"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SuperAdminDashboard() {
  const [accounts, setAccounts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all"); // 'all' | 'admin' | 'user'
  const [statusFilter, setStatusFilter] = useState("all"); // 'all' | 'active' | 'inactive'
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const debounceRef = useRef(null);
  const { toast, showToast, dismissToast } = useToast();

  const fetchAccounts = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    setLoadError("");
    try {
      const { data, error } = await supabase.rpc("super_admin_list_accounts");
      if (error) throw error;
      setAccounts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("[SuperAdminDashboard] Failed to load accounts:", err);
      const msg = err?.message?.toLowerCase().includes("unauthorized")
        ? "Access Restricted: Super Admin permissions required."
        : "Unable to load account records. Please ensure the Super Admin SQL setup is applied and try again.";
      setLoadError(msg);
      if (!silent) showToast(msg, "error");
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    let isMounted = true;

    const loadInitial = async () => {
      try {
        const { data, error } = await supabase.rpc("super_admin_list_accounts");
        if (!isMounted) return;
        if (error) throw error;
        setAccounts(Array.isArray(data) ? data : []);
      } catch (err) {
        if (!isMounted) return;
        console.error("[SuperAdminDashboard] Failed to load accounts:", err);
        const msg = err?.message?.toLowerCase().includes("unauthorized")
          ? "Access Restricted: Super Admin permissions required."
          : "Unable to load account records. Please ensure the Super Admin SQL setup is applied and try again.";
        setLoadError(msg);
        showToast(msg, "error");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadInitial();

    // Refresh smoothly in the background if profiles or quotations update
    const scheduleRefresh = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        fetchAccounts(true);
      }, 350);
    };

    const channel = supabase
      .channel("super-admin-accounts-watch")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, scheduleRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "quotation_requests" }, scheduleRefresh)
      .subscribe();

    return () => {
      isMounted = false;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      supabase.removeChannel(channel);
    };
  }, [fetchAccounts, showToast]);

  // Exclude super_admin accounts from the activation/deactivation directory
  const managedAccounts = useMemo(
    () => accounts.filter((acc) => acc.role === "admin" || acc.role === "user"),
    [accounts]
  );

  const stats = useMemo(() => {
    const admins = managedAccounts.filter((a) => a.role === "admin");
    const users = managedAccounts.filter((a) => a.role === "user");
    const deactivated = managedAccounts.filter((a) => a.is_active === false);
    const totalQuotes = users.reduce((sum, u) => sum + (Number(u.quotation_count) || 0), 0);
    const highVolumeUsers = users.filter(
      (u) => (Number(u.pending_quotation_count) || 0) >= 3 || (Number(u.quotation_count) || 0) >= 5
    ).length;

    return {
      totalAdmins: admins.length,
      activeAdmins: admins.filter((a) => a.is_active !== false).length,
      totalUsers: users.length,
      activeUsers: users.filter((a) => a.is_active !== false).length,
      deactivatedCount: deactivated.length,
      totalQuotes,
      highVolumeUsers,
    };
  }, [managedAccounts]);

  const filteredAccounts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return managedAccounts.filter((acc) => {
      if (roleFilter !== "all" && acc.role !== roleFilter) return false;
      if (statusFilter === "active" && acc.is_active === false) return false;
      if (statusFilter === "inactive" && acc.is_active !== false) return false;
      if (!q) return true;
      return (
        (acc.full_name || "").toLowerCase().includes(q) ||
        (acc.email || "").toLowerCase().includes(q) ||
        (acc.phone || "").toLowerCase().includes(q)
      );
    });
  }, [managedAccounts, roleFilter, statusFilter, searchQuery]);

  const handleToggleAccountStatus = async () => {
    if (!confirmTarget || actionLoadingId) return;
    const target = confirmTarget;
    const nextStatus = !target.is_active;

    setActionLoadingId(target.id);
    try {
      const { error } = await supabase.rpc("super_admin_set_account_status", {
        target_user_id: target.id,
        new_is_active: nextStatus,
      });

      if (error) throw error;

      setAccounts((prev) =>
        prev.map((item) =>
          item.id === target.id
            ? {
                ...item,
                is_active: nextStatus,
                deactivated_at: nextStatus ? null : new Date().toISOString(),
              }
            : item
        )
      );

      showToast(
        `${target.role === "admin" ? "Admin" : "User"} account (${target.email}) ${
          nextStatus ? "activated" : "deactivated"
        } successfully.`,
        "success"
      );
      setConfirmTarget(null);
    } catch (err) {
      console.error("[SuperAdminDashboard] Toggle status error:", err);
      showToast(err?.message || "Failed to update account status. Please try again.", "error");
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="w-full min-h-screen px-4 sm:px-6 lg:px-8 py-6 md:py-8">
      <ToastNotification toast={toast} onDismiss={dismissToast} />
      <StatusConfirmationModal
        target={confirmTarget}
        submitting={Boolean(actionLoadingId)}
        onCancel={() => !actionLoadingId && setConfirmTarget(null)}
        onConfirm={handleToggleAccountStatus}
      />

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Page Banner */}
        <div
          className="rounded-2xl p-6 md:p-8 border border-[#E2E8F0] shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4"
          style={{
            background: "linear-gradient(135deg, #FFFFFF 0%, #F9F9FB 100%)",
          }}
        >
          <div>
            <p className="text-[11px] font-bold tracking-widest uppercase text-[#C5A059]">
              Governance &amp; Security
            </p>
            <h1 className="text-2xl md:text-3xl font-bold text-[#232B32] mt-1">
              Admin &amp; User Account Control
            </h1>
            <p className="text-sm text-[#6B7280] mt-1.5 max-w-2xl">
              Monitor registered users and administrators, review quotation activity volume, and deactivate or restore account access in real time.
            </p>
          </div>

          <button
            type="button"
            disabled={isLoading}
            onClick={() => fetchAccounts(false)}
            className="self-start md:self-auto py-2.5 px-4 rounded-xl bg-[#232B32] hover:bg-[#1a2025] text-[#F9F9FB] text-xs font-semibold tracking-wider uppercase transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-2 shrink-0"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 4v6h-6" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
            Refresh Accounts
          </button>
        </div>

        {/* Summary Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-2xl bg-[#FFFFFF] border border-[#E2E8F0] p-5 shadow-xs">
            <p className="text-[11px] font-bold tracking-widest uppercase text-[#6B7280]">Admin Accounts</p>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-3xl font-bold text-[#232B32]">{stats.activeAdmins}</span>
              <span className="text-xs font-medium text-[#6B7280]">of {stats.totalAdmins} total</span>
            </div>
          </div>

          <div className="rounded-2xl bg-[#FFFFFF] border border-[#E2E8F0] p-5 shadow-xs">
            <p className="text-[11px] font-bold tracking-widest uppercase text-[#6B7280]">Active Users</p>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-3xl font-bold text-[#232B32]">{stats.activeUsers}</span>
              <span className="text-xs font-medium text-[#6B7280]">of {stats.totalUsers} total</span>
            </div>
          </div>

          <div className="rounded-2xl bg-[#FFFFFF] border border-[#E2E8F0] p-5 shadow-xs">
            <p className="text-[11px] font-bold tracking-widest uppercase text-[#6B7280]">Deactivated Accounts</p>
            <div className="mt-2 flex items-baseline justify-between">
              <span
                className="text-3xl font-bold"
                style={{ color: stats.deactivatedCount > 0 ? "#BE123C" : "#232B32" }}
              >
                {stats.deactivatedCount}
              </span>
              <span className="text-xs font-medium text-[#6B7280]">Blocked access</span>
            </div>
          </div>

          <div className="rounded-2xl bg-[#FFFFFF] border border-[#E2E8F0] p-5 shadow-xs">
            <p className="text-[11px] font-bold tracking-widest uppercase text-[#6B7280]">Quotation Activity</p>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-3xl font-bold text-[#232B32]">{stats.totalQuotes}</span>
              <span
                className="text-xs font-semibold"
                style={{ color: stats.highVolumeUsers > 0 ? "#B45309" : "#6B7280" }}
              >
                {stats.highVolumeUsers > 0
                  ? `${stats.highVolumeUsers} high-volume`
                  : "Normal volume"}
              </span>
            </div>
          </div>
        </div>

        {/* Filter Toolbar + Account Directory Panel */}
        <div className="rounded-2xl bg-[#FFFFFF] border border-[#E2E8F0] shadow-xs overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-[#E2E8F0] bg-[#F9F9FB] flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* Search */}
            <div className="relative w-full lg:max-w-sm">
              <svg
                className="w-4 h-4 text-[#9CA3AF] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, email, or phone…"
                className="w-full py-2.5 pl-10 pr-4 rounded-xl bg-[#FFFFFF] border border-[#E2E8F0] text-sm text-[#232B32] outline-none focus:border-[#C5A059] transition-colors"
              />
            </div>

            {/* Role & Status Filters */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex rounded-xl p-1 bg-[#FFFFFF] border border-[#E2E8F0]">
                {[
                  { key: "all", label: "All Roles" },
                  { key: "admin", label: "Admins" },
                  { key: "user", label: "Users" },
                ].map((tab) => {
                  const active = roleFilter === tab.key;
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setRoleFilter(tab.key)}
                      className="py-2 px-3.5 rounded-lg text-xs font-semibold tracking-wider uppercase transition-colors cursor-pointer"
                      style={{
                        backgroundColor: active ? "#232B32" : "transparent",
                        color: active ? "#C5A059" : "#6B7280",
                      }}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                aria-label="Filter accounts by status"
                className="py-2.5 px-4 rounded-xl bg-[#FFFFFF] border border-[#E2E8F0] text-xs font-semibold tracking-wider uppercase text-[#232B32] outline-none focus:border-[#C5A059] cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active Only</option>
                <option value="inactive">Deactivated Only</option>
              </select>
            </div>
          </div>

          {/* Content Area */}
          {loadError ? (
            <div className="p-8 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-[#FFF1F2] border border-[#FECDD3] text-[#BE123C] flex items-center justify-center mx-auto">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <p className="text-sm font-medium text-[#232B32] max-w-md mx-auto">{loadError}</p>
              <button
                type="button"
                onClick={() => fetchAccounts(false)}
                className="py-2.5 px-5 rounded-xl bg-[#C5A059] hover:bg-[#b08d47] text-[#FFFFFF] text-xs font-semibold tracking-wider uppercase cursor-pointer"
              >
                Retry
              </button>
            </div>
          ) : isLoading ? (
            <div className="p-10 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-4 border-[#C5A059] border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-medium text-[#6B7280]">Loading accounts from Supabase…</p>
            </div>
          ) : filteredAccounts.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-sm font-semibold text-[#232B32]">No matching accounts found</p>
              <p className="text-xs text-[#6B7280] mt-1">
                Try adjusting your search filter or role tab.
              </p>
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[760px]">
                <thead>
                  <tr className="border-b border-[#E2E8F0] bg-[#FFFFFF]">
                    <th className="py-3.5 px-5 text-[11px] font-bold tracking-widest uppercase text-[#6B7280]">
                      Account
                    </th>
                    <th className="py-3.5 px-4 text-[11px] font-bold tracking-widest uppercase text-[#6B7280]">
                      Role
                    </th>
                    <th className="py-3.5 px-4 text-[11px] font-bold tracking-widest uppercase text-[#6B7280]">
                      Quotations
                    </th>
                    <th className="py-3.5 px-4 text-[11px] font-bold tracking-widest uppercase text-[#6B7280]">
                      Last Sign-In
                    </th>
                    <th className="py-3.5 px-4 text-[11px] font-bold tracking-widest uppercase text-[#6B7280]">
                      Status
                    </th>
                    <th className="py-3.5 px-5 text-right text-[11px] font-bold tracking-widest uppercase text-[#6B7280]">
                      Access Control
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {filteredAccounts.map((acc) => {
                    const isActive = acc.is_active !== false;
                    const isAdminRole = acc.role === "admin";
                    const quoteTotal = Number(acc.quotation_count) || 0;
                    const quotePending = Number(acc.pending_quotation_count) || 0;
                    const isPotentialSpam = !isAdminRole && (quotePending >= 3 || quoteTotal >= 5);
                    const isRowPending = actionLoadingId === acc.id;

                    return (
                      <tr
                        key={acc.id}
                        className="hover:bg-[#F9F9FB] transition-colors"
                      >
                        <td className="py-4 px-5">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-[#232B32] truncate">
                              {acc.full_name || "Unnamed Account"}
                            </p>
                            <p className="text-xs text-[#6B7280] truncate">{acc.email}</p>
                            {acc.phone && (
                              <p className="text-[11px] text-[#9CA3AF] mt-0.5">{acc.phone}</p>
                            )}
                          </div>
                        </td>

                        <td className="py-4 px-4">
                          <span
                            className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase"
                            style={
                              isAdminRole
                                ? {
                                    backgroundColor: "#232B32",
                                    color: "#C5A059",
                                  }
                                : {
                                    backgroundColor: "#F9F9FB",
                                    color: "#232B32",
                                    border: "1px solid #E2E8F0",
                                  }
                            }
                          >
                            {isAdminRole ? "Admin" : "User"}
                          </span>
                        </td>

                        <td className="py-4 px-4">
                          {isAdminRole ? (
                            <span className="text-xs text-[#9CA3AF]">Staff Account</span>
                          ) : (
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-[#232B32]">
                                  {quoteTotal} {quoteTotal === 1 ? "quote" : "quotes"}
                                </span>
                                {isPotentialSpam && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#FFFBEB] text-[#B45309] border border-[#FCD34D]">
                                    High Volume
                                  </span>
                                )}
                              </div>
                              {quotePending > 0 && (
                                <span className="text-[11px] text-[#6B7280]">
                                  {quotePending} pending review
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        <td className="py-4 px-4">
                          <p className="text-xs text-[#232B32]">{formatDate(acc.last_sign_in_at)}</p>
                          <p className="text-[11px] text-[#9CA3AF]">
                            Joined {formatDate(acc.created_at)}
                          </p>
                        </td>

                        <td className="py-4 px-4">
                          <div className="flex flex-col items-start gap-1">
                            <span
                              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold"
                              style={
                                isActive
                                  ? {
                                      backgroundColor: "#ECFDF5",
                                      color: "#047857",
                                      border: "1px solid #A7F3D0",
                                    }
                                  : {
                                      backgroundColor: "#FFF1F2",
                                      color: "#BE123C",
                                      border: "1px solid #FECDD3",
                                    }
                              }
                            >
                              <span
                                className="w-1.5 h-1.5 rounded-full"
                                style={{ backgroundColor: isActive ? "#047857" : "#BE123C" }}
                              />
                              {isActive ? "Active" : "Deactivated"}
                            </span>
                            {!isActive && acc.deactivated_at && (
                              <span className="text-[11px] text-[#9CA3AF]">
                                Since {formatDate(acc.deactivated_at)}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-4 px-5 text-right">
                          <button
                            type="button"
                            disabled={isRowPending}
                            onClick={() => setConfirmTarget(acc)}
                            className="py-2.5 px-4 rounded-xl text-xs font-semibold tracking-wider uppercase transition-all disabled:opacity-50 cursor-pointer"
                            style={
                              isActive
                                ? {
                                    backgroundColor: "#FFF1F2",
                                    color: "#BE123C",
                                    border: "1px solid #FECDD3",
                                  }
                                : {
                                    backgroundColor: "#C5A059",
                                    color: "#FFFFFF",
                                    border: "1px solid #C5A059",
                                  }
                            }
                          >
                            {isRowPending
                              ? "Updating…"
                              : isActive
                              ? "Deactivate"
                              : "Activate"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
