// @ts-nocheck - Supabase is usually loaded via CDN in `index.html`.
// This file reads Supabase credentials from Vite env vars (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).
// We lazily initialise the Supabase client so that module import doesn't throw if the CDN
// script hasn't executed yet or the global isn't present (this avoids a blank screen due
// to an exception during module evaluation).

// Prefer runtime-configured values from Vite env. Keep the previous values as fallbacks.
const BASE_URL = import.meta.env.VITE_BASE_URL ?? 'https://short.ly';
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? "https://dszqmovpfyvcfclrgmit.supabase.co";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRzenFtb3ZwZnl2Y2ZjbHJnbWl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3NjUzMjQsImV4cCI6MjA3NzM0MTMyNH0.ZemHQCOELgmnEcsQoekfRfiU_i_K_ywzZ6tN9-q3fHA";

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.info('Using fallback Supabase credentials. To override, set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local');
}

let _supabaseClient: any = null;
function getSupabaseClient() {
  if (_supabaseClient) return _supabaseClient;

  // Prefer the global created by the CDN script if available
  const globalCreate = (typeof globalThis !== 'undefined' && (globalThis as any).supabase && (globalThis as any).supabase.createClient)
    ? (globalThis as any).supabase.createClient
    : null;

  if (globalCreate) {
    _supabaseClient = globalCreate(SUPABASE_URL, SUPABASE_ANON_KEY);
    return _supabaseClient;
  }

  // If the global isn't available, try to provide a helpful error rather than throwing a cryptic TypeError
  const msg = 'Supabase client not found. Ensure @supabase/supabase-js is loaded in index.html (CDN) or install it as a dependency.';
  console.error(msg);
  throw new Error(msg);
}

/**
 * NOTE: For this to work, you need to create a table in your Supabase project named `urls`
 * with at least the following columns:
 * - `id` (int8, primary key, auto-incrementing)
 * - `created_at` (timestamptz, default now())
 * - `long_url` (text)
 * - `short_code` (text, unique)
 */

/**
 * Generates a random alphanumeric string of a given length.
 * @param {number} length The desired length of the code.
 * @returns {string} A random code.
 */
const generateShortCode = (length: number = 6): string => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
};

/**
 * Validates if the given string is a valid URL.
 * @param {string} urlString The string to validate.
 * @returns {boolean} True if the URL is valid, false otherwise.
 */
const isValidUrl = (urlString: string): boolean => {
  try {
    new URL(urlString);
    return true;
  } catch (e) {
    return false;
  }
};

/**
 * Shortens a URL using Supabase as the backend.
 * @param {string} longUrl The original long URL.
 * @returns {Promise<string>} A promise that resolves with the shortened URL.
 */
export const shortenUrl = async (longUrl: string): Promise<string> => {
  if (!isValidUrl(longUrl)) {
    throw new Error('Invalid URL format. Please include http:// or https://');
  }

  let shortCode: string;
  let isCodeUnique = false;
  let attempts = 0;
  const maxAttempts = 5;

  // Generate a unique short code, retrying if a collision occurs
  while (!isCodeUnique && attempts < maxAttempts) {
    shortCode = generateShortCode();
    const { data, error } = await getSupabaseClient()
      .from('urls')
      .select('short_code')
      .eq('short_code', shortCode)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 means "No rows found"
      console.error('Error checking for existing short code:', error);
      throw new Error('Could not verify short code uniqueness. Please try again.');
    }

    if (!data) {
      isCodeUnique = true;
    }
    
    attempts++;
  }

  if (!isCodeUnique) {
    throw new Error('Could not generate a unique short link after multiple attempts. Please try again.');
  }

  // Insert the new mapping into the database
  const { error: insertError } = await getSupabaseClient()
    .from('urls')
    .insert({ long_url: longUrl, short_code: shortCode });

  if (insertError) {
    console.error('Error saving URL to Supabase:', insertError);
    throw new Error('Could not save the URL. Please try again later.');
  }

  const shortUrl = `${BASE_URL}/${shortCode}`;
  console.log('URL Mapping Stored in Supabase:', { shortCode, longUrl });
  
  return shortUrl;
};
