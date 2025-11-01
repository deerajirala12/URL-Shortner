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

  // Normalize code and escape single quotes for SQL literal safety
  const normalized = String(code).trim().toLowerCase();
  const escapeQuotes = (s) => String(s).replace(/'/g, "''");
  const safeNormalized = escapeQuotes(normalized);
  const safeOriginal = escapeQuotes(String(code));

  const quotedNormalized = encodeURIComponent(`'${safeNormalized}'`);
  const quotedOriginal = encodeURIComponent(`'${safeOriginal}'`);
  const base = SUPABASE_URL.replace(/\/$/, '');
  const endpointNormalized = `${base}/rest/v1/urls?select=long_url&short_code=eq.${quotedNormalized}`;
  const endpointOriginal = `${base}/rest/v1/urls?select=long_url&short_code=eq.${quotedOriginal}`;

  // Try normalized (lowercased, trimmed) exact match first
  let res = await fetch(endpointNormalized, {
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
  });
  console.log('redirect: try normalized code=', normalized, 'endpoint=', endpointNormalized, 'status=', res.status);
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    console.error('Supabase REST responded with error (normalized)', res.status, body);
    return { statusCode: 502, body: 'Bad gateway' };
  }
  let data = await res.json();
  console.log('redirect: normalized returned rows=', Array.isArray(data) ? data.length : 'unknown');
  if (Array.isArray(data) && data.length > 0 && data[0].long_url) {
    console.log('redirect: resolved long_url (normalized)=', data[0].long_url);
    return { statusCode: 301, headers: { Location: data[0].long_url } };
  }

  // Try original exact match next
  res = await fetch(endpointOriginal, {
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
  });
  console.log('redirect: try original code=', code, 'endpoint=', endpointOriginal, 'status=', res.status);
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    console.error('Supabase REST responded with error (original)', res.status, body);
    return { statusCode: 502, body: 'Bad gateway' };
  }
  data = await res.json();
  console.log('redirect: original returned rows=', Array.isArray(data) ? data.length : 'unknown');
  if (Array.isArray(data) && data.length > 0 && data[0].long_url) {
    console.log('redirect: resolved long_url (original)=', data[0].long_url);
    return { statusCode: 301, headers: { Location: data[0].long_url } };
  }

    // If no rows found, try a case-insensitive lookup (ilike) as a fallback. This helps when
    // short codes were stored with different casing or accidental normalization issues.
    try {
      const ilikeQuoted = encodeURIComponent(`'${code}'`);
      const ilikeEndpoint = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/urls?select=long_url&short_code=ilike.${ilikeQuoted}`;
      console.log('redirect: trying ilike fallback endpoint=', ilikeEndpoint);
      const res2 = await fetch(ilikeEndpoint, {
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
      });
      console.log('redirect: ilike supabase_status=', res2.status);
      if (res2.ok) {
        const d2 = await res2.json();
        console.log('redirect: ilike returned rows=', Array.isArray(d2) ? d2.length : 'unknown');
        if (Array.isArray(d2) && d2.length > 0 && d2[0].long_url) {
          console.log('redirect: ilike resolved long_url=', d2[0].long_url);
          return {
            statusCode: 301,
            headers: { Location: d2[0].long_url },
          };
        }
      } else {
        const body2 = await res2.text().catch(() => '');
        console.error('redirect: ilike supabase error', res2.status, body2);
      }
    } catch (e) {
      console.error('redirect: ilike fallback error', e);
    }

    return { statusCode: 404, body: 'Not found' };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: 'Internal error' };
  }
};
