import Navbar from "../components/Navbar";

export default function About() {
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
            Our Story
          </p>
          <h1
            className="text-4xl sm:text-5xl lg:text-6xl font-light leading-tight tracking-tight mb-6"
            style={{ color: "#FFFFFF" }}
          >
            Crafting Stone{" "}
            <span
              className="font-semibold"
              style={{
                background: "linear-gradient(135deg, #C5A059 0%, #e8c97a 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Excellence
            </span>
          </h1>
          <p
            className="text-base sm:text-lg leading-relaxed max-w-xl mx-auto"
            style={{ color: "#E2E8F0" }}
          >
            Six Sigmaphil has been the Philippines' premier destination for
            world-class granite and marble surfaces since our founding. We blend
            craftsmanship with technology to bring your vision to life.
          </p>
        </div>
      </section>

      {/* ════════════════════════════════════════
          CONTENT SECTION
      ════════════════════════════════════════ */}
      <section className="w-full py-20 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Text */}
            <div>
              <p
                className="text-xs font-semibold tracking-widest uppercase mb-3"
                style={{ color: "#C5A059" }}
              >
                Who We Are
              </p>
              <h2
                className="text-3xl sm:text-4xl font-bold tracking-tight mb-6"
                style={{ color: "#232B32" }}
              >
                Philippine Craftsmanship Meets Global Standards
              </h2>
              <p
                className="text-base leading-relaxed mb-4"
                style={{ color: "#6B7280" }}
              >
                Founded with a passion for natural stone, Six Sigmaphil has grown
                into a full-service granite and marble specialist. We source the
                finest materials from quarries around the world and deliver them
                with precision and care directly to your project.
              </p>
              <p
                className="text-base leading-relaxed"
                style={{ color: "#6B7280" }}
              >
                Our team of skilled craftsmen and designers work hand-in-hand
                with architects, interior designers, and homeowners to ensure
                every surface is a masterpiece — measured, cut, and finished to
                exact specifications.
              </p>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-6">
              {[
                { value: "15+", label: "Years of Excellence" },
                { value: "500+", label: "Projects Completed" },
                { value: "50+", label: "Stone Varieties" },
                { value: "100%", label: "Client Satisfaction" },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl p-6 text-center"
                  style={{
                    backgroundColor: "#FFFFFF",
                    border: "1px solid #E2E8F0",
                    boxShadow: "0 4px 20px rgba(35,43,50,0.06)",
                  }}
                >
                  <p
                    className="text-4xl font-bold mb-2"
                    style={{
                      background:
                        "linear-gradient(135deg, #C5A059 0%, #e8c97a 100%)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                    }}
                  >
                    {stat.value}
                  </p>
                  <p
                    className="text-sm font-medium"
                    style={{ color: "#6B7280" }}
                  >
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
