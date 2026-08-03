import { useState, useEffect, useRef } from 'react';
import { sendVerificationOTP, verifyOTPCode, saveDeviceSession } from '../utils/securityChecks';

/* ─────────────────────────────────────────
   DEVICE VERIFICATION MODAL
   Shown when a user signs in from:
     - A new unrecognised device/browser
     - A completely different timezone than usual

   Flow:
     1. Modal mounts → OTP is sent automatically to user's email
     2. User enters 6-digit code
     3. On success → device is saved as trusted → onVerified() is called
     4. onVerified() continues the normal role-based routing
─────────────────────────────────────────── */

const OTP_LENGTH   = 6;
const RESEND_DELAY = 60; // seconds before resend is allowed

export default function DeviceVerificationModal({
  user,           // Supabase user object { id, email }
  fingerprint,    // Device fingerprint string
  deviceLabel,    // e.g., "Chrome on Windows"
  reason,         // 'new_device' | 'unusual_timezone'
  onVerified,     // Callback — called after successful verification
  onCancel,       // Callback — called if user cancels (signs them out)
}) {
  const [code,        setCode]        = useState(['', '', '', '', '', '']);
  const [error,       setError]       = useState('');
  const [loading,     setLoading]     = useState(false);
  const [otpSent,     setOtpSent]     = useState(false);
  const [resendTimer, setResendTimer] = useState(RESEND_DELAY);
  const [canResend,   setCanResend]   = useState(false);

  const inputRefs = useRef([]);

  /* ── Send OTP automatically when modal opens ── */
  useEffect(() => {
    sendOTP();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Resend countdown timer ── */
  useEffect(() => {
    if (!otpSent) return;
    const interval = setInterval(() => {
      setResendTimer((t) => {
        if (t <= 1) {
          clearInterval(interval);
          setCanResend(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [otpSent]);

  const sendOTP = async () => {
    try {
      await sendVerificationOTP(user.email);
      setOtpSent(true);
      setResendTimer(RESEND_DELAY);
      setCanResend(false);
      setError('');
    } catch (err) {
      setError('Failed to send verification email. Please try again.');
      console.error('[DeviceVerificationModal] OTP send error:', err);
    }
  };

  /* ── Handle individual digit input ── */
  const handleDigitChange = (index, value) => {
    // Accept only single digits
    const digit = value.replace(/\D/g, '').slice(-1);
    const next  = [...code];
    next[index] = digit;
    setCode(next);
    setError('');

    // Auto-advance to next input
    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  /* ── Handle backspace to go back one input ── */
  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  /* ── Handle paste (user pastes the full 6-digit code) ── */
  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!pasted) return;
    const next = [...code];
    pasted.split('').forEach((char, i) => { next[i] = char; });
    setCode(next);
    // Focus the last filled input
    inputRefs.current[Math.min(pasted.length, OTP_LENGTH - 1)]?.focus();
  };

  /* ── Submit the OTP for verification ── */
  const handleVerify = async (e) => {
    e.preventDefault();
    const token = code.join('');
    if (token.length < OTP_LENGTH) {
      setError('Please enter the full 6-digit code.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Verify OTP with Supabase
      await verifyOTPCode(user.email, token);

      // Save this device as trusted so it won't need verification again
      await saveDeviceSession(user.id, fingerprint, deviceLabel);

      // All done — continue to the app
      onVerified();
    } catch (err) {
      // Common errors: invalid code, expired code
      setError('Invalid or expired code. Please try again.');
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
      console.error('[DeviceVerificationModal] OTP verify error:', err);
    } finally {
      setLoading(false);
    }
  };

  const reasonTitle = reason === 'new_device'
    ? 'New Device Detected'
    : 'Unusual Login Location';

  const reasonDesc = reason === 'new_device'
    ? `We detected a sign-in from a new device: ${deviceLabel}. To protect your account, please verify your identity.`
    : `We detected a sign-in from an unusual location. To protect your account, please verify your identity.`;

  return (
    /* ── Full-screen overlay ── */
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="verify-title"
      style={{
        position:        'fixed',
        inset:           0,
        zIndex:          9999,
        display:         'flex',
        alignItems:      'center',
        justifyContent:  'center',
        padding:         '1rem',
        backgroundColor: 'rgba(0,0,0,0.6)',
        backdropFilter:  'blur(4px)',
      }}
    >
      {/* ── Modal card ── */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius:    '1rem',
          padding:         'clamp(1.5rem, 5vw, 2.5rem)',
          width:           '100%',
          maxWidth:        '420px',
          boxShadow:       '0 25px 50px rgba(0,0,0,0.25)',
          border:          '1px solid #E2E8F0',
        }}
      >
        {/* ── Shield icon ── */}
        <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
          <div
            style={{
              display:         'inline-flex',
              alignItems:      'center',
              justifyContent:  'center',
              width:           '56px',
              height:          '56px',
              borderRadius:    '50%',
              backgroundColor: 'rgba(197,160,89,0.12)',
              marginBottom:    '0.75rem',
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#C5A059" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>

          <h2
            id="verify-title"
            style={{
              fontSize:      '1.125rem',
              fontWeight:    '700',
              color:         '#232B32',
              letterSpacing: '0.02em',
              marginBottom:  '0.5rem',
            }}
          >
            {reasonTitle}
          </h2>

          <p style={{ fontSize: '0.8125rem', color: '#6B7280', lineHeight: 1.6 }}>
            {reasonDesc}
          </p>
        </div>

        {/* ── OTP sent confirmation ── */}
        {otpSent && (
          <div
            style={{
              backgroundColor: 'rgba(197,160,89,0.08)',
              border:          '1px solid rgba(197,160,89,0.25)',
              borderRadius:    '0.5rem',
              padding:         '0.625rem 0.875rem',
              marginBottom:    '1.25rem',
              textAlign:       'center',
            }}
          >
            <p style={{ fontSize: '0.75rem', color: '#C5A059', fontWeight: 600 }}>
              Verification code sent to
            </p>
            <p style={{ fontSize: '0.8125rem', color: '#232B32', fontWeight: 700, marginTop: '2px' }}>
              {user.email}
            </p>
          </div>
        )}

        {/* ── Error alert ── */}
        {error && (
          <div
            style={{
              backgroundColor: 'rgba(239,68,68,0.08)',
              border:          '1px solid rgba(239,68,68,0.25)',
              borderRadius:    '0.5rem',
              padding:         '0.625rem 0.875rem',
              marginBottom:    '1rem',
              textAlign:       'center',
            }}
          >
            <p style={{ fontSize: '0.8125rem', color: '#DC2626' }}>{error}</p>
          </div>
        )}

        {/* ── 6-digit OTP input ── */}
        <form onSubmit={handleVerify}>
          <div
            style={{
              display:        'flex',
              gap:            '0.5rem',
              justifyContent: 'center',
              marginBottom:   '1.25rem',
            }}
          >
            {code.map((digit, i) => (
              <input
                key={i}
                ref={(el) => (inputRefs.current[i] = el)}
                id={`otp-digit-${i}`}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleDigitChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                onPaste={i === 0 ? handlePaste : undefined}
                disabled={loading}
                style={{
                  width:           '44px',
                  height:          '52px',
                  textAlign:       'center',
                  fontSize:        '1.375rem',
                  fontWeight:      '700',
                  color:           '#232B32',
                  backgroundColor: digit ? 'rgba(197,160,89,0.08)' : '#F9F9FB',
                  border:          digit
                    ? '2px solid #C5A059'
                    : '2px solid #E2E8F0',
                  borderRadius:    '0.5rem',
                  outline:         'none',
                  transition:      'all 0.15s ease',
                }}
              />
            ))}
          </div>

          {/* ── Verify button ── */}
          <button
            id="verify-otp-btn"
            type="submit"
            disabled={loading || code.join('').length < OTP_LENGTH}
            style={{
              width:           '100%',
              padding:         '0.75rem',
              borderRadius:    '0.5rem',
              border:          'none',
              backgroundColor: loading || code.join('').length < OTP_LENGTH
                ? 'rgba(197,160,89,0.4)'
                : '#C5A059',
              color:           '#ffffff',
              fontSize:        '0.875rem',
              fontWeight:      '700',
              letterSpacing:   '0.05em',
              cursor:          loading || code.join('').length < OTP_LENGTH
                ? 'not-allowed'
                : 'pointer',
              transition:      'all 0.2s ease',
              marginBottom:    '0.75rem',
            }}
          >
            {loading ? 'Verifying…' : 'Verify Identity'}
          </button>
        </form>

        {/* ── Resend + Cancel ── */}
        <div style={{ textAlign: 'center' }}>
          {canResend ? (
            <button
              onClick={sendOTP}
              style={{
                background:  'none',
                border:      'none',
                color:       '#C5A059',
                fontSize:    '0.8125rem',
                fontWeight:  600,
                cursor:      'pointer',
                marginBottom: '0.5rem',
                display:     'block',
                width:       '100%',
              }}
            >
              Resend Code
            </button>
          ) : (
            <p style={{ fontSize: '0.75rem', color: '#9CA3AF', marginBottom: '0.5rem' }}>
              Resend code in {resendTimer}s
            </p>
          )}

          <button
            onClick={onCancel}
            style={{
              background:  'none',
              border:      'none',
              color:       '#9CA3AF',
              fontSize:    '0.75rem',
              cursor:      'pointer',
              textDecoration: 'underline',
            }}
          >
            Cancel and sign out
          </button>
        </div>
      </div>
    </div>
  );
}
