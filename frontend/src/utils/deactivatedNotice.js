export const DEFAULT_SUPPORT_EMAIL = "rolkoh@yahoo.com.ph";
export const DEACTIVATED_NOTICE_KEY = "sixsigma_deactivated_notice";
export const DEACTIVATED_EVENT_NAME = "sixsigma:account-deactivated";

/**
 * Triggers the global SIX SIGMAPHIL deactivated-account modal and sets a short-lived
 * sessionStorage fallback in case a route navigation or reload happens right after.
 */
export function triggerDeactivatedPopup(detail = {}) {
  try {
    sessionStorage.setItem(DEACTIVATED_NOTICE_KEY, "1");
    window.dispatchEvent(new CustomEvent(DEACTIVATED_EVENT_NAME, { detail }));
  } catch (err) {
    console.error("[deactivatedNotice] Failed to dispatch notice:", err);
  }
}

export function isDeactivatedAuthError(err) {
  const msg = String(err?.message || err?.error_description || err || "").toLowerCase();
  return msg.includes("banned") || msg.includes("deactivated");
}

export function cleanDeactivatedUrlParams() {
  try {
    const url = new URL(window.location.href);
    let changed = false;

    if (url.searchParams.has("deactivated")) {
      url.searchParams.delete("deactivated");
      changed = true;
    }

    const searchErrDesc = (url.searchParams.get("error_description") || "").toLowerCase();
    const searchErrCode = (url.searchParams.get("error_code") || "").toLowerCase();
    if (
      searchErrDesc.includes("banned") ||
      searchErrDesc.includes("deactivated") ||
      searchErrCode.includes("banned")
    ) {
      url.searchParams.delete("error");
      url.searchParams.delete("error_code");
      url.searchParams.delete("error_description");
      changed = true;
    }

    if (url.hash && url.hash.includes("error")) {
      const hashParams = new URLSearchParams(url.hash.replace(/^#/, ""));
      const hashDesc = (hashParams.get("error_description") || "").toLowerCase();
      if (hashDesc.includes("banned") || hashDesc.includes("deactivated")) {
        url.hash = "";
        changed = true;
      }
    }

    if (changed) {
      const cleanPath = `${url.pathname}${url.search}${url.hash}`;
      window.history.replaceState({}, document.title, cleanPath);
    }
  } catch (err) {
    console.error("[deactivatedNotice] Failed to clean URL params:", err);
  }
}

export function hasDeactivatedUrlSignal() {
  try {
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get("deactivated") === "1") return true;

    const searchDesc = (searchParams.get("error_description") || "").toLowerCase();
    const searchCode = (searchParams.get("error_code") || "").toLowerCase();
    if (searchDesc.includes("banned") || searchDesc.includes("deactivated") || searchCode.includes("banned")) {
      return true;
    }

    if (window.location.hash) {
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const hashDesc = (hashParams.get("error_description") || "").toLowerCase();
      const hashCode = (hashParams.get("error_code") || "").toLowerCase();
      if (hashDesc.includes("banned") || hashDesc.includes("deactivated") || hashCode.includes("banned")) {
        return true;
      }
    }
  } catch {
    // Ignore malformed query/hash strings
  }
  return false;
}
