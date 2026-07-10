import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import kitchenImg from "../assets/kitchen.png";
import blackMarquinaImg from "../assets/Black Marquina.jpg";
import kitchenCountertopBlackMarquinaImg from "../assets/Kitchen countertop black marquina.png";
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
  const navigate = useNavigate();
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
          3D CONFIGURATOR SHOWCASE SECTION
      ════════════════════════════════════════ */}
      <section
        className="w-full py-20 sm:py-24 lg:py-28"
        style={{ backgroundColor: "#232B32" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* ── Section Label (centered, above image) ── */}
          <div className="text-center mb-12">
            <span
              className="inline-block text-xs font-semibold tracking-widest uppercase mb-4"
              style={{ color: "#C5A059" }}
            >
              3D Visualization
            </span>
            <h2
              className="text-3xl sm:text-4xl lg:text-5xl font-light tracking-tight mb-4"
              style={{ color: "#F9F9FB" }}
            >
              From Stone to{" "}
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
                Stunning Reality
              </span>
            </h2>
            <p
              className="text-sm sm:text-base max-w-xl mx-auto leading-relaxed"
              style={{ color: "#9CA3AF" }}
            >
              Our 3D configurator transforms raw stone textures into
              photorealistic, interactive models — so you can see exactly how
              your surface will look before it ever arrives.
            </p>
          </div>

          {/* ── Main Layout: Images Left | Description Right ── */}
          <div className="flex flex-col lg:flex-row gap-6 lg:gap-10 items-stretch">
            {/* LEFT — Two stacked images */}
            <div className="flex flex-row lg:flex-col gap-4 lg:gap-4 w-full lg:w-[48%]">
              {/* Black Marquina slab */}
              <div
                className="relative overflow-hidden rounded-2xl flex-1"
                style={{
                  border: "1px solid rgba(226,232,240,0.12)",
                  minHeight: "220px",
                }}
              >
                <img
                  src={blackMarquinaImg}
                  alt="Black Marquina granite slab"
                  className="w-full h-full object-cover"
                  style={{ maxHeight: "280px" }}
                />
                {/* Overlay label */}
                <div
                  className="absolute bottom-0 left-0 right-0 px-4 py-3"
                  style={{
                    background:
                      "linear-gradient(0deg, rgba(35,43,50,0.9) 0%, transparent 100%)",
                  }}
                >
                  <p
                    className="text-xs font-semibold tracking-widest uppercase"
                    style={{ color: "#C5A059" }}
                  >
                    Raw Slab
                  </p>
                  <p
                    className="text-sm font-light"
                    style={{ color: "#F9F9FB" }}
                  >
                    Black Marquina
                  </p>
                </div>
              </div>

              {/* Kitchen countertop application */}
              <div
                className="relative overflow-hidden rounded-2xl flex-1"
                style={{
                  border: "1px solid rgba(226,232,240,0.12)",
                  minHeight: "220px",
                }}
              >
                <img
                  src={kitchenCountertopBlackMarquinaImg}
                  alt="Black Marquina kitchen countertop"
                  className="w-full h-full object-cover"
                  style={{ maxHeight: "280px" }}
                />
                {/* Overlay label */}
                <div
                  className="absolute bottom-0 left-0 right-0 px-4 py-3"
                  style={{
                    background:
                      "linear-gradient(0deg, rgba(35,43,50,0.9) 0%, transparent 100%)",
                  }}
                >
                  <p
                    className="text-xs font-semibold tracking-widest uppercase"
                    style={{ color: "#C5A059" }}
                  >
                    In Application
                  </p>
                  <p
                    className="text-sm font-light"
                    style={{ color: "#F9F9FB" }}
                  >
                    Kitchen Countertop
                  </p>
                </div>
              </div>
            </div>

            {/* RIGHT — Rich Description */}
            <div
              className="w-full lg:w-[52%] rounded-2xl p-8 sm:p-10 flex flex-col justify-between"
              style={{
                backgroundColor: "rgba(249,249,251,0.04)",
                border: "1px solid rgba(226,232,240,0.1)",
              }}
            >
              {/* Title */}
              <div>
                <h3
                  className="text-2xl sm:text-3xl font-light tracking-wide mb-2"
                  style={{ color: "#F9F9FB" }}
                >
                  The Allure of{" "}
                  <span
                    style={{
                      background:
                        "linear-gradient(135deg, #C5A059 0%, #e8c97a 100%)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                      fontWeight: 600,
                    }}
                  >
                    Black Marquina
                  </span>
                </h3>

                {/* Gold divider */}
                <div
                  className="mb-6 mt-4 w-12 h-0.5 rounded-full"
                  style={{ backgroundColor: "#C5A059" }}
                />

                {/* Stone description */}
                <p
                  className="text-sm sm:text-base leading-relaxed mb-5"
                  style={{ color: "#9CA3AF" }}
                >
                  Born from the quarries of northern Spain, Black Marquina is
                  nature&apos;s most dramatic masterpiece. Its profound,
                  jet-black canvas is traversed by a delicate network of{" "}
                  <span style={{ color: "#F9F9FB", fontWeight: 500 }}>
                    ivory-white veining
                  </span>{" "}
                  — a contrast so striking, it commands the entire character of
                  any space it inhabits. Each slab is a singular work of art,
                  unrepeatable, timeless, and utterly commanding.
                </p>

                {/* Countertop & 3D model description */}
                <div
                  className="rounded-xl p-5 mb-6"
                  style={{
                    backgroundColor: "rgba(197,160,89,0.07)",
                    border: "1px solid rgba(197,160,89,0.2)",
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div>
                      <p
                        className="text-xs font-semibold tracking-widest uppercase mb-1"
                        style={{ color: "#C5A059" }}
                      >
                        Elevated to 3D
                      </p>
                      <p
                        className="text-sm leading-relaxed"
                        style={{ color: "#9CA3AF" }}
                      >
                        The countertop image you see is not merely a photograph
                        — it is{" "}
                        <span style={{ color: "#F9F9FB", fontWeight: 500 }}>
                          transformed into a fully interactive 3D model
                        </span>
                        , rendered with precision and depth to give you an
                        immersive spatial experience. Inspect every vein, every
                        reflection, every curve — as if the stone were right in
                        front of you.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* CTA Button */}
              <button
                onClick={() => navigate("/configurator-3d")}
                className="inline-flex items-center justify-center gap-3 w-full sm:w-auto px-8 py-4 rounded-xl text-sm font-semibold tracking-widest uppercase cursor-pointer transition-all duration-200"
                style={{ backgroundColor: "#C5A059", color: "#ffffff" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#b08d47";
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow =
                    "0 8px 24px rgba(197,160,89,0.35)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "#C5A059";
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                Launch 3D Configurator
              </button>
            </div>
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
