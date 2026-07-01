import Navbar from "../components/Navbar";
import kitchenImg from "../assets/kitchen.png";
import blackMarquinaImg from "../assets/Black Marquina.jpg";
import blackGalaxyImg from "../assets/Black galaxy.png";
import calacattaImg from "../assets/calacatta quarts.jpg";
import saltPepperImg from "../assets/salt and pepper.png";
import whiteQuartzImg from "../assets/white quartz.png";

/* ─────────────────────────────────────────
   STONE DESIGN DATA
   Each entry maps to one granite asset image.
───────────────────────────────────────── */
const STONE_DESIGNS = [
  {
    id: "black-marquina",
    name: "Black Marquina",
    description:
      "A bold statement of contrast — rich obsidian stone laced with delicate white veins that evoke old-world Italian marble prestige.",
    image: blackMarquinaImg,
  },
  {
    id: "black-galaxy",
    name: "Black Galaxy",
    description:
      "Midnight black canvas peppered with shimmering gold and bronze crystals. A cosmic luxury reserved for statement countertops.",
    image: blackGalaxyImg,
  },
  {
    id: "calacatta-quartz",
    name: "Calacatta Quartz",
    description:
      "The pinnacle of refined elegance. Broad sweeping veins of champagne gold cascade across a pristine white canvas.",
    image: calacattaImg,
  },
  {
    id: "salt-and-pepper",
    name: "Salt & Pepper",
    description:
      "A timeless, understated classic. Finely dispersed silver and charcoal minerals create a balanced, architecturally versatile texture.",
    image: saltPepperImg,
  },
  {
    id: "white-quartz",
    name: "White Quartz",
    description:
      "Immaculate and luminous. This engineered quartz radiates pure brightness, making spaces feel open, airy, and effortlessly luxurious.",
    image: whiteQuartzImg,
  },
];

/* ─────────────────────────────────────────
   MAIN HOME COMPONENT
───────────────────────────────────────── */
export default function Home() {
  return (
    <div className="min-h-screen w-full" style={{ backgroundColor: "#F9F9FB" }}>
      {/* Shared navbar — handles auth, nav links, and hamburger */}
      <Navbar />

      {/* Spacer for fixed navbar */}
      <div className="h-16" aria-hidden="true" />

      {/* ════════════════════════════════════════
          HERO SECTION
      ════════════════════════════════════════ */}
      <section className="w-full relative overflow-hidden bg-[#232B32]">
        {/* Ambient background kitchen image */}
        <div
          className="absolute inset-0 z-0 pointer-events-none"
          style={{ opacity: 0.6 }}
          aria-hidden="true"
        >
          <img
            src={kitchenImg}
            alt="Premium Granite Kitchen Countertop"
            className="w-full h-full object-cover object-center"
          />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28 lg:py-36 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            {/* Headline */}
            <h1
              className="text-4xl sm:text-5xl lg:text-6xl font-light leading-tight tracking-tight mb-6"
              style={{ color: "#FFFFFF" }}
            >
              Craft Your Perfect{" "}
              <span
                className="font-semibold"
                style={{
                  background:
                    "linear-gradient(135deg, #C5A059 0%, #e8c97a 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                Stone Design
              </span>{" "}
              in 3D
            </h1>

            {/* Subheadline */}
            <p
              className="text-base sm:text-lg leading-relaxed max-w-xl mx-auto"
              style={{ color: "#E2E8F0" }}
            >
              Six Sigmaphil brings world-class granite and marble to your
              architecture. Visualize, configure, and order premium stone
              surfaces.
            </p>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          POPULAR STONE DESIGNS SECTION
      ════════════════════════════════════════ */}
      <section
        className="w-full py-20 sm:py-24 lg:py-32"
        style={{
          background:
            "linear-gradient(180deg, #F9F9FB 0%, #F0EDE8 50%, #F9F9FB 100%)",
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="text-center mb-14 sm:mb-16">
            <h2
              className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-3"
              style={{ color: "#232B32" }}
            >
              Popular Stone Designs
            </h2>
            <p
              className="text-base sm:text-lg  tracking-wide"
              style={{ color: "#6B7280" }}
            >
              Explore our most loved patterns
            </p>
            {/* Accent divider */}
          </div>

          {/* Stone Cards — flex-wrap with justify-center so the last 2 of 5 center */}
          <div className="flex flex-wrap justify-center gap-6 lg:gap-8">
            {STONE_DESIGNS.map((stone, index) => (
              <div
                key={stone.id}
                className="group rounded-2xl overflow-hidden flex flex-col w-full md:w-[calc(50%-12px)] lg:w-[calc(33.333%-22px)]"
                style={{
                  backgroundColor: "#FFFFFF",
                  border: "1px solid #E2E8F0",
                  boxShadow: "0 4px 20px rgba(35,43,50,0.06)",
                  transition: "transform 0.3s ease, box-shadow 0.3s ease",
                  animationDelay: `${index * 80}ms`,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-6px)";
                  e.currentTarget.style.boxShadow =
                    "0 16px 40px rgba(35,43,50,0.14)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow =
                    "0 4px 20px rgba(35,43,50,0.06)";
                }}
              >
                {/* Stone Image */}
                <div
                  className="relative overflow-hidden"
                  style={{ aspectRatio: "4/3" }}
                >
                  <img
                    src={stone.image}
                    alt={stone.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>

                {/* Card Content */}
                <div className="flex flex-col flex-1 p-5 sm:p-6">
                  {/* Name + Color chip */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <h3
                      className="text-lg sm:text-xl font-semibold leading-snug"
                      style={{ color: "#232B32" }}
                    >
                      {stone.name}
                    </h3>
                  </div>

                  {/* Fancy gradient divider */}
                  <div
                    className="mb-3"
                    style={{
                      height: "1px",
                      background:
                        "linear-gradient(90deg, #E2E8F0 0%, transparent 100%)",
                    }}
                  />

                  {/* Description */}
                  <p
                    className="text-sm leading-relaxed flex-1"
                    style={{ color: "#6B7280" }}
                  >
                    {stone.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          FOOTER
      ════════════════════════════════════════ */}
      <footer
        className="w-full"
        style={{
          backgroundColor: "#232B32",
          borderTop: "1px solid rgba(226,232,240,0.12)",
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
          <div className="flex flex-col sm:flex-row items-center sm:justify-between gap-6">
            {/* Brand */}
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ backgroundColor: "#C5A059" }}
              >
                <svg
                  className="w-4 h-4"
                  style={{ color: "#ffffff" }}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125v-3.75"
                  />
                </svg>
              </div>
              <div>
                <p
                  className="text-sm font-light tracking-widest uppercase"
                  style={{ color: "#F9F9FB" }}
                >
                  Six Sigmaphil
                </p>
                <p className="text-xs mt-0.5" style={{ color: "#C5A059" }}></p>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div
            className="mt-8 mb-6 h-px"
            style={{ backgroundColor: "rgba(226,232,240,0.1)" }}
          />
        </div>
      </footer>
    </div>
  );
}
