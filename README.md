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
3. Run the app:
   `npm run dev`
