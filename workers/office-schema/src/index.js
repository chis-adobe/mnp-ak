/*
 * Office Schema POC — standalone Cloudflare Worker.
 *
 * Demonstrates enriching an office page with schema.org JSON-LD entirely at the
 * edge, so the schema is present in the HTML the browser/crawler receives with
 * NO client-side JavaScript required.
 *
 * Routes
 *   GET /                          -> index of demo offices
 *   GET /en/offices/:slug          -> office page HTML with JSON-LD injected (view-source!)
 *   GET /db/offices/:slug.json     -> raw mock-DB record (the "data source" layer)
 *   GET /schema/offices/:slug.json -> the assembled JSON-LD only (for validators)
 *
 * Data flow for the page route:
 *   1. render/fetch the "origin" HTML (page-authored content, no schema)
 *   2. look up the office record in the mock DB (third-party source)
 *   3. stream the HTML through HTMLRewriter, capturing page-derived fields
 *      (title + breadcrumb) as they pass
 *   4. at </body>, build the JSON-LD from page fields + DB record and inject it
 */

import { getOffice, listOffices } from '../data/offices.js';
import { renderOfficePage } from './page.js';
import { buildOfficeSchema } from './schema.js';

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
 * Streaming enrichment. Reads the page-derived title + breadcrumb out of the
 * HTML, then injects the assembled JSON-LD immediately before </body>.
 */
function enrichWithSchema(originResponse, record, canonicalUrl) {
  // Mutable page-derived context, filled in as the stream is parsed.
  const page = { url: canonicalUrl, title: '', breadcrumb: [] };
  let inTitle = false;

  const rewriter = new HTMLRewriter()
    .on('title', {
      element() { inTitle = true; },
      text(t) { if (inTitle) { page.title += t.text; if (t.lastInTextNode) inTitle = false; } },
    })
    // Each breadcrumb entry: capture its label; links keep their href.
    .on('ol.breadcrumb li a', {
      element(el) { page.breadcrumb.push({ name: '', url: el.getAttribute('href') || '' }); },
      text(t) {
        const last = page.breadcrumb[page.breadcrumb.length - 1];
        if (last) last.name += t.text;
      },
    })
    .on('ol.breadcrumb li span[aria-current]', {
      element() { page.breadcrumb.push({ name: '', url: canonicalUrl }); },
      text(t) {
        const last = page.breadcrumb[page.breadcrumb.length - 1];
        if (last) last.name += t.text;
      },
    })
    // Inject at the end of <body>, by which point title + breadcrumb are known.
    .on('body', {
      element(el) {
        el.onEndTag((end) => {
          const schema = buildOfficeSchema(record, {
            url: canonicalUrl,
            title: decodeEntities(page.title.trim()),
            breadcrumb: page.breadcrumb.map((c) => ({ name: decodeEntities(c.name.trim()), url: c.url })),
          });
          const script = `\n    <script type="application/ld+json">\n${JSON.stringify(schema, null, 2)}\n    </script>\n  `;
          end.before(script, { html: true });
        });
      },
    });

  return rewriter.transform(originResponse);
}

async function renderIndex(env) {
  const items = (await listOffices(env))
    .map((slug) => `<li><a href="/en/offices/${slug}">/en/offices/${slug}</a></li>`)
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
    <li><code>/db/offices/abbotsford.json</code> — raw mock-DB record (third-party source)</li>
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
        return json(buildOfficeSchema(record, { url: record.url, title: record.name }));
      }

      // Office page HTML with schema injected server-side.
      m = pathname.match(/^\/en\/offices\/([^/]+)\/?$/);
      if (m) {
        const record = await getOffice(env, m[1]);
        if (!record) return html('<h1>404</h1><p>Unknown office.</p>', 404);
        // In production this would be `await fetch(aemOriginUrl)`. For the POC we
        // render the origin HTML locally, then enrich it identically.
        const origin = html(renderOfficePage(record));
        return enrichWithSchema(origin, record, `https://www.mnp.ca${record.url}`);
      }

      return html('<h1>404</h1>', 404);
    } catch (err) {
      return json({ error: 'data source error', detail: String(err.message || err) }, 502);
    }
  },
};
