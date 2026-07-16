#!/usr/bin/env node
/**
 * Import MNP office pages into the DA-backed mnp-ak site (/offices/{slug}), via the
 * DA source API + AEM admin preview/publish.
 *
 * Sources:
 *   --supabase        pull rows from the Supabase `offices` table (default mock source)
 *   --input <dir>     parse locally-saved mnp.ca detail pages (*.html)
 *   --listing <file>  discover detail-page URLs from a saved offices index page
 *
 * Examples:
 *   # Dry run from Supabase — writes generated DA HTML for inspection, no live changes:
 *   node tools/importer/import-offices.js --supabase --out ./tools/importer/out
 *
 *   # Publish from Supabase (needs DA_TOKEN):
 *   DA_TOKEN=... node tools/importer/import-offices.js --supabase --publish
 *
 * Flags: --only <slug>  --base-path /offices  --no-preview  --no-live
 */
import { readFile, writeFile, readdir, mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import loadEnv from './lib/load-env.js';
import { buildOfficeSections } from './lib/build-da-doc.js';
import mergeDoc from './lib/merge-doc.js';
import { parseListing, parseOffice } from './lib/parse.js';
import { fetchOffices } from './lib/supabase-source.js';
import { createClient } from './lib/da-client.js';

// Load tools/importer/.env (next to this file) so DA_TOKEN etc. need not be typed in the shell.
loadEnv(fileURLToPath(new URL('.env', import.meta.url)));

function parseArgs(argv) {
  const args = { basePath: '/offices', out: 'tools/importer/out', preview: true, live: true };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--listing') args.listing = argv[++i];
    else if (a === '--input') args.input = argv[++i];
    else if (a === '--supabase') args.supabase = true;
    else if (a === '--out') args.out = argv[++i];
    else if (a === '--only') args.only = argv[++i];
    else if (a === '--base-path') args.basePath = argv[++i];
    else if (a === '--publish') args.publish = true;
    else if (a === '--no-preview') args.preview = false;
    else if (a === '--no-live') args.live = false;
  }
  return args;
}

/** Shared setup: DA client + output dir. Returns null on misconfig. */
async function prepare(args) {
  // Always create the client: even a dry run reads the existing doc (when a token is present)
  // so the generated output reflects the real merge.
  const client = createClient();
  if (args.publish && !client.hasToken) {
    console.error('--publish requires DA_TOKEN (set it in tools/importer/.env).');
    process.exitCode = 1;
    return null;
  }
  await mkdir(resolve(args.out), { recursive: true });
  return { client };
}

/** Merge the office blocks into the existing DA doc, write it out, and (optionally) publish. */
async function emitOffice(office, args, client) {
  if (!office.slug) {
    console.warn(`! skipping office with no derivable slug (${office.title || 'unknown'})`);
    return;
  }
  const path = `${args.basePath}/${office.slug}`;

  // Read the current doc so we only replace the blocks we manage and keep everything else.
  let existing = null;
  if (client.hasToken) existing = await client.getSource(path);
  const doc = mergeDoc(existing, buildOfficeSections(office));

  const outFile = join(resolve(args.out), `${office.slug}.html`);
  await writeFile(outFile, doc, 'utf8');
  let mode = 'new page';
  if (existing) mode = 'merged into existing';
  else if (!client.hasToken) mode = 'generated (no token — merge skipped)';
  console.log(`✓ ${path}  (${office.city || office.title || 'no title'})  [${mode}]  -> ${outFile}`);

  if (args.publish) {
    await client.putSource(path, doc);
    console.log('    DA source written');
    if (args.preview) { await client.preview(path); console.log('    previewed'); }
    if (args.live) { await client.publish(path); console.log('    published'); }
  }
}

async function runDiscovery(args) {
  const html = await readFile(resolve(args.listing), 'utf8');
  const offices = parseListing(html);
  if (!offices.length) {
    console.error('No office links found. Check CONFIG.listingLinkSelector in lib/parse.js.');
    process.exitCode = 1;
    return;
  }
  console.log(`Found ${offices.length} office links:`);
  offices.forEach((o) => console.log(`  ${o.slug.padEnd(28)} ${o.url}`));
}

async function runSupabase(args) {
  const setup = await prepare(args);
  if (!setup) return;
  const offices = await fetchOffices({ slug: args.only });
  if (!offices.length) {
    console.error(args.only ? `No office with slug "${args.only}".` : 'No offices returned.');
    process.exitCode = 1;
    return;
  }
  for (const office of offices) await emitOffice(office, args, setup.client);
  if (!args.publish) console.log('\nDry run complete. Re-run with --publish (and DA_TOKEN) to go live.');
}

async function runImport(args) {
  const setup = await prepare(args);
  if (!setup) return;
  const inputDir = resolve(args.input);
  const files = (await readdir(inputDir)).filter((f) => f.endsWith('.html'));
  if (!files.length) {
    console.error(`No .html files in ${inputDir}`);
    process.exitCode = 1;
    return;
  }
  for (const file of files) {
    const html = await readFile(join(inputDir, file), 'utf8');
    const url = `https://www.mnp.ca/en/offices/${file.replace(/\.html$/, '')}`;
    const office = parseOffice(html, { url });
    if (args.only && office.slug !== args.only) continue;
    await emitOffice(office, args, setup.client);
  }
  if (!args.publish) console.log('\nDry run complete. Re-run with --publish (and DA_TOKEN) to go live.');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.listing) return runDiscovery(args);
  if (args.supabase) return runSupabase(args);
  if (args.input) return runImport(args);
  console.log('Usage: import-offices.js (--supabase | --input <dir> | --listing <file>) [--out <dir>] [--publish] [--only <slug>]');
  return undefined;
}

main().catch((err) => { console.error(err); process.exitCode = 1; });
