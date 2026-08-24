import { useState } from "react";
import Navbar from "../components/Navbar";
import lobbyCounterImg from "../assets/lobby counter.jpg";
import lobbyWallCladdingImg from "../assets/lobby wall cladding.jpg";
import lobbyWallImg from "../assets/lobby wall.jpg";
import towerStoneImg from "../assets/tower stone cladding.jpg";
import barCountertopImg from "../assets/bar countertop.jpg";

const GALLERY_ITEMS = [
  {
    id: "lobby-counter",
    name: "Yellow Onyx Lobby Counter",
    tag: "Luxury Onyx",
    image: lobbyCounterImg,
    description: "Yellow onyx was chosen for this reception counter due to its rare translucent properties. When backlit, the stone’s golden veins naturally illuminate, creating a warm, inviting focal point that offsets the darker tones of the lobby."
  },
  {
    id: "lobby-wall-cladding",
    name: "Premium Lobby Cladding",
    tag: "Architectural Stone",
    image: lobbyWallCladdingImg,
    description: "This lobby features expansive slabs of travertine gray stone, selected for its subtle, linear veining. The horizontal cut of the stone visually widens the hall, while its dense composition ensures the high-traffic walls remain pristine."
  },
  {
    id: "lobby-wall",
    name: "Beige Travertine Wall",
    tag: "Warm Travertine",
    image: lobbyWallImg,
    description: "Beige travertine brings an earthy warmth to this hospitality lounge. Left with its natural porous texture, the stone softens the acoustics of the large open space and provides a calming, neutral backdrop that beautifully diffuses light."
  },
  {
    id: "tower-cladding",
    name: "Travertine Tower Cladding",
    tag: "Exterior Facade",
    image: towerStoneImg,
    description: "Gray travertine cladding was utilized for the exterior due to its exceptional weather resistance and timeless aging process. The stone’s natural banding breaks up the sheer scale of the facade, anchoring the building with an organic texture."
  },
  {
    id: "bar-countertop",
    name: "Golden Yellow Granite Bar",
    tag: "Premium Granite",
    image: barCountertopImg,
    description: "Golden yellow granite serves as the ideal bar surface because of its incredible hardness and resistance to spills. The vibrant mineral speckles naturally conceal daily wear, while its high-gloss polish catches the ambient lighting perfectly."
  },
];

