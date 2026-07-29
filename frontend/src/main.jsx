import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App.jsx";

/* ── Service Worker Registration ──────────────────────────────────────────
   Registers sw.js which implements a cache-first strategy for all
   Supabase Storage public-bucket requests (GLB models, PBR textures).

   On repeat visits, assets are served from CacheStorage (zero egress).
   On first visit, files download once, are cached, and future visits
   cost nothing in Supabase egress for those files.

   SW is scoped to '/' so it covers the entire app.
   It is registered AFTER React renders to avoid blocking first paint.
   'serviceWorker' in navigator guards against unsupported browsers.
────────────────────────────────────────────────────────────────────────── */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((reg) => {
        console.info('[SW] Registered — scope:', reg.scope);
      })
      .catch((err) => {
        /* Non-fatal: app works without the SW, just no asset caching */
        console.warn('[SW] Registration failed (asset caching disabled):', err);
      });
  });
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
