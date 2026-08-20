import { useEffect, useRef, useState, useCallback } from "react";
import useConfiguratorStore from "../../store/configuratorStore";
import {
  evaluateDesignQuality,
  getRecommendations,
  getGraniteRecommendations,
} from "../../utils/AIQualityEngine";

/* ─────────────────────────────────────────
   MATERIAL PANEL  (Right Column - Tab 1)
   Fetches all materials from Supabase and
   renders clickable swatches.  A 150ms guard
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
        border: isSelected
          ? "2px solid #C5A059"
          : "2px solid rgba(226, 232, 240, 0.1)",
        boxShadow: isSelected ? "0 0 0 3px rgba(197,160,89,0.15)" : "none",
        transform: isSelected ? "scale(1.02)" : "scale(1)",
        transition: "all 0.2s ease",
        cursor: isLocked ? "not-allowed" : "pointer",
        backgroundColor: "rgba(0, 0, 0, 0.2)",
      }}
    >
      <div
        className="w-full aspect-square overflow-hidden"
        style={{ backgroundColor: "#1c2026" }}
      >
        {material.color_url && (
          <img
            src={material.color_url}
            alt={material.name}
            crossOrigin="anonymous"
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        )}
      </div>

      {/* Name label */}
      <div
        className="px-2 py-2 text-center"
        style={{
          backgroundColor: isSelected ? "rgba(197,160,89,0.08)" : "transparent",
        }}
      >
        <p
          className="text-xs font-semibold tracking-wide truncate"
          style={{ color: isSelected ? "#C5A059" : "#F9F9FB" }}
        >
          {material.name}
        </p>
      </div>

      {/* Gold checkmark on selected */}
      {isSelected && (
        <div
          className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center shadow-sm"
          style={{ backgroundColor: "#C5A059" }}
        >
          <svg
            className="w-3 h-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="#fff"
            strokeWidth={3}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
      )}
    </button>
  );
}

