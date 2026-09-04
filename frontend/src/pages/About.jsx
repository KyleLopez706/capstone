import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import aboutImage from "../assets/about-history.jpg";

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
            {/* Image (Left side) */}
            <div className="w-full">
              <img 
                src={aboutImage} 
                alt="Stone quarrying history" 
                className="w-full h-auto rounded-2xl shadow-2xl object-cover"
                style={{ 
                  maxHeight: "600px", 
                  border: "1px solid rgba(226,232,240,0.8)" 
                }}
              />
            </div>

            {/* Text (Right side) */}
            <div>
              <p
                className="text-xs font-semibold tracking-widest uppercase mb-3"
                style={{ color: "#C5A059" }}
              >
                Who We Are
              </p>
              <h2
                className="text-3xl sm:text-4xl font-bold tracking-tight mb-8"
                style={{ color: "#232B32" }}
              >
                Philippine Craftsmanship Meets Global Standards
              </h2>
              <p
                className="text-base sm:text-lg leading-relaxed mb-6"
                style={{ color: "#6B7280" }}
              >
                Founded in the early 2000s by Rolando Koh, SixSigmaPhil Enterprise Corporation is engaged in the supply fabrication and installation of high quality granite, marble, limestone, sandstone, quartz & slates. Roland, an engineer by profession and a visionary by nature, was deeply inspired by the Six Sigma methodology, a systematic approach to eliminating waste, reducing errors, and optimizing performance in organizations.
              </p>
              <p
                className="text-base sm:text-lg leading-relaxed"
                style={{ color: "#6B7280" }}
              >
                Over the years, Six SigmaPhil expanded its expertise beyond traditional process improvement. Today, the company provides integrated business solutions that include process optimization, data analytics, digital transformation consulting, and corporate training programs. Through a team of dedicated professionals, the company continues to empower organizations to reach operational excellence while fostering a culture of continuous improvement.
              </p>
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
          <Link
            to="/services"
            className="inline-flex items-center justify-center px-8 py-4 rounded-full text-sm font-bold tracking-widest uppercase transition-all duration-300 cursor-pointer"
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
          </Link>
        </div>
      </section>
    </div>
  );
}
