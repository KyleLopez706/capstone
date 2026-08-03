/**
 * securityChecks.js
 *
 * Security utility module for the SIX SIGMAPHIL login flow.
 *
 * Implements two free security layers using Supabase tables:
 *
 *  Layer 1 — New Device Detection
 *    On every sign-in, the current browser's fingerprint is compared
 *    against the user's known `device_sessions` in Supabase. If the
 *    fingerprint is not recognised, verification is required.
 *
 *  Layer 3 — Unusual Timezone Detection
 *    The user's current timezone is logged on every sign-in.
 *    If the last 3+ logins all share one timezone and the current
 *    login comes from a completely different timezone, verification
 *    is required to guard against account takeover from foreign IPs.
 *
 * Both layers trigger an email OTP challenge handled by
 * DeviceVerificationModal.jsx.
 */

import { supabase } from '../supabaseClient';
import { generateDeviceFingerprint, getDeviceLabel } from './deviceFingerprint';

/**
 * Run all security checks for a signed-in user.
 * Call this AFTER supabase.auth.signInWithPassword or a Google OAuth
 * SIGNED_IN event, BEFORE navigating to the target route.
 *
 * @param   {object} user — The Supabase auth user object
 * @returns {object} Security result with shape:
 *   {
 *     needsVerification: boolean,
 *     reason:            'new_device' | 'unusual_timezone' | null,
 *     fingerprint:       string,
 *     deviceLabel:       string,
 *   }
 */
export async function runSecurityChecks(user) {
  const fingerprint = generateDeviceFingerprint();
  const deviceLabel = getDeviceLabel();
  const timezone    = Intl.DateTimeFormat().resolvedOptions().timeZone;

  try {
    // ── 1. Check if device is already trusted ──────────────────────────
    const { data: existingDevice } = await supabase
      .from('device_sessions')
      .select('id')
      .eq('user_id', user.id)
      .eq('device_fingerprint', fingerprint)
      .maybeSingle(); // maybeSingle() returns null instead of error when not found

    const isNewDevice = !existingDevice;

    // ── 2. Check for unusual timezone (Layer 3) ────────────────────────
    //    Only flag if the user has at least 3 previous logins all from
    //    the same timezone and this login differs.
    let isUnusualTimezone = false;

    if (!isNewDevice) {
      // Only run the timezone check for known devices (saves a DB call
      // when the device is new — the new-device check is enough).
      const { data: recentLogins } = await supabase
        .from('login_logs')
        .select('timezone')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (recentLogins && recentLogins.length >= 3) {
        const previousZones = [...new Set(recentLogins.map((l) => l.timezone))];
        // All previous logins from one timezone and current is different
        if (previousZones.length === 1 && previousZones[0] !== timezone) {
          isUnusualTimezone = true;
        }
      }
    }

    // ── 3. Log this login attempt regardless ──────────────────────────
    //    Non-fatal: failure here should never block the user from
    //    completing their sign-in.
    try {
      await supabase.from('login_logs').insert({
        user_id:            user.id,
        device_fingerprint: fingerprint,
        timezone,
        hour_of_day:        new Date().getHours(),
      });
    } catch (logErr) {
      console.warn('[Security] Login log write failed (non-fatal):', logErr);
    }

    const needsVerification = isNewDevice || isUnusualTimezone;
    const reason = isNewDevice
      ? 'new_device'
      : isUnusualTimezone
      ? 'unusual_timezone'
      : null;

    return { needsVerification, reason, fingerprint, deviceLabel };

  } catch (err) {
    // If security checks fail (e.g., network error), fail OPEN so the
    // user is never permanently locked out by a Supabase outage.
    // Log the error for debugging but allow the sign-in to proceed.
    console.error('[Security] Security check failed — failing open:', err);
    return { needsVerification: false, reason: null, fingerprint, deviceLabel };
  }
}

/**
 * Send a 6-digit email OTP to the user for device verification.
 * Uses Supabase's built-in OTP system — completely free on the Free plan.
 *
 * @param {string} email — The user's email address
 */
export async function sendVerificationOTP(email) {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: false, // IMPORTANT: never create a new account
    },
  });
  if (error) throw new Error(error.message);
}

/**
 * Verify the OTP code the user entered in DeviceVerificationModal.
 *
 * @param {string} email — The user's email address
 * @param {string} token — The 6-digit code from their inbox
 */
export async function verifyOTPCode(email, token) {
  const { error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: 'email',
  });
  if (error) throw new Error(error.message);
}

/**
 * Save the current device as trusted for this user.
 * Call this AFTER a successful OTP verification.
 *
 * Uses upsert so repeated calls (e.g., if the user clears their
 * browser data and goes through verification again) simply update
 * the last_seen timestamp rather than inserting a duplicate row.
 *
 * @param {string} userId      — Supabase auth user ID
 * @param {string} fingerprint — Device fingerprint from generateDeviceFingerprint()
 * @param {string} deviceLabel — Human-readable label from getDeviceLabel()
 */
export async function saveDeviceSession(userId, fingerprint, deviceLabel) {
  const { error } = await supabase
    .from('device_sessions')
    .upsert(
      {
        user_id:            userId,
        device_fingerprint: fingerprint,
        device_label:       deviceLabel,
        last_seen:          new Date().toISOString(),
      },
      { onConflict: 'user_id,device_fingerprint' }
    );

  if (error) {
    console.error('[Security] Failed to save device session:', error.message);
    throw error;
  }
}

/**
 * Update the last_seen timestamp for a known trusted device.
 * Call this when a known device successfully signs in (no OTP needed).
 *
 * @param {string} userId      — Supabase auth user ID
 * @param {string} fingerprint — Device fingerprint
 */
export async function refreshDeviceSession(userId, fingerprint) {
  // Non-fatal — if this fails, it just means last_seen won't be updated
  try {
    await supabase
      .from('device_sessions')
      .update({ last_seen: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('device_fingerprint', fingerprint);
  } catch (err) {
    console.warn('[Security] refreshDeviceSession failed (non-fatal):', err);
  }
}
