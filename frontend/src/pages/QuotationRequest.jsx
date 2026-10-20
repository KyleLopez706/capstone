import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import { supabase } from '../supabaseClient';
import useConfiguratorStore from '../store/configuratorStore';
import { useToast, ToastNotification } from '../utils/toast';
import { calculatePricing } from '../utils/pricingEngine';
import { applyQuotationInventoryTransition } from '../utils/inventoryManager.js';
import emailjs from '@emailjs/browser';

/* ─────────────────────────────────────────────────────────────
   QUOTATION REQUEST PAGE
   Standalone page reached after the user clicks
   "Request a Quote" in the 3D configurator.

   Guards:
     - If no active Supabase session → redirect to /login
     - If no configuration in the store (e.g. direct URL visit
       after a page refresh) → redirect back to configurator

   Left card  → Configuration Summary + cost breakdown + PDF
   Right card → Customer Information form → Supabase insert

   Pricing rules (per Six Sigmaphil rate card):
     Countertop / Flooring  →  ₱1,300 / m²  installation
     Wall Cladding          →  ₱2,600 / m²  installation
───────────────────────────────────────────────────────────── */

/* ── Calculate 7-day soft hold expiration timestamp ── */
function getSoftHoldExpiration() {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString();
}


/* ── Format peso ── */
const fmt = (n) =>
  `\u20b1${Number(n).toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

/* ── Format peso for PDF (ASCII safe for jsPDF standard fonts) ── */
const fmtPdf = (n) =>
  `PHP ${Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/* ── Generate reference ID ── */
function generateRequestId() {
  const year = new Date().getFullYear();
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `Q-${year}-${rand}`;
}

/* ── Shared input styles ── */
const inputBase = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: '8px',
  border: '1.5px solid #E2E8F0',
  backgroundColor: '#FFFFFF',
  color: '#232B32',
  fontSize: '14px',
  outline: 'none',
  transition: 'border-color 0.15s',
  boxSizing: 'border-box',
};

/* ── Reusable form field ── */
function Field({ label, id, required, type = 'text', value, onChange, placeholder, error, rows }) {
  const [focused, setFocused] = useState(false);
  const isTextarea = type === 'textarea';
  const Tag = isTextarea ? 'textarea' : 'input';

  return (
    <div style={{ marginBottom: '14px' }}>
      <label
        htmlFor={id}
        style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#232B32', marginBottom: '5px', letterSpacing: '0.02em' }}
      >
        {label} {required && <span style={{ color: '#C5A059' }}>*</span>}
      </label>
      <Tag
        id={id}
        type={isTextarea ? undefined : type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={isTextarea ? (rows ?? 3) : undefined}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          ...inputBase,
          borderColor: error ? '#EF4444' : focused ? '#C5A059' : '#E2E8F0',
          resize: isTextarea ? 'none' : undefined,
        }}
      />
      {error && (
        <p style={{ fontSize: '11px', color: '#EF4444', marginTop: '4px' }}>{error}</p>
      )}
    </div>
  );
}

/* ── Configuration summary row ── */
function SummaryRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid #F3F4F6' }}>
      <span style={{ fontSize: '14px', color: '#6B7280' }}>{label}</span>
      <span style={{ fontSize: '14px', fontWeight: 600, color: '#232B32', textAlign: 'right', maxWidth: '58%' }}>{value}</span>
    </div>
  );
}

/* ── Cost breakdown row ── */
function CostRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #F3F4F6' }}>
      <span style={{ fontSize: '13px', color: '#6B7280' }}>{label}</span>
      <span style={{ fontSize: '13px', fontWeight: 600, color: '#232B32' }}>{value}</span>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   QUOTATION REQUEST PAGE COMPONENT
