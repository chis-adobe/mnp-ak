/**
 * Build a DA-source HTML document for an office page.
 *
 * DA (da.live) stores blocks as nested divs: `<div class="block-name"><div><div>cell</div>…`.
 * Page metadata (the head <meta> tags that helix-query.yaml reads for /offices/query-index.json)
 * is authored as a `metadata` block. The office-info block renders address/phone/fax from those
 * metadata values, so the address data lives in the metadata block, not in office-info's body.
 */

/** Escape a plain-text string for safe HTML embedding. */
function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Render a block as DA nested divs.
 * @param {string} name block class name (e.g. "office-info", "metadata")
 * @param {string[][]} rows array of rows; each row is an array of cell HTML strings
 */
function block(name, rows) {
  const body = rows
    .map((cells) => `      <div>${cells.map((c) => `<div>${c}</div>`).join('')}</div>`)
    .join('\n');
  return `  <div>\n    <div class="${name}">\n${body}\n    </div>\n  </div>`;
}

/**
 * @typedef {Object} Office
 * @property {string} title       heading shown in the office-info block
 * @property {string[]} [description] paragraphs of body copy
 * @property {string} [mapsUrl]   external "Open location in Maps" link
 * @property {string} city
 * @property {string} [address]
 * @property {string} [province]
 * @property {string} [postalCode]
 * @property {string} [phone]
 * @property {string} [tollFree]
 * @property {string} [fax]
 * @property {string} [email]
 * @property {({name:string, href:string}|string)[]} [services]
 * @property {string} [metaDescription] page description meta
 */

/** Block names this importer owns — safe to remove and recreate on import. */
export const MANAGED_BLOCKS = ['office-info', 'services-links', 'metadata'];

/**
 * Build the office blocks this importer manages, as ordered, named sections.
 * @param {Office} office
 * @returns {{name:string, html:string}[]}
 */
export function buildOfficeSections(office) {
  const sections = [];

  // office-info: heading + body paragraphs + optional maps link.
  const infoParts = [`<h2>${esc(office.title || `MNP ${office.city} Office`)}</h2>`];
  (office.description || []).forEach((p) => {
    if (p && p.trim()) infoParts.push(`<p>${esc(p.trim())}</p>`);
  });
  if (office.mapsUrl) {
    infoParts.push(`<p><a href="${esc(office.mapsUrl)}">Open location in Maps</a></p>`);
  }
  sections.push({ name: 'office-info', html: block('office-info', [[infoParts.join('\n        ')]]) });

  // services-links: one service per row. Accepts {name, href} objects (linked) or
  // plain strings (text only, when the source has no service URLs).
  if (office.services && office.services.length) {
    const rows = office.services.map((s) => (typeof s === 'string'
      ? [esc(s)]
      : [`<a href="${esc(s.href)}">${esc(s.name)}</a>`]));
    sections.push({ name: 'services-links', html: block('services-links', rows) });
  }

  // metadata block -> head <meta> tags consumed by helix-query.yaml + office-info.js.
  const meta = [
    ['title', office.title || `MNP ${office.city} Office`],
    ['description', office.metaDescription || (office.description || [])[0] || ''],
    ['city', office.city || ''],
    ['address', office.address || ''],
    ['province', office.province || ''],
    ['postal-code', office.postalCode || ''],
    ['phone', office.phone || ''],
    ['toll-free', office.tollFree || ''],
    ['fax', office.fax || ''],
    ['email', office.email || ''],
  ].filter(([, v]) => v !== ''); // omit empty metadata rows
  sections.push({ name: 'metadata', html: block('metadata', meta.map(([k, v]) => [esc(k), esc(v)])) });

  return sections;
}

/**
 * @param {Office} office
 * @returns {string} full DA-source HTML document (create-from-scratch; no merge)
 */
export default function buildDaDoc(office) {
  const html = buildOfficeSections(office).map((s) => s.html).join('\n');
  return `<body>\n  <main>\n${html}\n  </main>\n</body>\n`;
}
