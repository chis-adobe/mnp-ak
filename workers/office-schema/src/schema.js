/*
 * Builds a schema.org JSON-LD graph for an office page.
 *
 * The graph is assembled from TWO sources so the POC makes the split obvious:
 *   - `record`  : the third-party / mock-DB data (address, geo, hours, ...)
 *   - `page`    : fields derived from the page itself (title, breadcrumb, url)
 *
 * Output is a single `@graph` linking a WebPage -> LocalBusiness -> Organization,
 * plus a BreadcrumbList. This mirrors the shape a professional-services office
 * page typically emits.
 */

const SITE_ORIGIN = 'https://www.mnp.ca';
const ORG_ID = `${SITE_ORIGIN}/#organization`;

function abs(url) {
  if (!url) return undefined;
  return url.startsWith('http') ? url : `${SITE_ORIGIN}${url}`;
}

function buildOpeningHours(openingHours = []) {
  return openingHours.map((slot) => ({
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: slot.days,
    opens: slot.opens,
    closes: slot.closes,
  }));
}

function buildBreadcrumb(breadcrumb = []) {
  if (!breadcrumb.length) return null;
  return {
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumb.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: abs(item.url),
    })),
  };
}

/**
 * @param {object} record  office record from the mock DB (third-party source)
 * @param {object} page     page-derived context { url, title, breadcrumb: [{name,url}] }
 */
export function buildOfficeSchema(record, page = {}) {
  const pageUrl = abs(page.url || record.url);
  const businessId = `${pageUrl}#localbusiness`;
  const webPageId = `${pageUrl}#webpage`;

  const organization = {
    '@type': 'Organization',
    '@id': ORG_ID,
    name: record.legalName || 'MNP LLP',
    url: SITE_ORIGIN,
    logo: `${SITE_ORIGIN}/img/logos/site.svg`,
    sameAs: record.sameAs,
  };

  const localBusiness = {
    '@type': ['LocalBusiness', 'AccountingService'],
    '@id': businessId,
    name: record.name,
    description: record.description,
    url: pageUrl,
    telephone: record.telephone,
    email: record.email,
    image: abs(record.image),
    priceRange: record.priceRange,
    address: {
      '@type': 'PostalAddress',
      streetAddress: record.address?.streetAddress,
      addressLocality: record.address?.addressLocality,
      addressRegion: record.address?.addressRegion,
      postalCode: record.address?.postalCode,
      addressCountry: record.address?.addressCountry,
    },
    geo: record.geo && {
      '@type': 'GeoCoordinates',
      latitude: record.geo.latitude,
      longitude: record.geo.longitude,
    },
    openingHoursSpecification: buildOpeningHours(record.openingHours),
    areaServed: record.areaServed,
    parentOrganization: { '@id': ORG_ID },
    sameAs: record.sameAs,
  };

  if (record.services?.length) {
    localBusiness.hasOfferCatalog = {
      '@type': 'OfferCatalog',
      name: 'Services',
      itemListElement: record.services.map((s) => ({
        '@type': 'Offer',
        itemOffered: { '@type': 'Service', name: s },
      })),
    };
  }

  const webPage = {
    '@type': 'WebPage',
    '@id': webPageId,
    url: pageUrl,
    // Page-derived: falls back to the DB name if the page has no <title>.
    name: page.title || record.name,
    about: { '@id': businessId },
    isPartOf: { '@id': `${SITE_ORIGIN}/#website` },
  };

  const breadcrumb = buildBreadcrumb(page.breadcrumb);
  if (breadcrumb) webPage.breadcrumb = { '@id': `${pageUrl}#breadcrumb` };

  const graph = [organization, localBusiness, webPage];
  if (breadcrumb) graph.push({ ...breadcrumb, '@id': `${pageUrl}#breadcrumb` });

  return prune({
    '@context': 'https://schema.org',
    '@graph': graph,
  });
}

/** Recursively drop undefined / null / empty values so the JSON-LD stays clean. */
function prune(value) {
  if (Array.isArray(value)) {
    const arr = value.map(prune).filter((v) => v !== undefined);
    return arr.length ? arr : undefined;
  }
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      const pv = prune(v);
      if (pv !== undefined) out[k] = pv;
    }
    return Object.keys(out).length ? out : undefined;
  }
  if (value === null || value === '') return undefined;
  return value;
}
