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

/**
 * Generates a unique, stone-specific explanation for why the AI gave a particular score.
 * Analyzes the actual CIELAB color properties (lightness, chroma, warmth, contrast)
 * of both the granite and its comparison target to build a human-readable sentence
 * that is different for every single stone + structure combination.
 *
 * @param {string} graniteHex - Hex color of the selected granite
 * @param {string} compareHex - Hex color being compared against (cabinet or #F9F9FB for walls)
 * @param {number} score - The AI score (0-100)
 * @param {string} graniteName - Display name of the granite
 * @param {boolean} isWallOrFloor - Whether the structure is a wall/floor (no cabinets)
 * @param {string} [cabinetName] - Display name of the cabinet finish (only for countertops)
 * @returns {string} - A unique human-readable explanation
 */
export function generateScoreExplanation(graniteHex, compareHex, score, graniteName, isWallOrFloor, cabinetName) {
    const lab1 = rgbToLab(hexToRGB(graniteHex));
    const lab2 = rgbToLab(hexToRGB(compareHex));

    // Derive human-readable color traits from CIELAB values
    const lightness1 = lab1.L;       // 0 = pitch black, 100 = pure white
    const chroma1 = Math.sqrt(lab1.a ** 2 + lab1.b ** 2); // saturation intensity
    const warmth1 = lab1.b;          // positive = warm/yellow, negative = cool/blue

    const deltaL = Math.abs(lab1.L - lab2.L);  // lightness contrast
    const deltaE = Math.sqrt((lab1.L - lab2.L) ** 2 + (lab1.a - lab2.a) ** 2 + (lab1.b - lab2.b) ** 2);

    // Classify the stone's visual character
    const isDark = lightness1 < 40;
    const isLight = lightness1 > 65;
    const isMidtone = !isDark && !isLight;
    const isVivid = chroma1 > 25;
    const isMuted = chroma1 < 10;
    const isWarm = warmth1 > 5;
    const isCool = warmth1 < -5;
    const isNeutral = !isWarm && !isCool;

    // Classify contrast level between the two surfaces
    const hasStrongContrast = deltaL > 35;
    const hasModerateContrast = deltaL > 15 && deltaL <= 35;
    const hasLowContrast = deltaL <= 15;

    // Build the stone's tone descriptor
    let toneDesc;
    if (isDark && isWarm) toneDesc = 'deep, warm tones';
    else if (isDark && isCool) toneDesc = 'deep, cool tones';
    else if (isDark && isNeutral) toneDesc = 'rich, dark tones';
    else if (isLight && isWarm) toneDesc = 'light, warm tones';
    else if (isLight && isCool) toneDesc = 'bright, cool tones';
    else if (isLight && isNeutral) toneDesc = 'clean, light tones';
    else if (isMidtone && isWarm) toneDesc = 'mid-range warm tones';
    else if (isMidtone && isCool) toneDesc = 'mid-range cool tones';
    else toneDesc = 'balanced, neutral tones';

    // Build the saturation descriptor
    let satDesc;
    if (isVivid) satDesc = 'bold veining and strong color presence';
    else if (isMuted) satDesc = 'subtle, understated pattern';
    else satDesc = 'moderate color depth';

    // ── COUNTERTOP WITH CABINETS ──
    if (!isWallOrFloor) {
        if (score >= 70) {
            if (hasStrongContrast) {
                return `${graniteName} features ${toneDesc} with ${satDesc}, creating a striking contrast against the ${cabinetName ?? 'selected cabinet'} finish. The significant difference in lightness between the stone and cabinet produces a visually dynamic pairing that draws the eye and defines the countertop as a standout feature.`;
            }
            if (isVivid) {
                return `The ${satDesc} of ${graniteName} pairs beautifully with the ${cabinetName ?? 'selected cabinet'} finish. The stone's ${toneDesc} complement the cabinet's color temperature, creating a cohesive and elegant countertop presentation with enough visual interest to feel premium.`;
            }
            return `${graniteName}'s ${toneDesc} harmonize naturally with the ${cabinetName ?? 'selected cabinet'} finish. The color temperature and lightness balance between these two materials creates a polished, well-coordinated look that aligns with top-rated interior pairings.`;
        }
        if (score >= 50) {
            if (hasLowContrast) {
                return `${graniteName} has ${toneDesc} that are similar in lightness to the ${cabinetName ?? 'selected cabinet'} finish, resulting in low contrast. While this creates a uniform look, the pairing lacks the dynamic visual separation that makes premium countertop designs stand out.`;
            }
            if (isMuted) {
                return `The ${satDesc} of ${graniteName} blends quietly with the ${cabinetName ?? 'selected cabinet'} finish. While there's no visual clash, the stone's ${toneDesc} don't create enough visual interest against this particular cabinet to produce a high-impact design.`;
            }
            return `${graniteName} provides an acceptable pairing with the ${cabinetName ?? 'selected cabinet'} finish. The stone's ${toneDesc} create a workable combination, but the contrast and color harmony between these specific materials falls short of what premium countertop designs typically achieve.`;
        }
        // Poor match (<50)
        if (hasLowContrast && !isVivid) {
            return `${graniteName}'s ${toneDesc} are too close in lightness and saturation to the ${cabinetName ?? 'selected cabinet'} finish, causing both surfaces to blend together. Without sufficient contrast, the countertop loses its visual definition and the overall design appears flat.`;
        }
        if (isWarm && isCool) {
            return `${graniteName} carries ${toneDesc} that clash with the cooler temperature of the ${cabinetName ?? 'selected cabinet'} finish. This warm-cool mismatch creates visual tension that makes the countertop pairing feel disjointed rather than intentional.`;
        }
        return `The combination of ${graniteName}'s ${toneDesc} with the ${cabinetName ?? 'selected cabinet'} finish creates an unbalanced appearance. The ${satDesc} of this stone does not complement this particular cabinet color, resulting in a pairing that lacks cohesion.`;
    }

    // ── WALL / FLOOR CLADDING (standalone against white backdrop) ──
    if (score >= 70) {
        if (isDark) {
            return `${graniteName}'s ${toneDesc} create a bold, dramatic statement when applied across walls or floors. Against a neutral room environment, the stone's ${satDesc} produces a stunning focal point without overwhelming the space because its darkness provides natural visual grounding.`;
        }
        if (isLight) {
            return `${graniteName}'s ${toneDesc} make it an ideal choice for expansive wall or floor coverage. The stone's brightness integrates seamlessly into modern interiors, keeping rooms feeling open and airy while the ${satDesc} adds just enough character to prevent a sterile look.`;
        }
        return `${graniteName}'s ${toneDesc} and ${satDesc} strike an excellent balance for large surface coverage. Applied across walls or floors, this stone maintains visual harmony by providing enough color presence to be interesting without dominating the room's overall aesthetic.`;
    }
    if (score >= 50) {
        if (isDark && isVivid) {
            return `While ${graniteName} features striking ${satDesc} that works well paired with contrasting cabinets, its ${toneDesc} can feel heavy when spread across entire walls or floor expanses without lighter cabinetry to break up the visual weight.`;
        }
        if (isLight && isMuted) {
            return `${graniteName}'s ${toneDesc} and ${satDesc} are slightly too understated for standalone wall or floor coverage. While this stone pairs nicely with cabinets that add contrast, on its own it may lack the visual anchor needed to make the space feel designed rather than plain.`;
        }
        return `${graniteName} performs moderately as a standalone wall or floor material. Its ${toneDesc} are acceptable for large surfaces, but the ${satDesc} doesn't fully deliver the visual impact needed when the stone must carry the entire room's design character by itself.`;
    }
    // Poor match (<50) for walls/floors
    if (isDark && isMuted) {
        return `${graniteName}'s combination of ${toneDesc} and ${satDesc} creates an overly heavy atmosphere when applied to large wall or floor areas. This stone would score significantly higher as a countertop paired with lighter cabinets, which would provide the contrast it needs to shine.`;
    }
    if (isLight && isMuted) {
        return `When covering entire walls or floors, ${graniteName}'s ${toneDesc} and ${satDesc} result in a washed-out appearance that lacks visual definition. This stone benefits from being paired with contrasting cabinetry to bring out its character rather than being used as a standalone surface.`;
    }
    return `${graniteName} is not recommended as a standalone wall or floor material. Its ${toneDesc} and ${satDesc} struggle to anchor the design of a large room by themselves. This stone would perform much better as a countertop, where a contrasting cabinet finish can elevate its visual qualities.`;
}

