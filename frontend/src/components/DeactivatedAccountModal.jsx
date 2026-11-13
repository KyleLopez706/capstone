import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import {
  DEFAULT_SUPPORT_EMAIL,
  DEACTIVATED_NOTICE_KEY,
  DEACTIVATED_EVENT_NAME,
  cleanDeactivatedUrlParams,
  hasDeactivatedUrlSignal,
} from "../utils/deactivatedNotice";

export default function DeactivatedAccountModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [supportEmail, setSupportEmail] = useState(DEFAULT_SUPPORT_EMAIL);
  const [loadingEmail, setLoadingEmail] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const openAndConsume = () => {
      sessionStorage.removeItem(DEACTIVATED_NOTICE_KEY);
      cleanDeactivatedUrlParams();
      setIsOpen(true);
    };

    const hadNotice = sessionStorage.getItem(DEACTIVATED_NOTICE_KEY) === "1";
    if (hadNotice || hasDeactivatedUrlSignal()) {
      openAndConsume();
    }

    const handleEvent = () => {
      openAndConsume();
    };

    window.addEventListener(DEACTIVATED_EVENT_NAME, handleEvent);
    return () => window.removeEventListener(DEACTIVATED_EVENT_NAME, handleEvent);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    const fetchOfficialEmail = async () => {
      setLoadingEmail(true);
      try {
        const { data: settingsRow } = await supabase
          .from("app_settings")
          .select("value")
          .eq("key", "contact_info")
          .maybeSingle();

        if (!cancelled && settingsRow?.value) {
          const parsed =
            typeof settingsRow.value === "string"
              ? JSON.parse(settingsRow.value)
              : settingsRow.value;
          if (parsed?.email) {
            setSupportEmail(parsed.email);
            return;
          }
        }

        const { data: fallbackRow } = await supabase
          .from("labor_rates")
          .select("unit_type")
          .eq("item_name", "contact_info")
          .maybeSingle();

        if (!cancelled && fallbackRow?.unit_type) {
          const parsed = JSON.parse(fallbackRow.unit_type);
          if (parsed?.email) {
            setSupportEmail(parsed.email);
          }
        }
      } catch (err) {
        console.error("[DeactivatedAccountModal] Failed to load contact email:", err);
      } finally {
        if (!cancelled) setLoadingEmail(false);
      }
    };

    fetchOfficialEmail();
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(supportEmail);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("[DeactivatedAccountModal] Clipboard copy failed:", err);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[1200] flex items-center justify-center p-4 sm:p-6 bg-[#232B32]/75 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="deactivated-account-title"
      onClick={() => setIsOpen(false)}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-[#FFFFFF] border border-[#E2E8F0] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Accent Strip */}
        <div className="bg-[#232B32] px-6 py-4 flex items-center justify-between border-b border-[#C5A059]/30">
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-[#C5A059]" />
            <span className="text-[11px] font-bold tracking-[0.2em] uppercase text-[#C5A059]">
              SIX SIGMAPHIL
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            aria-label="Close modal"
            className="text-[#9CA3AF] hover:text-[#FFFFFF] transition-colors cursor-pointer p-1 rounded-lg"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 sm:p-7 space-y-5">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-[#FFF1F2] border border-[#FECDD3] flex items-center justify-center shrink-0 text-[#BE123C]">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636"
                />
              </svg>
            </div>
            <div>
              <h2 id="deactivated-account-title" className="text-lg font-bold text-[#232B32]">
                Account Deactivated
              </h2>
              <p className="mt-1.5 text-sm text-[#4B5563] leading-relaxed">
                Your account was deactivated by the Super Admin. To request reactivation or clarify your account status, please contact the official Six Sigmaphil email address below.
              </p>
            </div>
          </div>

          {/* Official Contact Email Box */}
          <div className="rounded-xl bg-[#F9F9FB] border border-[#E2E8F0] p-4 space-y-2.5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">
              Six Sigmaphil Official Email
            </p>
            <div className="flex flex-wrap items-center justify-between gap-2">
              {loadingEmail ? (
                <span className="text-sm text-[#6B7280]">Loading contact email...</span>
              ) : (
                <a
                  href={`mailto:${supportEmail}`}
                  className="text-sm font-semibold text-[#232B32] hover:text-[#C5A059] underline underline-offset-4 break-all transition-colors"
                >
                  {supportEmail}
                </a>
              )}
              <button
                type="button"
                onClick={handleCopyEmail}
                disabled={loadingEmail}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#FFFFFF] border border-[#E2E8F0] text-[#232B32] hover:border-[#C5A059] hover:text-[#C5A059] transition-colors cursor-pointer disabled:opacity-50"
              >
                {copied ? "Copied" : "Copy Email"}
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="py-2.5 px-4 rounded-xl text-xs font-semibold uppercase tracking-wider border border-[#E2E8F0] text-[#232B32] bg-[#FFFFFF] hover:bg-[#F9F9FB] transition-colors cursor-pointer"
            >
              Close
            </button>
            <a
              href={`mailto:${supportEmail}?subject=${encodeURIComponent("Account Reactivation Request - SIX SIGMAPHIL")}`}
              className="py-2.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider text-center bg-[#C5A059] hover:bg-[#b08d47] text-[#232B32] transition-colors"
            >
              Email Six Sigmaphil
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
