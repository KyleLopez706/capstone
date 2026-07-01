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
            Our Portfolio
          </p>
          <h1
            className="text-4xl sm:text-5xl lg:text-6xl font-light leading-tight tracking-tight mb-6"
            style={{ color: "#FFFFFF" }}
          >
            Stone{" "}
            <span
              className="font-semibold"
              style={{
                background: "linear-gradient(135deg, #C5A059 0%, #e8c97a 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Gallery
            </span>
          </h1>
          <p
            className="text-base sm:text-lg leading-relaxed max-w-xl mx-auto"
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {GALLERY_ITEMS.map((item) => (
              <div
                key={item.id}
                className="group relative rounded-2xl overflow-hidden cursor-pointer"
                style={{
                  boxShadow: "0 4px 20px rgba(35,43,50,0.08)",
                  transition: "transform 0.3s ease, box-shadow 0.3s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-6px)";
                  e.currentTarget.style.boxShadow =
                    "0 20px 48px rgba(35,43,50,0.18)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow =
                    "0 4px 20px rgba(35,43,50,0.08)";
                }}
              >
                {/* Image */}
                <div style={{ aspectRatio: "4/3" }}>
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>

                {/* Overlay on hover */}
                <div
                  className="absolute inset-0 flex flex-col justify-end p-5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{
                    background:
                      "linear-gradient(to top, rgba(35,43,50,0.85) 0%, transparent 60%)",
                  }}
                >
                  <span
                    className="text-xs font-semibold tracking-widest uppercase mb-1"
                    style={{ color: "#C5A059" }}
                  >
                    {item.tag}
                  </span>
                  <p
                    className="text-lg font-semibold"
                    style={{ color: "#FFFFFF" }}
                  >
                    {item.name}
                  </p>
                </div>

                {/* Always-visible tag badge */}
                <div
                  className="absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-semibold tracking-wider uppercase"
                  style={{
                    backgroundColor: "rgba(35,43,50,0.75)",
                    color: "#C5A059",
                    backdropFilter: "blur(6px)",
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
    </div>
  );
}
