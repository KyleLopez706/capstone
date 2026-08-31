import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useToast, ToastNotification } from "../utils/toast";

/* ── Modal component ── */
function MessageModal({ message, onClose }) {
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
        <div style={{ backgroundColor: '#232B32', padding: '22px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <p style={{ fontSize: '11px', color: '#C5A059', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Contact Message
            </p>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#F9F9FB', marginTop: '4px' }}>
              {message.subject || 'General Inquiry'}
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F3F4F6', paddingBottom: '12px' }}>
              <div>
                <p style={{ fontSize: '11px', fontWeight: 700, color: '#6B7280', letterSpacing: '0.06em', textTransform: 'uppercase' }}>From</p>
                <p style={{ fontSize: '14px', fontWeight: 600, color: '#232B32', marginTop: '4px' }}>{message.full_name}</p>
                <p style={{ fontSize: '12px', color: '#6B7280' }}>
                  {message.email} {message.phone && <span style={{ color: '#D1D5DB', margin: '0 4px' }}>|</span>} {message.phone}
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: '11px', fontWeight: 700, color: '#6B7280', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Date</p>
                <p style={{ fontSize: '12px', color: '#232B32', marginTop: '4px', fontWeight: 500 }}>
                  {new Date(message.created_at).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })}
                </p>
              </div>
            </div>

            <div>
              <p style={{ fontSize: '11px', fontWeight: 700, color: '#6B7280', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '8px' }}>Message Body</p>
              <div style={{ 
                backgroundColor: '#F9F9FB', borderRadius: '12px', padding: '16px', 
                border: '1px solid #E2E8F0', color: '#232B32', fontSize: '14px', lineHeight: '1.6',
                whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflowWrap: 'anywhere'
              }}>
                {message.message}
              </div>
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminMessages() {
  const [messages, setMessages] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [viewMessage, setViewMessage] = useState(null);
  const { toast, showToast, dismissToast } = useToast();

  useEffect(() => {
    const fetchMessages = async () => {
      setDataLoading(true);

      const { data, error } = await supabase
        .from('contact_messages')
        .select('*')
        .order('created_at', { ascending: false });

      if (error && error.code !== '42P01') {
        console.error('[AdminMessages] Fetch messages error:', error.message);
        showToast('Unable to load messages. Please try again.', 'error');
      } else {
        setMessages(data ?? []);
      }

      setDataLoading(false);
    };

    fetchMessages();
  }, [showToast]);

  return (
    <div className="p-4 md:p-8" style={{ backgroundColor: '#F9F9FB', minHeight: '100vh' }}>
      <ToastNotification toast={toast} onDismiss={dismissToast} />
      <div className="max-w-7xl mx-auto space-y-6">

        {/* ── Messages Table ── */}
        <div className="rounded-2xl shadow-sm overflow-hidden" style={{ backgroundColor: '#ffffff', border: '1px solid #E2E8F0' }}>
          
          <div className="px-6 py-5 flex items-center gap-3" style={{ borderBottom: '1px solid #E2E8F0' }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#232B32' }}>
              <svg className="w-4 h-4" style={{ color: '#C5A059' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-semibold tracking-widest uppercase" style={{ color: '#232B32' }}>
                Contact Messages
              </h2>
              <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>
                {dataLoading ? 'Loading…' : `${messages.length} message${messages.length !== 1 ? 's' : ''}`}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto w-full">
            <table className="w-full text-sm" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                  {['Name', 'Email & Phone', 'Subject', 'Message', 'Date', 'Actions'].map((col) => (
                    <th key={col} className="text-left text-xs font-semibold tracking-widest uppercase px-5 py-3" style={{ color: '#6B7280', whiteSpace: 'nowrap' }}>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dataLoading ? (
                  <tr><td colSpan={6} className="px-5 py-8 text-center" style={{ color: '#9CA3AF' }}>Loading...</td></tr>
                ) : messages.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-14 text-center" style={{ color: '#9CA3AF', fontSize: '13px' }}>
                      No messages yet.
                    </td>
                  </tr>
                ) : (
                  messages.map((msg, idx) => (
                    <tr key={msg.id} style={{ borderBottom: idx < messages.length - 1 ? '1px solid #F3F4F6' : 'none' }}>
                      <td className="px-5 py-4" style={{ fontWeight: 600, color: '#232B32', whiteSpace: 'nowrap' }}>{msg.full_name}</td>
                      <td className="px-5 py-4" style={{ color: '#6B7280', whiteSpace: 'nowrap' }}>
                        <div>{msg.email}</div>
                        {msg.phone && <div style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '2px' }}>{msg.phone}</div>}
                      </td>
                      <td className="px-5 py-4" style={{ fontWeight: 600, color: '#232B32', whiteSpace: 'nowrap' }}>{msg.subject || 'General Inquiry'}</td>
                      <td className="px-5 py-4" style={{ color: '#6B7280', maxWidth: '250px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{msg.message}</td>
                      <td className="px-5 py-4" style={{ color: '#6B7280', whiteSpace: 'nowrap' }}>
                        {new Date(msg.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="px-5 py-4">
                        <button
                          onClick={() => setViewMessage(msg)}
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
      {viewMessage && (
        <MessageModal
          message={viewMessage}
          onClose={() => setViewMessage(null)}
        />
      )}
    </div>
  );
}
