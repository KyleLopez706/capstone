/**
 * AI Quality Engine (Brain 1)
 * This runs entirely on the client side without servers.
 * It loads the Random Forest model and predicts the Design Quality Score
 * by comparing a Granite color to a Cabinet color.
 */

// Helper: Convert Hex color to RGB (0-1 scale)
function hexToRGB(hex) {
    let c = hex.replace('#', '');
    if (c.length === 3) c = c.split('').map(x => x + x).join('');
    const num = parseInt(c, 16);
    return {
        r: (num >> 16) / 255,
        g: ((num >> 8) & 255) / 255,
        b: (num & 255) / 255
    };
}

// Helper: Convert RGB to CIELAB color space (matching how the human eye works)
function rgbToLab(rgb) {
    let r = rgb.r, g = rgb.g, b = rgb.b;

    // sRGB to Linear RGB
    r = (r > 0.04045) ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
    g = (g > 0.04045) ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
    b = (b > 0.04045) ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;

    r *= 100;
    g *= 100;
    b *= 100;

    // Observer = 2°, Illuminant = D65
    let x = r * 0.4124 + g * 0.3576 + b * 0.1805;
    let y = r * 0.2126 + g * 0.7152 + b * 0.0722;
    let z = r * 0.0193 + g * 0.1192 + b * 0.9505;

    x /= 95.047;
    y /= 100.000;
    z /= 108.883;

    x = (x > 0.008856) ? Math.pow(x, 1/3) : (7.787 * x) + (16 / 116);
    y = (y > 0.008856) ? Math.pow(y, 1/3) : (7.787 * y) + (16 / 116);
    z = (z > 0.008856) ? Math.pow(z, 1/3) : (7.787 * z) + (16 / 116);

    return {
        L: (116 * y) - 16,
        a: 500 * (x - y),
        b: 200 * (y - z)
    };
}

// Helper: Perceptual Color Distance
function ciede2000Approx(lab1, lab2) {
    return Math.sqrt(Math.pow(lab1.L - lab2.L, 2) + Math.pow(lab1.a - lab2.a, 2) + Math.pow(lab1.b - lab2.b, 2));
}

// Feature Extraction: Calculate all 14 features required by the AI
function extractFeatures(hex1, hex2) {
    const lab1 = rgbToLab(hexToRGB(hex1));
    const lab2 = rgbToLab(hexToRGB(hex2));

    const delta_L = Math.abs(lab1.L - lab2.L);
    const chroma1 = Math.sqrt(Math.pow(lab1.a, 2) + Math.pow(lab1.b, 2));
    const chroma2 = Math.sqrt(Math.pow(lab2.a, 2) + Math.pow(lab2.b, 2));
    const delta_C = Math.abs(chroma1 - chroma2);
    const hue1 = (Math.atan2(lab1.b, lab1.a) * 180) / Math.PI;
    const hue2 = (Math.atan2(lab2.b, lab2.a) * 180) / Math.PI;
    const delta_H = Math.abs(hue1 - hue2);
    const delta_E = ciede2000Approx(lab1, lab2);

    // 4 New Advanced Features
    const luminance_ratio = lab1.L / (lab2.L + 0.0001);
    const chroma_ratio = chroma1 / (chroma2 + 0.0001);
    const complementary_proximity = Math.abs(delta_H - 180);
    const warm_cool_diff = lab1.b - lab2.b;

    // This array order MUST EXACTLY MATCH the Python columns we trained on (18 features):
    return [
        lab1.L, lab1.a, lab1.b, lab2.L, lab2.a, lab2.b,
        delta_L, chroma1, chroma2, delta_C,
        hue1, hue2, delta_H, delta_E,
        luminance_ratio, chroma_ratio,
        complementary_proximity, warm_cool_diff
    ];
}

let rfModel = null;

