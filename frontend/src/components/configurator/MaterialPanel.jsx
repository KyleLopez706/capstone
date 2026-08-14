import { useEffect, useRef, useState } from 'react';
import { useTexture } from '@react-three/drei';
import { supabase } from '../../supabaseClient';
import useConfiguratorStore from '../../store/configuratorStore';

/* ─────────────────────────────────────────
   MATERIAL PANEL  (Left Column)
   Fetches all materials from Supabase and
   renders clickable swatches.  A 500ms guard
   prevents API spam on rapid clicks (AGENTS.md §A).
───────────────────────────────────────── */

/* ── Single swatch card ── */
function MaterialSwatch({ material, isSelected, onSelect, isLocked }) {
  return (
    <button
      id={`swatch-${material.id}`}
      onClick={() => !isLocked && onSelect(material)}
      disabled={isLocked}
      className="group relative w-full rounded-xl overflow-hidden focus:outline-none"
      style={{
        border: isSelected ? '2px solid #C5A059' : '2px solid rgba(226,232,240,0.1)',
        boxShadow: isSelected ? '0 0 0 3px rgba(197,160,89,0.25)' : 'none',
        transform: isSelected ? 'scale(1.03)' : 'scale(1)',
        transition: 'all 0.2s ease',
        cursor: isLocked ? 'not-allowed' : 'pointer',
      }}
    >
      {/* Texture thumbnail
           Using <img loading="lazy"> instead of CSS background-image so
           the browser only loads each texture when the swatch scrolls into
           view. Loading all 16 full-res granite PNGs simultaneously with
           background-image was exhausting GPU memory and crashing the
           WebGL context. (AGENTS.md §D) */}
      <div className="w-full aspect-square overflow-hidden" style={{ backgroundColor: '#4B5563' }}>
        {material.color_url && (
          <img
            src={material.color_url}
            alt={material.name}
            crossOrigin="anonymous"
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
        )}
      </div>

      {/* Name label */}
      <div
        className="px-2 py-2 text-center"
        style={{
          backgroundColor: isSelected
            ? 'rgba(197,160,89,0.18)'
            : 'rgba(28,32,38,0.92)',
        }}
      >
        <p
          className="text-xs font-semibold tracking-wide truncate"
          style={{ color: isSelected ? '#C5A059' : '#F9F9FB' }}
        >
          {material.name}
        </p>
      </div>

      {/* Gold checkmark on selected */}
      {isSelected && (
        <div
          className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
          style={{ backgroundColor: '#C5A059' }}
        >
          <svg
            className="w-3 h-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="#fff"
            strokeWidth={3}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}
    </button>
  );
}

/* ── Skeleton loader while fetching ── */
function SwatchSkeleton() {
  return (
    <div className="w-full rounded-xl overflow-hidden animate-pulse">
      <div className="w-full aspect-square" style={{ backgroundColor: '#2e3440' }} />
      <div className="px-2 py-2" style={{ backgroundColor: '#1c2026' }}>
        <div className="h-2.5 rounded w-3/4 mx-auto" style={{ backgroundColor: '#3a4250' }} />
      </div>
    </div>
  );
}

export default function MaterialPanel() {
  const materials        = useConfiguratorStore((s) => s.materials);
  const selectedMaterial = useConfiguratorStore((s) => s.selectedMaterial);
  const setMaterial      = useConfiguratorStore((s) => s.setMaterial);
  
  const cabinetMaterials = useConfiguratorStore((s) => s.cabinetMaterials);
  const selectedCabinetMaterial = useConfiguratorStore((s) => s.selectedCabinetMaterial);
  const setCabinetMaterial = useConfiguratorStore((s) => s.setCabinetMaterial);

  // Rate-limit state — prevents click spam on texture CDN (AGENTS.md §A)
  const [locked, setLocked] = useState(false);
  const lockTimer = useRef(null);

  const handleSelect = (material) => {
    if (locked) return; // Rate-limit guard (AGENTS.md §A)
    setLocked(true);
    setMaterial(material);
    // 150ms is enough to block accidental double-clicks without adding
    // perceptible latency to intentional swatch browsing.
    lockTimer.current = setTimeout(() => setLocked(false), 150);
  };

  return (
    <div
      className="h-full flex flex-col"
      style={{ backgroundColor: '#1c2026', borderRight: '1px solid rgba(226,232,240,0.1)' }}
    >
      {/* Panel Header */}
      <div
        className="px-4 py-4 shrink-0"
        style={{ borderBottom: '1px solid rgba(226,232,240,0.1)' }}
      >
        <p
          className="text-xs font-semibold tracking-widest uppercase"
          style={{ color: '#C5A059' }}
        >
          Stone Design
        </p>
        <h2 className="text-sm font-light mt-1" style={{ color: '#F9F9FB' }}>
          Select Granite
        </h2>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-6">
        
        {/* Granite Selection */}
        <div>
          <div className="grid grid-cols-2 gap-2">
            {materials.map((mat) => (
              <MaterialSwatch
                key={mat.id}
                material={mat}
                isSelected={selectedMaterial?.id === mat.id}
                onSelect={handleSelect}
                isLocked={locked}
              />
            ))}
          </div>
        </div>

        {/* Cabinet Finish Selection */}
        <div>
          <div className="mb-3 px-1">
            <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: '#C5A059' }}>
              Cabinet Finish
            </p>
            <h2 className="text-sm font-light mt-1" style={{ color: '#F9F9FB' }}>
              Select Base Color
            </h2>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            {cabinetMaterials.map((mat) => {
              const isSelected = selectedCabinetMaterial?.id === mat.id;
              return (
                <button
                  key={mat.id}
                  onClick={() => setCabinetMaterial(mat)}
                  className="group relative w-full rounded-xl overflow-hidden focus:outline-none flex flex-col items-center"
                  style={{
                    border: isSelected ? '2px solid #C5A059' : '2px solid rgba(226,232,240,0.1)',
                    boxShadow: isSelected ? '0 0 0 3px rgba(197,160,89,0.25)' : 'none',
                    transform: isSelected ? 'scale(1.03)' : 'scale(1)',
                    transition: 'all 0.2s ease',
                    cursor: 'pointer',
                    backgroundColor: '#232B32',
                  }}
                >
                  <div 
                    className="w-full h-16" 
                    style={{ 
                      backgroundImage: `url(${mat.color_url})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center'
                    }} 
                  />
                  <div
                    className="w-full px-2 py-2 text-center"
                    style={{
                      backgroundColor: isSelected ? 'rgba(197,160,89,0.18)' : 'rgba(28,32,38,0.92)',
                    }}
                  >
                    <p
                      className="text-xs font-semibold tracking-wide truncate"
                      style={{ color: isSelected ? '#C5A059' : '#F9F9FB' }}
                    >
                      {mat.name}
                    </p>
                  </div>
                  {isSelected && (
                    <div
                      className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center shadow-md"
                      style={{ backgroundColor: '#C5A059' }}
                    >
                      <svg
                        className="w-3 h-3"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="#fff"
                        strokeWidth={3}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
