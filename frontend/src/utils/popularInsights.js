import { supabase } from '../supabaseClient';

/* ─────────────────────────────────────────────────────────────
   POPULAR INSIGHTS & REAL-TIME DEMAND TRACKER
   Powers the Home Page live 3D showcases for:
   1. Popular Stone Designs (Salt & Pepper, Rosso Parino, etc.)
   2. Popular Project Types & 3D Models (Kitchen, Vanity, Island)
───────────────────────────────────────────────────────────── */

export const STRUCTURE_METADATA = {
  'kitchen countertop': {
    title: 'Kitchen Countertop',
    modelBadge: 'Countertop 3D Model',
    category: 'Kitchen',
    dimensions: '2.4m × 0.6m',
    description:
      'Bespoke executive kitchen surface engineered for culinary spaces. Features integrated sink cutout, seamless mitered edge profile, and splashboard siding.',
    keywords: ['kitchen', 'counter', 'countertop', 'sink', 'cooktop'],
  },
  'bathroom countertop': {
    title: 'Bathroom Countertop',
    modelBadge: 'Vanity 3D Model',
    category: 'Vanity',
    dimensions: '1.2m × 0.6m',
    description:
      'Luxury master vanity countertop featuring sleek proportions, splash guard siding, and under-mount basin integration for spa-grade hospitality.',
    keywords: ['bath', 'bathroom', 'vanity', 'lavatory', 'powder'],
  },
  'island countertop': {
    title: 'Island Countertop',
    modelBadge: 'Waterfall Island 3D Model',
    category: 'Island',
    dimensions: '2.4m × 1.0m',
    description:
      'Dramatic centerpiece waterfall island with expansive preparation area and monolithic dual-sided stone returns for contemporary open layouts.',
    keywords: ['island', 'waterfall', 'prep'],
  },
  'floor slab': {
    title: 'Floor Slab',
    modelBadge: 'Architectural Flooring 3D Model',
    category: 'Flooring',
    dimensions: '3.0m × 2.0m',
    description:
      'Grand format architectural stone flooring engineered for high-traffic luxury residential foyers and commercial lobby installations.',
    keywords: ['floor', 'flooring', 'ground', 'pavement'],
  },
  'wall slab': {
    title: 'Wall Slab',
    modelBadge: 'Vertical Cladding 3D Model',
    category: 'Cladding',
    dimensions: '3.0m × 2.0m',
    description:
      'Monolithic bookmatched vertical stone cladding with precision mechanical anchoring for high-end feature walls and executive suites.',
    keywords: ['wall', 'cladding', 'feature', 'vertical'],
  },
};

/**
 * Fetch Popular Project Types & 3D Models:
 * 1. Queries active structures table from Supabase.
 * 2. Reads live quotation frequency from `app_settings` (`popular_project_types`).
 * 3. Fallbacks to direct quotation_requests query if user is authenticated/admin.
 * 4. Ranks structures dynamically by quotation count descending.
 */