export default function MaterialPanel() {
  const materials = useConfiguratorStore((s) => s.materials);
  const selectedMaterial = useConfiguratorStore((s) => s.selectedMaterial);
  const setMaterial = useConfiguratorStore((s) => s.setMaterial);

  const cabinetMaterials = useConfiguratorStore((s) => s.cabinetMaterials);
  const selectedCabinetMaterial = useConfiguratorStore(
    (s) => s.selectedCabinetMaterial,
  );
  const setCabinetMaterial = useConfiguratorStore((s) => s.setCabinetMaterial);
  const selectedStructureName = useConfiguratorStore(
    (s) => s.selectedStructure?.name || "",
  ).toLowerCase();

  // Hide cabinet options if the structure is a wall or flooring
  const hideCabinets =
    selectedStructureName.includes("wall") ||
    selectedStructureName.includes("floor");

  // Rate-limit state — prevents click spam on texture CDN (AGENTS.md §A)
  const [locked, setLocked] = useState(false);
  const lockTimer = useRef(null);

  const [aiScore, setAiScore] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [graniteRecs, setGraniteRecs] = useState([]);

  // Helper to guess the hex color based on the material name since it's not in the DB yet
  const getHexForMaterial = useCallback((name) => {
    if (!name) return "#808080";
    const n = name.toLowerCase();
    if (n.includes("black") || n.includes("galaxy")) return "#1A1A1A";
    if (n.includes("white") || n.includes("ivory") || n.includes("cream"))
      return "#F5F5F5";
    if (n.includes("grey") || n.includes("gray")) return "#888888";
    if (n.includes("brown") || n.includes("tan")) return "#8B5A2B";
    if (n.includes("red") || n.includes("rose")) return "#8B2323";
    if (n.includes("blue") || n.includes("pearl")) return "#4B535D";
    if (n.includes("green")) return "#2E8B57";
    if (n.includes("gold")) return "#D4AF37";

    // Deterministic fallback based on the name string so it always changes!
    let hash = 0;
    for (let i = 0; i < n.length; i++)
      hash = n.charCodeAt(i) + ((hash << 5) - hash);
    const c = Math.floor(
      Math.abs((Math.sin(hash) * 16777215) % 16777215),
    ).toString(16);
    return "#" + "000000".substring(0, 6 - c.length) + c;
  }, []);

  useEffect(() => {
    async function fetchScore() {
      if (!selectedMaterial) {
        setAiScore(null);
        return;
      }

      const graniteHex =
        selectedMaterial.hex_code || getHexForMaterial(selectedMaterial.name);

      const hasCabinets = !hideCabinets;

      const cabinetHex = hasCabinets
        ? selectedCabinetMaterial?.hex_code ||
          getHexForMaterial(selectedCabinetMaterial?.name) ||
          "#F9F9FB"
        : "#F9F9FB"; // Neutral white

      const score = await evaluateDesignQuality(graniteHex, cabinetHex);
      setAiScore(score);

      if (hasCabinets && cabinetMaterials?.length) {
        const recs = await getRecommendations(
          graniteHex,
          cabinetMaterials,
          getHexForMaterial,
          3,
        );
        setRecommendations(recs);
      } else {
        setRecommendations([]);
      }

      if (materials?.length) {
        const compareColor = hasCabinets ? cabinetHex : graniteHex;
        const gRecs = await getGraniteRecommendations(
          compareColor,
          materials,
          selectedMaterial?.id,
          getHexForMaterial,
          3,
        );
        setGraniteRecs(gRecs);
      } else {
        setGraniteRecs([]);
      }
    }
    fetchScore();
  }, [
    selectedMaterial,
    selectedCabinetMaterial,
    hideCabinets,
    cabinetMaterials,
    materials,
    getHexForMaterial,
  ]);

  const handleSelect = (material) => {
    if (locked) return; // Rate-limit guard (AGENTS.md §A)
    setLocked(true);
    setMaterial(material);
    // 150ms is enough to block accidental double-clicks without adding
    // perceptible latency to intentional swatch browsing.
    lockTimer.current = setTimeout(() => setLocked(false), 150);
  };

  return (
    <div className="h-full flex flex-col bg-transparent">
      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6">
        {/* Granite Selection */}
        <div>
          <div className="mb-3 px-1">
            <p
              className="text-xs font-semibold tracking-widest uppercase"
              style={{ color: "#C5A059" }}
            >
              Stone Design
            </p>
            <h2
              className="text-sm font-semibold mt-1"
              style={{ color: "#F9F9FB" }}
            >
              Select Granite
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
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
        {!hideCabinets && (
          <div>
            <div className="mb-3 px-1">
              <p
                className="text-xs font-semibold tracking-widest uppercase"
                style={{ color: "#C5A059" }}
              >
                Cabinet Finish
              </p>
              <h2
                className="text-sm font-semibold mt-1"
                style={{ color: "#F9F9FB" }}
              >
                Select Base Color
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {cabinetMaterials.map((mat) => {
                const isSelected = selectedCabinetMaterial?.id === mat.id;
                return (
                  <button
                    key={mat.id}
                    onClick={() => setCabinetMaterial(mat)}
                    className="group relative w-full rounded-xl overflow-hidden focus:outline-none flex flex-col items-center"
                    style={{
                      border: isSelected
                        ? "2px solid #C5A059"
                        : "2px solid rgba(226, 232, 240, 0.1)",
                      boxShadow: isSelected
                        ? "0 0 0 3px rgba(197,160,89,0.15)"
                        : "none",
                      transform: isSelected ? "scale(1.02)" : "scale(1)",
                      transition: "all 0.2s ease",
                      cursor: "pointer",
                      backgroundColor: "rgba(0, 0, 0, 0.2)",
                    }}
                  >
                    <div
                      className="w-full h-16"
                      style={{
                        backgroundImage: `url(${mat.color_url})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        backgroundColor: "#1c2026",
                      }}
                    />
                    <div
                      className="w-full px-2 py-2 text-center"
                      style={{
                        backgroundColor: isSelected
                          ? "rgba(197,160,89,0.08)"
                          : "transparent",
                      }}
                    >
                      <p
                        className="text-xs font-semibold tracking-wide truncate"
                        style={{ color: isSelected ? "#C5A059" : "#F9F9FB" }}
                      >
                        {mat.name}
                      </p>
                    </div>
                    {isSelected && (
                      <div
                        className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center shadow-sm"
                        style={{ backgroundColor: "#C5A059" }}
                      >
                        <svg
                          className="w-3 h-3"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="#fff"
                          strokeWidth={3}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Design Quality Score ── */}
        <div
          className="rounded-xl p-4"
          style={{
            backgroundColor: "rgba(0,0,0,0.2)",
            border: aiScore
              ? "1px solid rgba(197,160,89,0.3)"
              : "1px dashed rgba(197,160,89,0.3)",
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <p
              className="text-xs font-semibold tracking-wider uppercase"
              style={{ color: "#C5A059" }}
            >
              Design Quality Score
            </p>
          </div>
          {aiScore !== null ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-end gap-2">
                <span
                  className="text-3xl font-bold leading-none"
                  style={{ color: "#F9F9FB" }}
                >
                  {aiScore}%
                </span>
                <span
                  className="text-xs font-medium mb-0.5"
                  style={{
                    color:
                      aiScore >= 70
                        ? "#10B981"
                        : aiScore >= 50
                          ? "#F59E0B"
                          : "#EF4444",
                  }}
                >
                  {aiScore >= 70
                    ? "Excellent Match"
                    : aiScore >= 50
                      ? "Fair Match"
                      : "Poor Match"}
                </span>
              </div>

              <div
                className="rounded-lg p-3"
                style={{
                  backgroundColor: "rgba(0,0,0,0.15)",
                  border: "1px solid rgba(226,232,240,0.05)",
                }}
              >
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: "#9CA3AF" }}
                >
                  <span style={{ color: "#E2E8F0", fontWeight: 600 }}>
                    Why this score?
                  </span>{" "}
                  {(() => {
                    const isWallOrFloor = hideCabinets;
                    if (!isWallOrFloor) {
                      if (aiScore >= 70)
                        return "Strong contrast and complementary hues between the granite and cabinet finish. This pairing provides excellent visual balance and aligns with top-rated interior designs.";
                      if (aiScore >= 50)
                        return "An acceptable pairing between the stone and cabinet, but it lacks the dynamic contrast or hue harmony required for a premium, high-end look.";
                      return "The cabinet finish and granite color clash in tone or temperature. The lack of contrast creates an unbalanced and muddy appearance for a countertop setup.";
                    } else {
                      if (aiScore >= 70)
                        return "This stone is an excellent choice for large walls or floors! Its brightness and colors are perfectly balanced, keeping the room feeling open, elegant, and not overwhelmingly busy.";
                      if (aiScore >= 50)
                        return "This stone looks decent on walls and floors, but it lacks a bit of contrast. When spread across a huge room, it might feel slightly plain or heavy without cabinets to break up the space.";
                      return "This stone is not recommended for covering massive wall or floor areas by itself. Its colors can feel too intense or too dark in a large open space without cabinets to balance it out.";
                    }
                  })()}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm" style={{ color: "#6B7280" }}>
              Select a stone material to view the live AI Design Quality Score.
            </p>
          )}
        </div>

        {/* ── AI Granite Recommendations ── */}
        {graniteRecs.length > 0 && (
          <div
            className="rounded-xl p-4"
            style={{
              backgroundColor: "rgba(0,0,0,0.2)",
              border: "1px solid rgba(226,232,240,0.1)",
            }}
          >
            <p
              className="text-xs font-semibold tracking-wider uppercase mb-3"
              style={{ color: "#C5A059" }}
            >
              Recommended Stone Designs
            </p>
            <p className="text-[11px] mb-3" style={{ color: "#9CA3AF" }}>
              {hideCabinets
                ? "Stones that complement your current selection."
                : "Best granite matches for your cabinet finish."}
            </p>
            <div className="flex flex-col gap-2">
              {graniteRecs.map((rec, idx) => (
                <button
                  key={rec.id}
                  onClick={() => {
                    const fullMat = materials.find((m) => m.id === rec.id);
                    if (fullMat) setMaterial(fullMat);
                  }}
                  className="w-full flex items-center gap-3 rounded-lg p-2.5 text-left"
                  style={{
                    backgroundColor: "rgba(0,0,0,0.15)",
                    border: "1px solid rgba(226,232,240,0.06)",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor =
                      "rgba(197,160,89,0.06)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "rgba(0,0,0,0.15)";
                  }}
                >
                  <span
                    className="shrink-0 w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold"
                    style={{
                      backgroundColor:
                        idx === 0
                          ? "rgba(197,160,89,0.2)"
                          : "rgba(226,232,240,0.08)",
                      color: idx === 0 ? "#C5A059" : "#9CA3AF",
                    }}
                  >
                    {idx + 1}
                  </span>
                  <div
                    className="shrink-0 w-8 h-8 rounded overflow-hidden"
                    style={{
                      border: "1px solid rgba(226,232,240,0.15)",
                      backgroundColor: rec.hex,
                    }}
                  >
                    {rec.color_url && (
                      <img
                        src={rec.color_url}
                        alt={rec.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        crossOrigin="anonymous"
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-xs font-medium truncate"
                      style={{ color: "#E2E8F0" }}
                    >
                      {rec.name}
                    </p>
                  </div>
                  <span
                    className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor:
                        rec.score >= 70
                          ? "rgba(16,185,129,0.12)"
                          : rec.score >= 50
                            ? "rgba(245,158,11,0.12)"
                            : "rgba(239,68,68,0.12)",
                      color:
                        rec.score >= 70
                          ? "#10B981"
                          : rec.score >= 50
                            ? "#F59E0B"
                            : "#EF4444",
                    }}
                  >
                    {rec.score}%
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── AI Recommendations (Cabinets) ── */}
        {recommendations.length > 0 && (
          <div
            className="rounded-xl p-4"
            style={{
              backgroundColor: "rgba(0,0,0,0.2)",
              border: "1px solid rgba(226,232,240,0.1)",
            }}
          >
            <p
              className="text-xs font-semibold tracking-wider uppercase mb-3"
              style={{ color: "#C5A059" }}
            >
              Recommended Cabinet Finishes
            </p>
            <p className="text-[11px] mb-3" style={{ color: "#9CA3AF" }}>
              Top matches for your selected stone.
            </p>
            <div className="flex flex-col gap-2">
              {recommendations.map((rec, idx) => (
                <button
                  key={rec.id}
                  onClick={() => {
                    const fullMat = cabinetMaterials.find(
                      (c) => c.id === rec.id,
                    );
                    if (fullMat) setCabinetMaterial(fullMat);
                  }}
                  className="w-full flex items-center gap-3 rounded-lg p-2.5 text-left"
                  style={{
                    backgroundColor:
                      selectedCabinetMaterial?.id === rec.id
                        ? "rgba(197,160,89,0.12)"
                        : "rgba(0,0,0,0.15)",
                    border:
                      selectedCabinetMaterial?.id === rec.id
                        ? "1px solid rgba(197,160,89,0.35)"
                        : "1px solid rgba(226,232,240,0.06)",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (selectedCabinetMaterial?.id !== rec.id)
                      e.currentTarget.style.backgroundColor =
                        "rgba(197,160,89,0.06)";
                  }}
                  onMouseLeave={(e) => {
                    if (selectedCabinetMaterial?.id !== rec.id)
                      e.currentTarget.style.backgroundColor =
                        "rgba(0,0,0,0.15)";
                  }}
                >
                  <span
                    className="shrink-0 w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold"
                    style={{
                      backgroundColor:
                        idx === 0
                          ? "rgba(197,160,89,0.2)"
                          : "rgba(226,232,240,0.08)",
                      color: idx === 0 ? "#C5A059" : "#9CA3AF",
                    }}
                  >
                    {idx + 1}
                  </span>
                  <div
                    className="shrink-0 w-6 h-6 rounded"
                    style={{
                      backgroundColor: rec.hex,
                      border: "1px solid rgba(226,232,240,0.15)",
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-xs font-medium truncate"
                      style={{ color: "#E2E8F0" }}
                    >
                      {rec.name}
                    </p>
                  </div>
                  <span
                    className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor:
                        rec.score >= 70
                          ? "rgba(16,185,129,0.12)"
                          : rec.score >= 50
                            ? "rgba(245,158,11,0.12)"
                            : "rgba(239,68,68,0.12)",
                      color:
                        rec.score >= 70
                          ? "#10B981"
                          : rec.score >= 50
                            ? "#F59E0B"
                            : "#EF4444",
                    }}
                  >
                    {rec.score}%
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
