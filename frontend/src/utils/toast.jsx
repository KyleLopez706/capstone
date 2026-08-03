import { useState, useCallback } from "react";

/* ─────────────────────────────────────────
   SHARED TOAST NOTIFICATION SYSTEM
   Six Sigmaphil Design System

   Usage:
     const { toast, showToast } = useToast();
     showToast('Saved!', 'success');
     showToast('Something failed.', 'error');
     showToast('Please wait...', 'info');

   Then render <ToastNotification toast={toast} onDismiss={...} />
   anywhere in your JSX.
───────────────────────────────────────── */

export function useToast() {
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const dismissToast = useCallback(() => setToast(null), []);

  return { toast, showToast, dismissToast };
}

const TOAST_CONFIG = {
  success: {
    bg: '#232B32',
    border: 'rgba(197,160,89,0.4)',
    iconBg: 'rgba(197,160,89,0.15)',
    iconColor: '#C5A059',
    titleColor: '#F9F9FB',
    msgColor: '#9CA3AF',
    dismissColor: '#6B7280',
    title: 'Success',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C5A059" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    ),
  },
  error: {
    bg: '#FEF2F2',
    border: '#FECACA',
    iconBg: '#FEE2E2',
    iconColor: '#EF4444',
    titleColor: '#DC2626',
    msgColor: '#EF4444',
    dismissColor: '#EF4444',
    title: 'Error',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    ),
  },
  info: {
    bg: '#EFF6FF',
    border: '#BFDBFE',
    iconBg: '#DBEAFE',
    iconColor: '#1D4ED8',
    titleColor: '#1E40AF',
    msgColor: '#3B82F6',
    dismissColor: '#3B82F6',
    title: 'Info',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1D4ED8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
    ),
  },
};

export function ToastNotification({ toast, onDismiss }) {
  if (!toast) return null;
  const cfg = TOAST_CONFIG[toast.type] ?? TOAST_CONFIG.info;

  return (
    <>
      <style>{`
        @keyframes toast-in {
          from { opacity: 0; transform: translateY(24px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0)    scale(1);    }
        }
      `}</style>
      <div
        style={{
          position: 'fixed', bottom: '32px', right: '32px', zIndex: 99999,
          display: 'flex', alignItems: 'flex-start', gap: '12px',
          padding: '16px 20px', borderRadius: '14px',
          backgroundColor: cfg.bg,
          border: `1px solid ${cfg.border}`,
          boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
          minWidth: '300px', maxWidth: '420px',
          animation: 'toast-in 0.35s cubic-bezier(0.34,1.56,0.64,1) forwards',
        }}
        role="alert"
        aria-live="assertive"
      >
        {/* Icon */}
        <div style={{
          width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
          backgroundColor: cfg.iconBg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginTop: '1px',
        }}>
          {cfg.icon}
        </div>

        {/* Text */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: '13px', fontWeight: 700, color: cfg.titleColor, margin: 0 }}>
            {cfg.title}
          </p>
          <p style={{ fontSize: '12px', color: cfg.msgColor, margin: '3px 0 0', lineHeight: 1.5, wordBreak: 'break-word' }}>
            {toast.message}
          </p>
        </div>

        {/* Dismiss */}
        <button
          onClick={onDismiss}
          aria-label="Dismiss notification"
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: cfg.dismissColor, fontSize: '20px', lineHeight: 1,
            padding: '0 2px', flexShrink: 0,
          }}
        >
          &times;
        </button>
      </div>
    </>
  );
}
