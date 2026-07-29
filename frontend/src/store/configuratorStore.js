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
 *  - setDimension clamps values to [0.01, 20] metres to prevent
 *    nonsensical or adversarial dimension inputs reaching pricing.
 *  - resetConfigurator returns the store to its factory state, used
 *    on sign-out or when the user navigates away from the configurator.
 */

/* Safe bounds for user-supplied dimensions (metres) */
const DIM_MIN = 0.01;
const DIM_MAX = 20;

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

      // Clamp dimension to [DIM_MIN, DIM_MAX] before storing —
      // prevents pricing engine from receiving 0, negative, or
      // excessively large values from user input.
      setDimension: (key, value) =>
        set((state) => {
          const raw     = parseFloat(value);
          const clamped = isNaN(raw) ? DIM_MIN : Math.min(DIM_MAX, Math.max(DIM_MIN, raw));
          return { dimensions: { ...state.dimensions, [key]: clamped } };
        }),

      // Full reset — call on sign-out or page exit to clear persisted state
      resetConfigurator: () =>
        set({
          appMode:           'showroom',
          selectedStructure: null,
          selectedMaterial:  null,
          materials:         [],
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

