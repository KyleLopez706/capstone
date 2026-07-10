import Navbar from "../components/Navbar";
import { useNavigate } from "react-router-dom";

/* ─────────────────────────────────────────
   3D CONFIGURATOR PAGE
   Draft / placeholder page.
───────────────────────────────────────── */
export default function Configurator3D() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen w-full" style={{ backgroundColor: "#F9F9FB" }}>
      <Navbar />

      {/* Spacer for fixed navbar */}
      <div className="h-16" aria-hidden="true" />

      {/* ── Draft Banner ── */}
      <section
        className="w-full min-h-[80vh] flex items-center justify-center px-4"
        style={{
          background:
            "radial-gradient(ellipse at 60% 40%, rgba(197,160,89,0.10) 0%, transparent 60%), linear-gradient(180deg, #F9F9FB 0%, #F0EDE8 100%)",
        }}
      >
        <div className="max-w-2xl w-full text-center">

          {/* Badge */}
          <span
            className="inline-block text-xs font-semibold tracking-widest uppercase px-4 py-1.5 rounded-full mb-6"
            style={{
              backgroundColor: "rgba(197,160,89,0.12)",
              color: "#C5A059",
              border: "1px solid rgba(197,160,89,0.3)",
            }}
          >
            Coming Soon
          </span>

          {/* Title */}
          <h1
            className="text-4xl sm:text-5xl font-light tracking-tight mb-5"
            style={{ color: "#232B32" }}
          >
            3D Stone{" "}
            <span
              className="font-semibold"
              style={{
                background: "linear-gradient(135deg, #C5A059 0%, #e8c97a 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Configurator
            </span>
          </h1>

          {/* Description */}
          <p
            className="text-base sm:text-lg leading-relaxed max-w-lg mx-auto mb-10"
            style={{ color: "#6B7280" }}
          >
            Our immersive 3D configurator is currently under development. Soon
            you will be able to explore, rotate, and customize every premium
            stone surface in real time — bringing your vision to life before a
            single slab is cut.
          </p>

          {/* Divider */}
          <div
            className="mx-auto mb-10 w-16 h-px"
            style={{ backgroundColor: "#C5A059", opacity: 0.5 }}
          />

          {/* Draft Features Preview */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12 text-left">
            {[
              {
                icon: "M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z",
                title: "360° View",
                desc: "Rotate and inspect every stone surface from any angle.",
              },
              {
                icon: "M9.53 16.122a3 3 0 0 0-5.78 1.128 2.25 2.25 0 0 1-2.4 2.245 4.5 4.5 0 0 0 8.4-2.245c0-.399-.078-.78-.22-1.128Zm0 0a15.998 15.998 0 0 0 3.388-1.62m-5.043-.025a15.994 15.994 0 0 1 1.622-3.395m3.42 3.42a15.995 15.995 0 0 0 4.764-4.648l3.876-5.814a1.151 1.151 0 0 0-1.597-1.597L14.146 6.32a15.996 15.996 0 0 0-4.649 4.763m3.42 3.42a6.776 6.776 0 0 0-3.42-3.42",
                title: "Real-Time Textures",
                desc: "Apply and preview granite textures instantly on your model.",
              },
              {
                icon: "M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3",
                title: "Export & Order",
                desc: "Save your configuration and request a custom quote instantly.",
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="rounded-xl p-5"
                style={{
                  backgroundColor: "#ffffff",
                  border: "1px solid #E2E8F0",
                  boxShadow: "0 2px 12px rgba(35,43,50,0.05)",
                }}
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center mb-3"
                  style={{ backgroundColor: "rgba(197,160,89,0.1)" }}
                >
                  <svg
                    className="w-4 h-4"
                    style={{ color: "#C5A059" }}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d={feature.icon}
                    />
                  </svg>
                </div>
                <p
                  className="text-sm font-semibold mb-1"
                  style={{ color: "#232B32" }}
                >
                  {feature.title}
                </p>
                <p className="text-xs leading-relaxed" style={{ color: "#6B7280" }}>
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>

          {/* Back button */}
          <button
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-2 text-sm font-semibold tracking-wide cursor-pointer transition-colors duration-150"
            style={{ color: "#C5A059" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#b08d47")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#C5A059")}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 19.5 8.25 12l7.5-7.5"
              />
            </svg>
            Back to Home
          </button>
        </div>
      </section>
    </div>
  );
}
