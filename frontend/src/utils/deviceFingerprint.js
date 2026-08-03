/**
 * deviceFingerprint.js
 *
 * Generates a stable, anonymous fingerprint from browser/device properties.
 * This is NOT a unique user ID — it identifies the browser environment so we
 * can detect when a user logs in from a new device or browser for the first time.
 *
 * No PII (Personally Identifiable Information) is collected. Only public
 * browser properties (screen size, language, timezone offset) are hashed.
 */

/**
 * Produces a short alphanumeric hash string that is stable across page
 * reloads on the same device/browser but differs across devices and browsers.
 *
 * @returns {string} A base-36 hash string (e.g. "1f3k9z2m")
 */
export function generateDeviceFingerprint() {
  const components = [
    navigator.userAgent        || '',
    navigator.language         || '',
    `${screen.width}x${screen.height}`,
    screen.colorDepth          || '',
    new Date().getTimezoneOffset(),
    navigator.hardwareConcurrency || '',
    navigator.platform         || '',
  ].join('|');

  // djb2 hash — fast, collision-resistant enough for fingerprinting
  let hash = 5381;
  for (let i = 0; i < components.length; i++) {
    hash = ((hash << 5) + hash) ^ components.charCodeAt(i);
    hash = hash & hash; // keep as 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Returns a human-readable label for the current device.
 * Used in the DeviceVerificationModal to tell the user which device
 * is being verified (e.g., "Chrome on Windows").
 *
 * @returns {string}
 */
export function getDeviceLabel() {
  const ua = navigator.userAgent;

  let browser = 'Browser';
  if      (ua.includes('Edg'))                             browser = 'Edge';
  else if (ua.includes('Chrome') && !ua.includes('Edg'))  browser = 'Chrome';
  else if (ua.includes('Firefox'))                         browser = 'Firefox';
  else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
  else if (ua.includes('OPR') || ua.includes('Opera'))    browser = 'Opera';

  let os = 'Device';
  if      (ua.includes('iPhone'))  os = 'iPhone';
  else if (ua.includes('iPad'))    os = 'iPad';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac'))     os = 'Mac';
  else if (ua.includes('Linux'))   os = 'Linux';

  return `${browser} on ${os}`;
}
