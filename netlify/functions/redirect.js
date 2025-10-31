// Netlify Function: redirect
// Looks up a short_code in Supabase (server-side) and returns an HTTP redirect (301)
// Requires environment variables set in Netlify:
// - SUPABASE_URL (e.g. https://xyz.supabase.co)
// - SUPABASE_SERVICE_ROLE_KEY (service_role key from Supabase - keep secret)

exports.handler = async (event) => {
  try {
    // Prefer explicit query param ?code=... (Netlify redirect will pass it), fallback to path
    const code = (event.queryStringParameters && event.queryStringParameters.code) ||
      (event.path || '').split('/').filter(Boolean).pop();

    if (!code) {
      return {
        statusCode: 302,
        headers: { Location: '/' },
      };
    }

    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing Supabase server credentials (SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY)');
      return { statusCode: 500, body: 'Server misconfigured' };
    }

    const endpoint = `${SUPABASE_URL}/rest/v1/urls?select=long_url&short_code=eq.${encodeURIComponent(code)}`;

    const res = await fetch(endpoint, {
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error('Supabase REST responded with error', res.status, body);
      return { statusCode: 502, body: 'Bad gateway' };
    }

    const data = await res.json();
    if (Array.isArray(data) && data.length > 0 && data[0].long_url) {
      return {
        statusCode: 301,
        headers: {
          Location: data[0].long_url,
        },
      };
    }

    return { statusCode: 404, body: 'Not found' };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: 'Internal error' };
  }
};
