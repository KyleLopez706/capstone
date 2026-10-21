import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { useToast, ToastNotification } from "../utils/toast";
import { applyQuotationInventoryTransition, formatInventoryAuditEntry, checkStockSupplementFeasibility } from "../utils/inventoryManager.js";
import emailjs from "@emailjs/browser";


/* ─────────────────────────────────────────
   DASHBOARD PAGE — Admin Only

   On mount: verifies session and admin role.
   Fetches all quotation_requests from Supabase.

   Features:
   ─ Stat cards  (Total / Pending / Approved / In-Review)
   ─ Search by name or request ID
   ─ Filter by status
   ─ Status update dropdown per row
   ─ View detail modal
───────────────────────────────────────── */

/* ── Full Stone Fabrication Project Lifecycle Statuses ── */
const PROJECT_STATUSES = [
  { value: 'pending', label: 'Pending Inspection', color: '#B45309', bg: '#FFFBEB', border: '#FCD34D' },
  { value: 'inspection_scheduled', label: 'Inspection Scheduled', color: '#0369A1', bg: '#F0F9FF', border: '#BAE6FD' },
  { value: 'inspection_completed', label: 'Inspection Completed', color: '#4338CA', bg: '#EEF2FF', border: '#C7D2FE' },
  { value: 'approved', label: 'Final Quotation Sent', color: '#047857', bg: '#ECFDF5', border: '#A7F3D0' },
  { value: 'downpayment_received', label: 'Downpayment Received', color: '#B38D4A', bg: '#FDF8F0', border: '#E9D5A1' },
  { value: 'in_fabrication', label: 'In Fabrication', color: '#0284C7', bg: '#F0F9FF', border: '#BAE6FD' },
  { value: 'installation_wip', label: 'Installation (WIP)', color: '#6D28D9', bg: '#F5F3FF', border: '#DDD6FE' },
  { value: 'completed', label: 'Project Completed', color: '#065F46', bg: '#D1FAE5', border: '#6EE7B7' },
  { value: 'cancelled', label: 'Cancelled', color: '#BE123C', bg: '#FFF1F2', border: '#FECDD3' },
];

const STATUS_STYLES = PROJECT_STATUSES.reduce((acc, curr) => {
  acc[curr.value] = { bg: curr.bg, color: curr.color, border: curr.border, label: curr.label };
  return acc;
}, {
  'in-review': { bg: '#F0F9FF', color: '#0369A1', border: '#BAE6FD', label: 'Inspection Scheduled' },
});


function StatusBadge({ status }) {
  const s = STATUS_STYLES[status] ?? {
    bg: '#F3F4F6',
    color: '#6B7280',
    border: '#D1D5DB',
    label: (status || '').replace(/_/g, ' '),
  };
  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '5px',
        padding: '3px 10px', borderRadius: '999px', fontSize: '11px',
        fontWeight: 600, letterSpacing: '0.03em', whiteSpace: 'nowrap',
        backgroundColor: s.bg, color: s.color, border: `1px solid ${s.border}`,
      }}
    >
      <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: s.color, display: 'inline-block' }} />
      {s.label || status}
    </span>
  );
}

/* ── Stat card ── */
function StatCard({ label, value, accent, isLoading }) {
  return (
    <div
      style={{
        backgroundColor: '#ffffff', borderRadius: '14px',
        border: `1px solid ${accent ?? '#E2E8F0'}`,
        padding: '20px 24px', minWidth: '0',
        boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
      }}
    >
      <p style={{ fontSize: '12px', color: '#6B7280', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '8px' }}>
        {label}
      </p>
      {isLoading ? (
        <div style={{ height: '32px', width: '48px', borderRadius: '6px', backgroundColor: '#E2E8F0', animation: 'db-pulse 1.5s ease-in-out infinite' }} />
      ) : (
        <p style={{ fontSize: '32px', fontWeight: 700, color: accent ?? '#232B32', lineHeight: 1 }}>
          {value}
        </p>
      )}
    </div>
  );
}

/* ── Modal Row component ── */
const Row = ({ label, value }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #F3F4F6' }}>
    <span style={{ fontSize: '13px', color: '#6B7280' }}>{label}</span>
    <span style={{ fontSize: '13px', fontWeight: 600, color: '#232B32', textAlign: 'right', maxWidth: '60%' }}>{value ?? '\u2014'}</span>
  </div>
);

/* ── Automated Inventory Lifecycle Transition ── */
async function handleQuotationStatusInventoryTransition(prevStatus, newStatus, request, supabaseClient) {
  try {
    const rawSlabs = Math.max(1, Number(request.required_slabs) || Math.ceil((Number(request.area || 0) * 1.15) / 4.35));
    if (!request.design) return { success: false, reason: 'No material design specified' };

    return await applyQuotationInventoryTransition({
      prevStatus,
      newStatus,
      design: request.design,
      requiredSlabs: rawSlabs,
      supabaseClient,
    });
  } catch (err) {
    console.error('[Dashboard] Error during automated inventory transition:', err);
    return { success: false, error: err };
  }
}

