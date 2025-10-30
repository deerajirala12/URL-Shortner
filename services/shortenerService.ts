// @ts-nocheck - Supabase is loaded via CDN
const { createClient } = supabase;

const BASE_URL = 'https://short.ly';
const SUPABASE_URL = "https://dszqmovpfyvcfclrgmit.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRzenFtb3ZwZnl2Y2ZjbHJnbWl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3NjUzMjQsImV4cCI6MjA3NzM0MTMyNH0.ZemHQCOELgmnEcsQoekfRfiU_i_K_ywzZ6tN9-q3fHA";

// Create a single supabase client for interacting with your database
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
    const { data, error } = await supabaseClient
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
  const { error: insertError } = await supabaseClient
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
