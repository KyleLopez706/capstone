import { useEffect, useState } from "react";
import { useNavigate, Outlet, Link, useLocation } from "react-router-dom";
import { supabase } from "../supabaseClient";

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isVerifying, setIsVerifying] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);

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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
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
        className={`flex flex-col shrink-0 shadow-sm md:h-screen sticky top-0 z-50 transition-all duration-300 ${isCollapsed ? 'md:w-20' : 'md:w-64'}`}
        style={{ backgroundColor: '#232B32', borderRight: '1px solid #1a2025' }}
      >
        <div className="p-4 md:p-6 pb-2 md:pb-6 flex justify-between items-center md:flex-col md:items-stretch border-b md:border-b-0 border-[#1a2025]">
          <div className="flex justify-between items-center">
            {/* Desktop Toggle Button */}
            <button 
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden md:flex p-2 rounded-lg text-[#9CA3AF] hover:text-[#F9F9FB] hover:bg-[rgba(255,255,255,0.05)] transition-colors"
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
            
            {/* Mobile Sign Out Icon */}
            <button 
              onClick={handleLogout}
              className="md:hidden p-2 rounded-lg text-[#9CA3AF] hover:text-[#C5A059] transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
            </button>
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

      {/* ── Main Content Area ── */}
      <main className="flex-1 w-full overflow-y-auto">
        <Outlet />
      </main>

    </div>
  );
}