export default function Gallery() {
  const [selectedItem, setSelectedItem] = useState(null);

  return (
    <div className="min-h-screen w-full" style={{ backgroundColor: "#F5F5F5" }}>
      <Navbar />

      {/* Spacer for fixed navbar */}
      <div className="h-16" aria-hidden="true" />

      {/* ════════════════════════════════════════
          HERO BANNER
      ════════════════════════════════════════ */}
      <section
        className="w-full relative py-24 sm:py-32 lg:py-40 text-center overflow-hidden"
        style={{
          background: "linear-gradient(160deg, #1A1F24 0%, #232B32 50%, #1A1F24 100%)",
        }}
      >
        <div className="absolute inset-0 pointer-events-none opacity-20" style={{ backgroundImage: "radial-gradient(circle at 50% 0%, #C5A059 0%, transparent 60%)" }} />
        
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <p
            className="text-xs font-bold tracking-[0.3em] uppercase mb-6"
            style={{ color: "#C5A059" }}
          >
            Our Portfolio
          </p>
          <h1
            className="text-5xl sm:text-6xl lg:text-7xl font-light leading-tight tracking-tight mb-8"
            style={{ color: "#FFFFFF" }}
          >
            Finished{" "}
            <span
              className="font-semibold"
              style={{
                background: "linear-gradient(135deg, #DFBE74 0%, #C5A059 50%, #9B7D46 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Projects
            </span>
          </h1>
          <p
            className="text-lg sm:text-xl leading-relaxed max-w-2xl mx-auto"
            style={{ color: "#E2E8F0" }}
          >
            Explore our gallery of completed projects showcasing our commitment to detail and design.
          </p>
        </div>
      </section>

      {/* ════════════════════════════════════════
          GALLERY GRID
      ════════════════════════════════════════ */}
      <section className="w-full py-20 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section heading */}
          <div className="text-center mb-14">
            <h2
              className="text-3xl sm:text-4xl font-bold tracking-tight mb-3"
              style={{ color: "#232B32" }}
            >
              Featured Stones & Projects
            </h2>
            <p className="text-base" style={{ color: "#6B7280" }}>
              Every texture tells a story of geological time and artisan skill.
            </p>
            <div
              className="mx-auto mt-5 rounded-full"
              style={{
                width: "56px",
                height: "3px",
                background: "linear-gradient(90deg, #C5A059 0%, #e8c97a 100%)",
              }}
            />
          </div>

          {/* Masonry-style responsive grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 mt-12">
            {GALLERY_ITEMS.map((item) => (
              <div
                key={item.id}
                className="group relative rounded-2xl overflow-hidden cursor-pointer"
                onClick={() => setSelectedItem(item)}
                style={{
                  boxShadow: "0 4px 20px rgba(35,43,50,0.08)",
                  border: "1px solid rgba(226,232,240,0.15)",
                  transition: "transform 0.4s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.4s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-6px)";
                  e.currentTarget.style.boxShadow = "0 20px 48px rgba(35,43,50,0.18)";
                  e.currentTarget.style.borderColor = "rgba(197,160,89,0.3)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 4px 20px rgba(35,43,50,0.08)";
                  e.currentTarget.style.borderColor = "rgba(226,232,240,0.15)";
                }}
              >
                {/* Image */}
                <div style={{ aspectRatio: "4/3" }}>
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    loading="lazy"
                    decoding="async"
                  />
                </div>

                {/* Overlay on hover */}
                <div
                  className="absolute inset-0 flex flex-col justify-end p-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{
                    background: "linear-gradient(to top, rgba(26,31,36,0.95) 0%, rgba(35,43,50,0.6) 70%, transparent 100%)",
                  }}
                >

                  <p
                    className="text-xl font-semibold mb-1 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500 delay-75"
                    style={{ color: "#FFFFFF" }}
                  >
                    {item.name}
                  </p>
                  <p
                    className="text-sm leading-relaxed mb-4 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500 delay-100"
                    style={{ color: "#E2E8F0" }}
                  >
                    {item.description}
                  </p>

                </div>

                {/* Always-visible tag badge */}
                <div
                  className="absolute top-4 left-4 px-4 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase"
                  style={{
                    backgroundColor: "rgba(26,31,36,0.75)",
                    color: "#C5A059",
                    backdropFilter: "blur(8px)",
                    border: "1px solid rgba(197,160,89,0.3)",
                  }}
                >
                  {item.tag}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          BOTTOM CTA
      ════════════════════════════════════════ */}
      <section className="w-full relative py-20 sm:py-28 overflow-hidden bg-[#232B32]">
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at center, rgba(197,160,89,0.1) 0%, transparent 70%)" }} />
        <div className="max-w-3xl mx-auto px-4 text-center relative z-10">
          <h2 className="text-3xl sm:text-4xl font-light tracking-tight mb-6" style={{ color: "#FFFFFF" }}>
            Experience it in your space
          </h2>
          <p className="text-base mb-8" style={{ color: "#9CA3AF" }}>
            Don't just imagine it. Use our interactive 3D configurator to visualize any stone on custom structures.
          </p>
          <a
            href="/configurator-3d"
            className="inline-flex items-center justify-center px-8 py-4 rounded-full text-sm font-bold tracking-widest uppercase transition-all duration-300"
            style={{ backgroundColor: "#C5A059", color: "#1A1F24" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 10px 30px rgba(197,160,89,0.3)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            Launch Configurator
          </a>
        </div>
      </section>
      {/* ════════════════════════════════════════
          LIGHTBOX MODAL
      ════════════════════════════════════════ */}
      {selectedItem && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8"
          style={{ backgroundColor: "rgba(12, 13, 16, 0.95)", backdropFilter: "blur(12px)" }}
          onClick={() => setSelectedItem(null)}
        >
          {/* Close Button */}
          <button 
            className="absolute top-6 right-6 w-12 h-12 flex items-center justify-center rounded-full text-white hover:text-[#C5A059] transition-colors z-50"
            style={{ backgroundColor: "rgba(255,255,255,0.1)" }}
            onClick={(e) => { e.stopPropagation(); setSelectedItem(null); }}
          >
            <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <img 
            src={selectedItem.image} 
            alt={selectedItem.name} 
            className="max-w-full max-h-full object-contain rounded-xl shadow-2xl border border-white/10"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
