# Office importer

Imports MNP office pages into the DA-backed `mnp-ak` site (`/offices/{slug}`), using the
[DA source API](https://docs.da.live/developers/api/source) and the AEM admin
preview/publish API.

Two sources are supported:

- **`--supabase`** (default mock source) — pull rows from the Supabase `offices` table.
- **`--input <dir>`** — parse locally-saved `mnp.ca` detail pages (`www.mnp.ca` blocks
  automated crawling, so save the HTML with **Save Page As…** first).

## Setup

```sh
npm i -D node-html-parser   # only needed for the --input (HTML) path
```

## 1. Dry run (Supabase)

Fetch offices and write the generated DA HTML for inspection — **no changes to the live site**:

```sh
node tools/importer/import-offices.js --supabase --out ./tools/importer/out
```

Check the files in `out/` before publishing. Override the endpoint with
`SUPABASE_URL` / `SUPABASE_KEY` if needed.

## 2. Publish

Get an IMS bearer token from da.live (signed-in browser devtools). Rather than typing it in
the shell, paste it into a local `.env` file (gitignored):

```sh
cp tools/importer/.env.example tools/importer/.env
# then edit tools/importer/.env and set DA_TOKEN=eyJ...
```

Then just run:

```sh
node tools/importer/import-offices.js --supabase --publish
```

The CLI auto-loads `tools/importer/.env`. A `DA_TOKEN=... node ...` env var still overrides the
file if you prefer. This creates each page in DA, then previews and publishes it.

### npm shortcuts

```sh
npm run import:office -- owen-sound   # publish/re-sync one office (the trigger for a DB change)
npm run import:offices                # publish/re-sync every office
npm run import:offices:dry            # dry run — write generated HTML to out/, no live changes
```

> Always pass a slug to `import:office` (after `--`). Running it with no slug falls through to
> "all offices", same as `import:offices`.

### Flags

| Flag | Effect |
| --- | --- |
| `--only <slug>` | Process a single office (e.g. `--only abbotsford`). |
| `--base-path <p>` | Target base path (default `/offices`). |
| `--no-preview` / `--no-live` | Skip the preview / publish step. |

For the HTML path, `--listing <file>` prints the office detail-page URLs found in a saved
`https://www.mnp.ca/en/offices` index page, so you know which pages to save.

## Merge behavior (does not overwrite the whole page)

On import the tool **reads the existing DA doc first** and merges, rather than replacing it:

- Blocks it manages (`office-info`, `services-links`, `metadata` — see `MANAGED_BLOCKS`) are
  removed and recreated **in their original position**.
- Every other block (hero, breadcrumb, form, contact-card, accordion, insights, plain content)
  is **left untouched, in its original order**.
- Managed blocks not already present are appended.

If the page doesn't exist yet, the generated blocks are created in order. (A dry run only
reflects the merge when a `DA_TOKEN` is available to read the current doc.)

## Layout

| File | Role |
| --- | --- |
| `import-offices.js` | CLI orchestrator (supabase / input / listing → dry-run / publish). |
| `lib/supabase-source.js` | Supabase `offices` row → office data. |
| `lib/parse.js` | mnp.ca HTML → office data (JSON-LD first, then meta/DOM). |
| `lib/build-da-doc.js` | office data → managed block sections (`office-info` + `services-links` + `metadata`). |
| `lib/merge-doc.js` | merge generated blocks into the existing doc, preserving the rest. |
| `lib/da-client.js` | DA source API (read/write) + AEM admin preview/publish. |
| `lib/slug.js` | Office name → `/offices/{slug}`. |

> The DOM-fallback selectors in `lib/parse.js` (`CONFIG`) are best-effort and only matter
> for the HTML `--input` path; they should be verified against a real saved detail page.
