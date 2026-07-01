import { useState } from "react";
import Navbar from "../components/Navbar";

export default function Contact() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    // Basic validation
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      setError("Please fill in all required fields.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError("Please enter a valid email address.");
      return;
    }

    // Simulate submission (replace with real API call when ready)
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 1200);
  };

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
            Get In Touch
          </p>
          <h1
            className="text-4xl sm:text-5xl lg:text-6xl font-light leading-tight tracking-tight mb-6"
            style={{ color: "#FFFFFF" }}
          >
            Let&apos;s{" "}
            <span
              className="font-semibold"
              style={{
                background: "linear-gradient(135deg, #C5A059 0%, #e8c97a 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Start a Conversation
            </span>
          </h1>
          <p
            className="text-base sm:text-lg leading-relaxed max-w-xl mx-auto"
            style={{ color: "#E2E8F0" }}
          >
            Have a project in mind? Reach out to our team and we&apos;ll get
            back to you within one business day.
          </p>
        </div>
      </section>

      {/* ════════════════════════════════════════
          CONTACT SECTION
      ════════════════════════════════════════ */}
      <section className="w-full py-20 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 lg:gap-16">

            {/* ── Left: contact info ── */}
            <div className="lg:col-span-2 flex flex-col gap-8">
              <div>
                <h2
                  className="text-2xl sm:text-3xl font-bold tracking-tight mb-4"
                  style={{ color: "#232B32" }}
                >
                  Contact Information
                </h2>
                <p className="text-sm leading-relaxed" style={{ color: "#6B7280" }}>
                  Visit our showroom, call us, or drop us an email. We are happy
                  to answer questions about materials, pricing, and timelines.
                </p>
              </div>

              {/* Info cards */}
              {[
                {
                  label: "Address",
                  value: "123 Stone Ave, Makati City, Metro Manila, Philippines",
                  icon: (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                    </svg>
                  ),
                },
                {
                  label: "Phone",
                  value: "+63 2 8123 4567",
                  icon: (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
                    </svg>
                  ),
                },
                {
                  label: "Email",
                  value: "hello@sixsigmaphil.com",
                  icon: (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                    </svg>
                  ),
                },
                {
                  label: "Hours",
                  value: "Mon – Sat: 8:00 AM – 6:00 PM",
                  icon: (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                  ),
                },
              ].map((item) => (
                <div key={item.label} className="flex items-start gap-4">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                      backgroundColor: "rgba(197,160,89,0.1)",
                      color: "#C5A059",
                    }}
                  >
                    {item.icon}
                  </div>
                  <div>
                    <p
                      className="text-xs font-semibold tracking-wider uppercase mb-0.5"
                      style={{ color: "#C5A059" }}
                    >
                      {item.label}
                    </p>
                    <p className="text-sm" style={{ color: "#232B32" }}>
                      {item.value}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* ── Right: contact form ── */}
            <div className="lg:col-span-3">
              <div
                className="rounded-2xl p-8 sm:p-10"
                style={{
                  backgroundColor: "#FFFFFF",
                  border: "1px solid #E2E8F0",
                  boxShadow: "0 4px 24px rgba(35,43,50,0.07)",
                }}
              >
                {submitted ? (
                  /* Success state */
                  <div className="flex flex-col items-center justify-center py-12 text-center gap-4">
                    <div
                      className="w-16 h-16 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: "rgba(197,160,89,0.12)" }}
                    >
                      <svg
                        className="w-8 h-8"
                        style={{ color: "#C5A059" }}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                        />
                      </svg>
                    </div>
                    <h3
                      className="text-xl font-semibold"
                      style={{ color: "#232B32" }}
                    >
                      Message Sent!
                    </h3>
                    <p className="text-sm max-w-xs" style={{ color: "#6B7280" }}>
                      Thank you for reaching out. Our team will get back to you
                      within one business day.
                    </p>
                  </div>
                ) : (
                  /* Form */
                  <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
                    <h3
                      className="text-xl font-semibold mb-1"
                      style={{ color: "#232B32" }}
                    >
                      Send Us a Message
                    </h3>

                    {/* Error */}
                    {error && (
                      <p
                        className="text-sm px-4 py-3 rounded-lg"
                        style={{
                          backgroundColor: "#FEF2F2",
                          color: "#DC2626",
                          border: "1px solid #FECACA",
                        }}
                      >
                        {error}
                      </p>
                    )}

                    {/* Name + Email row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div className="flex flex-col gap-1.5">
                        <label
                          htmlFor="contact-name"
                          className="text-xs font-semibold tracking-wide"
                          style={{ color: "#232B32" }}
                        >
                          Full Name <span style={{ color: "#DC2626" }}>*</span>
                        </label>
                        <input
                          id="contact-name"
                          name="name"
                          type="text"
                          value={form.name}
                          onChange={handleChange}
                          placeholder="Juan dela Cruz"
                          className="w-full rounded-lg py-2.5 px-4 text-sm outline-none transition-all duration-200"
                          style={{
                            backgroundColor: "#F9F9FB",
                            border: "1px solid #E2E8F0",
                            color: "#232B32",
                          }}
                          onFocus={(e) =>
                            (e.currentTarget.style.borderColor = "#C5A059")
                          }
                          onBlur={(e) =>
                            (e.currentTarget.style.borderColor = "#E2E8F0")
                          }
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label
                          htmlFor="contact-email"
                          className="text-xs font-semibold tracking-wide"
                          style={{ color: "#232B32" }}
                        >
                          Email Address <span style={{ color: "#DC2626" }}>*</span>
                        </label>
                        <input
                          id="contact-email"
                          name="email"
                          type="email"
                          value={form.email}
                          onChange={handleChange}
                          placeholder="you@example.com"
                          className="w-full rounded-lg py-2.5 px-4 text-sm outline-none transition-all duration-200"
                          style={{
                            backgroundColor: "#F9F9FB",
                            border: "1px solid #E2E8F0",
                            color: "#232B32",
                          }}
                          onFocus={(e) =>
                            (e.currentTarget.style.borderColor = "#C5A059")
                          }
                          onBlur={(e) =>
                            (e.currentTarget.style.borderColor = "#E2E8F0")
                          }
                        />
                      </div>
                    </div>

                    {/* Subject */}
                    <div className="flex flex-col gap-1.5">
                      <label
                        htmlFor="contact-subject"
                        className="text-xs font-semibold tracking-wide"
                        style={{ color: "#232B32" }}
                      >
                        Subject
                      </label>
                      <input
                        id="contact-subject"
                        name="subject"
                        type="text"
                        value={form.subject}
                        onChange={handleChange}
                        placeholder="e.g. Kitchen countertop inquiry"
                        className="w-full rounded-lg py-2.5 px-4 text-sm outline-none transition-all duration-200"
                        style={{
                          backgroundColor: "#F9F9FB",
                          border: "1px solid #E2E8F0",
                          color: "#232B32",
                        }}
                        onFocus={(e) =>
                          (e.currentTarget.style.borderColor = "#C5A059")
                        }
                        onBlur={(e) =>
                          (e.currentTarget.style.borderColor = "#E2E8F0")
                        }
                      />
                    </div>

                    {/* Message */}
                    <div className="flex flex-col gap-1.5">
                      <label
                        htmlFor="contact-message"
                        className="text-xs font-semibold tracking-wide"
                        style={{ color: "#232B32" }}
                      >
                        Message <span style={{ color: "#DC2626" }}>*</span>
                      </label>
                      <textarea
                        id="contact-message"
                        name="message"
                        rows={5}
                        value={form.message}
                        onChange={handleChange}
                        placeholder="Tell us about your project..."
                        className="w-full rounded-lg py-2.5 px-4 text-sm outline-none resize-none transition-all duration-200"
                        style={{
                          backgroundColor: "#F9F9FB",
                          border: "1px solid #E2E8F0",
                          color: "#232B32",
                        }}
                        onFocus={(e) =>
                          (e.currentTarget.style.borderColor = "#C5A059")
                        }
                        onBlur={(e) =>
                          (e.currentTarget.style.borderColor = "#E2E8F0")
                        }
                      />
                    </div>

                    {/* Submit */}
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3 rounded-lg text-sm font-semibold tracking-widest uppercase transition-all duration-200 cursor-pointer"
                      style={{
                        backgroundColor: loading ? "#b08d47" : "#C5A059",
                        color: "#ffffff",
                        opacity: loading ? 0.75 : 1,
                      }}
                      onMouseEnter={(e) => {
                        if (!loading)
                          e.currentTarget.style.backgroundColor = "#b08d47";
                      }}
                      onMouseLeave={(e) => {
                        if (!loading)
                          e.currentTarget.style.backgroundColor = "#C5A059";
                      }}
                    >
                      {loading ? "Sending…" : "Send Message"}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
