import { createClient } from "@supabase/supabase-js";

/**
 * supabaseClient.js
 * Single source of truth for the Supabase connection.
 * All database, auth, and storage operations go through this client.
 * Credentials are loaded from Vite environment variables — never hardcoded.
 */
const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey  = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);