/**
 * Predicts the Design Quality Score (0-100%) for two colors.
 * @param {string} graniteHex - The primary hex color of the granite (e.g., "#3C3C3C")
 * @param {string} cabinetHex - The primary hex color of the cabinet
 * @returns {Promise<number>} - The AI score
 */
export async function evaluateDesignQuality(graniteHex, cabinetHex) {
    // 1. Load the model JSON file once and keep it in memory
    if (!rfModel) {
        try {
            const response = await fetch('/ai-model/rf_model.json');
            if (!response.ok) throw new Error("File not found");
            rfModel = await response.json();
            console.log("✅ AI Model Loaded Successfully from Static JSON");
        } catch (error) {
            console.error("❌ Failed to load AI model. Ensure rf_model.json is in public/ai-model/", error);
            return 50; // Fallback score if it fails
        }
    }

    // 2. Extract features from the two colors
    const features = extractFeatures(graniteHex, cabinetHex);

    // 3. Traverse all 100 Decision Trees
    let sum = 0;
    for (const tree of rfModel) {
        let node = tree;
        
        // Follow the if/else rules down the tree
        while (node.left !== undefined && node.right !== undefined) {
            if (features[node.feature] <= node.threshold) {
                node = node.left;
            } else {
                node = node.right;
            }
        }
        // Add the final leaf value
        sum += node.value;
    }

    // 4. Calculate final average score from all 100 trees
    const averageScore = sum / rfModel.length;

    // 5. Cap safely between 0 and 100 just in case
    return Math.max(0, Math.min(100, Math.round(averageScore)));
}

/**
 * Recommends the best cabinet materials to pair with a given granite.
 * Runs the AI model against every cabinet option and returns them
 * sorted by score (highest first).
 *
 * @param {string} graniteHex - The hex code of the selected granite
 * @param {Array} cabinetMaterials - Array of cabinet material objects from Supabase
 * @param {Function} hexFallback - Fallback function to derive hex from name
 * @param {number} [topN=3] - How many recommendations to return
 * @returns {Promise<Array<{id, name, hex, score}>>} - Top N recommendations
 */
export async function getRecommendations(graniteHex, cabinetMaterials, hexFallback, topN = 3) {
    if (!graniteHex || !cabinetMaterials?.length) return [];

    // Score every cabinet material against the selected granite
    const scored = await Promise.all(
        cabinetMaterials.map(async (cab) => {
            const cabHex = cab.hex_code || (hexFallback ? hexFallback(cab.name) : '#808080');
            const score  = await evaluateDesignQuality(graniteHex, cabHex);
            return { id: cab.id, name: cab.name, hex: cabHex, score };
        })
    );

    // Sort descending by score and return the top N
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topN);
}

/**
 * Recommends the best granite designs to pair with the current cabinet.
 * Scores every available granite against the selected cabinet hex and
 * returns them sorted by score, excluding the currently selected granite.
 *
 * @param {string} cabinetHex - The hex code of the selected cabinet
 * @param {Array} materials - Array of granite material objects from Supabase
 * @param {string} currentMaterialId - ID of the currently selected granite (excluded from results)
 * @param {Function} hexFallback - Fallback function to derive hex from name
 * @param {number} [topN=3] - How many recommendations to return
 * @returns {Promise<Array<{id, name, hex, score}>>} - Top N granite recommendations
 */
export async function getGraniteRecommendations(cabinetHex, materials, currentMaterialId, hexFallback, topN = 3) {
    if (!cabinetHex || !materials?.length) return [];

    const scored = await Promise.all(
        materials
            .filter((mat) => mat.id !== currentMaterialId) // Exclude current selection
            .map(async (mat) => {
                const matHex = mat.hex_code || (hexFallback ? hexFallback(mat.name) : '#808080');
                const score  = await evaluateDesignQuality(matHex, cabinetHex);
                return { id: mat.id, name: mat.name, hex: matHex, color_url: mat.color_url, score };
            })
    );

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topN);
}
