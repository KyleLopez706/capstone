import Navbar from "../components/Navbar";
import blackMarquinaImg from "../assets/Black Marquina.jpg";
import blackGalaxyImg from "../assets/Black galaxy.png";
import calacattaImg from "../assets/calacatta quarts.jpg";
import saltPepperImg from "../assets/salt and pepper.png";
import whiteQuartzImg from "../assets/white quartz.png";
import kitchenImg from "../assets/kitchen.png";

const GALLERY_ITEMS = [
  {
    id: "black-marquina",
    name: "Black Marquina",
    tag: "Veined Marble",
    image: blackMarquinaImg,
  },
  {
    id: "black-galaxy",
    name: "Black Galaxy",
    tag: "Speckled Granite",
    image: blackGalaxyImg,
  },
  {
    id: "calacatta-quartz",
    name: "Calacatta Quartz",
    tag: "Book-Matched Marble",
    image: calacattaImg,
  },
  {
    id: "salt-pepper",
    name: "Salt & Pepper",
    tag: "Granular Granite",
    image: saltPepperImg,
  },
  {
    id: "white-quartz",
    name: "White Quartz",
    tag: "Pure Crystalline",
    image: whiteQuartzImg,
  },
  {
    id: "kitchen-install",
    name: "Kitchen Installation",
    tag: "Project Showcase",
    image: kitchenImg,
  },
];

export default function Gallery() {
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
            Stone{" "}
            <span
              className="font-semibold"
              style={{
                background: "linear-gradient(135deg, #DFBE74 0%, #C5A059 50%, #9B7D46 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Gallery
            </span>
          </h1>
          <p
            className="text-lg sm:text-xl leading-relaxed max-w-2xl mx-auto"
            style={{ color: "#E2E8F0" }}
          >
            Browse our curated collection of premium granite, marble, and quartz
            surfaces — each one a testament to natural beauty and expert
            craftsmanship.
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
                    background: "linear-gradient(to top, rgba(26,31,36,0.9) 0%, rgba(35,43,50,0.4) 50%, transparent 100%)",
                  }}
                >
                  <span
                    className="text-xs font-semibold tracking-widest uppercase mb-2 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500"
                    style={{ color: "#C5A059" }}
                  >
                    {item.tag}
                  </span>
                  <p
                    className="text-xl font-semibold mb-4 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500 delay-75"
                    style={{ color: "#FFFFFF" }}
                  >
                    {item.name}
                  </p>
                  
                  {/* View in 3D Button */}
                  <a
                    href="/configurator-3d"
                    className="inline-flex items-center gap-2 self-start px-5 py-2.5 rounded-full text-xs font-bold tracking-widest uppercase transition-all duration-300 transform translate-y-4 group-hover:translate-y-0 delay-150"
                    style={{ backgroundColor: "rgba(197,160,89,0.2)", color: "#DFBE74", border: "1px solid rgba(197,160,89,0.4)", backdropFilter: "blur(4px)" }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#C5A059";
                      e.currentTarget.style.color = "#1A1F24";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "rgba(197,160,89,0.2)";
                      e.currentTarget.style.color = "#DFBE74";
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6" />
                    </svg>
                    View in 3D
                  </a>
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
    </div>
  );
}
