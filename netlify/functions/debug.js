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
    // Normalize the incoming code (trim + lowercase) to improve matching, and escape single quotes for PostgREST queries.
    const raw = String(code || '');
    const normalized = raw.trim().toLowerCase();

    const escapeForPg = (s) => String(s).replace(/'/g, "''");
    const makeQuoted = (s) => encodeURIComponent(`'${s}'`);

    const base = SUPABASE_URL.replace(/\/$/, '');
    const normalizedQuoted = makeQuoted(escapeForPg(normalized));
    const originalQuoted = makeQuoted(escapeForPg(raw));

    const endpointNormalized = `${base}/rest/v1/urls?select=long_url&short_code=eq.${normalizedQuoted}`;
    const endpointOriginal = `${base}/rest/v1/urls?select=long_url&short_code=eq.${originalQuoted}`;

    // Helper to probe an endpoint and return { status, found }
    const probeEndpoint = async (endpoint) => {
      try {
        const r = await fetch(endpoint, {
          method: 'GET',
          headers: {
            apikey: SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
        });
        const status = r.status;
        let found = false;
        if (r.ok) {
          try {
            const data = await r.json();
            if (Array.isArray(data) && data.length > 0 && data[0] && data[0].long_url) {
              found = true;
            }
          } catch (e) {
            // ignore parse errors
          }
        }
        return { status, found };
      } catch (err) {
        return { status: 0, found: false };
      }
    };

    // Try normalized first, then original. We intentionally do not return long_url or any secret data.
    const normalizedProbe = await probeEndpoint(endpointNormalized);
    let originalProbe = { status: 0, found: false };
    if (!normalizedProbe.found) {
      originalProbe = await probeEndpoint(endpointOriginal);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, envs, probe: { code: raw, normalized: normalizedProbe, original: originalProbe } }, null, 2),
    };
  } catch (err) {
    console.error('Debug function error', err);
    return { statusCode: 500, body: JSON.stringify({ ok: false, message: 'Internal error' }) };
  }
};
