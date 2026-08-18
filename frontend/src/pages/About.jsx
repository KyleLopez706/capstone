import Navbar from "../components/Navbar";

export default function About() {
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
            Our Story
          </p>
          <h1
            className="text-5xl sm:text-6xl lg:text-7xl font-light leading-tight tracking-tight mb-8"
            style={{ color: "#FFFFFF" }}
          >
            Crafting Stone{" "}
            <span
              className="font-semibold"
              style={{
                background: "linear-gradient(135deg, #DFBE74 0%, #C5A059 50%, #9B7D46 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Excellence
            </span>
          </h1>
          <p
            className="text-lg sm:text-xl leading-relaxed max-w-2xl mx-auto"
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
                Founded with a passion for natural stone, Six Sigmaphil has
                grown into a full-service granite and marble specialist. We
                source the finest materials from quarries around the world and
                deliver them with precision and care directly to your project.
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
                  className="rounded-2xl p-6 sm:p-8 text-center transition-transform duration-300 hover:-translate-y-1"
                  style={{
                    backgroundColor: "rgba(255,255,255,0.6)",
                    backdropFilter: "blur(12px)",
                    border: "1px solid rgba(226,232,240,0.8)",
                    boxShadow: "0 10px 30px rgba(35,43,50,0.05)",
                  }}
                >
                  <p
                    className="text-4xl sm:text-5xl font-bold mb-3"
                    style={{
                      background: "linear-gradient(135deg, #C5A059 0%, #e8c97a 100%)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                    }}
                  >
                    {stat.value}
                  </p>
                  <p
                    className="text-sm font-semibold tracking-wide uppercase"
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

      {/* ════════════════════════════════════════
          BOTTOM CTA
      ════════════════════════════════════════ */}
      <section className="w-full relative py-20 sm:py-28 overflow-hidden bg-[#232B32]">
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at center, rgba(197,160,89,0.1) 0%, transparent 70%)" }} />
        <div className="max-w-3xl mx-auto px-4 text-center relative z-10">
          <h2 className="text-3xl sm:text-4xl font-light tracking-tight mb-6" style={{ color: "#FFFFFF" }}>
            Ready to start your project?
          </h2>
          <p className="text-base mb-8" style={{ color: "#9CA3AF" }}>
            Let our experts guide you through material selection and custom fabrication.
          </p>
          <a
            href="/services"
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
            See Our Services
          </a>
        </div>
      </section>
    </div>
  );
}
