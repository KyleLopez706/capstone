import { createClient } from "@supabase/supabase-js";

/**
 * supabaseClient.js
 * Single source of truth for the Supabase connection.
 * All database, auth, and storage operations go through this client.
 * Credentials are loaded from Vite environment variables — never hardcoded.
 */
const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey  = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    // PKCE is Supabase v2's default secure flow. Declaring it explicitly
    // ensures consistent behaviour across all auth operations.
    flowType: "pkce",
    // Let the Supabase SDK detect and exchange the ?code= param in the URL
    // automatically. Combined with the global PASSWORD_RECOVERY guard in
    // App.jsx, this prevents the double-navigation ("tab doubling") that
    // occurs when SIGNED_IN fires before PASSWORD_RECOVERY on reset links.
    detectSessionInUrl: true,
  },
});
