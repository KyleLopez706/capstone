import { useEffect, useState, useRef } from "react";
import { useNavigate, Outlet, Link, useLocation } from "react-router-dom";
import { supabase } from "../supabaseClient";

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isVerifying, setIsVerifying] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Notification & Realtime states
  const [pendingCount, setPendingCount] = useState(0);
  const [recentRequests, setRecentRequests] = useState([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSwinging, setIsSwinging] = useState(false);
  const [newQuoteToast, setNewQuoteToast] = useState(null);
  const dropdownRef = useRef(null);
  const swingTimerRef = useRef(null);

  // Global Auth Guard for Admin pages
  useEffect(() => {
    const verifyAdmin = async () => {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        navigate('/login');
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (profileError || profile?.role !== 'admin') {
        navigate('/');
        return;
      }

      setIsVerifying(false);
    };

    verifyAdmin();
  }, [navigate]);

  // Click outside to close notification dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch pending count and recent 5 requests
  const fetchQuotationData = async () => {
    try {
      // 1. Fetch exact pending count
      const { count, error: countErr } = await supabase
        .from('quotation_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      if (!countErr && count !== null) {
        setPendingCount(count);
      }

      // 2. Fetch recent 5 quotation requests
      const { data: recent, error: recentErr } = await supabase
        .from('quotation_requests')
        .select('id, request_id, full_name, product_type, design, total_cost, status, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

      if (!recentErr && recent) {
        setRecentRequests(recent);
      }
    } catch (err) {
      console.warn('[AdminLayout] Failed to load quotation alerts:', err);
    }
  };

  // Web Audio API Dual-Tone Chime
  const playBellChime = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'triangle';

      osc1.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc1.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
      osc2.frequency.setValueAtTime(880, ctx.currentTime);
      osc2.frequency.exponentialRampToValueAtTime(1174.66, ctx.currentTime + 0.2); // D6

      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start();
      osc2.start();
      osc1.stop(ctx.currentTime + 0.8);
      osc2.stop(ctx.currentTime + 0.8);
    } catch (e) {
      // Audio autoplay policy fallback
    }
  };

  const triggerIncomingQuoteAlert = (newQuote) => {
    setPendingCount((prev) => prev + 1);
    setRecentRequests((prev) => [newQuote, ...(prev || [])].slice(0, 5));
    setIsSwinging(true);
    playBellChime();
    setNewQuoteToast({
      id: newQuote.id || Date.now(),
      requestId: newQuote.request_id || 'Q-NEW',
      name: newQuote.full_name || 'Prospective Client',
      material: newQuote.design || 'Natural Stone',
      product: newQuote.product_type || 'Structure',
      amount: newQuote.total_cost || 0,
      isVerified: newQuote.is_verified || true,
    });

    clearTimeout(swingTimerRef.current);
    swingTimerRef.current = setTimeout(() => {
      setIsSwinging(false);
    }, 10000);
  };

  // Realtime & Cross-tab subscriptions
  useEffect(() => {
    if (isVerifying) return;

    Promise.resolve().then(() => {
      fetchQuotationData();
    });

    // 1. Supabase Realtime channel subscription
    const channel = supabase
      .channel('admin_quotation_alerts')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'quotation_requests' },
        (payload) => {
          triggerIncomingQuoteAlert(payload.new);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'quotation_requests' },
        () => {
          fetchQuotationData();
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'quotation_requests' },
        () => {
          fetchQuotationData();
        }
      )
      .subscribe();

    // 2. BroadcastChannel for instant cross-tab alerting
    let bc;
    try {
      bc = new BroadcastChannel('sixsigma_quotation_alert');
      bc.onmessage = (event) => {
        if (event.data?.type === 'NEW_QUOTATION') {
          triggerIncomingQuoteAlert(event.data.quote);
        }
      };
    } catch (e) {}

    // 3. LocalStorage storage event fallback
    const handleStorage = (e) => {
      if (e.key === 'sixsigma_new_quotation_alert' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          triggerIncomingQuoteAlert(parsed);
        } catch (err) {}
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      clearTimeout(swingTimerRef.current);
      supabase.removeChannel(channel);
      if (bc) bc.close();
      window.removeEventListener('storage', handleStorage);
    };
  }, [isVerifying]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const formatTimeAgo = (dateString) => {
    if (!dateString) return '';
    const now = new Date();
    const past = new Date(dateString);
    const diffSec = Math.floor((now - past) / 1000);

    if (diffSec < 60) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour}h ago`;
    const diffDay = Math.floor(diffHour / 24);
    if (diffDay < 7) return `${diffDay}d ago`;
    return past.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
  };

  const fmt = (n) =>
    `₱${Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return { label: 'Pending Inspection', bg: '#FFFBEB', color: '#B45309', border: '#FCD34D' };
      case 'inspection_scheduled':
        return { label: 'Inspection Scheduled', bg: '#F0F9FF', color: '#0369A1', border: '#BAE6FD' };
      case 'inspection_completed':
        return { label: 'Inspection Done', bg: '#EEF2FF', color: '#4338CA', border: '#C7D2FE' };
      case 'approved':
        return { label: 'Quote Sent', bg: '#ECFDF5', color: '#047857', border: '#A7F3D0' };
      case 'downpayment_received':
        return { label: 'Downpayment', bg: '#FDF8F0', color: '#B38D4A', border: '#E9D5A1' };
      case 'in_fabrication':
        return { label: 'In Fabrication', bg: '#F0F9FF', color: '#0284C7', border: '#BAE6FD' };
      case 'installation_wip':
        return { label: 'Installation', bg: '#F5F3FF', color: '#6D28D9', border: '#DDD6FE' };
      case 'completed':
        return { label: 'Completed', bg: '#D1FAE5', color: '#065F46', border: '#6EE7B7' };
      case 'cancelled':
        return { label: 'Cancelled', bg: '#FFF1F2', color: '#BE123C', border: '#FECDD3' };
      default:
        return { label: (status || 'New').replace(/_/g, ' '), bg: '#F3F4F6', color: '#6B7280', border: '#E5E7EB' };
    }
  };

  const getPageTitle = (pathname) => {
    if (pathname.startsWith('/dashboard')) return 'Overview & Quotations';
    if (pathname.startsWith('/analytics')) return 'Analytics & Insights';
    if (pathname.startsWith('/messages')) return 'Client Inquiries';
    if (pathname.startsWith('/admin/materials')) return 'Warehouse & Materials';
    if (pathname.startsWith('/admin/models')) return '3D Configurator Models';
    if (pathname.startsWith('/admin/cabinet-colors')) return 'Cabinet Color Palettes';
    if (pathname.startsWith('/admin/gallery')) return 'Completed Works Gallery';
    if (pathname.startsWith('/admin/settings')) return 'Enterprise Settings';
    return 'Admin Management';
  };

  const handleSelectRequest = (req) => {
    setIsDropdownOpen(false);
    setIsSwinging(false);
    navigate(`/dashboard?view=${req.request_id || req.id}`);
  };

  const handleViewAll = () => {
    setIsDropdownOpen(false);
    setIsSwinging(false);
    navigate('/dashboard');
  };

  if (isVerifying) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center" style={{ backgroundColor: '#F9F9FB' }}>
        <div className="text-center">
          <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin mx-auto mb-4"
            style={{ borderColor: '#C5A059', borderTopColor: 'transparent' }} />
          <p className="text-xs tracking-widest uppercase" style={{ color: '#9CA3AF' }}>Verifying access…</p>
        </div>
      </div>
    );
  }

  const navLinks = [
    { name: "Overview", path: "/dashboard", icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7"></rect>
        <rect x="14" y="3" width="7" height="7"></rect>
        <rect x="14" y="14" width="7" height="7"></rect>
        <rect x="3" y="14" width="7" height="7"></rect>
      </svg>
    )},
    { name: "Insights", path: "/analytics", icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10"></line>
        <line x1="12" y1="20" x2="12" y2="4"></line>
        <line x1="6" y1="20" x2="6" y2="14"></line>
      </svg>
    )},
    { name: "Messages", path: "/messages", icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
        <polyline points="22,6 12,13 2,6"></polyline>
      </svg>
    )},
    { name: "Materials", path: "/admin/materials", icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1"></rect>
        <rect x="14" y="3" width="7" height="7" rx="1"></rect>
        <rect x="3" y="14" width="7" height="7" rx="1"></rect>
        <rect x="14" y="14" width="7" height="7" rx="1"></rect>
      </svg>
    )},
    { name: "Models", path: "/admin/models", icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
        <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
        <line x1="12" y1="22.08" x2="12" y2="12"></line>
      </svg>
    )},
    { name: "Cabinet Colors", path: "/admin/cabinet-colors", icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
        <line x1="3" y1="9" x2="21" y2="9"></line>
        <line x1="9" y1="21" x2="9" y2="9"></line>
      </svg>
    )},
    { name: "Gallery", path: "/admin/gallery", icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
        <circle cx="8.5" cy="8.5" r="1.5"></circle>
        <polyline points="21 15 16 10 5 21"></polyline>
      </svg>
    )},
    { name: "Settings", path: "/admin/settings", icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"></circle>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
      </svg>
    )}
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row" style={{ backgroundColor: '#F9F9FB' }}>
      
      {/* ── Left Sidebar (Desktop) / Top Nav (Mobile) ── */}
      <nav 
        className={`flex flex-col shrink-0 shadow-sm md:h-screen md:sticky md:top-0 z-50 transition-all duration-300 ${isCollapsed ? 'md:w-20' : 'md:w-64'}`}
        style={{ backgroundColor: '#232B32', borderRight: '1px solid #1a2025' }}
      >
        <div className="p-4 md:p-6 pb-2 md:pb-6 flex justify-between items-center md:flex-col md:items-stretch border-b md:border-b-0 border-[#1a2025]">
          <div className="flex justify-between items-center">
            {/* Desktop Toggle Button */}
            <button 
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden md:flex p-2 rounded-lg text-[#9CA3AF] hover:text-[#F9F9FB] hover:bg-[rgba(255,255,255,0.05)] transition-colors cursor-pointer"
              title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {isCollapsed ? (
                  <polyline points="13 17 18 12 13 7"></polyline>
                ) : (
                  <polyline points="15 18 9 12 15 6"></polyline>
                )}
              </svg>
            </button>
            
            {/* Mobile Actions: Sign Out */}
            <div className="flex items-center gap-2 md:hidden">
              <button 
                onClick={handleLogout}
                className="p-2 rounded-lg text-[#9CA3AF] hover:text-[#C5A059] transition-colors cursor-pointer"
                title="Sign Out"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                  <polyline points="16 17 21 12 16 7"></polyline>
                  <line x1="21" y1="12" x2="9" y2="12"></line>
                </svg>
              </button>
            </div>
          </div>
          
          <div className={`mt-4 ${isCollapsed ? 'hidden md:hidden' : 'block'}`}>
            <h1 className="text-xl font-light tracking-widest uppercase" style={{ color: '#F9F9FB' }}>
              Six Sigmaphil
            </h1>
            <p className="text-xs tracking-wide mt-1" style={{ color: '#C5A059' }}>Admin Panel</p>
          </div>
          {isCollapsed && (
            <div className="hidden md:block mt-4 text-center">
              <h1 className="text-xl font-light tracking-widest uppercase" style={{ color: '#C5A059' }}>
                SSP
              </h1>
            </div>
          )}
        </div>

        {/* Navigation Links */}
        <div className="flex-1 px-4 py-2 md:py-6 flex flex-row md:flex-col overflow-x-auto gap-2 border-b md:border-b-0 border-[#1a2025]">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.name}
                to={link.path}
                title={isCollapsed ? link.name : ""}
                className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-4 py-3 rounded-xl transition-all duration-200 min-w-max md:min-w-0`}
                style={{
                  backgroundColor: isActive ? '#C5A059' : 'transparent',
                  color: isActive ? '#ffffff' : '#9CA3AF',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.color = '#F9F9FB';
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.color = '#9CA3AF';
                }}
              >
                {link.icon}
                {!isCollapsed && (
                  <span className="text-sm font-semibold tracking-widest uppercase">{link.name}</span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Desktop Sign Out Button */}
        <div className="hidden md:block p-4 mt-auto">
          <button
            onClick={handleLogout}
            title={isCollapsed ? "Sign Out" : ""}
            className={`w-full flex items-center justify-center gap-2 font-semibold text-xs tracking-widest uppercase ${isCollapsed ? 'p-3' : 'py-3 px-4'} rounded-xl transition-all duration-200 cursor-pointer`}
            style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: '#F9F9FB', border: '1px solid rgba(255,255,255,0.1)' }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'; }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            {!isCollapsed && "Sign Out"}
          </button>
        </div>
      </nav>

      {/* ── Main Content Area with Universal Top Header ── */}
      <main className="flex-1 w-full flex flex-col min-w-0">
        
        {/* Top Header Bar with Realtime Swinging Bell */}
        <header
          className="sticky top-0 z-40 bg-[#FFFFFF] border-b border-[#E2E8F0] px-4 md:px-8 py-3 flex items-center justify-between"
          style={{ backdropFilter: 'blur(8px)', backgroundColor: 'rgba(255,255,255,0.96)' }}
        >
          {/* Breadcrumbs / Page Identifier (Hidden on Analytics as requested) */}
          {location.pathname !== '/admin/analytics' ? (
            <div className="flex items-center gap-2 min-w-0">
              <span className="hidden sm:inline-block text-[11px] font-bold tracking-widest uppercase text-[#C5A059]">
                SIX SIGMAPHIL
              </span>
              <span className="hidden sm:inline-block text-[#9CA3AF] text-xs">/</span>
              <h2 className="text-sm md:text-base font-bold text-[#232B32] truncate">
                {getPageTitle(location.pathname)}
              </h2>
            </div>
          ) : (
            <div />
          )}

          {/* Right Header Actions */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Swinging Notification Bell Component */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => {
                  setIsDropdownOpen(!isDropdownOpen);
                  setIsSwinging(false);
                }}
                className="relative p-2.5 rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] hover:bg-[#F9F9FB] text-[#232B32] hover:text-[#C5A059] transition-all cursor-pointer focus:outline-none shadow-xs"
                title="Quotation Notifications"
                aria-label="Quotation Notifications"
              >
                {/* Bell Icon with conditional swinging class */}
                <span className={isSwinging ? "bell-swinging inline-block" : "inline-block"}>
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={isSwinging ? "#C5A059" : "currentColor"}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                  </svg>
                </span>

                {/* Unread Pending Count Badge */}
                {pendingCount > 0 && (
                  <span
                    className="absolute -top-1.5 -right-1.5 min-w-[20px] h-[20px] px-1 rounded-full flex items-center justify-center text-[10px] font-bold text-[#FFFFFF] shadow-sm bell-badge-pulse"
                    style={{ backgroundColor: '#C5A059' }}
                  >
                    {pendingCount > 99 ? '99+' : pendingCount}
                  </span>
                )}

                {/* Animated Ping Ring when swinging */}
                {isSwinging && (
                  <span
                    className="absolute -top-1.5 -right-1.5 w-[20px] h-[20px] rounded-full animate-ping opacity-75"
                    style={{ backgroundColor: '#C5A059' }}
                  />
                )}
              </button>

              {/* Notification Dropdown Preview */}
              {isDropdownOpen && (
                <div
                  className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl shadow-2xl bg-[#FFFFFF] border border-[#E2E8F0] overflow-hidden z-50 animate-fadeIn"
                  style={{ filter: 'drop-shadow(0 14px 30px rgba(35, 43, 50, 0.12))' }}
                >
                  {/* Dropdown Header */}
                  <div className="p-4 bg-[#F9F9FB] border-b border-[#E2E8F0] flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-[#232B32]">Quotation Alerts</h4>
                        {pendingCount > 0 && (
                          <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded-full text-[#FFFFFF]"
                            style={{ backgroundColor: '#C5A059' }}
                          >
                            {pendingCount} Pending
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#6B7280] mt-0.5">Real-time incoming customer requests</p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setIsSwinging(true);
                          setTimeout(() => setIsSwinging(false), 4000);
                        }}
                        className="p-1.5 rounded-lg hover:bg-[#FFFFFF] text-[#9CA3AF] hover:text-[#C5A059] transition-colors border border-transparent hover:border-[#E2E8F0] cursor-pointer"
                        title="Simulate Bell Swing Animation"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                          <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                        </svg>
                      </button>
                      <button
                        onClick={fetchQuotationData}
                        className="p-1.5 rounded-lg hover:bg-[#FFFFFF] text-[#9CA3AF] hover:text-[#232B32] transition-colors border border-transparent hover:border-[#E2E8F0] cursor-pointer"
                        title="Refresh Quotations"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M23 4v6h-6"></path>
                          <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Dropdown Content / List */}
                  <div className="max-h-80 overflow-y-auto divide-y divide-[#F3F4F6]">
                    {recentRequests.length === 0 ? (
                      <div className="py-8 px-4 text-center">
                        <div className="w-10 h-10 rounded-full bg-[#F9F9FB] border border-[#E2E8F0] text-[#9CA3AF] flex items-center justify-center mx-auto mb-2">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                          </svg>
                        </div>
                        <p className="text-xs font-semibold text-[#232B32]">No Quotation Alerts</p>
                        <p className="text-[11px] text-[#9CA3AF] mt-0.5">All customer requests have been attended to.</p>
                      </div>
                    ) : (
                      recentRequests.map((req) => {
                        const badge = getStatusBadge(req.status);
                        return (
                          <button
                            key={req.id || req.request_id}
                            onClick={() => handleSelectRequest(req)}
                            className="w-full text-left p-3.5 hover:bg-[#FDF8F0] transition-colors flex items-start justify-between gap-3 group cursor-pointer"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-[11px] font-mono font-bold text-[#C5A059]">
                                  {req.request_id || 'Q-RECENT'}
                                </span>
                                <span className="text-[10px] text-[#9CA3AF]">
                                  {formatTimeAgo(req.created_at)}
                                </span>
                              </div>
                              <p className="text-xs font-bold text-[#232B32] group-hover:text-[#C5A059] transition-colors truncate">
                                {req.full_name || 'Anonymous Client'}
                              </p>
                              <p className="text-[11px] text-[#6B7280] truncate mt-0.5">
                                {req.product_type} &bull; {req.design}
                              </p>
                            </div>

                            <div className="text-right shrink-0">
                              <p className="text-xs font-bold text-[#232B32]">
                                {fmt(req.total_cost)}
                              </p>
                              <span
                                className="inline-block mt-1 text-[9px] font-semibold px-2 py-0.5 rounded-full"
                                style={{ backgroundColor: badge.bg, color: badge.color, border: `1px solid ${badge.border}` }}
                              >
                                {badge.label}
                              </span>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>

                  {/* Dropdown Footer */}
                  <div className="p-3 bg-[#F9F9FB] border-t border-[#E2E8F0] text-center">
                    <button
                      onClick={handleViewAll}
                      className="w-full py-2 px-3 rounded-xl bg-[#232B32] hover:bg-[#C5A059] text-[#FFFFFF] text-xs font-semibold tracking-wider uppercase transition-colors flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span>View All in Dashboard</span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="9 18 15 12 9 6"></polyline>
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Real-time Toast Alert for New Inbound Quote */}
        {newQuoteToast && (
          <div
            className="fixed top-20 right-4 sm:right-8 z-50 max-w-sm w-full bg-[#FFFFFF] border-2 border-[#C5A059] rounded-2xl shadow-2xl p-4 flex items-start gap-3 transition-all"
            style={{ filter: 'drop-shadow(0 14px 35px rgba(197, 160, 89, 0.3))' }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border"
              style={{ backgroundColor: '#FDF8F0', borderColor: '#E9D5A1', color: '#C5A059' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="bell-swinging">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold tracking-wider uppercase text-[#C5A059]">New Incoming Quote</span>
                <button
                  onClick={() => setNewQuoteToast(null)}
                  className="text-[#9CA3AF] hover:text-[#232B32] p-0.5 cursor-pointer"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
              <p className="text-xs font-bold text-[#232B32] truncate mt-0.5">
                {newQuoteToast.name} &bull; <span className="font-mono text-[#C5A059]">{newQuoteToast.requestId}</span>
              </p>
              <p className="text-[11px] text-[#6B7280] truncate mt-0.5">
                {newQuoteToast.material} &bull; <strong className="text-[#232B32]">{fmt(newQuoteToast.amount)}</strong>
              </p>
              <button
                onClick={() => {
                  const reqId = newQuoteToast.requestId;
                  setNewQuoteToast(null);
                  navigate(`/dashboard?view=${reqId}`);
                }}
                className="mt-2 text-xs font-semibold text-[#C5A059] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Open Project Review</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Main Routed Page Content */}
        <div className="flex-1">
          <Outlet />
        </div>
      </main>

      {/* Bell Swinging & Pulse Animations */}
      <style>{`
        @keyframes bell-swing {
          0% { transform: rotate(0deg); }
          15% { transform: rotate(18deg); }
          30% { transform: rotate(-15deg); }
          45% { transform: rotate(12deg); }
          60% { transform: rotate(-8deg); }
          75% { transform: rotate(4deg); }
          100% { transform: rotate(0deg); }
        }
        .bell-swinging {
          animation: bell-swing 0.8s cubic-bezier(0.36, 0.07, 0.19, 0.97) infinite;
          transform-origin: top center;
        }
        @keyframes bell-badge-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.18); }
        }
        .bell-badge-pulse {
          animation: bell-badge-pulse 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