export async function fetchPopularProjectTypes() {
  try {
    // 1. Fetch active 3D models and structures from Supabase
    const { data: structures, error: structErr } = await supabase
      .from('structures')
      .select('id, name, structure_type, model_url, base_length, base_width')
      .order('name');

    if (structErr) console.warn('[popularInsights] Structures fetch fallback:', structErr.message);

    const activeStructures = structures || [
      {
        id: 7,
        name: 'Kitchen Countertop',
        structure_type: 'countertop',
        base_length: 2.4,
        base_width: 0.6,
        model_url: 'https://hwdtkuwtbuhxzaqnjwoy.supabase.co/storage/v1/object/public/showroom-assets/models/kitchen_countertop_v5-v1.glb',
      },
      {
        id: 3,
        name: 'Bathroom Countertop',
        structure_type: 'countertop',
        base_length: 1.2,
        base_width: 0.6,
        model_url: 'https://hwdtkuwtbuhxzaqnjwoy.supabase.co/storage/v1/object/public/showroom-assets/models/bathroom_countertop_v5-v1.glb',
      },
      {
        id: 4,
        name: 'Island Countertop',
        structure_type: 'island',
        base_length: 2.4,
        base_width: 1.0,
        model_url: 'https://hwdtkuwtbuhxzaqnjwoy.supabase.co/storage/v1/object/public/showroom-assets/models/island_countertop_v5-v1.glb',
      },
    ];

    // 2. Query aggregate quotation counts from app_settings
    let countsMap = {
      'Kitchen Countertop': 19,
      'Bathroom Countertop': 9,
      'Island Countertop': 5,
      'Floor Slab': 4,
      'Wall Slab': 2,
    };

    const { data: settingsData } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'popular_project_types')
      .single();

    if (settingsData?.value && Array.isArray(settingsData.value)) {
      settingsData.value.forEach((item) => {
        if (item.name) {
          countsMap[item.name] = Number(item.count) || 0;
        }
      });
    }

    // 3. Optional direct query if accessible (e.g. admin or public view)
    try {
      const { data: quotesData } = await supabase
        .from('quotation_requests')
        .select('product_type');

      if (quotesData && quotesData.length > 0) {
        const directCounts = {};
        quotesData.forEach((q) => {
          const pt = (q.product_type || '').trim();
          if (pt) directCounts[pt] = (directCounts[pt] || 0) + 1;
        });

        Object.keys(directCounts).forEach((k) => {
          countsMap[k] = directCounts[k];
        });
      }
    } catch {
      // Ignore RLS restriction if unauthenticated
    }

    // 4. Map active structures with metadata and quotation counts
    const ranked = activeStructures.map((struct) => {
      const key = (struct.name || '').toLowerCase().trim();
      const meta =
        STRUCTURE_METADATA[key] ||
        Object.entries(STRUCTURE_METADATA).find(([k]) => key.includes(k) || k.includes(key))?.[1] || {
          title: struct.name,
          modelBadge: `${struct.structure_type || 'Structure'} 3D Model`,
          category: struct.structure_type || 'Custom',
          dimensions: `${struct.base_length || 2.4}m × ${struct.base_width || 0.6}m`,
          description: 'High-precision architectural stone fabrication tailored to exact architectural dimensions.',
        };

      // Find matching count
      let count = countsMap[struct.name] || 0;
      if (!count) {
        const matchedEntry = Object.entries(countsMap).find(
          ([n]) => n.toLowerCase() === key || n.toLowerCase().includes(key) || key.includes(n.toLowerCase())
        );
        if (matchedEntry) count = matchedEntry[1];
      }

      return {
        id: struct.id,
        name: struct.name,
        structure_type: struct.structure_type,
        model_url: struct.model_url,
        base_length: struct.base_length,
        base_width: struct.base_width,
        count: Number(count) || 0,
        title: meta.title,
        modelBadge: meta.modelBadge,
        category: meta.category,
        dimensions: `${struct.base_length || 2.4}m × ${struct.base_width || 0.6}m`,
        description: meta.description,
      };
    });

    // 5. Sort dynamically descending by quotation request count
    ranked.sort((a, b) => b.count - a.count);

    return ranked;
  } catch (err) {
    console.warn('[fetchPopularProjectTypes] Error loading popular project types:', err);
    return [];
  }
}

/**
 * Increment Popular Project Type on Quotation Submission:
 * Whenever a client requests a quote for a structure/project type,
 * its count increments and automatically re-ranks.
 */
export async function incrementPopularProjectType(productType) {
  if (!productType) return;
  try {
    const { data: settingsData } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'popular_project_types')
      .single();

    let list = Array.isArray(settingsData?.value) ? [...settingsData.value] : [];

    const raw = productType.toLowerCase().trim();
    let found = false;

    list = list.map((item) => {
      const itemName = (item.name || '').toLowerCase().trim();
      if (itemName === raw || itemName.includes(raw) || raw.includes(itemName)) {
        found = true;
        return {
          ...item,
          count: (Number(item.count) || 0) + 1,
        };
      }
      return item;
    });

    if (!found) {
      list.push({
        name: productType,
        count: 1,
        structure_type: 'countertop',
      });
    }

    // Dynamic re-ranking: sort by count descending
    list.sort((a, b) => (Number(b.count) || 0) - (Number(a.count) || 0));

    await supabase
      .from('app_settings')
      .upsert({
        key: 'popular_project_types',
        value: list,
        updated_at: new Date().toISOString(),
      });
  } catch (err) {
    console.warn('[incrementPopularProjectType] Non-fatal count increment notice:', err);
  }
}
