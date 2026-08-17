import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/**
 * configuratorStore.js
 * Global Zustand state for the 3D Showroom & Configurator.
 *
 * Drives:
 *  - appMode toggle (showroom ↔ configurator)
 *  - active structure loaded from Supabase
 *  - active material selection
 *  - user-input dimensions for live pricing
 *
 * Security / Functional notes:
 *  - setDimension clamps values to [0.3, 5] metres to prevent
 *    nonsensical or adversarial dimension inputs reaching pricing
 *    and to keep 3D model scaling within a visually pleasing range.
 *  - resetConfigurator returns the store to its factory state, used
 *    on sign-out or when the user navigates away from the configurator.
 */

/* Safe bounds for user-supplied dimensions (metres).
   Tightened to [0.3, 5] so the 3D model never scales to an absurdly
   small or large size that would break camera framing. This range
   covers realistic countertop sizes (small vanity to large island). */
// Hardcoded max/mins have been removed. Bounds are now calculated dynamically
// based on the selected structure's base dimensions to prevent extreme 3D distortion.

const useConfiguratorStore = create(
  persist(
    (set) => ({
      /* ── App mode ── */
      appMode: 'showroom', // 'showroom' | 'configurator'

      /* ── Active structure from Supabase structures table ── */
      selectedStructure: null, // { id, name, base_length, base_width, model_url }

      /* ── Active material from Supabase materials table ── */
      selectedMaterial: null, // { id, name, price_per_sqm, color_url, normal_url, roughness_url }
      materials: [],          // Shared list of all materials fetched on boot

      /* ── Active cabinet material from Supabase cabinet_materials table ── */
      selectedCabinetMaterial: null,
      cabinetMaterials: [],

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

      setMaterials: (materials) => set({ materials }),
      setMaterial: (material) => set({ selectedMaterial: material }),

      setCabinetMaterials: (cabinetMaterials) => set({ cabinetMaterials }),
      setCabinetMaterial: (material) => set({ selectedCabinetMaterial: material }),

      // Clamp dimension to their respective minimums and maximums before storing —
      // prevents pricing engine from receiving 0, negative, or
      // excessively large values from user input.
      setDimension: (key, value) =>
        set((state) => {
          const raw     = parseFloat(value);
          const baseLen = state.selectedStructure?.base_length || 1.2;
          const baseWid = state.selectedStructure?.base_width  || 0.6;
          
          const minLen  = Number((baseLen * 0.8).toFixed(2)); // Max 20% shrink
          const maxLen  = Number((baseLen * 1.5).toFixed(2)); // Max 50% grow
          const minWid  = baseWid;       // Locked to standard
          const maxWid  = baseWid;       // Locked to standard

          const min     = key === 'length' ? minLen : minWid;
          const max     = key === 'length' ? maxLen : maxWid;
          const clamped = isNaN(raw) ? min : Math.min(max, Math.max(min, raw));
          return { dimensions: { ...state.dimensions, [key]: clamped } };
        }),

      // Full reset — call on sign-out or page exit to clear persisted state
      resetConfigurator: () =>
        set({
          appMode:                 'showroom',
          selectedStructure:       null,
          selectedMaterial:        null,
          selectedCabinetMaterial: null,
          materials:               [],
          cabinetMaterials:        [],
          dimensions:        { length: 1.2, width: 0.6 },
        }),
    }),
    {
      name:    'sixsigma-configurator',
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);

export default useConfiguratorStore;

