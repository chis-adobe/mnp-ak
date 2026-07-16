/**
 * Pull office rows from the Supabase `offices` table and map them into the office data
 * model consumed by build-da-doc.js.
 *
 * The anon/publishable key is safe to ship (it's the public REST key). Override via
 * SUPABASE_URL / SUPABASE_KEY if the project moves.
 */
import slugify from './slug.js';

const DEFAULT_URL = 'https://wdgjvnbgtulfuevdtvjk.supabase.co/rest/v1';
const DEFAULT_KEY = 'sb_publishable_z3Bo2By780HZIQxZ7cf9vg_iTNLg-Cx';

/** Map one Supabase row to the office model. */
export function mapRow(row) {
  const addr = row.address || {};
  return {
    slug: row.slug || slugify(addr.addressLocality || row.name),
    title: row.name || `MNP ${addr.addressLocality || ''} Office`.trim(),
    city: addr.addressLocality || '',
    address: addr.streetAddress || '',
    province: addr.addressRegion || '',
    postalCode: addr.postalCode || '',
    phone: row.telephone || '',
    fax: row.fax || '',
    email: row.email || '',
    metaDescription: row.description || '',
    description: row.description ? [row.description] : [],
    services: row.services || [], // plain strings; build-da-doc renders them as a list
    sourceUrl: row.url || '',
  };
}

/**
 * Fetch offices from Supabase.
 * @param {{url?:string, key?:string, slug?:string}} [opts] slug filters to one office
 * @returns {Promise<ReturnType<typeof mapRow>[]>}
 */
export async function fetchOffices({
  url = process.env.SUPABASE_URL || DEFAULT_URL,
  key = process.env.SUPABASE_KEY || DEFAULT_KEY,
  slug,
} = {}) {
  const query = slug ? `?slug=eq.${encodeURIComponent(slug)}` : '?order=slug';
  const res = await fetch(`${url}/offices${query}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!res.ok) {
    throw new Error(`Supabase fetch -> ${res.status} ${res.statusText}: ${await res.text()}`);
  }
  const rows = await res.json();
  return rows.map(mapRow);
}
