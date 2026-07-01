/**
 * FormHelpers.jsx
 * Shared React components for the login forms.
 * Non-component constants live in formConstants.js.
 */
import { ICON_PATHS } from "./formConstants";

/* ── Eye-toggle icons ── */
function EyeIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.964-7.178Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
    </svg>
  );
}

/** Icon prefix rendered inside an input wrapper */
export function InputIcon({ icon }) {
  return (
    <span
      className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"
      style={{ color: "#9CA3AF" }}
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d={ICON_PATHS[icon]} />
      </svg>
    </span>
  );
}

/** Show / hide password toggle button */
export function EyeToggle({ show, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="absolute inset-y-0 right-0 pr-4 flex items-center transition-colors duration-150"
      style={{ color: "#9CA3AF" }}
      onMouseEnter={(e) => (e.currentTarget.style.color = "#C5A059")}
      onMouseLeave={(e) => (e.currentTarget.style.color = "#9CA3AF")}
      tabIndex={-1}
    >
      {show ? <EyeOffIcon /> : <EyeIcon />}
    </button>
  );
}

/** Animated loading spinner */
export function Spinner() {
  return (
    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

/** Red error / green success feedback banner */
export function Alert({ type, message }) {
  const styles =
    type === "error"
      ? { backgroundColor: "#FEF2F2", border: "1px solid #FECACA", color: "#DC2626" }
      : { backgroundColor: "#F0FDF4", border: "1px solid #BBF7D0", color: "#16A34A" };
  return (
    <div className="mb-5 px-4 py-3 rounded-lg text-sm text-center" style={styles}>
      {message}
    </div>
  );
}

/** Gold submit button with built-in loading state */
export function SubmitButton({ loading, label, loadingLabel }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="w-full mt-1 font-semibold text-sm tracking-widest uppercase py-3.5 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      style={{ backgroundColor: "#C5A059", color: "#ffffff" }}
      onMouseEnter={(e) => !loading && (e.currentTarget.style.backgroundColor = "#b08d47")}
      onMouseLeave={(e) => !loading && (e.currentTarget.style.backgroundColor = "#C5A059")}
    >
      {loading ? (
        <span className="inline-flex items-center justify-center gap-2">
          <Spinner />
          {loadingLabel}
        </span>
      ) : label}
    </button>
  );
}

/** Back-arrow link for multi-step flows */
export function BackButton({ onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 text-xs mb-5 cursor-pointer transition-colors duration-150"
      style={{ color: "#9CA3AF" }}
      onMouseEnter={(e) => (e.currentTarget.style.color = "#C5A059")}
      onMouseLeave={(e) => (e.currentTarget.style.color = "#9CA3AF")}
    >
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
      </svg>
      {label}
    </button>
  );
}
