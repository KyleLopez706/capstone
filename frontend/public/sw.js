/**
 * sw.js — SIX SIGMAPHIL Asset Service Worker
 *
 * PURPOSE:
 *   Intercepts all fetch requests to Supabase Storage (GLB models, PBR
 *   textures) and serves them from the browser's CacheStorage API on
 *   repeat visits.  This means returning users download ZERO bytes from
 *   Supabase, directly cutting the egress bill.
 *
 * STRATEGY: Cache-First with Network Fallback
 *   1. Check CacheStorage for the requested URL.
 *   2. If found (cache HIT)  → return immediately, no network request.
 *   3. If not found (cache MISS) → fetch from network, cache the response,
 *      then return it.
 *
 * CACHE SCOPE:
 *   Only Supabase Storage public-bucket URLs are intercepted.
 *   All other requests (API calls, auth, HTML, JS) pass through normally.
 *
 * VERSIONING:
 *   CACHE_VERSION must be incremented whenever you update a model or
 *   texture file in Supabase Storage.  Old caches are deleted on activate.
 *   (Matches MODEL_VERSION in Configurator3D.jsx — keep them in sync.)
 */

const CACHE_VERSION   = 'sixsigma-assets-v3';
const STORAGE_PATTERN = /https:\/\/[a-z0-9]+\.supabase\.co\/storage\/v1\/object\/public\//;

/* ── Install: activate immediately, no waiting for old tabs to close ── */
self.addEventListener('install', () => {
  self.skipWaiting();
});

/* ── Activate: delete stale caches from previous versions ── */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_VERSION) // delete anything that isn't current
          .map((k)  => caches.delete(k))
      )
    ).then(() => self.clients.claim()) // take control of all open tabs immediately
  );
});

/* ── Fetch: cache-first for Supabase Storage assets ── */
self.addEventListener('fetch', (event) => {
  const { request } = event;

  /* Only intercept GET requests to Supabase Storage public buckets */
  if (request.method !== 'GET' || !STORAGE_PATTERN.test(request.url)) return;

  event.respondWith(
    caches.open(CACHE_VERSION).then(async (cache) => {
      /* 1. Try cache first */
      const cached = await cache.match(request);
      if (cached) return cached;

      /* 2. Cache miss — fetch from network */
      try {
        const networkResponse = await fetch(request);

        /* Cache 200 OK and opaque responses (standard <img> tag requests) */
        if (networkResponse.status === 200 || networkResponse.type === 'opaque') {
          /* Clone before consuming — a Response body can only be read once */
          cache.put(request, networkResponse.clone());
        }

        return networkResponse;
      } catch (err) {
        /* Network failure and no cache — surface the error naturally */
        console.warn('[SW] Fetch failed, no cache available:', request.url, err);
        return new Response('Network error', { status: 503, statusText: 'Service Unavailable' });
      }
    })
  );
});
