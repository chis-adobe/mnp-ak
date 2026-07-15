/*
 * Office Schema POC — standalone Cloudflare Worker.
 *
 * Demonstrates enriching an office page with schema.org JSON-LD entirely at the
 * edge, so the schema is present in the HTML the browser/crawler receives with
 * NO client-side JavaScript required.
 *
 * Routes
 *   GET /                          -> index of demo offices
 *   GET /offices/:slug             -> real AEM page HTML with JSON-LD injected (view-source!)
 *   GET /db/offices/:slug.json     -> raw DB record (the "data source" layer)
 *   GET /schema/offices/:slug.json -> the assembled JSON-LD only (for validators)
 *
 * Data flow for the page route:
 *   1. look up the office record in the DB (third-party source)
 *   2. fetch the real page HTML from the AEM origin (page-authored, no schema)
 *   3. stream that HTML through HTMLRewriter, capturing page-derived fields
 *      (title + breadcrumb) as they pass
 *   4. at </body>, build the JSON-LD from page fields + DB record and inject it
 */

import { getOffice, listOffices } from '../data/offices.js';
import { buildOfficeSchema } from './schema.js';

// Where the real page HTML is fetched from, and the public origin the schema's
// canonical/@id URLs point to. Overridable via wrangler [vars] / secrets.
const DEFAULT_ORIGIN = 'https://main--mnp-ak--chis-adobe.aem.live';
const DEFAULT_SITE_ORIGIN = 'https://main--mnp-ak--chis-adobe.aem.live';

const json = (data, status = 200) => new Response(JSON.stringify(data, null, 2), {
  status,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': '*',
    'cache-control': 'no-store',
  },
});

const html = (body, status = 200) => new Response(body, {
  status,
  headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' },
});

/*
 * HTMLRewriter reports text with HTML entities un-decoded (e.g. "&amp;"). Inside
 * a <script type="application/ld+json"> block those entities are NOT decoded by
 * parsers, so page-derived text must be decoded before it goes into the JSON-LD.
 */
const decodeEntities = (s = '') => s
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'")
  .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)));

/**
 * Deterministic breadcrumb trail for an office page. Built from the request path
 * + DB record rather than scraped from the HTML: in EDS the breadcrumb is a
 * client-hydrated block, so its content is NOT present in the origin HTML.
 */
function officeBreadcrumb(record, pathname) {
  return [
    { name: 'Home', url: '/' },
    { name: 'Offices', url: '/offices' },
    { name: record.address?.addressLocality || record.name, url: pathname },
  ];
}

/**
 * Streaming enrichment. Reads the page-derived <title> out of the HTML <head>
 * (which IS present server-side), then injects the assembled JSON-LD at the end
 * of <head> — the conventional spot for JSON-LD. Since <title> always streams
 * before </head>, it's available by the time we inject. The breadcrumb is
 * supplied by the caller (see officeBreadcrumb).
 */
function enrichWithSchema(originResponse, record, { canonicalUrl, siteOrigin, breadcrumb }) {
  const page = { title: '' };
  let inTitle = false;

  const rewriter = new HTMLRewriter()
    .on('title', {
      element() { inTitle = true; },
      text(t) { if (inTitle) { page.title += t.text; if (t.lastInTextNode) inTitle = false; } },
    })
    // Inject before </head>, by which point the <title> has already been seen.
    .on('head', {
      element(el) {
        el.onEndTag((end) => {
          const schema = buildOfficeSchema(record, {
            url: canonicalUrl,
            title: decodeEntities(page.title.trim()),
            breadcrumb,
          }, siteOrigin);
          const script = `\n    <script type="application/ld+json">\n${JSON.stringify(schema, null, 2)}\n    </script>\n  `;
          end.before(script, { html: true });
        });
      },
    });

  return rewriter.transform(originResponse);
}

async function renderIndex(env) {
  const items = (await listOffices(env))
    .map((slug) => `<li><a href="/offices/${slug}">/offices/${slug}</a></li>`)
    .join('\n      ');
  return html(`<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>Office Schema POC</title></head>
<body>
  <h1>Office Schema POC</h1>
  <p>Open an office page and use <strong>View Source</strong> — the JSON-LD is in the HTML, injected at the edge.</p>
  <h2>Office pages (schema injected)</h2>
  <ul>
      ${items}
  </ul>
  <h2>Inspect the layers</h2>
  <ul>
    <li><code>/db/offices/abbotsford.json</code> — raw DB record (third-party source)</li>
    <li><code>/schema/offices/abbotsford.json</code> — assembled JSON-LD (paste into Rich Results Test)</li>
  </ul>
</body></html>`);
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const { pathname } = url;

    try {
      if (pathname === '/' || pathname === '') return await renderIndex(env);

      // Raw DB record — the "data source" on its own.
      let m = pathname.match(/^\/db\/offices\/([^/]+)\.json$/);
      if (m) {
        const record = await getOffice(env, m[1]);
        return record ? json(record) : json({ error: 'office not found', slug: m[1] }, 404);
      }

      // Assembled JSON-LD only — for validators.
      m = pathname.match(/^\/schema\/offices\/([^/]+)\.json$/);
      if (m) {
        const record = await getOffice(env, m[1]);
        if (!record) return json({ error: 'office not found', slug: m[1] }, 404);
        const siteOrigin = (env.SITE_ORIGIN || DEFAULT_SITE_ORIGIN).replace(/\/+$/, '');
        return json(buildOfficeSchema(record, { url: record.url, title: record.name }, siteOrigin));
      }

      // Office page HTML with schema injected server-side.
      m = pathname.match(/^\/offices\/([^/]+)\/?$/);
      if (m) {
        const record = await getOffice(env, m[1]);
        if (!record) return html('<h1>404</h1><p>Unknown office.</p>', 404);

        // Fetch the real, ready-to-go page HTML from the AEM origin (same path).
        const origin = (env.ORIGIN || DEFAULT_ORIGIN).replace(/\/+$/, '');
        const originResp = await fetch(`${origin}${pathname}`, {
          headers: { accept: 'text/html' },
        });
        if (!originResp.ok) {
          return html(`<h1>${originResp.status}</h1><p>Origin has no page at ${pathname}.</p>`, originResp.status);
        }

        // Canonical URL for the schema = this site's public URL for the page
        // actually being served (the request path), not the worker/origin host.
        const siteOrigin = (env.SITE_ORIGIN || DEFAULT_SITE_ORIGIN).replace(/\/+$/, '');
        const canonicalUrl = `${siteOrigin}${pathname}`;
        const breadcrumb = officeBreadcrumb(record, pathname);

        // Stream the untouched origin HTML through the rewriter, injecting only
        // the JSON-LD. Every other byte passes through verbatim.
        return enrichWithSchema(originResp, record, { canonicalUrl, siteOrigin, breadcrumb });
      }

      return html('<h1>404</h1>', 404);
    } catch (err) {
      return json({ error: 'data source error', detail: String(err.message || err) }, 502);
    }
  },
};
