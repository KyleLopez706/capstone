import { useState, useRef, useEffect } from 'react';
import MaterialPanel      from './MaterialPanel';
import ConfiguratorCanvas from './ConfiguratorCanvas';
import DimensionPanel     from './DimensionPanel';
import useConfiguratorStore from '../../store/configuratorStore';

/* ─────────────────────────────────────────
   CONFIGURATOR LAYOUT
   2-column composition (Light Theme):
     Left  → ConfiguratorCanvas (3D preview, massive)
     Right → Tabbed Control Panel (Materials / Dimensions)
───────────────────────────────────────── */
export default function ConfiguratorLayout() {
  const setAppMode       = useConfiguratorStore((s) => s.setAppMode);
  const selectedStructure = useConfiguratorStore((s) => s.selectedStructure);
  const canvasTheme       = useConfiguratorStore((s) => s.canvasTheme);
  const toggleCanvasTheme = useConfiguratorStore((s) => s.toggleCanvasTheme);
  const modelUrl          = selectedStructure?.model_url ?? '';

  const [activeTab, setActiveTab] = useState('materials');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const layoutRef = useRef(null);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullScreen = async () => {
    if (!document.fullscreenElement) {
      if (layoutRef.current?.requestFullscreen) {
        await layoutRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      }
    }
  };

  return (
    <div ref={layoutRef} className="flex flex-col relative bg-white dark:bg-[#1a1e22]" style={{ height: isFullscreen ? '100vh' : 'calc(100vh - 64px)' }}>
      {/* ── Top Bar ── */}
      <div
        className="flex items-center justify-between px-4 sm:px-6 h-12 shrink-0 relative z-20"
        style={{
          backgroundColor: canvasTheme === 'dark' ? '#1a1e22' : '#FFFFFF',
          borderBottom: `1px solid ${canvasTheme === 'dark' ? 'rgba(226,232,240,0.1)' : '#E2E8F0'}`,
          transition: 'background-color 0.3s ease'
        }}
      >
        {/* Back button */}
        <button
          id="back-to-showroom-btn"
          onClick={() => setAppMode('showroom')}
          className="flex items-center gap-2 text-xs font-semibold tracking-widest uppercase cursor-pointer transition-colors duration-150"
          style={{ color: canvasTheme === 'dark' ? '#9CA3AF' : '#6B7280' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#C5A059')}
          onMouseLeave={(e) => (e.currentTarget.style.color = canvasTheme === 'dark' ? '#9CA3AF' : '#6B7280')}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
          Showroom
        </button>

        {/* Centre title */}
        <p 
          className="text-xs font-semibold tracking-widest uppercase hidden sm:block"
          style={{ color: canvasTheme === 'dark' ? '#F9F9FB' : '#232B32' }}
        >
          {selectedStructure?.name ?? 'Bathroom Countertop'} · Configurator
        </p>

        {/* Right Controls */}
        <div className="flex items-center gap-1">
          {/* Sidebar Toggle */}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="flex items-center justify-center w-8 h-8 rounded-full cursor-pointer transition-colors duration-150"
            style={{ color: canvasTheme === 'dark' ? '#9CA3AF' : '#6B7280' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#C5A059')}
            onMouseLeave={(e) => (e.currentTarget.style.color = canvasTheme === 'dark' ? '#9CA3AF' : '#6B7280')}
            title={isSidebarOpen ? "Hide Sidebar" : "Show Sidebar"}
          >
            {isSidebarOpen ? (
              <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v16.5h16.5V3.75H3.75z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 3.75v16.5" />
              </svg>
            ) : (
              <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v16.5h16.5V3.75H3.75z" />
              </svg>
            )}
          </button>

          {/* Full Screen Toggle */}
          <button
            onClick={toggleFullScreen}
            className="flex items-center justify-center w-8 h-8 rounded-full cursor-pointer transition-colors duration-150"
            style={{ color: canvasTheme === 'dark' ? '#9CA3AF' : '#6B7280' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#C5A059')}
            onMouseLeave={(e) => (e.currentTarget.style.color = canvasTheme === 'dark' ? '#9CA3AF' : '#6B7280')}
            title="Toggle Full Screen"
          >
            {isFullscreen ? (
              <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-3.75 3.75M15 9V4.5M15 9h4.5M15 9l3.75-3.75M15 15v4.5M15 15h4.5M15 15l3.75 3.75" />
              </svg>
            ) : (
              <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
              </svg>
            )}
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleCanvasTheme}
            className="flex items-center justify-center w-8 h-8 rounded-full cursor-pointer transition-colors duration-150"
            style={{ color: canvasTheme === 'dark' ? '#9CA3AF' : '#6B7280' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#C5A059')}
            onMouseLeave={(e) => (e.currentTarget.style.color = canvasTheme === 'dark' ? '#9CA3AF' : '#6B7280')}
            title="Toggle Canvas Theme"
          >
            {canvasTheme === 'dark' ? (
              <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
              </svg>
            ) : (
              <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* ── Main Area (Full-screen Canvas with Floating Sidebar) ── */}
      <div className="flex-1 flex flex-col lg:block relative overflow-hidden">
        
        {/* 3D Canvas Area */}
        <div className={`relative w-full ${isSidebarOpen ? 'h-[50vh]' : 'flex-1'} lg:absolute lg:inset-0 lg:w-full lg:h-full z-0`}>
          {modelUrl ? (
            <ConfiguratorCanvas modelUrl={modelUrl} />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <p className="text-xs tracking-widest uppercase" style={{ color: canvasTheme === 'dark' ? '#9CA3AF' : '#6B7280' }}>
                Loading model…
              </p>
            </div>
          )}
        </div>

        {/* Floating Tabbed Control Panel (Lamborghini Style) */}
        <div 
          className={`relative flex-1 w-full lg:absolute lg:top-0 lg:bottom-0 lg:right-0 lg:w-[420px] flex flex-col z-10 transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}
          style={{
            backgroundColor: 'rgba(28, 32, 38, 0.85)',
            backdropFilter: 'blur(10px)',
            borderLeft: '1px solid rgba(226, 232, 240, 0.1)',
            display: isSidebarOpen ? 'flex' : 'none',
          }}
        >
          {/* Tabs Header */}
          <div className="flex px-4 pt-4 shrink-0" style={{ borderBottom: '1px solid rgba(226, 232, 240, 0.1)' }}>
            <button
              onClick={() => setActiveTab('materials')}
              className="flex-1 pb-3 text-xs font-semibold tracking-widest uppercase transition-colors"
              style={{
                color: activeTab === 'materials' ? '#C5A059' : '#9CA3AF',
                borderBottom: activeTab === 'materials' ? '2px solid #C5A059' : '2px solid transparent'
              }}
            >
              Materials
            </button>
            <button
              onClick={() => setActiveTab('dimensions')}
              className="flex-1 pb-3 text-xs font-semibold tracking-widest uppercase transition-colors"
              style={{
                color: activeTab === 'dimensions' ? '#C5A059' : '#9CA3AF',
                borderBottom: activeTab === 'dimensions' ? '2px solid #C5A059' : '2px solid transparent'
              }}
            >
              Dimensions
            </button>
          </div>

          {/* Active Tab Content */}
          <div className="flex-1 overflow-hidden relative">
            <div className="w-full h-full absolute inset-0" style={{ display: activeTab === 'materials' ? 'block' : 'none' }}>
              <MaterialPanel />
            </div>
            <div className="w-full h-full absolute inset-0" style={{ display: activeTab === 'dimensions' ? 'block' : 'none' }}>
              <DimensionPanel />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
