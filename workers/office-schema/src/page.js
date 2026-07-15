/*
 * Renders the "origin" office page HTML — i.e. what AEM / EDS would serve
 * BEFORE any schema enrichment. It deliberately contains NO JSON-LD.
 *
 * It carries only page-authored content: the <title>, an <h1>, a breadcrumb
 * trail, and human-readable address/contact prose. The worker later reads the
 * title + breadcrumb back out of this HTML (see index.js) and merges them with
 * the mock-DB record to build the JSON-LD.
 *
 * In production this function would NOT exist — the worker would fetch the real
 * page HTML from the AEM origin and run the same enrichment over it.
 */

const esc = (s = '') => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

export function renderOfficePage(record) {
  const a = record.address || {};
  const title = `${record.name} | Accounting, Tax & Consulting`;
  const breadcrumb = [
    { name: 'Home', url: '/en' },
    { name: 'Offices', url: '/en/offices' },
    { name: record.address?.addressLocality || record.name, url: record.url },
  ];

  const crumbHtml = breadcrumb
    .map((c, i) => {
      const last = i === breadcrumb.length - 1;
      const link = last
        ? `<span aria-current="page">${esc(c.name)}</span>`
        : `<a href="${esc(c.url)}">${esc(c.name)}</a>`;
      return `<li>${link}</li>`;
    })
    .join('\n        ');

  const hours = (record.openingHours || [])
    .map((h) => `${h.days[0]}–${h.days[h.days.length - 1]}: ${h.opens}–${h.closes}`)
    .join('<br>');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(record.description)}">
  <link rel="canonical" href="https://www.mnp.ca${esc(record.url)}">
</head>
<body>
  <nav aria-label="Breadcrumb">
    <ol class="breadcrumb">
        ${crumbHtml}
    </ol>
  </nav>

  <main>
    <h1>${esc(record.name)}</h1>
    <p class="intro">${esc(record.description)}</p>

    <section class="office-contact">
      <h2>Visit us</h2>
      <address>
        ${esc(a.streetAddress)}<br>
        ${esc(a.addressLocality)}, ${esc(a.addressRegion)} ${esc(a.postalCode)}<br>
        <a href="tel:${esc(record.telephone)}">${esc(record.telephone)}</a><br>
        <a href="mailto:${esc(record.email)}">${esc(record.email)}</a>
      </address>
      <p class="hours">${hours}</p>
    </section>
  </main>
</body>
</html>`;
}
