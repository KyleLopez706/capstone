import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import { supabase } from '../supabaseClient';
import useConfiguratorStore from '../store/configuratorStore';
import { useToast, ToastNotification } from '../utils/toast';

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

/* ── Installation rate helper ── */
function getInstallRate(structureName) {
  const name = (structureName ?? '').toLowerCase();
  if (name.includes('wall') || name.includes('cladding')) return 2600;
  return 1300;
}

/* ── Format peso ── */
const fmt = (n) =>
  `\u20b1${Number(n).toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

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

  /* ── Computed values ── */
  const area         = (dimensions.length ?? 0) * (dimensions.width ?? 0);
  const ratePerSqm   = selectedMaterial?.price_per_sqm ?? 0;
  const materialCost = area * ratePerSqm;
  const installRate  = getInstallRate(selectedStructure?.name);
  const installCost  = area * installRate;
  const totalCost    = materialCost + installCost;

  /* ── Stable reference ID for this visit ── */
  const [requestId] = useState(() => generateRequestId());

  /* ── Form state ── */
  const [form, setForm]             = useState({ fullName: '', email: '', phone: '', address: '', notes: '' });
  const [errors, setErrors]         = useState({});
  const [isLoading, setIsLoading]   = useState(false);
  const [submitted, setSubmitted]   = useState(false);
  const { toast, showToast, dismissToast } = useToast();

  /* ── Guard: verify session on mount; redirect to /login if unauthenticated ── */
  const [verifying, setVerifying] = useState(true);

  useEffect(() => {
    const guard = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        /* Unauthenticated — bounce to login */
        navigate('/login', { replace: true });
        return;
      }

      /* Pre-fill email from the authenticated session */
      setForm((prev) => ({ ...prev, email: session.user.email ?? '' }));

      /* If store has no configuration (e.g. page refreshed), go back to configurator */
      if (!selectedStructure || !selectedMaterial) {
        navigate('/configurator-3d', { replace: true });
        return;
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
    } else if (!/^(?:\+63|0)9\d{9}$/.test(cleanPhone)) {
      errs.phone = 'Enter a valid PH number (e.g., +639171234567 or 09171234567).';
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
      ['Product Type', selectedStructure?.name ?? '\u2014'],
      ['Design',       selectedMaterial?.name  ?? '\u2014'],
      ['Dimensions',   `${Number(dimensions.length).toFixed(2)}m \u00d7 ${Number(dimensions.width).toFixed(2)}m`],
      ['Total Area',   `${area.toFixed(2)} m\u00b2`],
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
    doc.text('Material Cost:', margin, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(35, 43, 50);
    doc.text(fmt(materialCost), 100, y);
    y += 7;

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(107, 114, 128);
    doc.text(`Installation Cost (${fmt(installRate)}/m\u00b2):`, margin, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(35, 43, 50);
    doc.text(fmt(installCost), 100, y);
    y += 10;

    /* Total box */
    doc.setFillColor(35, 43, 50);
    doc.roundedRect(margin, y - 2, 170, 16, 2, 2, 'F');
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(249, 249, 251);
    doc.text('ESTIMATED TOTAL:', margin + 4, y + 8);
    doc.setTextColor(197, 160, 89);
    doc.text(fmt(totalCost), 100 + 4, y + 8);
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

  /* ── Submit to Supabase ── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setIsLoading(true);

    try {
      const { error } = await supabase.from('quotation_requests').insert([{
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
        area:          parseFloat(area.toFixed(4)),
        rate_per_sqm:  ratePerSqm,
        material_cost: parseFloat(materialCost.toFixed(2)),
        install_cost:  parseFloat(installCost.toFixed(2)),
        total_cost:    parseFloat(totalCost.toFixed(2)),
        status:        'pending',
      }]);

      if (error) throw new Error(error.message);
      setSubmitted(true);
    } catch (err) {
      console.error('[QuotationRequest] Submit error:', err.message);
      showToast('Failed to send your request. Please try again or contact us directly.', 'error');
    } finally {
      setIsLoading(false);
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
            <SummaryRow label="Rate per m²"  value={fmt(ratePerSqm)} />

            {/* Cost breakdown */}
            <div style={{ marginTop: '18px' }}>
              <CostRow label="Material Cost"                               value={fmt(materialCost)} />
              <CostRow label={`Installation Cost (${fmt(installRate)}/m\u00b2)`} value={fmt(installCost)} />
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
                <span style={{ fontSize: '26px', fontWeight: 800, color: '#C5A059' }}>{fmt(totalCost)}</span>
              </div>
              <p style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '8px', lineHeight: 1.5 }}>
                *Final price may vary based on installation complexity and additional requirements.
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
              /* ── Success state ── */
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div
                  style={{
                    width: '72px', height: '72px', borderRadius: '50%',
                    backgroundColor: 'rgba(197,160,89,0.12)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 20px',
                  }}
                >
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#C5A059" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                </div>

                <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#232B32', marginBottom: '10px' }}>
                  Request Sent Successfully!
                </h2>
                <p style={{ fontSize: '14px', color: '#6B7280', lineHeight: 1.6, marginBottom: '8px' }}>
                  Your quotation request{' '}
                  <strong style={{ color: '#232B32' }}>{requestId}</strong>{' '}
                  has been submitted. Our team will contact you within 1&ndash;2 business days.
                </p>

                {/* PDF generation temporarily removed as requested */}
              </div>
            ) : (
              /* ── Form ── */
              <form onSubmit={handleSubmit} noValidate>
                <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#232B32', marginBottom: '20px' }}>
                  Your Information
                </h2>

                <Field
                  id="quote-full-name"  label="Full Name"  required
                  value={form.fullName}
                  onChange={(e) => { setForm({ ...form, fullName: e.target.value }); setErrors({ ...errors, fullName: '' }); }}
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
                  onChange={(e) => { setForm({ ...form, phone: e.target.value }); setErrors({ ...errors, phone: '' }); }}
                  placeholder="+63 917 123 4567"  error={errors.phone}
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
                  disabled={isLoading}
                  style={{
                    width: '100%', padding: '14px', borderRadius: '10px',
                    border: 'none', backgroundColor: isLoading ? '#b08d47' : '#C5A059',
                    color: '#fff', fontWeight: 700, fontSize: '15px',
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    transition: 'background-color 0.18s', letterSpacing: '0.04em',
                  }}
                  onMouseEnter={(e) => { if (!isLoading) e.currentTarget.style.backgroundColor = '#b08d47'; }}
                  onMouseLeave={(e) => { if (!isLoading) e.currentTarget.style.backgroundColor = '#C5A059'; }}
                >
                  {isLoading ? (
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
                      Sending\u2026
                    </>
                  ) : 'Submit Request'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      <style>{`@keyframes qr-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
