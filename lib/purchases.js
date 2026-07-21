// Talks to Supabase's REST API (PostgREST) directly with fetch — no SDK,
// so this project needs no `npm install` step.
//
// Expects a `purchases` table:
//   email text, book_slug text, source text, purchased_at timestamptz,
//   primary key (email, book_slug)

function creds() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_KEY not set');
  return { url, key };
}

// Returns an array of book_slugs this email has purchased.
async function getPurchasedSlugs(email) {
  const { url, key } = creds();
  const endpoint = `${url}/rest/v1/purchases?email=eq.${encodeURIComponent(
    email.toLowerCase()
  )}&select=book_slug`;
  const res = await fetch(endpoint, {
    headers: { apikey: key, Authorization: `Bearer ${key}` }
  });
  if (!res.ok) throw new Error(`Supabase lookup failed: ${res.status}`);
  const rows = await res.json();
  return rows.map((r) => r.book_slug);
}

async function addPurchase(email, bookSlug, source) {
  const { url, key } = creds();
  const res = await fetch(`${url}/rest/v1/purchases`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates'
    },
    body: JSON.stringify({
      email: email.toLowerCase(),
      book_slug: bookSlug,
      source: source || 'unknown',
      purchased_at: new Date().toISOString()
    })
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase insert failed: ${res.status} ${text}`);
  }
}

module.exports = { getPurchasedSlugs, addPurchase };
