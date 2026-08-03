/* ─────────────────────────────────────────────────────────────────
   authErrors.js
   Centralized Supabase auth error translator.

   Supabase / GoTrue returns raw, technical error strings that are
   confusing to end users (e.g. long password policy lists, schema
   cache misses, internal codes).  This module maps every known
   error pattern to a short, friendly sentence so that all pages
   (UserLogin, ResetPassword, etc.) show consistent, readable copy.

   Usage:
     import { friendlyAuthError } from '../utils/authErrors';
     setError(friendlyAuthError(err.message));
───────────────────────────────────────────────────────────────── */

const ERROR_MAP = [
  // ── Credentials ──────────────────────────────────────────────
  {
    match: /invalid login credentials/i,
    message: 'Incorrect email or password. Please try again.',
  },
  {
    match: /email not confirmed/i,
    message: 'Please verify your email address before signing in. Check your inbox.',
  },
  {
    match: /user not found/i,
    message: 'No account found with this email address.',
  },

  // ── Password policy (the long GoTrue list) ───────────────────
  {
    match: /password should contain/i,
    message: 'Password must be at least 8 characters and include uppercase, lowercase, a number, and a symbol.',
  },
  {
    match: /password is too (short|weak)/i,
    message: 'Your password is too weak. Please choose a stronger one.',
  },
  {
    match: /password must be/i,
    message: 'Password must be at least 8 characters and include a mix of letters, numbers, and symbols.',
  },
  {
    match: /same password/i,
    message: 'Your new password cannot be the same as your current password.',
  },

  // ── Rate limits ───────────────────────────────────────────────
  {
    match: /rate limit|too many requests|429/i,
    message: 'Too many attempts. Please wait a few minutes and try again.',
  },
  {
    match: /email rate limit/i,
    message: 'Too many emails sent. Please wait a few minutes before trying again.',
  },

  // ── Sign-up ───────────────────────────────────────────────────
  {
    match: /user already registered|already exists/i,
    message: 'An account with this email already exists. Please sign in instead.',
  },

  // ── OAuth ─────────────────────────────────────────────────────
  {
    match: /oauth/i,
    message: 'Google sign-in failed. Please try again.',
  },

  // ── Token / Session ───────────────────────────────────────────
  {
    match: /token (has expired|is invalid|expired)/i,
    message: 'This link has expired. Please request a new one.',
  },
  {
    match: /invalid token/i,
    message: 'This link is invalid. Please request a new password reset.',
  },
  {
    match: /session (not found|expired|missing)/i,
    message: 'Your session has expired. Please sign in again.',
  },

  // ── RPC / Schema (developer-facing errors that slip through) ──
  {
    match: /could not find the function|schema cache/i,
    message: 'A system error occurred. Please try again in a moment.',
  },
  {
    match: /permission denied/i,
    message: 'Access denied. You do not have permission to perform this action.',
  },
  {
    match: /network|failed to fetch|load failed/i,
    message: 'Network error. Please check your connection and try again.',
  },
];

/**
 * Translates a raw Supabase / GoTrue error message into a
 * short, user-friendly sentence.
 *
 * @param {string} rawMessage — the error.message from Supabase
 * @returns {string} — a clean, readable error for the UI
 */
export function friendlyAuthError(rawMessage = '') {
  for (const { match, message } of ERROR_MAP) {
    if (match.test(rawMessage)) return message;
  }
  // Fallback: return the original message if no pattern matched,
  // but strip any internal code prefixes Supabase sometimes adds.
  return rawMessage.replace(/^(AuthApiError|AuthError|Error):\s*/i, '').trim()
    || 'Something went wrong. Please try again.';
}
