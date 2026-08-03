import { useEffect, useState, useMemo } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";

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

/* ── Status badge colours ── */
const STATUS_STYLES = {
  pending:    { bg: '#FFFBEB', color: '#B45309', border: '#FCD34D' },
  approved:   { bg: '#ECFDF5', color: '#065F46', border: '#6EE7B7' },
  'in-review': { bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' },
};

function StatusBadge({ status }) {
  const s = STATUS_STYLES[status] ?? { bg: '#F3F4F6', color: '#6B7280', border: '#D1D5DB' };
  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '5px',
        padding: '3px 10px', borderRadius: '999px', fontSize: '11px',
        fontWeight: 600, letterSpacing: '0.03em', textTransform: 'capitalize',
        backgroundColor: s.bg, color: s.color, border: `1px solid ${s.border}`,
      }}
    >
      <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: s.color, display: 'inline-block' }} />
      {status === 'in-review' ? 'In Review' : status.charAt(0).toUpperCase() + status.slice(1)}
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

/* ── Detail Modal ── */
function DetailModal({ request, onClose, onStatusChange }) {
  const [status, setStatus] = useState(request.status);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  const fmt = (n) => `₱${Number(n).toLocaleString('en-PH', { minimumFractionDigits: 0 })}`;

  const handleStatusSave = async (newStatus) => {
    if (newStatus === 'approved') {
      navigate(`/admin/quotation/${request.id}`);
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('quotation_requests')
        .update({ status: newStatus })
        .eq('id', request.id);
      if (error) throw error;
      setStatus(newStatus);
      onStatusChange(request.id, newStatus);
    } catch (err) {
      console.error('[Dashboard] Status update error:', err.message);
    } finally {
      setSaving(false);
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
          backgroundColor: '#ffffff', borderRadius: '18px', width: '100%', maxWidth: '560px',
          boxShadow: '0 24px 60px rgba(0,0,0,0.25)', overflow: 'hidden', position: 'relative',
        }}
      >
        {/* Header */}
        <div style={{ backgroundColor: '#232B32', padding: '22px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <p style={{ fontSize: '11px', color: '#C5A059', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Quotation Request
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

        <div style={{ padding: '24px', maxHeight: '70vh', overflowY: 'auto' }}>
          {/* Status control */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <StatusBadge status={status} />
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {status === 'approved' && (
                <button
                  onClick={() => navigate(`/admin/quotation/${request.id}`)}
                  style={{
                    padding: '7px 12px', borderRadius: '8px', border: 'none',
                    fontSize: '12px', fontWeight: 600, color: '#FFF', backgroundColor: '#C5A059',
                    cursor: 'pointer', outline: 'none', boxShadow: '0 4px 12px rgba(197,160,89,0.3)'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#B38D4A'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#C5A059'; }}
                >
                  Edit & Resend Quote
                </button>
              )}
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
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="in-review">In Review</option>
              </select>
            </div>
          </div>

          {/* Customer */}
          <p style={{ fontSize: '11px', fontWeight: 700, color: '#6B7280', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '8px' }}>Customer</p>
          <Row label="Full Name" value={request.full_name} />
          <Row label="Email"     value={request.email} />
          <Row label="Phone"     value={request.phone} />
          <Row label="Address"   value={request.address} />
          {request.notes && <Row label="Notes" value={request.notes} />}

          {/* Configuration */}
          <p style={{ fontSize: '11px', fontWeight: 700, color: '#6B7280', letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: '20px', marginBottom: '8px' }}>Configuration</p>
          <Row label="Product Type" value={request.product_type} />
          <Row label="Design"       value={request.design} />
          <Row label="Dimensions"   value={`${request.length}m × ${request.width}m`} />
          <Row label="Area"         value={`${Number(request.area).toFixed(2)} sqm`} />
          <Row label="Rate per sqm"    value={fmt(request.rate_per_sqm)} />

          {/* Costs */}
          <p style={{ fontSize: '11px', fontWeight: 700, color: '#6B7280', letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: '20px', marginBottom: '8px' }}>Cost Breakdown</p>
          <Row label="Material Cost"     value={fmt(request.material_cost)} />
          <Row label="Installation Cost" value={fmt(request.install_cost)} />
          <div style={{ marginTop: '12px', padding: '14px', borderRadius: '10px', backgroundColor: '#FDF8F0', border: '1px solid rgba(197,160,89,0.25)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, fontSize: '14px', color: '#232B32' }}>Total Estimated</span>
            <span style={{ fontWeight: 800, fontSize: '20px', color: '#C5A059' }}>{fmt(request.total_cost)}</span>
          </div>

          <p style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '12px' }}>
            Submitted: {new Date(request.created_at).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })}
          </p>
        </div>
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
  const [dataLoading, setDataLoading]   = useState(true);
  const [dataError, setDataError]       = useState('');

  /* ── Search & filter ── */
  const [searchQuery, setSearchQuery]   = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  /* ── Detail modal ── */
  const [viewRequest, setViewRequest]   = useState(null);

  /* ── Fetch quotation requests ── */
  useEffect(() => {

    const fetchRequests = async () => {
      setDataLoading(true);
      setDataError('');

      const { data, error } = await supabase
        .from('quotation_requests')
        .select('id, request_id, full_name, email, phone, address, notes, product_type, design, length, width, area, rate_per_sqm, material_cost, install_cost, total_cost, status, created_at')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[Dashboard] Fetch error:', error.message);
        setDataError('Unable to load quotation requests. Please try again.');
      } else {
        setRequests(data ?? []);
      }

      setDataLoading(false);
    };

    fetchRequests();
  }, []);

  /* ── Status update propagated from DetailModal ── */
  const handleStatusChange = (id, newStatus) => {
    setRequests((prev) => prev.map((r) => r.id === id ? { ...r, status: newStatus } : r));
  };

  /* ── Status update directly from table dropdown ── */
  const handleInlineStatusChange = async (id, newStatus) => {
    if (newStatus === 'approved') {
      navigate(`/admin/quotation/${id}`);
      return;
    }

    // Optimistic update
    setRequests((prev) => prev.map((r) => r.id === id ? { ...r, status: newStatus } : r));
    try {
      const { error } = await supabase
        .from('quotation_requests')
        .update({ status: newStatus })
        .eq('id', id);
      if (error) throw error;
    } catch (err) {
      console.error('[Dashboard] Inline status update error:', err.message);
      // Revert on failure — re-fetch
      const { data } = await supabase
        .from('quotation_requests')
        .select('id, status')
        .eq('id', id)
        .single();
      if (data) setRequests((prev) => prev.map((r) => r.id === id ? { ...r, status: data.status } : r));
    }
  };

  /* ── Derived stats ── */
  const stats = useMemo(() => ({
    total:    requests.length,
    pending:  requests.filter((r) => r.status === 'pending').length,
    approved: requests.filter((r) => r.status === 'approved').length,
    inReview: requests.filter((r) => r.status === 'in-review').length,
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

  return (
    <div className="p-4 md:p-8" style={{ backgroundColor: '#F9F9FB', minHeight: '100vh' }}>
      <div className="max-w-7xl mx-auto space-y-6">

        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Requests" value={stats.total}    isLoading={dataLoading} />
          <StatCard label="Pending"         value={stats.pending}  accent="#B45309"        isLoading={dataLoading} />
          <StatCard label="Approved"        value={stats.approved} accent="#065F46"        isLoading={dataLoading} />
          <StatCard label="In Review"       value={stats.inReview} accent="#1D4ED8"        isLoading={dataLoading} />
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
              placeholder="Search by name, email, or request ID\u2026"
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
              cursor: 'pointer', outline: 'none', minWidth: '130px',
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = '#C5A059'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = '#E2E8F0'; }}
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="in-review">In Review</option>
          </select>
        </div>

        {/* ── Quotation Requests Table ── */}
        <div
          className="rounded-2xl shadow-sm overflow-hidden"
          style={{ backgroundColor: '#ffffff', border: '1px solid #E2E8F0' }}
        >
          {/* Table header */}
          <div className="px-6 py-5 flex items-center gap-3" style={{ borderBottom: '1px solid #E2E8F0' }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#232B32' }}>
              <svg className="w-4 h-4" style={{ color: '#C5A059' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75a2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V19.5" />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-semibold tracking-widest uppercase" style={{ color: '#232B32' }}>
                Quotation Requests
              </h2>
              <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>
                {dataLoading ? 'Loading\u2026' : `${filtered.length} of ${requests.length} request${requests.length !== 1 ? 's' : ''}`}
              </p>
            </div>
          </div>

          {/* Error state */}
          {dataError && (
            <div className="px-6 py-4" style={{ backgroundColor: '#FEF2F2', borderBottom: '1px solid #FECACA' }}>
              <p style={{ fontSize: '13px', color: '#DC2626' }}>{dataError}</p>
            </div>
          )}

          {/* Table */}
          <div className="overflow-x-auto w-full">
            <table className="w-full text-sm" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                  {['Request ID', 'Customer', 'Product', 'Design', 'Area (sqm)', 'Price', 'Status', 'Date', 'Actions'].map((col) => (
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
                        <p style={{ fontSize: '13px', fontWeight: 600, color: '#232B32', whiteSpace: 'nowrap' }}>{req.full_name}</p>
                        <p style={{ fontSize: '11px', color: '#6B7280' }}>{req.email}</p>
                      </td>

                      {/* Product */}
                      <td className="px-5 py-4" style={{ fontSize: '13px', color: '#232B32', whiteSpace: 'nowrap' }}>
                        {req.product_type}
                      </td>

                      {/* Design */}
                      <td className="px-5 py-4" style={{ fontSize: '13px', color: '#232B32', whiteSpace: 'nowrap' }}>
                        {req.design}
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
                            title="Change status"
                            style={{
                              padding: '4px 8px', borderRadius: '6px', border: '1px solid #E2E8F0',
                              fontSize: '11px', fontWeight: 600, color: '#232B32',
                              backgroundColor: '#F9F9FB', cursor: 'pointer', outline: 'none',
                            }}
                            onFocus={(e) => { e.currentTarget.style.borderColor = '#C5A059'; }}
                            onBlur={(e) => { e.currentTarget.style.borderColor = '#E2E8F0'; }}
                          >
                            <option value="pending">Pending</option>
                            <option value="approved">Approved</option>
                            <option value="in-review">In Review</option>
                          </select>

                          {/* View detail button */}
                          <button
                            id={`view-request-${req.request_id}`}
                            onClick={() => setViewRequest(req)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: '4px',
                              padding: '4px 10px', borderRadius: '6px',
                              border: '1px solid #E2E8F0', backgroundColor: '#F9F9FB',
                              fontSize: '12px', fontWeight: 600, color: '#C5A059',
                              cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s',
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#FDF8F0'; e.currentTarget.style.borderColor = '#C5A059'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#F9F9FB'; e.currentTarget.style.borderColor = '#E2E8F0'; }}
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                            </svg>
                            View
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
          onClose={() => setViewRequest(null)}
          onStatusChange={handleStatusChange}
        />
      )}

      {/* Skeleton pulse animation */}
      <style>{`@keyframes db-pulse { 0%,100%{opacity:1} 50%{opacity:0.45} }`}</style>
    </div>
  );
}
