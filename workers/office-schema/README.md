# Office Schema POC

A standalone Cloudflare Worker that shows how an **office page can be enriched
with schema.org JSON-LD at the edge**, pulling office data from a **Supabase
(Postgres) table** keyed by office name (slug).

The schema is written into the **HTML source** the browser/crawler receives —
**no client-side JavaScript** — so search engines and LLMs see it without
executing anything.

## Why this shape

It mirrors the patterns already in `workers/website/`:

- The site is served through a Cloudflare Worker proxy.
- Structured data is already treated as a first-class thing (`/dasc/*.json`).

Here we add a worker that (1) reads office data from a data source and
(2) injects the derived JSON-LD into the page HTML.

## The two data sources (the point of the POC)

The final JSON-LD is assembled from two places, kept deliberately separate:

| Source | Fields | Where it lives |
| --- | --- | --- |
| **The page** | `<title>`, breadcrumb trail, canonical URL | the office page HTML |
| **Third-party DB** | address, geo, phone, email, opening hours, services, `sameAs` | Supabase `offices` table (via `data/offices.js`) |

The `offices` table is the demo's system of record; in production it would be
swapped for the real one (a locations API, a CMS content endpoint, an EDS
spreadsheet served as JSON, the `da-sc` structured-content worker, …). The rest
of the pipeline is unchanged.

## Config

The worker reads two values from its env:

| Var | Value |
| --- | --- |
| `SUPABASE_URL` | `https://<project-ref>.supabase.co` |
| `SUPABASE_KEY` | the publishable/anon key (read-only via the table's RLS policy) |

For local dev these live in `workers/office-schema/.dev.vars` (git-ignored).
For a deployed worker, set them as secrets instead:

```bash
wrangler secret put SUPABASE_URL
wrangler secret put SUPABASE_KEY
```

The `offices` table has RLS enabled with a public `select` policy, so the
publishable key can only read rows — never write.

## Run it

```bash
cd workers/office-schema
npm install
npm run dev        # wrangler dev, defaults to http://localhost:8787
```

> Requires Node.js 22+ (wrangler 4). The values in `.dev.vars` are loaded
> automatically.

## Routes

| Route | What you get |
| --- | --- |
| `GET /` | Index of demo offices + inspection links |
| `GET /en/offices/:slug` | Office page HTML **with JSON-LD injected** — use **View Source** |
| `GET /db/offices/:slug.json` | Raw mock-DB record (the "data source" layer on its own) |
| `GET /schema/offices/:slug.json` | The assembled JSON-LD only (paste into a validator) |

Available slugs: `abbotsford`, `vancouver`, `calgary`.

### Try it

```bash
# Schema is already in the HTML — no JS run:
curl -s http://localhost:8787/en/offices/abbotsford | grep -A40 'application/ld+json'

# The raw third-party record:
curl -s http://localhost:8787/db/offices/abbotsford.json

# Just the JSON-LD, for Google's Rich Results Test / schema.org validator:
curl -s http://localhost:8787/schema/offices/abbotsford.json
```

## How the injection works

`src/index.js` streams the page HTML through Cloudflare's `HTMLRewriter`:

1. Handlers on `<title>` and the breadcrumb list **capture page-derived fields**
   as the HTML streams past.
2. A handler on `<body>`'s end tag builds the JSON-LD (page fields + DB record
   via `src/schema.js`) and injects a `<script type="application/ld+json">`
   right before `</body>`.

Injecting at end-of-body means the page-derived fields (which appear in the
body) are already known by the time we write the script. The position is valid
for JSON-LD; crawlers read it anywhere in the document.

## Files

```
data/offices.js   Supabase data source (getOffice / listOffices, snake_case->camelCase)
src/schema.js     buildOfficeSchema(record, pageContext) -> JSON-LD @graph
src/page.js       renders the "origin" office HTML (stands in for AEM)
src/index.js      the worker: routing + HTMLRewriter enrichment
```

## Adapting to production

- Replace `renderOfficePage()` with `fetch()` of the real AEM office page.
- Point `SUPABASE_URL`/`SUPABASE_KEY` at the real office data source (or swap
  `data/offices.js` for whatever the system of record is), and add caching —
  Cache API or KV, keyed by slug — so every request doesn't hit the DB.
- Fold the `/en/offices/:slug` handling into `workers/website/index.js` as a new
  route in the `ROUTES` table, before the default AEM handler.
