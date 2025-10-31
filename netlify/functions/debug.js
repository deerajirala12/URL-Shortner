// Netlify Function: debug
// Safe diagnostics endpoint to check environment and Supabase REST connectivity.
// Usage: /.netlify/functions/debug?code=<shortcode>
// WARNING: This function NEVER returns secrets. It only returns boolean flags and status codes.

exports.handler = async (event) => {
  try {
    const code = (event.queryStringParameters && event.queryStringParameters.code) || null;

    const SUPABASE_URL = process.env.SUPABASE_URL || null;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || null;

    const envs = {
      hasSupabaseUrl: !!SUPABASE_URL,
      hasServiceRoleKey: !!SUPABASE_SERVICE_ROLE_KEY,
    };

    if (!code) {
      return {
        statusCode: 200,
        body: JSON.stringify({ ok: true, envs, message: 'Provide ?code=<shortcode> to probe Supabase REST for that code' }, null, 2),
      };
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return {
        statusCode: 200,
        body: JSON.stringify({ ok: false, envs, message: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment' }, null, 2),
      };
    }

    // Probe Supabase REST for the short code using service role key (server-side). We do NOT include any secret in the response.
  // PostgREST expects string values to be quoted in the query (eq.'value').
  const quoted = encodeURIComponent(`'${code}'`);
  const endpoint = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/urls?select=long_url&short_code=eq.${quoted}`;

    const res = await fetch(endpoint, {
      method: 'GET',
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
    });

    const status = res.status;

    // Only parse body when small; but never return long_url contents. We'll report if a row exists.
    let found = false;
    if (res.ok) {
      try {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0 && data[0] && data[0].long_url) {
          found = true;
        }
      } catch (e) {
        // ignore parse errors
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, envs, probe: { status, found } }, null, 2),
    };
  } catch (err) {
    console.error('Debug function error', err);
    return { statusCode: 500, body: JSON.stringify({ ok: false, message: 'Internal error' }) };
  }
};
