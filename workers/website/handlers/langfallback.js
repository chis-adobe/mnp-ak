/*
 * Language fallback for 404s.
 *
 * When the AEM origin returns a 404 for a page request, we check whether the
 * same page is published in another language. If it is, we respond 200 with a
 * friendly, on-brand page linking to the available-language version(s) instead
 * of the normal 404.
 *
 * Locale scheme (see scripts/scripts.js): English lives at the site root with
 * no prefix; other languages are path-prefixed. A handful of pages also use an
 * explicit `/en` prefix, so we treat it as a known locale too. The sibling
 * derivation is therefore generalized: strip any known prefix to get the base
 * path, then try the base under every OTHER known prefix (including root).
 */

const LOCALES = [
  { prefix: '', lang: 'en', label: 'English' },
  { prefix: '/en', lang: 'en', label: 'English' },
  { prefix: '/fr', lang: 'fr', label: 'Français' },
  { prefix: '/de', lang: 'de', label: 'Deutsch' },
  { prefix: '/es', lang: 'es', label: 'Español' },
  { prefix: '/hi', lang: 'hi', label: 'हिन्दी' },
  { prefix: '/ja', lang: 'ja', label: '日本語' },
  { prefix: '/zh', lang: 'zh', label: '中文' },
];

// Copy shown on the fallback page, keyed by the REQUESTED language.
const PHRASES = {
  en: {
    title: 'Page available in another language',
    heading: 'This page isn’t available in this language',
    body: 'The page you requested hasn’t been published in this language yet. It’s available in:',
    viewIn: (label) => `View this page in ${label}`,
  },
  fr: {
    title: 'Page disponible dans une autre langue',
    heading: 'Cette page n’est pas disponible dans cette langue',
    body: 'La page demandée n’a pas encore été publiée dans cette langue. Elle est disponible en :',
    viewIn: (label) => `Voir cette page en ${label}`,
  },
};

/**
 * Only run the fallback for real page navigations: GET/HEAD requests to
 * extensionless (or .html) paths. This excludes JSON, media, drafts and other
 * asset 404s, which should stay 404.
 */
const isPageRequest = (url, method) => {
  if (method !== 'GET' && method !== 'HEAD') return false;
  const { pathname } = url;
  if (pathname.startsWith('/drafts') || pathname.startsWith('/.')) return false;
  const basename = pathname.split('/').pop();
  const dot = basename.lastIndexOf('.');
  const ext = (basename === '' || dot < 1) ? '' : basename.slice(dot + 1);
  return ext === '' || ext === 'html';
};

/** Split a pathname into its known locale prefix and the prefix-less base. */
const splitLocale = (pathname) => {
  const match = LOCALES.find(({ prefix }) => prefix
    && (pathname === prefix || pathname.startsWith(`${prefix}/`)));
  if (!match) return { prefix: '', base: pathname };
  return { prefix: match.prefix, base: pathname.slice(match.prefix.length) || '/' };
};

/**
 * Fetch the published-pages index and return a Set of published paths.
 * Cached at the Cloudflare edge so a burst of 404s costs one origin hit.
 * Returns null on any failure so the caller can fall back to the plain 404.
 */
const getPublishedSet = async (origin) => {
  try {
    const resp = await fetch(`${origin}/query-index.json`, {
      cf: { cacheEverything: true, cacheTtl: 300 },
    });
    if (!resp.ok) return null;
    const json = await resp.json();
    // NOTE: query-index returns up to `limit` rows (default 1000). If the site
    // ever exceeds that, this needs offset-based pagination.
    return new Set((json.data || []).map((row) => row.path));
  } catch {
    return null;
  }
};

/** Find the requested page's published siblings in other locales. */
const findAlternates = (pathname, published) => {
  const { prefix: reqPrefix, base } = splitLocale(pathname);
  const alternates = [];
  const seen = new Set();
  LOCALES.forEach((loc) => {
    if (loc.prefix === reqPrefix) return;
    const candidate = loc.prefix === '' ? base : `${loc.prefix}${base}`;
    if (seen.has(candidate) || !published.has(candidate)) return;
    seen.add(candidate);
    alternates.push({ ...loc, path: candidate });
  });
  return { reqPrefix, alternates };
};

const escapeHtml = (str) => str.replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[c]));

/**
 * Render an on-brand 200 page. It reuses the EDS shell (styles + scripts, empty
 * header/footer that the client decorates) so it matches the rest of the site.
 */
const renderFallback = (reqPrefix, alternates) => {
  const reqLang = (LOCALES.find((l) => l.prefix === reqPrefix) || {}).lang || 'en';
  const t = PHRASES[reqLang] || PHRASES.en;

  const links = alternates
    .map((a) => `<li><a href="${escapeHtml(a.path)}">${escapeHtml(t.viewIn(a.label))}</a></li>`)
    .join('');

  const html = `<!DOCTYPE html>
<html lang="${reqLang}">
  <head>
    <title>${escapeHtml(t.title)}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1"/>
    <meta name="robots" content="noindex, nofollow"/>
    <!-- Use the in-flow (static) header so content isn't overlapped by the
         default fixed/transparent header, which expects a full-bleed hero. -->
    <meta name="header-style" content="static"/>
    <link rel="stylesheet" href="/styles/styles.css"/>
    <script src="/scripts/ak.js" type="module"></script>
    <script src="/scripts/scripts.js" type="module"></script>
    <link rel="icon" href="data:,">
  </head>
  <body>
    <header></header>
    <main>
      <div>
        <h1>${escapeHtml(t.heading)}</h1>
        <p>${escapeHtml(t.body)}</p>
        <ul>${links}</ul>
      </div>
    </main>
    <footer></footer>
  </body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      // Short TTL: publish state can change. noindex: this is a soft-404.
      'cache-control': 'max-age=60',
      'x-robots-tag': 'noindex, nofollow',
    },
  });
};

/**
 * Attempt a language fallback for a 404'd request.
 * @returns {Promise<Response|null>} a 200 fallback Response, or null to keep 404.
 */
export const tryLanguageFallback = async ({ url, request }) => {
  if (!url || !isPageRequest(url, request.method)) return null;

  const { origin } = new URL(request.url); // AEM origin (already rewritten)
  const published = await getPublishedSet(origin);
  if (!published) return null;

  const { reqPrefix, alternates } = findAlternates(url.pathname, published);
  if (!alternates.length) return null;

  return renderFallback(reqPrefix, alternates);
};