/* ── Detail Modal ── */
function DetailModal({ request, onClose, onStatusChange, onRemarkAdded, onOpenFollowUp, showToast, materials = [] }) {
  const [status, setStatus] = useState(request.status);
  const [saving, setSaving] = useState(false);
  const [remarksHistory, setRemarksHistory] = useState(() => {
    if (Array.isArray(request.remarks_history)) return request.remarks_history;
    if (typeof request.remarks_history === 'string') {
      try { return JSON.parse(request.remarks_history); } catch { return []; }
    }
    return request.remarks ? [{ text: request.remarks, timestamp: request.created_at, author: 'System' }] : [];
  });
  const [newRemarkText, setNewRemarkText] = useState('');
  const [addingRemark, setAddingRemark] = useState(false);
  const navigate = useNavigate();

  const fmt = (n) => `₱${Number(n).toLocaleString('en-PH', { minimumFractionDigits: 0 })}`;
  const requiredSlabs = request.required_slabs || Math.max(1, Math.ceil((Number(request.area || 0) * 1.15) / 4.35));

  /* Maps custom project statuses to baseline statuses accepted by legacy DB check constraints */
  const getSafeDbStatus = (st) => {
    if (st === 'pending') return 'pending';
    if (st === 'approved' || st === 'completed') return 'approved';
    return 'in-review';
  };

  const handleStatusSave = async (newStatus) => {
    setSaving(true);
    try {
      let updatedHistory = [...remarksHistory];

      // Automated Inventory Lifecycle Transition (Soft holds, Downpayment allocation, Completion deduction, Cancellation restore)
      if (newStatus !== status) {
        const invRes = await handleQuotationStatusInventoryTransition(status, newStatus, request, supabase);
        if (invRes?.success && !invRes.unchanged) {
          const auditEntry = formatInventoryAuditEntry(invRes, newStatus);
          if (auditEntry) {
            updatedHistory = [auditEntry, ...updatedHistory];
            setRemarksHistory(updatedHistory);
          }
          if (newStatus === 'downpayment_received') {
            if (showToast) showToast(`Downpayment recorded! Automatically deducted ${invRes.slabs} slab(s) of ${invRes.materialName} from warehouse stock.`, 'success');
          } else if (newStatus === 'cancelled') {
            if (showToast) showToast(`Quotation cancelled. Restored ${invRes.slabs} slab(s) of ${invRes.materialName} to warehouse stock.`, 'info');
          } else if (newStatus === 'completed') {
            if (showToast) showToast(`Project completed! ${invRes.slabs} slab(s) of ${invRes.materialName} fulfilled.`, 'success');
          }
        }
      }

      // Step 1: Attempt update with newStatus and remarks_history
      let { error } = await supabase
        .from('quotation_requests')
        .update({
          status: newStatus,
          remarks_history: updatedHistory,
        })
        .eq('id', request.id);

      // Step 2: Retry with status only if remarks_history column is unmigrated
      if (error && (error.message?.includes('remarks_history') || error.code === '42703')) {
        const retryRes = await supabase
          .from('quotation_requests')
          .update({ status: newStatus })
          .eq('id', request.id);
        error = retryRes.error;
      }

      // Step 3: If database has legacy check constraint on status column, fallback to safe legacy status
      if (error && (error.message?.includes('check constraint') || error.code === '23514')) {
        const safeStatus = getSafeDbStatus(newStatus);
        const constraintRes = await supabase
          .from('quotation_requests')
          .update({ status: safeStatus })
          .eq('id', request.id);
        error = constraintRes.error;
      }

      if (error) throw error;
      setStatus(newStatus);
      onStatusChange(request.id, newStatus, updatedHistory);
      if (showToast) showToast(`Status updated to ${STATUS_STYLES[newStatus]?.label || newStatus}`, 'success');
    } catch (err) {
      console.error('[Dashboard] Status update error:', err.message);
      if (showToast) showToast('Failed to update status: ' + (err.message || 'database error'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAddRemarkSubmit = async (e) => {
    e.preventDefault();
    if (!newRemarkText.trim()) return;

    setAddingRemark(true);
    const entry = {
      text: newRemarkText.trim(),
      timestamp: new Date().toISOString(),
      author: 'Admin',
    };
    const updatedHistory = [entry, ...remarksHistory];

    try {
      let { error } = await supabase
        .from('quotation_requests')
        .update({
          remarks: newRemarkText.trim(),
          remarks_history: updatedHistory,
        })
        .eq('id', request.id);

      if (error) {
        // Fallback if remarks_history column is not present
        await supabase
          .from('quotation_requests')
          .update({ remarks: newRemarkText.trim() })
          .eq('id', request.id);
      }

      setRemarksHistory(updatedHistory);
      setNewRemarkText('');
      if (onRemarkAdded) onRemarkAdded(request.id, newRemarkText.trim(), updatedHistory);
      if (showToast) showToast('Remark added successfully', 'success');
    } catch (err) {
      console.error('[Dashboard] Error adding remark:', err);
      if (showToast) showToast('Failed to save remark', 'error');
    } finally {
      setAddingRemark(false);
    }
  };

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        backgroundColor: 'rgba(35,43,50,0.55)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff', borderRadius: '18px', width: '100%', maxWidth: '600px',
          boxShadow: '0 24px 60px rgba(0,0,0,0.25)', overflow: 'hidden', position: 'relative',
        }}
      >
        {/* Header */}
        <div style={{ backgroundColor: '#232B32', padding: '22px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <p style={{ fontSize: '11px', color: '#C5A059', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Quotation Request & Project Details
            </p>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#F9F9FB', marginTop: '4px' }}>
              {request.request_id}
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', fontSize: '20px', lineHeight: 1, padding: '4px' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#F9F9FB'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#9CA3AF'; }}
          >&times;</button>
        </div>

        <div style={{ padding: '24px', maxHeight: '78vh', overflowY: 'auto' }}>
          {/* Status control */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', gap: '12px', flexWrap: 'wrap' }}>
            <StatusBadge status={status} />
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              {/* Follow-up Email Action Button */}
              {onOpenFollowUp && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenFollowUp(request);
                  }}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    padding: '7px 12px', borderRadius: '8px', border: '1px solid #BAE6FD',
                    fontSize: '12px', fontWeight: 600, color: '#0369A1', backgroundColor: '#F0F9FF',
                    cursor: 'pointer', outline: 'none', transition: 'all 0.15s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#E0F2FE'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#F0F9FF'; }}
                  title="Send project continuation follow-up email to customer"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                    <polyline points="22,6 12,13 2,6"></polyline>
                  </svg>
                  <span>Email Customer</span>
                </button>
              )}
              {/* Official Quotation Builder Action Button */}
              <button
                onClick={() => navigate(`/admin/quotation/${request.id}`)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  padding: '7px 14px', borderRadius: '8px', border: 'none',
                  fontSize: '12px', fontWeight: 600, color: '#FFFFFF', backgroundColor: '#C5A059',
                  cursor: 'pointer', outline: 'none', boxShadow: '0 4px 12px rgba(197,160,89,0.3)',
                  whiteSpace: 'nowrap', transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#B38D4A'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#C5A059'; }}
                title={['approved', 'downpayment_received', 'in_fabrication', 'installation_wip', 'completed'].includes(status) ? "View or edit the official quotation proposal" : "Build and calculate the official quotation proposal with laser measurements"}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
                <span>
                  {['approved', 'downpayment_received', 'in_fabrication', 'installation_wip', 'completed'].includes(status)
                    ? 'View / Edit Quote'
                    : 'Create Official Quote'}
                </span>
              </button>
              <select
                value={status}
                disabled={saving}
                onChange={(e) => handleStatusSave(e.target.value)}
                style={{
                  padding: '7px 12px', borderRadius: '8px', border: '1.5px solid #E2E8F0',
                  fontSize: '12px', fontWeight: 600, color: '#232B32', backgroundColor: '#F9F9FB',
                  cursor: saving ? 'not-allowed' : 'pointer', outline: 'none',
                }}
              >
                {PROJECT_STATUSES.map((st) => (
                  <option key={st.value} value={st.value}>
                    {st.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Stock Supplement Feasibility Advisory (Six Sigmaphil Capacity Check) */}
          {(() => {
            const feas = checkStockSupplementFeasibility(request, materials);
            if (!feas) return null;
            return (
              <div
                style={{
                  marginBottom: '18px',
                  padding: '14px 16px',
                  borderRadius: '12px',
                  backgroundColor: feas.badgeBg,
                  border: `1px solid ${feas.badgeBorder}`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        backgroundColor: '#FFFFFF',
                        color: feas.badgeColor,
                        border: `1px solid ${feas.badgeBorder}`,
                      }}
                    >
                      {feas.badge}
                    </span>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: feas.badgeColor }}>
                      {feas.canSupplement ? 'Six Sigmaphil Can Supplement This Quotation' : 'Stock Supplement Advisory'}
                    </span>
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280' }}>
                    Available: {feas.availableSlabs} slab(s) · Needed: {feas.requiredSlabs} slab(s)
                  </span>
                </div>
                <p style={{ fontSize: '12px', color: '#374151', lineHeight: '1.5', margin: 0 }}>
                  {feas.message}
                </p>
              </div>
            );
          })()}

          {/* Customer & Legitimacy Verification */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <p style={{ fontSize: '11px', fontWeight: 700, color: '#6B7280', letterSpacing: '0.06em', textTransform: 'uppercase', margin: 0 }}>Customer & Verification</p>
            <span
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '4px',
                padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700,
                backgroundColor: request.is_verified || (request.remarks && request.remarks.includes('Verified')) ? '#ECFDF5' : '#FFFBEB',
                color: request.is_verified || (request.remarks && request.remarks.includes('Verified')) ? '#047857' : '#B45309',
                border: `1px solid ${request.is_verified || (request.remarks && request.remarks.includes('Verified')) ? '#A7F3D0' : '#FCD34D'}`
              }}
              title={request.is_verified || (request.remarks && request.remarks.includes('Verified')) ? "Customer verified email ownership via 6-digit OTP" : "Standard client request"}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                <polyline points="9 12 11 14 15 10"></polyline>
              </svg>
              <span>{request.is_verified || (request.remarks && request.remarks.includes('Verified')) ? 'Email Verified (Legit Client)' : 'Inquiry'}</span>
            </span>
          </div>
          <Row label="Full Name" value={request.full_name} />
          <Row label="Email"     value={request.email} />
          <Row label="Phone"     value={request.phone} />
          <Row label="Address"   value={request.address} />
          <Row label="Auth Verification" value={request.is_verified || (request.remarks && request.remarks.includes('Verified')) ? "Authenticated via 6-digit email confirmation code" : "Submitted online"} />
          {request.notes && <Row label="Client Notes" value={request.notes} />}

          {/* Configuration */}
          <p style={{ fontSize: '11px', fontWeight: 700, color: '#6B7280', letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: '20px', marginBottom: '8px' }}>Configuration</p>
          <Row label="Product Type" value={request.product_type} />
          <Row label="Design"       value={request.design} />
          <Row label="Dimensions"   value={`${request.length}m × ${request.width}m`} />
          <Row label="Area"         value={`${Number(request.area).toFixed(2)} sqm`} />
          <Row label="Estimated Raw Slabs" value={`${requiredSlabs} slab(s) (15% kerf inc.)`} />
          <Row label="Rate per sqm" value={fmt(request.rate_per_sqm)} />

          {/* Costs */}
          <p style={{ fontSize: '11px', fontWeight: 700, color: '#6B7280', letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: '20px', marginBottom: '8px' }}>Cost Breakdown</p>
          <Row label="Material Cost"     value={fmt(request.material_cost)} />
          <Row label="Installation Cost" value={fmt(request.install_cost)} />
          <Row label="Delivery & Mobilization" value={Number(request.delivery_cost) > 0 ? fmt(request.delivery_cost) : "Assessed on-site"} />
          <div style={{ marginTop: '12px', padding: '14px', borderRadius: '10px', backgroundColor: '#FDF8F0', border: '1px solid rgba(197,160,89,0.25)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, fontSize: '14px', color: '#232B32' }}>Total Estimated (Preliminary)</span>
            <span style={{ fontWeight: 800, fontSize: '20px', color: '#C5A059' }}>{fmt(request.total_cost)}</span>
          </div>

          {/* Remarks & Activity Log */}
          <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #E2E8F0' }}>
            <p style={{ fontSize: '11px', fontWeight: 700, color: '#6B7280', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '10px' }}>
              Project Remarks & Inspection Notes
            </p>

            <form onSubmit={handleAddRemarkSubmit} style={{ marginBottom: '14px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="Add inspection note, templating observation, or slab remark…"
                  value={newRemarkText}
                  onChange={(e) => setNewRemarkText(e.target.value)}
                  disabled={addingRemark}
                  style={{
                    flex: 1, padding: '8px 12px', borderRadius: '8px',
                    border: '1.5px solid #E2E8F0', fontSize: '12px',
                    outline: 'none', backgroundColor: '#F9F9FB', color: '#232B32',
                  }}
                />
                <button
                  type="submit"
                  disabled={addingRemark || !newRemarkText.trim()}
                  style={{
                    padding: '8px 14px', borderRadius: '8px', border: 'none',
                    backgroundColor: '#C5A059', color: '#FFFFFF', fontSize: '12px',
                    fontWeight: 600, cursor: addingRemark || !newRemarkText.trim() ? 'not-allowed' : 'pointer',
                    opacity: addingRemark || !newRemarkText.trim() ? 0.6 : 1,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {addingRemark ? 'Saving…' : 'Add Note'}
                </button>
              </div>
            </form>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
              {remarksHistory.length === 0 ? (
                <p style={{ fontSize: '12px', color: '#9CA3AF', fontStyle: 'italic' }}>
                  No remarks recorded yet. Add on-site inspection notes or notes about slab reservations above.
                </p>
              ) : (
                remarksHistory.map((rem, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '8px 12px', borderRadius: '8px', backgroundColor: '#F9F9FB',
                      border: '1px solid #E2E8F0', fontSize: '12px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                      <span style={{ fontWeight: 600, color: rem.author === 'Inventory Engine' ? '#C5A059' : '#232B32', fontSize: '11px' }}>
                        {rem.author || 'Admin'}
                      </span>
                      <span style={{ color: '#9CA3AF', fontSize: '10px' }}>
                        {new Date(rem.timestamp).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p style={{ color: '#4B5563', lineHeight: 1.4 }}>{rem.text}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          <p style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '16px' }}>
            Submitted: {new Date(request.created_at).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ── Follow-Up Email Modal ── */
function FollowUpModal({ request, onClose, onSuccess, showToast }) {
  const customerName = request.full_name || 'Valued Customer';
  const requestId = request.request_id || '';
  const productType = request.product_type || 'Countertop';
  const stoneName = request.design || 'Natural Stone';
  const areaSqm = Number(request.area || 0).toFixed(2);
  const estimatedCost = `₱${Number(request.total_cost || 0).toLocaleString('en-PH', { maximumFractionDigits: 0 })}`;

  const defaultSubject = `Project Follow-up: Quotation Request ${requestId} — SIX SIGMAPHIL`;

  const defaultMessage = useMemo(() => {
    return `Dear ${customerName},

Good day from SIX SIGMAPHIL!

We are following up regarding your quotation request (${requestId}) for ${stoneName} ${productType}.

We would like to check if you would still like to proceed with this project and schedule your on-site laser inspection.

Please reply directly to this email or call us at 0919 585 9959 if you would like to continue.

Best regards,
Roland B. Koh
General Manager · SIX SIGMAPHIL CORP.`;
  }, [customerName, requestId, stoneName, productType]);

  const [subject, setSubject] = useState(defaultSubject);
  const [message, setMessage] = useState(defaultMessage);
  const [sending, setSending] = useState(false);

  const handleSendEmail = async (e) => {
    e.preventDefault();
    if (!message.trim() || !subject.trim()) {
      if (showToast) showToast('Please provide an email subject and message.', 'error');
      return;
    }

    setSending(true);
    try {
      const SERVICE_ID = "service_jdqablg";
      const TEMPLATE_ID = "template_nswrucb";
      const PUBLIC_KEY = "Sc6zRHEuqJILL6S2A";

      const templateParams = {
        to_name: customerName,
        client_name: customerName,
        customer_name: customerName,
        to_email: request.email,
        client_email: request.email,
        client_phone: request.phone || '',
        client_address: request.address || '',
        request_id: requestId,
        order_id: requestId,
        project_name: `${productType} Project`,
        project: `${productType} Project`,
        project_type: productType,
        product: productType,
        product_type: productType,
        item: productType,
        item_name: productType,
        order: `${productType} Project`,
        service: productType,
        structure: productType,
        design: stoneName,
        stone: stoneName,
        stone_design: stoneName,
        material: stoneName,
        dimensions: `${Number(request.length || 0).toFixed(2)}m × ${Number(request.width || 0).toFixed(2)}m`,
        area: `${areaSqm} sqm`,
        total_due: estimatedCost,
        subject: subject.trim(),
        message: message.trim(),
        notes: message.trim(),
        date: new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' }),
      };

      if (PUBLIC_KEY) {
        try {
          await emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams, PUBLIC_KEY);
        } catch (mailErr) {
          console.warn("[FollowUpModal] EmailJS warning:", mailErr);
        }
      }

      // Add audit note to remarks_history in Supabase
      const auditText = `Follow-up email sent to customer (${request.email}) inquiring about project continuation.`;
      let existingHistory = request.remarks_history;
      if (typeof existingHistory === 'string') {
        try { existingHistory = JSON.parse(existingHistory); } catch { existingHistory = []; }
      }
      if (!Array.isArray(existingHistory)) existingHistory = [];

      const newEntry = {
        text: auditText,
        timestamp: new Date().toISOString(),
        author: 'Follow-up Engine',
      };
      const updatedHistory = [newEntry, ...existingHistory];

      try {
        await supabase
          .from('quotation_requests')
          .update({
            remarks: auditText,
            remarks_history: updatedHistory,
          })
          .eq('id', request.id);
      } catch (dbErr) {
        console.warn("[FollowUpModal] Remarks update warning:", dbErr);
      }

      if (onSuccess) {
        onSuccess(updatedHistory);
      }
    } catch (err) {
      console.error("[FollowUpModal] Error sending follow-up:", err);
      if (showToast) showToast('Failed to send follow-up email: ' + (err.message || 'unknown error'), 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed', inset: 0, zIndex: 10000,
        backgroundColor: 'rgba(35,43,50,0.65)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff', borderRadius: '18px', width: '100%', maxWidth: '620px',
          boxShadow: '0 24px 60px rgba(0,0,0,0.28)', overflow: 'hidden', position: 'relative',
          maxHeight: '92vh', display: 'flex', flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div style={{ backgroundColor: '#232B32', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', shrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: 'rgba(197,160,89,0.15)', border: '1px solid #C5A059', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#C5A059' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                <polyline points="22,6 12,13 2,6"></polyline>
              </svg>
            </div>
            <div>
              <p style={{ fontSize: '11px', color: '#C5A059', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Customer Follow-up
              </p>
              <h2 style={{ fontSize: '17px', fontWeight: 700, color: '#F9F9FB', margin: 0 }}>
                Inquire Project Continuation
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={sending}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', fontSize: '22px', lineHeight: 1, padding: '4px' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#F9F9FB'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#9CA3AF'; }}
          >&times;</button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSendEmail} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflowY: 'auto' }}>
          <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Recipient & Quotation Info Card */}
            <div style={{ backgroundColor: '#F9F9FB', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '14px 16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '10px' }}>
              <div>
                <span style={{ fontSize: '11px', color: '#6B7280', fontWeight: 600, textTransform: 'uppercase' }}>Recipient Customer</span>
                <p style={{ fontSize: '13px', fontWeight: 700, color: '#232B32', margin: '2px 0 0' }}>{customerName}</p>
                <p style={{ fontSize: '11px', color: '#0369A1', margin: '1px 0 0', fontWeight: 500 }}>{request.email}</p>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: '#6B7280', fontWeight: 600, textTransform: 'uppercase' }}>Quotation Reference</span>
                <p style={{ fontSize: '13px', fontWeight: 700, color: '#232B32', margin: '2px 0 0' }}>{requestId}</p>
                <p style={{ fontSize: '11px', color: '#6B7280', margin: '1px 0 0' }}>{stoneName} · {productType}</p>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: '#6B7280', fontWeight: 600, textTransform: 'uppercase' }}>Estimated Total</span>
                <p style={{ fontSize: '13px', fontWeight: 700, color: '#C5A059', margin: '2px 0 0' }}>{estimatedCost}</p>
                <span style={{ display: 'inline-block', fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '999px', backgroundColor: '#FFFBEB', color: '#B45309', border: '1px solid #FCD34D', marginTop: '2px' }}>
                  Pending Decision
                </span>
              </div>
            </div>

            {/* Subject Input */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#232B32', display: 'block', marginBottom: '6px' }}>
                Email Subject Line
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
                disabled={sending}
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: '10px',
                  border: '1.5px solid #E2E8F0', fontSize: '13px', color: '#232B32',
                  backgroundColor: '#FFFFFF', outline: 'none', boxSizing: 'border-box',
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#C5A059'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = '#E2E8F0'; }}
              />
            </div>

            {/* Message Body */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#232B32' }}>
                  Email Message Body
                </label>
                <span style={{ fontSize: '11px', color: '#6B7280' }}>
                  Editable before sending
                </span>
              </div>
              <textarea
                rows={9}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                disabled={sending}
                style={{
                  width: '100%', padding: '12px 14px', borderRadius: '10px',
                  border: '1.5px solid #E2E8F0', fontSize: '12.5px', color: '#232B32',
                  backgroundColor: '#FFFFFF', outline: 'none', resize: 'vertical',
                  lineHeight: 1.5, boxSizing: 'border-box', fontFamily: 'inherit',
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#C5A059'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = '#E2E8F0'; }}
              />
            </div>
          </div>

          {/* Modal Footer */}
          <div style={{ backgroundColor: '#F9F9FB', borderTop: '1px solid #E2E8F0', padding: '16px 24px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '10px' }}>
            <button
                type="button"
                onClick={onClose}
                disabled={sending}
                style={{
                  padding: '9px 16px', borderRadius: '10px', border: '1px solid #E2E8F0',
                  backgroundColor: '#FFFFFF', fontSize: '12px', fontWeight: 600, color: '#6B7280',
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={sending}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  padding: '9px 20px', borderRadius: '10px', border: 'none',
                  backgroundColor: '#C5A059', fontSize: '12px', fontWeight: 700, color: '#FFFFFF',
                  cursor: sending ? 'not-allowed' : 'pointer', opacity: sending ? 0.7 : 1,
                  boxShadow: '0 2px 8px rgba(197,160,89,0.3)', transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => { if (!sending) e.currentTarget.style.backgroundColor = '#B38D4A'; }}
                onMouseLeave={(e) => { if (!sending) e.currentTarget.style.backgroundColor = '#C5A059'; }}
              >
                {sending ? (
                  <>
                    <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', border: '2px solid #FFFFFF', borderTopColor: 'transparent', animation: 'spin 1s linear infinite' }} />
                    <span>Sending…</span>
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="22" y1="2" x2="11" y2="13"></line>
                      <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                    </svg>
                    <span>Send Follow-up Email</span>
                  </>
                )}
              </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   MAIN DASHBOARD COMPONENT
══════════════════════════════════════════════ */
export default function Dashboard() {
  const navigate = useNavigate();

  /* ── Quotation data ── */
  const [requests, setRequests]         = useState([]);
  const [materials, setMaterials]       = useState([]);
  const [dataLoading, setDataLoading]   = useState(true);

  /* ── Search & filter ── */
  const [searchQuery, setSearchQuery]   = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  /* ── Detail modal ── */
  const [viewRequest, setViewRequest]   = useState(null);
  const [followUpRequest, setFollowUpRequest] = useState(null);
  const [incomingAlert, setIncomingAlert]     = useState(null);
  const [searchParams, setSearchParams]       = useSearchParams();
  const viewParam = searchParams.get('view');
  const location = useLocation();

  const { toast, showToast, dismissToast } = useToast();

  /* ── Check for incoming navigation toasts (e.g. from quotation builder) ── */
  useEffect(() => {
    if (location.state?.toastMessage) {
      showToast(location.state.toastMessage, location.state.toastType || 'success');
      window.history.replaceState({}, document.title);
    }
  }, [location, showToast]);

  /* ── Fetch quotation requests ── */
  const fetchRequests = useCallback(async () => {
    setDataLoading(true);

    const [reqRes, matRes] = await Promise.all([
      supabase
        .from('quotation_requests')
        .select('*')
        .order('created_at', { ascending: false }),
      supabase
        .from('materials')
        .select('id, name, slab_count, allocated_slabs, soft_hold_slabs, reorder_threshold, stock_status')
    ]);

    if (reqRes.error) {
      console.error('[Dashboard] Fetch error:', reqRes.error.message);
      showToast('Unable to load quotation requests. Please try again.', 'error');
    } else {
      setRequests(reqRes.data ?? []);
    }

    if (matRes.data) {
      setMaterials(matRes.data);
    }

    setDataLoading(false);
  }, [showToast]);

  useEffect(() => {
    Promise.resolve().then(() => fetchRequests());

    const handleNewQuoteArrived = (quote) => {
      fetchRequests();
      setIncomingAlert(quote);
    };

    // 1. Supabase Realtime synchronization on quotation_requests and materials
    const channel = supabase
      .channel('dashboard_quotation_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quotation_requests' }, (payload) => {
        fetchRequests();
        if (payload.eventType === 'INSERT') {
          handleNewQuoteArrived(payload.new);
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'materials' }, () => {
        fetchRequests();
      })
      .subscribe();

    // 2. BroadcastChannel for instant cross-tab inbound alerts
    let bc;
    try {
      bc = new BroadcastChannel('sixsigma_quotation_alert');
      bc.onmessage = (event) => {
        if (event.data?.type === 'NEW_QUOTATION') {
          handleNewQuoteArrived(event.data.quote);
        }
      };
    } catch (e) {}

    // 3. LocalStorage storage event fallback
    const handleStorage = (e) => {
      if (e.key === 'sixsigma_new_quotation_alert' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          handleNewQuoteArrived(parsed);
        } catch (err) {}
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      supabase.removeChannel(channel);
      if (bc) bc.close();
      window.removeEventListener('storage', handleStorage);
    };
  }, [fetchRequests]);

  /* ── Auto-open requested quotation if ?view= is in URL ── */
  useEffect(() => {
    if (!viewParam) return;

    if (requests.length > 0) {
      const match = requests.find((r) => r.request_id === viewParam || String(r.id) === String(viewParam));
      if (match) {
        Promise.resolve().then(() => setViewRequest(match));
        return;
      }
    }

    // Direct lookup fallback if arriving via realtime notification before state re-fetched
    let isSubscribed = true;
    const fetchDirect = async () => {
      const isNum = !isNaN(Number(viewParam));
      let query = supabase.from('quotation_requests').select('*');
      if (isNum) {
        query = query.or(`request_id.eq.${viewParam},id.eq.${viewParam}`);
      } else {
        query = query.eq('request_id', viewParam);
      }
      const { data, error } = await query.maybeSingle();
      if (!error && data && isSubscribed) {
        setRequests((prev) => [data, ...prev.filter((p) => p.id !== data.id)]);
        setViewRequest(data);
      }
    };

    fetchDirect();
    return () => { isSubscribed = false; };
  }, [viewParam, requests]);

  /* ── Status update propagated from DetailModal ── */
  const handleStatusChange = (id, newStatus, updatedHistory) => {
    setRequests((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              status: newStatus,
              ...(updatedHistory ? { remarks_history: updatedHistory } : {}),
            }
          : r
      )
    );
  };

  /* ── Remark update propagated from DetailModal ── */
  const handleRemarkAdded = (id, newRemarkText, updatedHistory) => {
    setRequests((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              remarks: newRemarkText,
              remarks_history: updatedHistory,
            }
          : r
      )
    );
  };

  /* ── Status update directly from table dropdown ── */
  const handleInlineStatusChange = async (id, newStatus) => {
    const currentReq = requests.find((r) => r.id === id);
    let updatedHistory = currentReq?.remarks_history;
    if (typeof updatedHistory === 'string') {
      try { updatedHistory = JSON.parse(updatedHistory); } catch { updatedHistory = []; }
    }
    if (!Array.isArray(updatedHistory)) updatedHistory = [];

    // Automated Inventory Lifecycle Transition (Soft holds, Downpayment allocation, Completion deduction, Cancellation restore)
    if (newStatus !== currentReq?.status) {
      const invRes = await handleQuotationStatusInventoryTransition(currentReq?.status, newStatus, currentReq, supabase);
      if (invRes?.success && !invRes.unchanged) {
        const auditEntry = formatInventoryAuditEntry(invRes, newStatus);
        if (auditEntry) {
          updatedHistory = [auditEntry, ...updatedHistory];
        }
        if (newStatus === 'downpayment_received') {
          showToast(`Downpayment recorded! Automatically deducted ${invRes.slabs} slab(s) of ${invRes.materialName} from warehouse stock.`, 'success');
        } else if (newStatus === 'cancelled') {
          showToast(`Quotation cancelled. Restored ${invRes.slabs} slab(s) of ${invRes.materialName} to warehouse stock.`, 'info');
        } else if (newStatus === 'completed') {
          showToast(`Project completed! ${invRes.slabs} slab(s) of ${invRes.materialName} fulfilled.`, 'success');
        }
      }
    }

    // Optimistic update
    setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status: newStatus, remarks_history: updatedHistory } : r)));

    try {
      // Step 1: Attempt update with newStatus and remarks_history
      let { error } = await supabase
        .from('quotation_requests')
        .update({
          status: newStatus,
          ...(updatedHistory.length > 0 ? { remarks_history: updatedHistory } : {}),
        })
        .eq('id', id);

      // Step 2: Retry with status only if remarks_history is unmigrated
      if (error && (error.message?.includes('remarks_history') || error.code === '42703')) {
        const retryRes = await supabase
          .from('quotation_requests')
          .update({ status: newStatus })
          .eq('id', id);
        error = retryRes.error;
      }

      // Step 3: If database has legacy check constraint on status column, fallback to safe legacy status
      if (error && (error.message?.includes('check constraint') || error.code === '23514')) {
        const safeStatus = newStatus === 'pending' ? 'pending' : (newStatus === 'approved' || newStatus === 'completed' ? 'approved' : 'in-review');
        const constraintRes = await supabase
          .from('quotation_requests')
          .update({ status: safeStatus })
          .eq('id', id);
        error = constraintRes.error;
      }

      if (error) throw error;
      showToast(`Status updated to ${STATUS_STYLES[newStatus]?.label || newStatus}`, 'success');
    } catch (err) {
      console.error('[Dashboard] Inline status update error:', err.message);
      // Revert on failure — re-fetch
      const { data } = await supabase
        .from('quotation_requests')
        .select('*')
        .eq('id', id)
        .single();
      if (data) setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status: data.status } : r)));
      showToast('Failed to update status: ' + (err.message || 'database error'), 'error');
    }
  };

  /* ── Derived stats ── */
  const stats = useMemo(() => ({
    total: requests.length,
    pending: requests.filter((r) => ['pending', 'inspection_scheduled'].includes(r.status)).length,
    inFabrication: requests.filter((r) => ['downpayment_received', 'in_fabrication', 'installation_wip'].includes(r.status)).length,
    completed: requests.filter((r) => ['completed', 'approved'].includes(r.status)).length,
  }), [requests]);

  /* ── Filtered & searched rows ── */
  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return requests.filter((r) => {
      const matchesSearch =
        !q ||
        r.full_name?.toLowerCase().includes(q) ||
        r.request_id?.toLowerCase().includes(q) ||
        r.email?.toLowerCase().includes(q);
      const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [requests, searchQuery, statusFilter]);

  const fmt = (n) => `₱${Number(n).toLocaleString('en-PH', { minimumFractionDigits: 0 })}`;

  /* ── Horizontal Scrollbar Synchronization & Sticky Navigation ── */
  const tableContainerRef = useRef(null);
  const topScrollRef = useRef(null);
  const [tableScrollWidth, setTableScrollWidth] = useState(0);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(65);

  // Measure top admin header height dynamically so sticky offset is pixel-perfect
  useEffect(() => {
    const updateHeaderHeight = () => {
      const adminHeader = document.querySelector('main > header');
      if (adminHeader) {
        setHeaderHeight(adminHeader.offsetHeight);
      }
    };
    updateHeaderHeight();
    window.addEventListener('resize', updateHeaderHeight);
    return () => window.removeEventListener('resize', updateHeaderHeight);
  }, []);

  // Monitor table width changes and scroll state
  useEffect(() => {
    const container = tableContainerRef.current;
    if (!container) return;

    const updateDimensions = () => {
      setTableScrollWidth(container.scrollWidth);
      setCanScrollLeft(container.scrollLeft > 10);
      setCanScrollRight(container.scrollLeft + container.clientWidth < container.scrollWidth - 10);
    };

    updateDimensions();

    const resizeObserver = new ResizeObserver(() => {
      updateDimensions();
    });
    resizeObserver.observe(container);

    const table = container.querySelector('table');
    if (table) resizeObserver.observe(table);

    return () => resizeObserver.disconnect();
  }, [filtered, dataLoading]);

  // Synchronize top and bottom scroll positions in lockstep
  useEffect(() => {
    const topEl = topScrollRef.current;
    const bottomEl = tableContainerRef.current;
    if (!topEl || !bottomEl) return;

    let isSyncing = false;

    const handleTopScroll = () => {
      if (isSyncing) return;
      isSyncing = true;
      bottomEl.scrollLeft = topEl.scrollLeft;
      setCanScrollLeft(topEl.scrollLeft > 10);
      setCanScrollRight(topEl.scrollLeft + topEl.clientWidth < topEl.scrollWidth - 10);
      requestAnimationFrame(() => {
        isSyncing = false;
      });
    };

    const handleBottomScroll = () => {
      if (isSyncing) return;
      isSyncing = true;
      topEl.scrollLeft = bottomEl.scrollLeft;
      setCanScrollLeft(bottomEl.scrollLeft > 10);
      setCanScrollRight(bottomEl.scrollLeft + bottomEl.clientWidth < bottomEl.scrollWidth - 10);
      requestAnimationFrame(() => {
        isSyncing = false;
      });
    };

    topEl.addEventListener('scroll', handleTopScroll, { passive: true });
    bottomEl.addEventListener('scroll', handleBottomScroll, { passive: true });

    return () => {
      topEl.removeEventListener('scroll', handleTopScroll);
      bottomEl.removeEventListener('scroll', handleBottomScroll);
    };
  }, [tableScrollWidth]);

  const scrollToStart = () => {
    if (tableContainerRef.current) {
      tableContainerRef.current.scrollTo({ left: 0, behavior: 'smooth' });
    }
    if (topScrollRef.current) {
      topScrollRef.current.scrollTo({ left: 0, behavior: 'smooth' });
    }
  };

  const scrollToActions = () => {
    if (tableContainerRef.current) {
      tableContainerRef.current.scrollTo({ left: tableContainerRef.current.scrollWidth, behavior: 'smooth' });
    }
    if (topScrollRef.current) {
      topScrollRef.current.scrollTo({ left: topScrollRef.current.scrollWidth, behavior: 'smooth' });
    }
  };

  return (
    <div className="p-4 md:p-8" style={{ backgroundColor: '#F9F9FB', minHeight: '100vh' }}>
      <ToastNotification toast={toast} onDismiss={dismissToast} position="bottom-right" />
      <div className="max-w-7xl mx-auto space-y-6">
        {/* ── Realtime Inbound Quotation Alert Banner (Swinging Bell) ── */}
        {incomingAlert && (
          <div
            className="rounded-2xl p-4 md:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-2 transition-all"
            style={{
              backgroundColor: '#FFFFFF',
              borderColor: '#C5A059',
              boxShadow: '0 12px 30px rgba(197, 160, 89, 0.2)',
            }}
          >
            <div className="flex items-center gap-4 min-w-0">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border"
                style={{ backgroundColor: '#FDF8F0', borderColor: '#E9D5A1', color: '#C5A059' }}
              >
                <span className="bell-swinging inline-block text-2xl">
                  🔔
                </span>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#C5A059]">
                    New Inbound Quotation Request
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0]">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                      <polyline points="9 12 11 14 15 10"></polyline>
                    </svg>
                    Email Verified (Legit Client)
                  </span>
                </div>
                <h3 className="text-sm md:text-base font-bold text-[#232B32] truncate mt-0.5">
                  {incomingAlert.full_name} submitted <span className="font-mono text-[#C5A059]">{incomingAlert.request_id}</span> ({incomingAlert.product_type} · {incomingAlert.design})
                </h3>
                <p className="text-xs text-[#6B7280] truncate mt-0.5">
                  Estimated Total: ₱{Number(incomingAlert.total_cost || 0).toLocaleString()} · Client email verified via 6-digit confirmation code.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
              <button
                type="button"
                onClick={() => {
                  setViewRequest(incomingAlert);
                  setIncomingAlert(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#C5A059] hover:bg-[#B38D4A] transition-all shadow-sm cursor-pointer whitespace-nowrap"
              >
                View Details
              </button>
              <button
                type="button"
                onClick={() => setIncomingAlert(null)}
                className="p-2 text-[#9CA3AF] hover:text-[#232B32] rounded-lg transition-colors cursor-pointer"
                title="Dismiss alert"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Requests" value={stats.total} isLoading={dataLoading} />
          <StatCard label="Pending Inspection" value={stats.pending} accent="#B45309" isLoading={dataLoading} />
          <StatCard label="Fabrication / WIP" value={stats.inFabrication} accent="#0284C7" isLoading={dataLoading} />
          <StatCard label="Completed / Sent" value={stats.completed} accent="#065F46" isLoading={dataLoading} />
        </div>

        {/* ── Search + Filter ── */}
        <div
          className="flex flex-col sm:flex-row gap-3"
          style={{ backgroundColor: '#ffffff', borderRadius: '14px', border: '1px solid #E2E8F0', padding: '16px 20px' }}
        >
          {/* Search */}
          <div style={{ position: 'relative', flex: 1 }}>
            <svg
              style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
              width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              id="dashboard-search"
              type="text"
              placeholder="Search by name, email, or request ID…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%', padding: '9px 12px 9px 38px',
                borderRadius: '8px', border: '1.5px solid #E2E8F0',
                fontSize: '13px', color: '#232B32', backgroundColor: '#F9F9FB',
                outline: 'none', boxSizing: 'border-box',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#C5A059'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = '#E2E8F0'; }}
            />
          </div>

          {/* Status filter */}
          <select
            id="dashboard-status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: '9px 14px', borderRadius: '8px', border: '1.5px solid #E2E8F0',
              fontSize: '13px', fontWeight: 600, color: '#232B32', backgroundColor: '#F9F9FB',
              cursor: 'pointer', outline: 'none', minWidth: '150px',
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = '#C5A059'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = '#E2E8F0'; }}
          >
            <option value="all">All Statuses</option>
            {PROJECT_STATUSES.map((st) => (
              <option key={st.value} value={st.value}>{st.label}</option>
            ))}
          </select>
        </div>

        {/* ── Quotation Requests Table ── */}
        <div
          className="rounded-2xl shadow-sm"
          style={{ backgroundColor: '#ffffff', border: '1px solid #E2E8F0' }}
        >
          {/* Table header */}
          <div className="px-6 py-5 flex items-center gap-3 rounded-t-2xl" style={{ borderBottom: '1px solid #E2E8F0' }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#232B32' }}>
              <svg className="w-4 h-4" style={{ color: '#C5A059' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75a2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V19.5" />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-semibold tracking-widest uppercase" style={{ color: '#232B32' }}>
                Quotation Requests & Project Lifecycle
              </h2>
              <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>
                {dataLoading ? 'Loading\u2026' : `${filtered.length} of ${requests.length} request${requests.length !== 1 ? 's' : ''}`}
              </p>
            </div>
          </div>

          {/* Sticky Top Scrollbar & Quick Navigation Bar */}
          <div
            className="sticky z-30 bg-[#FFFFFF] border-b border-[#E2E8F0] shadow-sm"
            style={{
              top: `${headerHeight || 65}px`,
              backgroundColor: '#FFFFFF',
            }}
          >
            {/* Quick action helper bar */}
            <div className="px-4 md:px-6 py-2 flex items-center justify-between gap-3 text-xs border-b border-[#F1F5F9]">
              <div className="flex items-center gap-2 text-[#6B7280]">
                <span className="flex items-center justify-center w-5 h-5 rounded-md bg-[#F9F9FB] border border-[#E2E8F0] text-[#C5A059] font-bold text-xs select-none">
                  ↔
                </span>
                <span className="font-semibold text-[#232B32]">Table Navigation</span>
                <span className="hidden sm:inline text-[#9CA3AF]">·</span>
                <span className="hidden sm:inline text-[11px] text-[#6B7280]">
                  {canScrollRight 
                    ? "Drag top bar or click 'Actions & Status' to view rightmost columns" 
                    : "Showing rightmost columns (Actions, Status & Date)"}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={scrollToStart}
                  disabled={!canScrollLeft}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                    canScrollLeft
                      ? 'text-[#232B32] bg-[#FFFFFF] hover:bg-[#F9F9FB] border border-[#E2E8F0] cursor-pointer shadow-xs'
                      : 'text-[#9CA3AF] bg-[#F9F9FB] border border-[#F1F5F9] cursor-not-allowed opacity-50'
                  }`}
                  title="Scroll left to Customer & Request ID"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 18 9 12 15 6"></polyline>
                  </svg>
                  <span>Start</span>
                </button>

                <button
                  type="button"
                  onClick={scrollToActions}
                  disabled={!canScrollRight}
                  className={`inline-flex items-center gap-1 px-3 py-1 rounded-md text-[11px] font-bold transition-all ${
                    canScrollRight
                      ? 'text-[#FFFFFF] bg-[#C5A059] hover:bg-[#B38D4A] cursor-pointer shadow-xs'
                      : 'text-[#9CA3AF] bg-[#F9F9FB] border border-[#F1F5F9] cursor-not-allowed opacity-50'
                  }`}
                  title="Scroll right to Actions (Status, View, Follow-up, Build Quote)"
                >
                  <span>Actions & Status</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                </button>
              </div>
            </div>

            {/* Top Synchronized Scrollbar Track */}
            <div
              ref={topScrollRef}
              className="overflow-x-auto w-full custom-horizontal-scrollbar"
              style={{
                height: '14px',
                backgroundColor: '#F8FAFC',
                scrollbarWidth: 'thin',
                scrollbarColor: '#C5A059 #F1F5F9',
              }}
              title="Top Scrollbar: Click and drag horizontally to navigate table columns"
            >
              <div style={{ width: `${Math.max(tableScrollWidth, 1)}px`, height: '1px' }} />
            </div>
          </div>

          {/* Table */}
          <div ref={tableContainerRef} className="overflow-x-auto w-full custom-horizontal-scrollbar rounded-b-2xl">
            <table className="w-full text-sm" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                  {['Request ID', 'Customer', 'Product & Slabs', 'Design', 'Area (sqm)', 'Price', 'Status', 'Date', 'Actions'].map((col) => (
                    <th
                      key={col}
                      className="text-left text-xs font-semibold tracking-widest uppercase px-5 py-3"
                      style={{ color: '#6B7280', whiteSpace: 'nowrap' }}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dataLoading ? (
                  /* Skeleton rows */
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={`skel-${i}`} style={{ borderBottom: '1px solid #F3F4F6' }}>
                      {Array.from({ length: 9 }).map((__, j) => (
                        <td key={j} className="px-5 py-4">
                          <div style={{ height: '12px', borderRadius: '4px', backgroundColor: '#F3F4F6', animation: 'db-pulse 1.5s ease-in-out infinite', width: j === 1 ? '120px' : '70px' }} />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-14 text-center" style={{ color: '#9CA3AF', fontSize: '13px' }}>
                      {requests.length === 0
                        ? 'No quotation requests yet. They will appear here once users submit their configurations.'
                        : 'No results match your search or filter.'}
                    </td>
                  </tr>
                ) : (
                  filtered.map((req, idx) => (
                    <tr
                      key={req.id}
                      style={{
                        borderBottom: idx < filtered.length - 1 ? '1px solid #F3F4F6' : 'none',
                        transition: 'background-color 0.15s',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#FAFAFA'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                    >
                      {/* Request ID */}
                      <td className="px-5 py-4" style={{ whiteSpace: 'nowrap' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#232B32', fontFamily: 'monospace' }}>
                          {req.request_id}
                        </span>
                      </td>

                      {/* Customer */}
                      <td className="px-5 py-4">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <p style={{ fontSize: '13px', fontWeight: 600, color: '#232B32', whiteSpace: 'nowrap', margin: 0 }}>{req.full_name}</p>
                          <span
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: '3px',
                              padding: '1px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 700,
                              backgroundColor: req.is_verified || (req.remarks && req.remarks.includes('Verified')) ? '#ECFDF5' : '#FFFBEB',
                              color: req.is_verified || (req.remarks && req.remarks.includes('Verified')) ? '#047857' : '#B45309',
                              border: `1px solid ${req.is_verified || (req.remarks && req.remarks.includes('Verified')) ? '#A7F3D0' : '#FCD34D'}`
                            }}
                            title={req.is_verified || (req.remarks && req.remarks.includes('Verified')) ? "Customer verified email ownership via 6-digit OTP code" : "Standard client inquiry"}
                          >
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                              <polyline points="9 12 11 14 15 10"></polyline>
                            </svg>
                            <span>{req.is_verified || (req.remarks && req.remarks.includes('Verified')) ? 'Verified' : 'Inquiry'}</span>
                          </span>
                        </div>
                        <p style={{ fontSize: '11px', color: '#6B7280', margin: '2px 0 0' }}>{req.email}</p>
                        {(() => {
                          let latestNote = req.remarks;
                          if (Array.isArray(req.remarks_history) && req.remarks_history.length > 0) {
                            latestNote = req.remarks_history[0].text;
                          } else if (typeof req.remarks_history === 'string') {
                            try {
                              const parsed = JSON.parse(req.remarks_history);
                              if (Array.isArray(parsed) && parsed.length > 0) latestNote = parsed[0].text;
                            } catch { /* use req.remarks */ }
                          }
                          if (!latestNote) return null;
                          return (
                            <p className="text-[11px] text-[#6B7280] truncate max-w-[220px] mt-0.5" title={latestNote}>
                              <span style={{ color: '#C5A059', fontWeight: 600 }}>Note:</span> {latestNote}
                            </p>
                          );
                        })()}
                      </td>

                      {/* Product & Slabs */}
                      <td className="px-5 py-4" style={{ whiteSpace: 'nowrap' }}>
                        <p style={{ fontSize: '13px', fontWeight: 600, color: '#232B32' }}>{req.product_type}</p>
                        <p style={{ fontSize: '11px', color: '#C5A059', fontWeight: 600 }}>
                          {req.required_slabs || Math.max(1, Math.ceil((Number(req.area || 0) * 1.15) / 4.35))} slab(s)
                        </p>
                      </td>

                      {/* Design & Supplement Feasibility */}
                      <td className="px-5 py-4" style={{ fontSize: '13px', color: '#232B32', whiteSpace: 'nowrap' }}>
                        <div>
                          <p style={{ margin: 0, fontWeight: 600 }}>{req.design}</p>
                          {(() => {
                            const feas = checkStockSupplementFeasibility(req, materials);
                            if (!feas) return null;
                            return (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  marginTop: '4px',
                                  padding: '1.5px 6px',
                                  borderRadius: '4px',
                                  fontSize: '10px',
                                  fontWeight: 700,
                                  backgroundColor: feas.badgeBg,
                                  color: feas.badgeColor,
                                  border: `1px solid ${feas.badgeBorder}`,
                                }}
                                title={feas.message}
                              >
                                {feas.badge}
                              </span>
                            );
                          })()}
                        </div>
                      </td>

                      {/* Area */}
                      <td className="px-5 py-4" style={{ fontSize: '13px', color: '#232B32', textAlign: 'center' }}>
                        {Number(req.area).toFixed(1)}
                      </td>

                      {/* Price */}
                      <td className="px-5 py-4" style={{ fontSize: '13px', fontWeight: 700, color: '#232B32', whiteSpace: 'nowrap' }}>
                        {fmt(req.total_cost)}
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4" style={{ whiteSpace: 'nowrap' }}>
                        <StatusBadge status={req.status} />
                      </td>

                      {/* Date */}
                      <td className="px-5 py-4" style={{ fontSize: '12px', color: '#6B7280', whiteSpace: 'nowrap' }}>
                        {new Date(req.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {/* Inline status select */}
                          <select
                            value={req.status}
                            onChange={(e) => handleInlineStatusChange(req.id, e.target.value)}
                            title="Change project status"
                            style={{
                              padding: '4px 8px', borderRadius: '6px', border: '1px solid #E2E8F0',
                              fontSize: '11px', fontWeight: 600, color: '#232B32',
                              backgroundColor: '#F9F9FB', cursor: 'pointer', outline: 'none',
                              maxWidth: '140px',
                            }}
                            onFocus={(e) => { e.currentTarget.style.borderColor = '#C5A059'; }}
                            onBlur={(e) => { e.currentTarget.style.borderColor = '#E2E8F0'; }}
                          >
                            {PROJECT_STATUSES.map((st) => (
                              <option key={st.value} value={st.value}>
                                {st.label}
                              </option>
                            ))}
                          </select>

                          {/* View detail button */}
                          <button
                            id={`view-request-${req.request_id}`}
                            onClick={() => setViewRequest(req)}
                            title="View request details and inspection notes"
                            style={{
                              display: 'flex', alignItems: 'center', gap: '4px',
                              padding: '5px 10px', borderRadius: '7px',
                              border: '1px solid #E2E8F0', backgroundColor: '#F9F9FB',
                              fontSize: '11px', fontWeight: 600, color: '#6B7280',
                              cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s',
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#E2E8F0'; e.currentTarget.style.color = '#232B32'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#F9F9FB'; e.currentTarget.style.color = '#6B7280'; }}
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                            </svg>
                            View
                          </button>

                          {/* Project Continuation Follow-up Email button */}
                          {['pending', 'inspection_scheduled', 'inspection_completed'].includes(req.status) && (
                            <button
                              id={`follow-up-${req.request_id}`}
                              onClick={() => setFollowUpRequest(req)}
                              title={`Send project follow-up email to ${req.full_name}`}
                              style={{
                                display: 'flex', alignItems: 'center', gap: '4px',
                                padding: '5px 10px', borderRadius: '7px',
                                border: '1px solid #BAE6FD', backgroundColor: '#F0F9FF',
                                fontSize: '11px', fontWeight: 600, color: '#0369A1',
                                cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s',
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#E0F2FE'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#F0F9FF'; }}
                            >
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                                <polyline points="22,6 12,13 2,6"></polyline>
                              </svg>
                              Follow-up
                            </button>
                          )}

                          {/* Direct Official Quotation Builder button */}
                          <button
                            id={`quote-builder-${req.request_id}`}
                            onClick={() => navigate(`/admin/quotation/${req.id}`)}
                            title={['approved', 'downpayment_received', 'in_fabrication', 'installation_wip', 'completed'].includes(req.status) ? "View or edit official quotation proposal" : "Build official quotation with laser measurements"}
                            style={{
                              display: 'flex', alignItems: 'center', gap: '4px',
                              padding: '5px 11px', borderRadius: '7px',
                              border: 'none', backgroundColor: '#C5A059',
                              fontSize: '11px', fontWeight: 600, color: '#FFFFFF',
                              cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s',
                              boxShadow: '0 2px 6px rgba(197,160,89,0.25)',
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#B38D4A'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#C5A059'; }}
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                              <polyline points="14 2 14 8 20 8"></polyline>
                              <line x1="16" y1="13" x2="8" y2="13"></line>
                              <line x1="16" y1="17" x2="8" y2="17"></line>
                              <polyline points="10 9 9 9 8 9"></polyline>
                            </svg>
                            {['approved', 'downpayment_received', 'in_fabrication', 'installation_wip', 'completed'].includes(req.status) ? 'Edit Quote' : 'Build Quote'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Footer */}
      <p className="text-center text-xs mt-10 tracking-wide" style={{ color: '#9CA3AF' }}>
        Six Sigmaphil Corp. &middot; Admin Portal
      </p>

      {/* Detail modal */}
      {viewRequest && (
        <DetailModal
          request={viewRequest}
          onClose={() => {
            setViewRequest(null);
            if (searchParams.get('view')) {
              setSearchParams({});
            }
          }}
          onStatusChange={handleStatusChange}
          onRemarkAdded={handleRemarkAdded}
          onOpenFollowUp={(req) => setFollowUpRequest(req)}
          showToast={showToast}
          materials={materials}
        />
      )}

      {/* Follow-up Email Modal */}
      {followUpRequest && (
        <FollowUpModal
          request={followUpRequest}
          onClose={() => setFollowUpRequest(null)}
          onSuccess={(updatedHistory) => {
            handleRemarkAdded(
              followUpRequest.id,
              `Follow-up email sent to customer (${followUpRequest.email}) inquiring about project continuation.`,
              updatedHistory
            );
            showToast(`Follow-up email sent to ${followUpRequest.full_name}!`, 'success');
            setFollowUpRequest(null);
          }}
          showToast={showToast}
        />
      )}


      {/* Skeleton pulse animation */}
      <style>{`@keyframes db-pulse { 0%,100%{opacity:1} 50%{opacity:0.45} }`}</style>
    </div>
  );
}

