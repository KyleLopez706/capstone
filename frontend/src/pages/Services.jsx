import Navbar from "../components/Navbar";

const SERVICES = [
  {
    id: "countertops",

    title: "Custom Countertops",
    description:
      "Kitchen and bathroom countertops cut and finished to your exact measurements. Choose from our full range of granite, marble, and quartz slabs.",
  },
  {
    id: "flooring",

    title: "Flooring Installation",
    description:
      "Premium stone flooring installed by our expert team. From grand entrance halls to intimate bathrooms — every tile laid with precision.",
  },
  {
    id: "wall-cladding",

    title: "Wall Cladding",
    description:
      "Transform accent walls, feature panels, and facades with natural stone veneers that add depth, texture, and lasting luxury to any space.",
  },
  {
    id: "3d-visualizer",

    title: "3D Design Visualizer",
    description:
      "Use our interactive 3D configurator to preview exactly how your chosen stone will look in your space — before a single cut is made.",
  },
];

export default function Services() {
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
            What We Offer
          </p>
          <h1
            className="text-5xl sm:text-6xl lg:text-7xl font-light leading-tight tracking-tight mb-8"
            style={{ color: "#FFFFFF" }}
          >
            Premium{" "}
            <span
              className="font-semibold"
              style={{
                background: "linear-gradient(135deg, #DFBE74 0%, #C5A059 50%, #9B7D46 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Stone Services
            </span>
          </h1>
          <p
            className="text-lg sm:text-xl leading-relaxed max-w-2xl mx-auto"
            style={{ color: "#E2E8F0" }}
          >
            From material selection to final installation, Six Sigmaphil offers
            end-to-end stone solutions tailored to every project scale.
          </p>
        </div>
      </section>

      {/* ════════════════════════════════════════
          SERVICES GRID
      ════════════════════════════════════════ */}
      <section className="w-full py-20 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section label */}
          <div className="text-center mb-14">
            <h2
              className="text-3xl sm:text-4xl font-bold tracking-tight mb-3"
              style={{ color: "#232B32" }}
            >
              Everything You Need, Built-In
            </h2>
            <p className="text-base" style={{ color: "#6B7280" }}>
              A complete suite of stone services under one roof.
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 mt-16 max-w-5xl mx-auto">
            {SERVICES.map((svc) => (
              <div
                key={svc.id}
                className="group relative rounded-2xl p-8 flex flex-col gap-6 overflow-hidden transition-all duration-500 cursor-pointer"
                style={{
                  background: "linear-gradient(135deg, #232B32 0%, #1A1F24 100%)",
                  border: "1px solid rgba(197,160,89,0.15)",
                  boxShadow: "0 10px 30px rgba(35,43,50,0.1)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-8px)";
                  e.currentTarget.style.boxShadow = "0 20px 40px rgba(197,160,89,0.15)";
                  e.currentTarget.style.borderColor = "rgba(197,160,89,0.5)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 10px 30px rgba(35,43,50,0.1)";
                  e.currentTarget.style.borderColor = "rgba(197,160,89,0.15)";
                }}
              >
                {/* Subtle background glow on hover */}
                <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-[#C5A059] to-transparent opacity-0 group-hover:opacity-20 transition-opacity duration-500 rounded-bl-[100px]" />

                <div className="flex-1 relative z-10">
                  <h3
                    className="text-xl font-bold tracking-wide mb-3 transition-colors duration-300 group-hover:text-[#C5A059]"
                    style={{ color: "#F9F9FB" }}
                  >
                    {svc.title}
                  </h3>
                  <p
                    className="text-sm sm:text-base leading-relaxed"
                    style={{ color: "#9CA3AF" }}
                  >
                    {svc.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          CLOSING STATEMENT
      ════════════════════════════════════════ */}
      <section className="w-full relative py-20 sm:py-28 overflow-hidden bg-[#232B32]">
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at center, rgba(197,160,89,0.1) 0%, transparent 70%)" }} />
        <div className="max-w-3xl mx-auto px-4 text-center relative z-10">
          <h2 className="text-3xl sm:text-4xl font-light tracking-tight mb-6" style={{ color: "#FFFFFF" }}>
            Uncompromising Excellence
          </h2>
          <p className="text-base sm:text-lg leading-relaxed" style={{ color: "#9CA3AF" }}>
            Our commitment goes beyond simply providing materials. We deliver uncompromising quality, meticulous attention to detail, and a seamless experience that transforms your architectural vision into an enduring masterpiece.
          </p>
        </div>
      </section>
    </div>
  );
}
