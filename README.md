<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/10xaB97gGTT1g2rnReIOnhAu6q6n8LhRP

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
4. (Optional) To integrate Supabase for URL storage, add the following to `.env.local`:

```
VITE_SUPABASE_URL=https://dszqmovpfyvcfclrgmit.supabase.co
VITE_SUPABASE_ANON_KEY=<your-supabase-anon-key>
```

Also ensure your Supabase project contains a `urls` table with the following schema (SQL):

```sql
-- Create the `urls` table used by the app
create table if not exists public.urls (
   id bigserial primary key,
   created_at timestamptz default now(),
   long_url text not null,
   short_code text not null unique
);
```

The app's `services/shortenerService.ts` now reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` at runtime.

## Deploying redirects on Netlify (server-side redirects)

If you want short links like `https://yourdomain.com/abc123` to perform a proper HTTP redirect (301) to the original URL
without exposing a server role key to the browser, deploy the app to Netlify and use a serverless function that performs the lookup
and returns a 301 redirect. This repo includes a Netlify function and config:

- `netlify/functions/redirect.js` — serverless function that looks up `short_code` in Supabase using a service role key and returns
   a 301 redirect to the `long_url`.
- `netlify.toml` — redirects rule that proxies `/:shortcode` to the function.

Setup steps on Netlify:

1. Build the app locally (or let Netlify build it during deploy):

    npm run build

2. In your Netlify site settings, set these environment variables (Netlify → Site settings → Build & deploy → Environment):

    SUPABASE_URL=https://<your-project>.supabase.co
    SUPABASE_SERVICE_ROLE_KEY=<your-supabase-service-role-key>

    Important: the `SUPABASE_SERVICE_ROLE_KEY` is a secret and must not be committed or exposed to the browser.

3. Deploy the repo to Netlify (connect GitHub, or drag-and-drop the `dist` folder). Netlify will use `netlify.toml` to wire the function.

4. (Optional) Add a custom domain in Netlify (for example, `short.example.com`) and point DNS to Netlify. You must own the domain
    to assign it; Netlify can manage DNS or you can add CNAME/A records at your registrar.

Notes:
- If you want to use the `short.ly` domain specifically, you must own that domain and configure it to point to Netlify (Netlify supports
   custom domains). Without owning the domain you can't serve redirects under that hostname.
- This server-side approach returns a real HTTP 301/302 redirect (good for SEO and immediate redirect) and keeps the Supabase
   service role key secret.

3. Run the app:
   `npm run dev`
