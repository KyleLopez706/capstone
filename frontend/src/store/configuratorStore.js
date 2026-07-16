import { create } from 'zustand';

/**
 * configuratorStore.js
 * Global Zustand state for the 3D Showroom & Configurator.
 *
 * Drives:
 *  - appMode toggle (showroom ↔ configurator)
 *  - active structure loaded from Supabase
 *  - active material selection
 *  - user-input dimensions for live pricing
 */
const useConfiguratorStore = create((set) => ({
  /* ── App mode ── */
  appMode: 'showroom', // 'showroom' | 'configurator'

  /* ── Active structure from Supabase structures table ── */
  selectedStructure: null, // { id, name, base_length, base_width, model_url }

  /* ── Active material from Supabase materials table ── */
  selectedMaterial: null, // { id, name, price_per_sqm, color_url, normal_url, roughness_url }

  /* ── User-input dimensions in metres ── */
  dimensions: { length: 1.2, width: 0.6 },

  /* ── Actions ── */
  setAppMode: (mode) => set({ appMode: mode }),

  // When a structure is set, seed dimensions from its base_length / base_width
  setStructure: (structure) =>
    set({
      selectedStructure: structure,
      dimensions: {
        length: structure?.base_length ?? 1.2,
        width:  structure?.base_width  ?? 0.6,
      },
    }),

  setMaterial: (material) => set({ selectedMaterial: material }),

  setDimension: (key, value) =>
    set((state) => ({
      dimensions: { ...state.dimensions, [key]: parseFloat(value) || 0 },
    })),
}));

export default useConfiguratorStore;
