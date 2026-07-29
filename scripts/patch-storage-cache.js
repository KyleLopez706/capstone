/**
 * patch-storage-cache.js
 * ─────────────────────────────────────────────────────────────────────────
 * Patches every file in your Supabase Storage public bucket to use:
 *
 *   Cache-Control: public, max-age=31536000, immutable
 *
 * Uses Node 18+ native fetch — NO external packages or npm install needed.
 *
 * HOW TO RUN (from D:\Capstone):
 *   node scripts/patch-storage-cache.js
 *
 * REQUIRES:
 *   VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY set in frontend/.env
 *   Node.js 18 or later (native fetch support)
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/* ── Load credentials from frontend/.env ─────────────────────────────── */
function loadEnv() {
  try {
    const envPath = join(__dirname, '..', 'frontend', '.env');
    const raw     = readFileSync(envPath, 'utf8');
    const vars    = {};
    for (const line of raw.split('\n')) {
      const eqIdx = line.indexOf('=');
      if (eqIdx < 1) continue;
      const key = line.slice(0, eqIdx).trim();
      const val = line.slice(eqIdx + 1).trim().replace(/^['"]|['"]$/g, '');
      if (key) vars[key] = val;
    }
    return vars;
  } catch {
    return {};
  }
}

const env = loadEnv();
const SUPABASE_URL = env.VITE_SUPABASE_URL  || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌  Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  console.error('    Make sure frontend/.env exists with both values.');
  console.error('    (You must use the Service Role Key to bypass RLS for uploads.)');
  process.exit(1);
}

/* ── Common auth headers ─────────────────────────────────────────────── */
const AUTH_HEADERS = {
  apikey:        SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
};

/* ── MIME type map ───────────────────────────────────────────────────── */
const MIME = {
  glb:  'model/gltf-binary',
  png:  'image/png',
  jpg:  'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  ktx2: 'image/ktx2',
};

function mimeFor(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  return MIME[ext] || 'application/octet-stream';
}

/* ── List all files in a bucket (handles pagination) ─────────────────── */
async function listFiles(bucket, prefix = '') {
  const all = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const res = await fetch(
      `${SUPABASE_URL}/storage/v1/object/list/${bucket}`,
      {
        method:  'POST',
        headers: { ...AUTH_HEADERS, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ prefix, limit, offset, sortBy: { column: 'name', order: 'asc' } }),
      }
    );

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`List failed (${res.status}): ${text}`);
    }

    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) break;

    /* Recurse into sub-folders (items without an id are folders) */
    for (const item of data) {
      if (!item.id) {
        /* It's a folder — list recursively */
        const subPath = prefix ? `${prefix}/${item.name}` : item.name;
        const nested  = await listFiles(bucket, subPath);
        all.push(...nested);
      } else {
        all.push(prefix ? `${prefix}/${item.name}` : item.name);
      }
    }

    if (data.length < limit) break; // last page
    offset += limit;
  }

  return all;
}

/* ── Download a file as an ArrayBuffer ──────────────────────────────── */
async function downloadFile(bucket, path) {
  const res = await fetch(
    `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`,
    { headers: AUTH_HEADERS }
  );
  if (!res.ok) throw new Error(`Download failed (${res.status}) for ${path}`);
  return res.arrayBuffer();
}

/* ── Re-upload with long-lived cache header (upsert) ─────────────────── */
async function uploadFile(bucket, path, buffer, mime) {
  const res = await fetch(
    `${SUPABASE_URL}/storage/v1/object/${bucket}/${path}`,
    {
      method:  'PUT',
      headers: {
        ...AUTH_HEADERS,
        'Content-Type':  mime,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'x-upsert':      'true',
      },
      body: buffer,
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Upload failed (${res.status}): ${text}`);
  }
  return res.json();
}

/* ── Patch a single bucket ───────────────────────────────────────────── */
async function patchBucket(bucket) {
  console.log(`\n📦  Bucket: ${bucket}`);

  let files;
  try {
    files = await listFiles(bucket);
  } catch (err) {
    console.error(`   ❌  Could not list files: ${err.message}`);
    return { patched: 0, failed: 0 };
  }

  if (files.length === 0) {
    console.log('   No files found.');
    return { patched: 0, failed: 0 };
  }

  console.log(`   Found ${files.length} file(s)\n`);

  let patched = 0;
  let failed  = 0;

  for (const path of files) {
    process.stdout.write(`   → ${path} … `);
    try {
      const buffer = await downloadFile(bucket, path);
      await uploadFile(bucket, path, buffer, mimeFor(path));
      process.stdout.write('✅  max-age=31536000\n');
      patched++;
    } catch (err) {
      process.stdout.write(`❌  ${err.message}\n`);
      failed++;
    }
  }

  return { patched, failed };
}

/* ── Main ────────────────────────────────────────────────────────────── */
async function main() {
  console.log('🔧  SIX SIGMAPHIL — Supabase Storage Cache Patcher');
  console.log('    Setting: Cache-Control: public, max-age=31536000, immutable');
  console.log(`    URL: ${SUPABASE_URL}\n`);

  /* Add all your storage bucket names here */
  const BUCKETS = ['showroom-assets'];

  let totalPatched = 0;
  let totalFailed  = 0;

  for (const bucket of BUCKETS) {
    const { patched, failed } = await patchBucket(bucket);
    totalPatched += patched;
    totalFailed  += failed;
  }

  console.log('\n─────────────────────────────────────────');
  console.log(`✅  Done. ${totalPatched} file(s) patched, ${totalFailed} failed.`);
  console.log('');
  console.log('⚠️  Remember: when you replace a .glb or texture in Storage,');
  console.log('   increment MODEL_VERSION in Configurator3D.jsx AND');
  console.log('   CACHE_VERSION in public/sw.js to bust all caches.\n');
}

main().catch((err) => {
  console.error('\n❌  Fatal:', err.message);
  process.exit(1);
});
