/**
 * Parse saved mnp.ca HTML into the office data model consumed by build-da-doc.js.
 *
 * Strategy (most reliable first):
 *   1. JSON-LD structured data (schema.org LocalBusiness / AccountingService / PostalAddress)
 *   2. <meta> tags (og:title, description)
 *   3. DOM fallbacks (main content paragraphs, service links)
 *
 * NOTE: the DOM-fallback selectors are best-effort and must be verified against the real
 * mnp.ca markup. Once a sample detail page is saved locally, confirm/adjust CONFIG below.
 */
import { parse } from 'node-html-parser';
import slugify from './slug.js';

const CONFIG = {
  // Listing page: anchors pointing at office detail pages.
  listingLinkSelector: 'a[href*="/offices/"]',
  // Detail page: where the body copy lives (fallback when JSON-LD lacks a description).
  descriptionSelector: 'main p, article p, .office-content p',
  // Detail page: service links.
  servicesSelector: 'a[href*="/services/"]',
};

/** Collect every JSON-LD object (flattening @graph) from a parsed document. */
function jsonLdNodes(root) {
  const out = [];
  root.querySelectorAll('script[type="application/ld+json"]').forEach((s) => {
    try {
      const data = JSON.parse(s.textContent);
      const items = Array.isArray(data) ? data : [data];
      items.forEach((it) => {
        if (it && it['@graph']) out.push(...it['@graph']);
        else if (it) out.push(it);
      });
    } catch { /* ignore malformed blocks */ }
  });
  return out;
}

function findLocalBusiness(nodes) {
  const isBiz = (t) => {
    const types = Array.isArray(t) ? t : [t];
    return types.some((x) => /LocalBusiness|AccountingService|Organization|ProfessionalService/i.test(x || ''));
  };
  return nodes.find((n) => n && (isBiz(n['@type']) && (n.address || n.telephone)));
}

function metaContent(root, selector) {
  const el = root.querySelector(selector);
  return el ? (el.getAttribute('content') || '').trim() : '';
}

/**
 * Parse an office listing page into detail-page references.
 * @param {string} html
 * @param {string} [baseUrl] to resolve relative hrefs
 * @returns {{name:string, url:string, slug:string}[]}
 */
export function parseListing(html, baseUrl = 'https://www.mnp.ca') {
  const root = parse(html);
  const seen = new Set();
  const offices = [];
  root.querySelectorAll(CONFIG.listingLinkSelector).forEach((a) => {
    const href = a.getAttribute('href');
    if (!href) return;
    let url;
    try { url = new URL(href, baseUrl).href; } catch { return; }
    // Only detail pages (skip the listing index itself).
    if (!/\/offices\/[^/?#]+/.test(new URL(url).pathname)) return;
    if (seen.has(url)) return;
    seen.add(url);
    const name = a.textContent.trim() || new URL(url).pathname.split('/').pop();
    offices.push({ name, url, slug: slugify(name) });
  });
  return offices;
}

/**
 * Parse a single office detail page.
 * @param {string} html
 * @param {{url?:string}} [opts]
 * @returns {import('./build-da-doc.js').Office & {slug:string}}
 */
export function parseOffice(html, { url } = {}) {
  const root = parse(html);
  const biz = findLocalBusiness(jsonLdNodes(root)) || {};
  const addr = biz.address || {};

  const title = biz.name
    || metaContent(root, 'meta[property="og:title"]')
    || (root.querySelector('h1')?.textContent || '').trim();

  const city = addr.addressLocality || '';

  const description = [];
  const metaDesc = metaContent(root, 'meta[name="description"]')
    || metaContent(root, 'meta[property="og:description"]');
  root.querySelectorAll(CONFIG.descriptionSelector).forEach((p) => {
    const t = p.textContent.replace(/\s+/g, ' ').trim();
    if (t.length > 40) description.push(t);
  });

  const services = [];
  const seenSvc = new Set();
  root.querySelectorAll(CONFIG.servicesSelector).forEach((a) => {
    const href = a.getAttribute('href');
    const name = a.textContent.trim();
    if (href && name && !seenSvc.has(href)) {
      seenSvc.add(href);
      services.push({ name, href });
    }
  });

  const slug = slugify(city || title || (url ? new URL(url).pathname.split('/').pop() : ''));

  return {
    slug,
    title,
    city,
    address: addr.streetAddress || '',
    province: addr.addressRegion || '',
    postalCode: addr.postalCode || '',
    phone: biz.telephone || '',
    fax: biz.faxNumber || '',
    mapsUrl: biz.hasMap || biz.map || '',
    metaDescription: metaDesc,
    description: description.slice(0, 4),
    services,
    sourceUrl: url || '',
  };
}