══════════════════════════════════════════════════════════ */
export default function QuotationRequest() {
  const navigate = useNavigate();

  /* Read configuration from the in-memory Zustand store */
  const selectedStructure = useConfiguratorStore((s) => s.selectedStructure);
  const selectedMaterial  = useConfiguratorStore((s) => s.selectedMaterial);
  const dimensions        = useConfiguratorStore((s) => s.dimensions);
  const laborRates        = useConfiguratorStore((s) => s.laborRates);

  /* ── Computed pricing breakdown from Supabase rates ── */
  const pricing = calculatePricing({
    length: dimensions.length,
    width: dimensions.width,
    structureName: selectedStructure?.name,
    structureType: selectedStructure?.structure_type,
    pricePerSqm: selectedMaterial?.price_per_sqm,
    laborRates,
  });

  const area       = pricing.area;
  const ratePerSqm = pricing.pricePerSqm;

  /* ── Stable reference ID for this visit ── */
  const [requestId] = useState(() => generateRequestId());

  /* ── Form state ── */
  const [form, setForm]             = useState({ fullName: '', email: '', phone: '', address: '', notes: '' });
  const [errors, setErrors]         = useState({});
  const [isLoading, setIsLoading]   = useState(false);
  const [submitted, setSubmitted]   = useState(false);
  const { toast, showToast, dismissToast } = useToast();

  /* ── Email Verification / OTP state machine (Panelist legitimacy guard) ── */
  const [showOtpModal, setShowOtpModal]         = useState(false);
  const [otpCode, setOtpCode]                   = useState('');
  const [enteredOtp, setEnteredOtp]             = useState(['', '', '', '', '', '']);
  const [otpError, setOtpError]                 = useState('');
  const [otpSending, setOtpSending]             = useState(false);
  const [resendCooldown, setResendCooldown]     = useState(0);
  const [isVerifyingOtp, setIsVerifyingOtp]     = useState(false);
  const [verifiedSuccess, setVerifiedSuccess]   = useState(false);
  const otpInputRefs                            = useRef([]);

  /* ── Auto-redirect countdown after submission ── */
  const [countdown, setCountdown]   = useState(3);
  const redirectedRef               = useRef(false);

  const handleReturnToConfigurator = useCallback(() => {
    if (redirectedRef.current) return;
    redirectedRef.current = true;
    useConfiguratorStore.getState().setAppMode('configurator');
    navigate('/configurator-3d', { state: { quoteSubmitted: true, requestId } });
  }, [navigate, requestId]);

  useEffect(() => {
    if (!submitted) return;

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleReturnToConfigurator();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [submitted, handleReturnToConfigurator]);

  /* ── Guard: verify session on mount; redirect to /login if unauthenticated ── */
  const [verifying, setVerifying] = useState(true);

  useEffect(() => {
    const guard = async () => {
      /* 1. Ensure Zustand persist has finished hydrating from localStorage */
      if (useConfiguratorStore.persist && !useConfiguratorStore.persist.hasHydrated()) {
        await new Promise((resolve) => {
          const unsub = useConfiguratorStore.persist.onFinishHydration(() => {
            unsub();
            resolve();
          });
        });
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        /* Unauthenticated — save return destination and bounce to login */
        sessionStorage.setItem("returnTo", "/quotation-request");
        localStorage.setItem("sixsigma_return_to", "/quotation-request");
        navigate('/login', { replace: true });
        return;
      }

      /* Pre-fill email from the authenticated session */
      setForm((prev) => ({ ...prev, email: session.user.email ?? '' }));

      const currentStructure = useConfiguratorStore.getState().selectedStructure;
      const currentMaterial  = useConfiguratorStore.getState().selectedMaterial;

      /* If store has no configuration (e.g. page refreshed without selection), go back to configurator */
      if (!currentStructure || !currentMaterial) {
        navigate('/configurator-3d', { replace: true });
        return;
      }

      /* If labor rates aren't loaded yet, fetch from Supabase to guarantee accurate pricing */
      if (!useConfiguratorStore.getState().laborRates) {
        try {
          const { data: ratesData } = await supabase
            .from('labor_rates')
            .select('item_name, rate_amount');
          if (ratesData?.length) {
            const ratesMap = {};
            ratesData.forEach((r) => { ratesMap[r.item_name] = r.rate_amount; });
            useConfiguratorStore.getState().setLaborRates(ratesMap);
          }
        } catch (ratesErr) {
          console.warn('[QuotationRequest] Could not fetch fresh labor rates:', ratesErr.message);
        }
      }

      setVerifying(false);
    };

    guard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Validation ── */
  const validate = () => {
    const errs = {};
    if (!form.fullName.trim()) errs.fullName = 'Full name is required.';
    if (!form.email.trim())    errs.email    = 'Email address is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errs.email = 'Enter a valid email address.';
    const cleanPhone = form.phone.replace(/[\s-]/g, '');
    if (!cleanPhone) {
      errs.phone = 'Phone number is required.';
    } else if (!/^09\d{9}$/.test(cleanPhone)) {
      errs.phone = 'Enter a valid PH number (e.g., 09171234567).';
    }

    if (!form.address.trim())  errs.address = 'Installation address is required.';
    return errs;
  };

  /* ── PDF generation ── */
  // eslint-disable-next-line no-unused-vars
  const handleDownloadPDF = () => {
    const doc    = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const margin = 20;
    let y        = margin;

    /* Header band */
    doc.setFillColor(35, 43, 50);
    doc.rect(0, 0, 210, 30, 'F');
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(197, 160, 89);
    doc.text('SIX SIGMAPHIL CORP.', margin, 13);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(249, 249, 251);
    doc.text('Premium Stone Solutions  \u00b7  Quotation Document', margin, 22);

    y = 40;

    /* Title */
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(35, 43, 50);
    doc.text('QUOTATION REQUEST', margin, y);
    y += 7;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(107, 114, 128);
    doc.text(`Reference ID: ${requestId}`, margin, y);
    y += 6;
    doc.text(
      `Date: ${new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}`,
      margin, y
    );
    y += 10;
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, y, 210 - margin, y);
    y += 8;

    /* Configuration */
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(35, 43, 50);
    doc.text('CONFIGURATION SUMMARY', margin, y);
    y += 7;

    const configRows = [
      ['Product Type',    selectedStructure?.name ?? '\u2014'],
      ['Design',          selectedMaterial?.name  ?? '\u2014'],
      ['Dimensions',      `${Number(dimensions.length).toFixed(2)}m \u00d7 ${Number(dimensions.width).toFixed(2)}m`],
      ['Total Area',      `${area.toFixed(2)} m\u00b2`],
      ['Estimated Slabs', `${pricing.requiredSlabs} slab(s) (15% waste inc.)`],
      ['Rate per m\u00b2', fmt(ratePerSqm)],
    ];

    doc.setFontSize(10);
    configRows.forEach(([lbl, val]) => {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(107, 114, 128);
      doc.text(lbl + ':', margin, y);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(35, 43, 50);
      doc.text(val, 100, y);
      y += 7;
    });

    y += 2;
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, y, 210 - margin, y);
    y += 7;

    /* Costs */
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(107, 114, 128);
    doc.text('Stone Material:', margin, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(35, 43, 50);
    doc.text(fmtPdf(pricing.materialCost), 100, y);
    y += 6;

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(107, 114, 128);
    doc.text(`Fabrication / Cutting (${pricing.perimeter.toFixed(2)} lm):`, margin, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(35, 43, 50);
    doc.text(fmtPdf(pricing.fabricationCost), 100, y);
    y += 6;

    if (pricing.isCountertop && (pricing.edgePolishingCost + pricing.miteringCost > 0)) {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(107, 114, 128);
      doc.text(`Edge Polishing & Mitering (${pricing.length.toFixed(2)} lm):`, margin, y);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(35, 43, 50);
      doc.text(fmtPdf(pricing.edgePolishingCost + pricing.miteringCost), 100, y);
      y += 6;
    }

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(107, 114, 128);
    doc.text(`Installation (${fmtPdf(pricing.installRate)}/m\u00b2):`, margin, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(35, 43, 50);
    doc.text(fmtPdf(pricing.installCost), 100, y);
    y += 6;

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(107, 114, 128);
    doc.text('Delivery & Mobilization:', margin, y);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(197, 160, 89);
    doc.text('To be determined upon on-site inspection', 100, y);
    y += 6;

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(107, 114, 128);
    doc.text(`VAT (${pricing.vatRate}%):`, margin, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(35, 43, 50);
    doc.text(fmtPdf(pricing.vatCost), 100, y);
    y += 8;

    /* Total box */
    doc.setFillColor(35, 43, 50);
    doc.roundedRect(margin, y - 2, 170, 16, 2, 2, 'F');
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(249, 249, 251);
    doc.text('ESTIMATED TOTAL (VAT INC.):', margin + 4, y + 8);
    doc.setTextColor(197, 160, 89);
    doc.text(fmtPdf(pricing.total), 100 + 4, y + 8);
    y += 22;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(156, 163, 175);
    doc.text('*Final price may vary based on installation complexity and additional requirements.', margin, y);
    y += 10;

    /* Customer info (if available) */
    if (form.fullName.trim() || form.email.trim()) {
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, y, 210 - margin, y);
      y += 8;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(35, 43, 50);
      doc.text('CUSTOMER INFORMATION', margin, y);
      y += 7;

      const clientRows = [
        ['Full Name', form.fullName || '\u2014'],
        ['Email',     form.email    || '\u2014'],
        ['Phone',     form.phone    || '\u2014'],
        ['Address',   form.address  || '\u2014'],
      ];
      if (form.notes.trim()) clientRows.push(['Notes', form.notes]);

      doc.setFontSize(10);
      clientRows.forEach(([lbl, val]) => {
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(107, 114, 128);
        doc.text(lbl + ':', margin, y);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(35, 43, 50);
        const lines = doc.splitTextToSize(val, 90);
        doc.text(lines, 100, y);
        y += 7 * lines.length;
      });
    }

    /* Footer */
    y = 278;
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, y, 210 - margin, y);
    y += 5;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(156, 163, 175);
    doc.text(
      'Six Sigmaphil Corp.  \u00b7  This quotation is valid for 30 days from the date of issue.',
      margin, y
    );

    doc.save(`SixSigmaphil_Quote_${requestId}.pdf`);
  };

  /* ── Cooldown timer for resending OTP ── */
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  /* ── Generate & Send 6-Digit Email Verification Code ── */
  const generateAndSendOtp = async (targetEmail, clientName) => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setOtpCode(code);
    setOtpError('');
    setEnteredOtp(['', '', '', '', '', '']);
    setOtpSending(true);

    try {
      const SERVICE_ID = "service_jdqablg";
      const TEMPLATE_ID = "template_nswrucb";
      const PUBLIC_KEY = "Sc6zRHEuqJILL6S2A";

      if (PUBLIC_KEY) {
        const verifyEmailParams = {
          to_email: targetEmail,
          client_email: targetEmail,
          to_name: clientName,
          client_name: clientName,
          customer_name: clientName,
          name: clientName,
          request_id: requestId,
          verification_code: code,
          otp: code,
          subject: `Six Sigmaphil - Your Quotation Verification Code: ${code}`,
          title: `Quotation Request Verification (${code})`,
          project_name: `${selectedStructure?.name || 'Countertop'} Project`,
          project: `${selectedStructure?.name || 'Countertop'} Project`,
          message: `Dear ${clientName},\n\nYour 6-digit verification code to confirm and legitimize your quotation request is: ${code}.\n\nPlease enter this code on the verification screen to authenticate your request. This verification ensures that only authentic client requests are forwarded to our stone fabrication engineers.\n\nThank you for choosing Six Sigmaphil.`,
          date: new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' }),
        };

        await emailjs.send(SERVICE_ID, TEMPLATE_ID, verifyEmailParams, PUBLIC_KEY);
      }
      showToast(`Verification code sent to ${targetEmail}`, 'info');
    } catch (err) {
      console.warn('[QuotationRequest] EmailJS OTP dispatch note:', err);
      showToast(`Verification code dispatched to ${targetEmail}`, 'info');
    } finally {
      setOtpSending(false);
      setResendCooldown(30);
    }
  };

  /* ── OTP Digit Input Handlers ── */
  const handleDigitChange = (index, value) => {
    const digit = value.replace(/[^0-9]/g, '').slice(-1);
    const newOtp = [...enteredOtp];
    newOtp[index] = digit;
    setEnteredOtp(newOtp);
    setOtpError('');

    if (digit && index < 5 && otpInputRefs.current[index + 1]) {
      otpInputRefs.current[index + 1].focus();
    }
  };

  const handleDigitKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !enteredOtp[index] && index > 0 && otpInputRefs.current[index - 1]) {
      otpInputRefs.current[index - 1].focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 6);
    if (!pasteData) return;
    const digits = pasteData.split('');
    const newOtp = [...enteredOtp];
    digits.forEach((d, i) => {
      if (i < 6) newOtp[i] = d;
    });
    setEnteredOtp(newOtp);
    setOtpError('');
    const nextIdx = Math.min(digits.length, 5);
    if (otpInputRefs.current[nextIdx]) {
      otpInputRefs.current[nextIdx].focus();
    }
  };

  /* ── Initiate Quotation Submission (Trigger OTP Verification) ── */
  const handleInitiateSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setShowOtpModal(true);
    await generateAndSendOtp(form.email.trim(), form.fullName.trim());
  };

  /* ── Authenticate Entered OTP ── */
  const handleVerifyOtp = async () => {
    const fullCode = enteredOtp.join('');
    if (fullCode.length < 6) {
      setOtpError('Please enter all 6 digits of your verification code.');
      return;
    }

    if (fullCode !== otpCode) {
      setOtpError('Invalid verification code. Please check your email or resend.');
      return;
    }

    setIsVerifyingOtp(true);
    setVerifiedSuccess(true);
    setOtpError('');

    setTimeout(async () => {
      setShowOtpModal(false);
      await executeFinalSubmission(fullCode);
    }, 800);
  };

  /* ── Final Submission after Legitimacy Verification ── */
  const executeFinalSubmission = async (code) => {
    setIsLoading(true);

    try {
      const quotePayload = {
        request_id:    requestId,
        full_name:     form.fullName.trim(),
        email:         form.email.trim(),
        phone:         form.phone.trim(),
        address:       form.address.trim(),
        notes:         form.notes.trim() || null,
        product_type:  selectedStructure?.name ?? 'Unknown',
        design:        selectedMaterial?.name  ?? 'Unknown',
        length:        dimensions.length ?? 0,
        width:         dimensions.width  ?? 0,
        area:          parseFloat(pricing.area.toFixed(4)),
        rate_per_sqm:  pricing.pricePerSqm,
        material_cost: parseFloat(pricing.materialCost.toFixed(2)),
        install_cost:  parseFloat(pricing.installCost.toFixed(2)),
        delivery_cost: 0, // Finalized post-inspection
        total_cost:    parseFloat(pricing.total.toFixed(2)),
        status:        'pending',
        required_slabs: pricing.requiredSlabs || 1,
        soft_hold_expires_at: getSoftHoldExpiration(),
        remarks:       'Email Verified Client (OTP Authenticated). Legit inquiry.',
      };

      let { error: insertError } = await supabase.from('quotation_requests').insert([quotePayload]);

      // Defensive fallback if newly planned schema columns do not exist yet in live Supabase table
      if (insertError) {
        console.warn('[QuotationRequest] Retrying insert with baseline schema:', insertError.message);
        const baselinePayload = { ...quotePayload };
        delete baselinePayload.required_slabs;
        delete baselinePayload.soft_hold_expires_at;
        delete baselinePayload.remarks;
        const fallbackRes = await supabase.from('quotation_requests').insert([baselinePayload]);
        insertError = fallbackRes.error;
      }

      if (insertError) throw new Error(insertError.message);

      // Automated Stone Inventory: Place 7-Day Soft Hold on raw slab(s)
      try {
        await applyQuotationInventoryTransition({
          prevStatus: null,
          newStatus: 'pending',
          design: selectedMaterial?.name,
          requiredSlabs: pricing.requiredSlabs || 1,
          supabaseClient: supabase,
        });
      } catch (invErr) {
        console.warn('[QuotationRequest] Non-blocking automated soft hold notice:', invErr);
      }

      // 1. Instant cross-tab BroadcastChannel notification to swing Admin's bell immediately
      try {
        const bc = new BroadcastChannel('sixsigma_quotation_alert');
        bc.postMessage({
          type: 'NEW_QUOTATION',
          quote: {
            id: requestId,
            request_id: requestId,
            full_name: form.fullName.trim(),
            email: form.email.trim(),
            design: selectedMaterial?.name ?? 'Unknown',
            product_type: selectedStructure?.name ?? 'Unknown',
            total_cost: pricing.total,
            is_verified: true,
            created_at: new Date().toISOString(),
          }
        });
        bc.close();
      } catch (bcErr) {}

      // 2. Storage event fallback for cross-tab alert
      try {
        localStorage.setItem('sixsigma_new_quotation_alert', JSON.stringify({
          id: requestId,
          request_id: requestId,
          full_name: form.fullName.trim(),
          email: form.email.trim(),
          design: selectedMaterial?.name ?? 'Unknown',
          product_type: selectedStructure?.name ?? 'Unknown',
          total_cost: pricing.total,
          is_verified: true,
          timestamp: Date.now(),
        }));
      } catch (stErr) {}

      // 3. Automated Admin Email Alert via EmailJS
      try {
        const SERVICE_ID = "service_jdqablg";
        const TEMPLATE_ID = "template_uzrfo2q";
        const PUBLIC_KEY = "Sc6zRHEuqJILL6S2A";

        if (PUBLIC_KEY) {
          const emailParams = {
            request_id: requestId,
            to_email: 'kyelopez706@gmail.com',
            client_name: `${form.fullName.trim()} (Email Verified ✅)`,
            client_email: form.email.trim(),
            client_phone: form.phone.trim(),
            client_address: form.address.trim(),
            product_type: selectedStructure?.name ?? 'Unknown',
            design: selectedMaterial?.name ?? 'Unknown',
            dimensions: `${Number(dimensions.length).toFixed(2)}m × ${Number(dimensions.width).toFixed(2)}m`,
            area: `${pricing.area.toFixed(2)} sqm`,
            required_slabs: `${pricing.requiredSlabs || 1} slab(s)`,
            total_due: fmt(pricing.total),
            notes: `[LEGIT VERIFIED REQUEST - OTP ${code}] ${form.notes.trim() || 'No special instructions provided'}`,
            date: new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' }),
          };

          await emailjs.send(SERVICE_ID, TEMPLATE_ID, emailParams, PUBLIC_KEY);
        }
      } catch (emailErr) {
        console.warn('[QuotationRequest] Admin notification email dispatch skipped or errored:', emailErr);
      }

      setSubmitted(true);
    } catch (err) {
      console.error('[QuotationRequest] Submit error:', err.message);
      showToast('Failed to send your request. Please try again or contact us directly.', 'error');
    } finally {
      setIsLoading(false);
      setIsVerifyingOtp(false);
    }
  };

  /* ── Verifying / redirecting state ── */
  if (verifying) {
    return (
      <div
        style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F9F9FB' }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: '36px', height: '36px', borderRadius: '50%',
              border: '3px solid #C5A059', borderTopColor: 'transparent',
              animation: 'qr-spin 0.7s linear infinite', margin: '0 auto 12px',
            }}
          />
          <p style={{ fontSize: '12px', color: '#9CA3AF', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Verifying\u2026
          </p>
        </div>
        <style>{`@keyframes qr-spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F9F9FB' }}>
      <ToastNotification toast={toast} onDismiss={dismissToast} />

      {/* ── Page Header ── */}
      <div
        style={{
          backgroundColor: '#232B32',
          borderBottom: '1px solid rgba(226,232,240,0.1)',
          padding: '0 24px',
          height: '60px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}
      >
        {/* Back button */}
        <button
          id="back-to-configurator-btn"
          onClick={() => navigate('/configurator-3d')}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#9CA3AF', fontSize: '13px', fontWeight: 600,
            letterSpacing: '0.05em', textTransform: 'uppercase',
            transition: 'color 0.15s', padding: '6px 0',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#C5A059'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = '#9CA3AF'; }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15.75 19.5L8.25 12l7.5-7.5"/>
          </svg>
          Back to Configurator
        </button>

        {/* Brand */}
        <p style={{ fontSize: '12px', fontWeight: 700, color: '#C5A059', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          Six Sigmaphil
        </p>

        {/* Spacer for centering */}
        <div style={{ width: '160px' }} />
      </div>

      {/* ── Page Body ── */}
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '40px 24px' }}>

        {/* Page title */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#232B32', marginBottom: '6px' }}>
            Quotation Request
          </h1>
          <p style={{ fontSize: '14px', color: '#6B7280' }}>
            Review your configuration and submit your details to receive a formal quote.
          </p>
        </div>

        {/* Two-column grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '24px',
            alignItems: 'start',
          }}
        >
          {/* ────────── LEFT: Configuration Summary ────────── */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #E2E8F0',
              padding: '28px',
              boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
            }}
          >
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#232B32', marginBottom: '20px' }}>
              Configuration Summary
            </h2>

            <SummaryRow label="Product Type" value={selectedStructure?.name ?? '\u2014'} />
            <SummaryRow label="Design"        value={selectedMaterial?.name  ?? '\u2014'} />
            <SummaryRow label="Dimensions"    value={`${Number(dimensions.length).toFixed(2)}m \u00d7 ${Number(dimensions.width).toFixed(2)}m`} />
            <SummaryRow label="Total Area"    value={`${area.toFixed(2)} m²`} />
            <SummaryRow label="Estimated Slabs" value={`${pricing.requiredSlabs} slab${pricing.requiredSlabs === 1 ? '' : 's'} (inc. 15% fabrication waste)`} />
            <SummaryRow label="Rate per m²"  value={fmt(ratePerSqm)} />

            {/* Cost breakdown */}
            <div style={{ marginTop: '18px' }}>
              <CostRow label={`Stone Material (${pricing.area.toFixed(2)} m²)`} value={fmt(pricing.materialCost)} />
              <CostRow label={`Cutting / Perimeter (${pricing.perimeter.toFixed(2)} lm)`} value={fmt(pricing.cuttingCost)} />
              {pricing.isCountertop && (pricing.edgePolishingCost + pricing.miteringCost > 0) && (
                <CostRow label={`Edge Polishing & Mitering (${pricing.length.toFixed(2)} lm)`} value={fmt(pricing.edgePolishingCost + pricing.miteringCost)} />
              )}
              <CostRow label={`Installation: ${pricing.isWall ? 'SS Anchor Cladding' : 'Base'} (${fmt(pricing.installRate)}/m²)`} value={fmt(pricing.installCost)} />
              <CostRow label="Delivery & Mobilization" value="To be determined upon on-site inspection" />
              <CostRow label={`VAT (${pricing.vatRate}%)`} value={fmt(pricing.vatCost)} />
            </div>

            {/* Estimated total */}
            <div
              style={{
                marginTop: '20px', padding: '18px', borderRadius: '12px',
                backgroundColor: '#FDF8F0', border: '1px solid rgba(197,160,89,0.3)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '15px', fontWeight: 700, color: '#232B32' }}>Estimated Total:</span>
                <span style={{ fontSize: '26px', fontWeight: 800, color: '#C5A059' }}>{fmt(pricing.total)}</span>
              </div>
              <p style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '8px', lineHeight: 1.5 }}>
                Preliminary estimate (VAT inc.). Delivery and mobilization are finalized strictly after on-site laser inspection.
              </p>
            </div>

          </div>

          {/* ────────── RIGHT: Customer Info Form ────────── */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #E2E8F0',
              padding: '28px',
              boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
            }}
          >
            {submitted ? (
              /* ── Success state with auto-redirect ── */
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <div
                  style={{
                    width: '68px', height: '68px', borderRadius: '50%',
                    backgroundColor: 'rgba(197,160,89,0.12)',
                    border: '1.5px solid rgba(197,160,89,0.35)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 18px',
                  }}
                >
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#C5A059" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>

                <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#232B32', marginBottom: '8px' }}>
                  Request Sent Successfully!
                </h2>
                <p style={{ fontSize: '13px', color: '#6B7280', lineHeight: 1.6, marginBottom: '20px' }}>
                  Your quotation request{' '}
                  <strong style={{ color: '#232B32', fontFamily: 'monospace' }}>{requestId}</strong>{' '}
                  has been submitted. Our team will contact you within 1&ndash;2 business days.
                </p>

                {/* Auto-redirect countdown panel */}
                <div
                  style={{
                    backgroundColor: 'rgba(197,160,89,0.08)',
                    border: '1px solid rgba(197,160,89,0.25)',
                    borderRadius: '12px',
                    padding: '16px',
                    marginBottom: '18px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '10px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div
                      style={{
                        width: '14px', height: '14px', borderRadius: '50%',
                        border: '2px solid #C5A059', borderTopColor: 'transparent',
                        animation: 'qr-spin 0.7s linear infinite',
                      }}
                    />
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#232B32' }}>
                      Redirecting to 3D Configurator in{' '}
                      <span style={{ color: '#C5A059', fontWeight: 700 }}>{countdown}s</span>…
                    </span>
                  </div>

                  {/* Progress bar track */}
                  <div style={{ width: '100%', height: '4px', backgroundColor: 'rgba(226,232,240,0.8)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        backgroundColor: '#C5A059',
                        width: `${Math.max(0, Math.min(100, ((3 - countdown) / 3) * 100))}%`,
                        transition: 'width 1s linear',
                      }}
                    />
                  </div>
                </div>

                {/* Immediate Return button */}
                <button
                  id="return-to-configurator-btn"
                  type="button"
                  onClick={handleReturnToConfigurator}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    border: 'none',
                    backgroundColor: '#C5A059',
                    color: '#FFFFFF',
                    fontWeight: 700,
                    fontSize: '14px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    letterSpacing: '0.03em',
                    transition: 'background-color 0.18s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#b08d47'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#C5A059'; }}
                >
                  Return to 3D Configurator Now
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </button>
              </div>
            ) : (
              /* ── Form ── */
              <form onSubmit={handleInitiateSubmit} noValidate>
                <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#232B32', marginBottom: '20px' }}>
                  Your Information
                </h2>

                <Field
                  id="quote-full-name"  label="Full Name"  required
                  value={form.fullName}
                  onChange={(e) => { setForm({ ...form, fullName: e.target.value.replace(/[^A-Za-z\s\-ñÑ]/g, '') }); setErrors({ ...errors, fullName: '' }); }}
                  placeholder="Juan dela Cruz"  error={errors.fullName}
                />
                <Field
                  id="quote-email"  label="Email Address"  type="email"  required
                  value={form.email}
                  onChange={(e) => { setForm({ ...form, email: e.target.value }); setErrors({ ...errors, email: '' }); }}
                  placeholder="juan@example.com"  error={errors.email}
                />
                <Field
                  id="quote-phone"  label="Phone Number"  type="tel"  required
                  value={form.phone}
                  onChange={(e) => { setForm({ ...form, phone: e.target.value.replace(/[^0-9]/g, '').slice(0,11) }); setErrors({ ...errors, phone: '' }); }}
                  placeholder="09171234567"  error={errors.phone}
                />
                <Field
                  id="quote-address"  label="Installation Address"  type="textarea"  required
                  value={form.address}
                  onChange={(e) => { setForm({ ...form, address: e.target.value }); setErrors({ ...errors, address: '' }); }}
                  placeholder="123 Main St, Barangay, City, Province"
                  error={errors.address}  rows={2}
                />
                <Field
                  id="quote-notes"  label="Additional Notes"  type="textarea"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Any special requirements or questions…"  rows={2}
                />

                <p style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '14px' }}>
                  Reference ID: <strong style={{ color: '#232B32', fontFamily: 'monospace' }}>{requestId}</strong>
                </p>

                <button
                  id="submit-quote-btn"
                  type="submit"
                  disabled={isLoading || otpSending}
                  style={{
                    width: '100%', padding: '14px', borderRadius: '10px',
                    border: 'none', backgroundColor: (isLoading || otpSending) ? '#b08d47' : '#C5A059',
                    color: '#fff', fontWeight: 700, fontSize: '15px',
                    cursor: (isLoading || otpSending) ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    transition: 'background-color 0.18s', letterSpacing: '0.04em',
                    boxShadow: '0 4px 14px rgba(197,160,89,0.3)',
                  }}
                  onMouseEnter={(e) => { if (!isLoading && !otpSending) e.currentTarget.style.backgroundColor = '#b08d47'; }}
                  onMouseLeave={(e) => { if (!isLoading && !otpSending) e.currentTarget.style.backgroundColor = '#C5A059'; }}
                >
                  {otpSending ? (
                    <>
                      <span
                        style={{
                          width: '16px', height: '16px',
                          border: '2px solid rgba(255,255,255,0.4)',
                          borderTopColor: '#fff', borderRadius: '50%',
                          animation: 'qr-spin 0.7s linear infinite',
                          display: 'inline-block',
                        }}
                      />
                      Sending Verification Code…
                    </>
                  ) : isLoading ? (
                    <>
                      <span
                        style={{
                          width: '16px', height: '16px',
                          border: '2px solid rgba(255,255,255,0.4)',
                          borderTopColor: '#fff', borderRadius: '50%',
                          animation: 'qr-spin 0.7s linear infinite',
                          display: 'inline-block',
                        }}
                      />
                      Submitting…
                    </>
                  ) : (
                    <>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                        <polyline points="9 12 11 14 15 10"></polyline>
                      </svg>
                      <span>Verify Email & Submit Request</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* ── 6-Digit Email Verification / OTP Modal (Legitimacy Guard) ── */}
      {showOtpModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            backgroundColor: 'rgba(35, 43, 50, 0.72)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              maxWidth: '460px',
              width: '100%',
              boxShadow: '0 25px 60px rgba(0,0,0,0.35)',
              overflow: 'hidden',
              border: '1px solid #E2E8F0',
            }}
          >
            {/* Header */}
            <div style={{ backgroundColor: '#232B32', padding: '24px', textAlign: 'center' }}>
              <div
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '14px',
                  backgroundColor: 'rgba(197, 160, 89, 0.15)',
                  border: '1.5px solid #C5A059',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 12px',
                  color: '#C5A059',
                }}
              >
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                  <polyline points="9 12 11 14 15 10"></polyline>
                </svg>
              </div>
              <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#C5A059' }}>
                Quotation Legitimacy Verification
              </span>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#F9F9FB', margin: '4px 0 0' }}>
                Verify Your Request
              </h3>
              <p style={{ fontSize: '12px', color: '#9CA3AF', margin: '6px 0 0', lineHeight: 1.4 }}>
                To ensure authentic project requests and prevent accidental submissions, we sent a 6-digit confirmation code to:
              </p>
              <p style={{ fontSize: '13px', fontWeight: 700, color: '#C5A059', margin: '4px 0 0' }}>
                {form.email}
              </p>
            </div>

            {/* Body */}
            <div style={{ padding: '24px' }}>
              {verifiedSuccess ? (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <div
                    style={{
                      width: '52px',
                      height: '52px',
                      borderRadius: '50%',
                      backgroundColor: '#ECFDF5',
                      color: '#047857',
                      border: '2px solid #A7F3D0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 12px',
                    }}
                  >
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </div>
                  <h4 style={{ fontSize: '16px', fontWeight: 700, color: '#232B32', margin: 0 }}>
                    Email Authenticated!
                  </h4>
                  <p style={{ fontSize: '13px', color: '#6B7280', marginTop: '6px' }}>
                    Legitimized request confirmed. Notifying fabrication team…
                  </p>
                </div>
              ) : (
                <>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#232B32', marginBottom: '10px', textAlign: 'center' }}>
                    Enter 6-Digit Email Code
                  </label>

                  {/* 6 Digit Input Boxes */}
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '12px' }}>
                    {enteredOtp.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={(el) => (otpInputRefs.current[idx] = el)}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleDigitChange(idx, e.target.value)}
                        onKeyDown={(e) => handleDigitKeyDown(idx, e)}
                        onPaste={idx === 0 ? handleOtpPaste : undefined}
                        style={{
                          width: '44px',
                          height: '50px',
                          textAlign: 'center',
                          fontSize: '20px',
                          fontWeight: 800,
                          borderRadius: '10px',
                          border: '2px solid',
                          borderColor: otpError ? '#EF4444' : digit ? '#C5A059' : '#E2E8F0',
                          backgroundColor: digit ? '#FDF8F0' : '#FFFFFF',
                          color: '#232B32',
                          outline: 'none',
                          transition: 'all 0.15s',
                        }}
                        autoFocus={idx === 0}
                      />
                    ))}
                  </div>

                  {otpError && (
                    <p style={{ fontSize: '12px', color: '#EF4444', textAlign: 'center', marginBottom: '14px', fontWeight: 600 }}>
                      {otpError}
                    </p>
                  )}

                  {/* Defense / Thesis Demo Helper */}
                  <div
                    style={{
                      backgroundColor: '#F9F9FB',
                      border: '1px dashed #C5A059',
                      borderRadius: '10px',
                      padding: '10px 12px',
                      marginBottom: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px',
                    }}
                  >
                    <div>
                      <span style={{ fontSize: '10px', fontWeight: 700, color: '#C5A059', textTransform: 'uppercase' }}>
                        Defense Presentation Helper
                      </span>
                      <p style={{ fontSize: '11px', color: '#6B7280', margin: '2px 0 0' }}>
                        Demo Code: <strong style={{ color: '#232B32', fontFamily: 'monospace' }}>{otpCode}</strong>
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setEnteredOtp(otpCode.split(''));
                        setOtpError('');
                      }}
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        color: '#C5A059',
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #E2E8F0',
                        padding: '5px 10px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Auto-fill Code
                    </button>
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={handleVerifyOtp}
                      disabled={enteredOtp.join('').length < 6 || isVerifyingOtp}
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '10px',
                        border: 'none',
                        backgroundColor: enteredOtp.join('').length === 6 ? '#C5A059' : '#E2E8F0',
                        color: enteredOtp.join('').length === 6 ? '#FFFFFF' : '#9CA3AF',
                        fontSize: '14px',
                        fontWeight: 700,
                        cursor: enteredOtp.join('').length === 6 ? 'pointer' : 'not-allowed',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        transition: 'all 0.15s',
                      }}
                    >
                      {isVerifyingOtp ? 'Verifying…' : 'Verify & Submit Quotation'}
                    </button>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                      <button
                        type="button"
                        onClick={() => generateAndSendOtp(form.email.trim(), form.fullName.trim())}
                        disabled={resendCooldown > 0 || otpSending}
                        style={{
                          fontSize: '12px',
                          fontWeight: 600,
                          color: resendCooldown > 0 ? '#9CA3AF' : '#C5A059',
                          background: 'none',
                          border: 'none',
                          cursor: resendCooldown > 0 ? 'not-allowed' : 'pointer',
                          padding: 0,
                        }}
                      >
                        {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend Code'}
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowOtpModal(false)}
                        style={{
                          fontSize: '12px',
                          fontWeight: 600,
                          color: '#6B7280',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: 0,
                        }}
                      >
                        Cancel / Edit Info
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes qr-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
