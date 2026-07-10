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
  {
    id: "consultation",

    title: "Design Consultation",
    description:
      "One-on-one sessions with our stone specialists. We help you select the perfect material, finish, and profile for your project and budget.",
  },
  {
    id: "fabrication",

    title: "Custom Fabrication",
    description:
      "Our state-of-the-art workshop handles complex edge profiles, waterfall edges, book-matching, and intricate inlays with exacting tolerances.",
  },
];

export default function Services() {
  return (
    <div className="min-h-screen w-full" style={{ backgroundColor: "#F9F9FB" }}>
      <Navbar />

      {/* Spacer for fixed navbar */}
      <div className="h-16" aria-hidden="true" />

      {/* ════════════════════════════════════════
          HERO BANNER
      ════════════════════════════════════════ */}
      <section
        className="w-full py-20 sm:py-28 lg:py-36 text-center"
        style={{
          background:
            "linear-gradient(160deg, #232B32 0%, #2e3a43 60%, #232B32 100%)",
        }}
      >
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <p
            className="text-xs font-semibold tracking-widest uppercase mb-4"
            style={{ color: "#C5A059" }}
          >
            What We Offer
          </p>
          <h1
            className="text-4xl sm:text-5xl lg:text-6xl font-light leading-tight tracking-tight mb-6"
            style={{ color: "#FFFFFF" }}
          >
            Premium{" "}
            <span
              className="font-semibold"
              style={{
                background: "linear-gradient(135deg, #C5A059 0%, #e8c97a 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Stone Services
            </span>
          </h1>
          <p
            className="text-base sm:text-lg leading-relaxed max-w-xl mx-auto"
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

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {SERVICES.map((svc) => (
              <div
                key={svc.id}
                className="group rounded-2xl p-6 flex flex-col gap-4 transition-all duration-300"
                style={{
                  backgroundColor: "#FFFFFF",
                  border: "1px solid #E2E8F0",
                  boxShadow: "0 4px 20px rgba(35,43,50,0.06)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-4px)";
                  e.currentTarget.style.boxShadow =
                    "0 16px 40px rgba(35,43,50,0.12)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow =
                    "0 4px 20px rgba(35,43,50,0.06)";
                }}
              >

                {/* Text */}
                <div>
                  <h3
                    className="text-lg font-semibold mb-2"
                    style={{ color: "#232B32" }}
                  >
                    {svc.title}
                  </h3>
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: "#6B7280" }}
                  >
                    {svc.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
