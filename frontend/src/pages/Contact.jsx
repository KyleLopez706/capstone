import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import { useToast, ToastNotification } from "../utils/toast";
import kitchenImg from "../assets/kitchen.png";
import { supabase } from "../supabaseClient";
export default function Contact() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", subject: "", message: "" });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [contactInfo, setContactInfo] = useState({
    phone: "0919 585 9959",
    email: "rolkoh@yahoo.com.ph",
    facebook: "facebook.com/sixsigmaphil",
    viber: "0919 585 9959"
  });
  const { toast, showToast, dismissToast } = useToast();

  useEffect(() => {
    const fetchContactInfo = async () => {
      try {
        // 1. Check app_settings first
        const { data: settingsData, error: settingsError } = await supabase
          .from('app_settings')
          .select('value')
          .eq('key', 'contact_info')
          .single();

        if (!settingsError && settingsData?.value) {
          setContactInfo(prev => ({
            phone: settingsData.value.phone || prev.phone,
            email: settingsData.value.email || prev.email,
            facebook: settingsData.value.facebook || prev.facebook,
            viber: settingsData.value.viber || prev.viber,
          }));
          return;
        }

        // 2. Fallback to labor_rates
        const { data, error } = await supabase
          .from('labor_rates')
          .select('unit_type')
          .eq('item_name', 'contact_info')
          .single();
        if (!error && data?.unit_type) {
          const parsed = JSON.parse(data.unit_type);
          setContactInfo(prev => ({
            phone: parsed.phone || prev.phone,
            email: parsed.email || prev.email,
            facebook: parsed.facebook || prev.facebook,
            viber: parsed.viber || prev.viber,
          }));
        }
      } catch (err) {
        console.warn("Using default contact information:", err);
      }
    };
    fetchContactInfo();
  }, []);

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Basic validation
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      showToast("Please fill in all required fields.", "error");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      showToast("Please enter a valid email address.", "error");
      return;
    }
    if (form.phone && !/^09\d{9}$/.test(form.phone)) {
      showToast("Please enter a valid Philippine mobile number (e.g., 09171234567).", "error");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('contact_messages')
        .insert([{
          full_name: form.name,
          email: form.email,
          phone: form.phone,
          subject: form.subject || "General Inquiry",
          message: form.message
        }]);

      if (error) throw error;
      
      setSubmitted(true);
    } catch (error) {
      console.error("Error submitting contact form:", error);
      showToast("Something went wrong. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full" style={{ backgroundColor: "#F5F5F5" }}>
      <ToastNotification toast={toast} onDismiss={dismissToast} />
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
            Get In Touch
          </p>
          <h1
            className="text-5xl sm:text-6xl lg:text-7xl font-light leading-tight tracking-tight mb-8"
            style={{ color: "#FFFFFF" }}
          >
            Let&apos;s{" "}
            <span
              className="font-semibold"
              style={{
                background: "linear-gradient(135deg, #DFBE74 0%, #C5A059 50%, #9B7D46 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Start a Conversation
            </span>
          </h1>
          <p
            className="text-lg sm:text-xl leading-relaxed max-w-2xl mx-auto"
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
      <section className="w-full py-20 sm:py-24 relative overflow-hidden">
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-0 overflow-hidden rounded-3xl" style={{ boxShadow: "0 20px 60px rgba(35,43,50,0.08)" }}>
            
            {/* ── Left: Image & Contact Info ── */}
            <div className="lg:col-span-2 relative p-10 sm:p-14 flex flex-col justify-between overflow-hidden">
              <div className="absolute inset-0 z-0">
                <img src={kitchenImg} alt="Showroom" className="w-full h-full object-cover" loading="lazy" decoding="async" />
                <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, rgba(26,31,36,0.95) 0%, rgba(35,43,50,0.85) 100%)" }} />
              </div>
              
              <div className="relative z-10">
                <h2
                  className="text-3xl sm:text-4xl font-light tracking-tight mb-12"
                  style={{ color: "#FFFFFF" }}
                >
                  Contact Information
                </h2>

                <div className="flex flex-col gap-8">
                  {[
                    { label: "Phone", value: contactInfo.phone },
                    { label: "Email", value: contactInfo.email },
                    { label: "Facebook Page", value: contactInfo.facebook },
                    { label: "Viber", value: contactInfo.viber },
                  ].map((item) => (
                    <div key={item.label} className="flex flex-col">
                      <p
                        className="text-xs font-bold tracking-[0.2em] uppercase mb-1"
                        style={{ color: "#C5A059" }}
                      >
                        {item.label}
                      </p>
                      <p className="text-sm" style={{ color: "#FFFFFF" }}>
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Right: contact form ── */}
            <div className="lg:col-span-3 p-10 sm:p-14 flex flex-col justify-center" style={{ backgroundColor: "#FFFFFF" }}>
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


                    {/* Name, Phone, Email row */}
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
                          onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value.replace(/[^A-Za-z\s\-ñÑ]/g, '') }))}
                          placeholder="Juan dela Cruz"
                          className="w-full rounded-lg py-2.5 px-4 text-sm outline-none transition-all duration-200"
                          style={{
                            backgroundColor: "#F5F5F5",
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
                          htmlFor="contact-phone"
                          className="text-xs font-semibold tracking-wide"
                          style={{ color: "#232B32" }}
                        >
                          Phone Number
                        </label>
                        <input
                          id="contact-phone"
                          name="phone"
                          type="tel"
                          value={form.phone}
                          onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value.replace(/[^0-9]/g, '') }))}
                          maxLength={11}
                          placeholder="0917 123 4567"
                          className="w-full rounded-lg py-2.5 px-4 text-sm outline-none transition-all duration-200"
                          style={{
                            backgroundColor: "#F5F5F5",
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
                      <div className="flex flex-col gap-1.5 sm:col-span-2">
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
                            backgroundColor: "#F5F5F5",
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
                          backgroundColor: "#F5F5F5",
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
                          backgroundColor: "#F5F5F5",
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
      </section>
    </div>
  );
}
