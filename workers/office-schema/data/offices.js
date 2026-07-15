/*
 * Office data source — backed by a Supabase (Postgres/PostgREST) table.
 *
 * This replaces the earlier hardcoded object with a real DB lookup, while
 * keeping the same two-function surface the worker consumes:
 *   getOffice(env, slug)  -> a single office record (camelCase) or null
 *   listOffices(env)      -> array of slugs
 *
 * Config comes from the worker env (see .dev.vars for local dev):
 *   SUPABASE_URL  e.g. https://<ref>.supabase.co
 *   SUPABASE_KEY  the publishable/anon key (read-only via the table's RLS policy)
 *
 * The table stores nested fields (address, geo, opening_hours, ...) as jsonb
 * with camelCase keys, so they map straight into the schema builder. Flat
 * columns are snake_case (Postgres convention) and are mapped below.
 */

function client(env) {
  const base = env?.SUPABASE_URL;
  const key = env?.SUPABASE_KEY;
  if (!base || !key) {
    throw new Error('Missing SUPABASE_URL / SUPABASE_KEY (set them in .dev.vars or as wrangler secrets)');
  }
  return { base: base.replace(/\/+$/, ''), key };
}

async function query(env, path) {
  const { base, key } = client(env);
  const resp = await fetch(`${base}/rest/v1/${path}`, {
    headers: {
      apikey: key,
      authorization: `Bearer ${key}`,
      accept: 'application/json',
    },
  });
  if (!resp.ok) {
    throw new Error(`Supabase request failed (${resp.status}): ${await resp.text()}`);
  }
  return resp.json();
}

/** Map a snake_case DB row to the camelCase record the schema builder expects. */
function mapRow(row) {
  if (!row) return null;
  return {
    slug: row.slug,
    name: row.name,
    legalName: row.legal_name,
    url: row.url,
    description: row.description,
    telephone: row.telephone,
    email: row.email,
    priceRange: row.price_range,
    image: row.image,
    address: row.address, // jsonb -> object (camelCase keys)
    geo: row.geo, // jsonb -> object
    openingHours: row.opening_hours, // jsonb -> array
    areaServed: row.area_served, // jsonb -> array
    services: row.services, // jsonb -> array
    sameAs: row.same_as, // jsonb -> array
  };
}

/** Look up a single office record by slug. Returns null when unknown. */
export async function getOffice(env, slug) {
  if (!slug) return null;
  const rows = await query(
    env,
    `offices?slug=eq.${encodeURIComponent(slug.toLowerCase())}&limit=1`,
  );
  return rows.length ? mapRow(rows[0]) : null;
}

/** List every office slug in the table. */
export async function listOffices(env) {
  const rows = await query(env, 'offices?select=slug&order=slug.asc');
  return rows.map((r) => r.slug);
}
