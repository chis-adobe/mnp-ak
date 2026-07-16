// AEM Assets delivery links carry the asset id, so we can look up DAM metadata.
const ASSET_LINK = /^(https:\/\/delivery-p\d+-e\d+\.adobeaemcloud\.com)\/adobe\/assets\/(urn:aaid:aem:[0-9a-f-]+)/i;

// Metadata values can be plain strings, arrays, or localized objects; flatten to text.
function toText(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return toText(value[0]);
  if (typeof value === 'object') return toText(value.value ?? value['@value']);
  return String(value);
}

// Pull dc:title / dc:description from the DAM (CORS-enabled delivery endpoint) and
// use them as the link text and hover/label. Falls back to the authored text on failure.
async function enrichAssetLink(a) {
  const match = a.getAttribute('href')?.match(ASSET_LINK);
  if (!match) return;
  const [, origin, assetId] = match;
  try {
    const resp = await fetch(`${origin}/adobe/assets/${assetId}/metadata`);
    if (!resp.ok) return;
    const json = await resp.json();
    const md = { ...json.repositoryMetadata, ...json.assetMetadata };
    const title = toText(md['dc:title']);
    const description = toText(md['dc:description']);
    if (title) a.textContent = title;
    if (description) {
      a.title = description;
      a.setAttribute('aria-label', description);
    }
  } catch {
    // Keep the authored link text/href on any failure.
  }
}

function enrichAssetLinks(root) {
  const assetLinks = [...root.querySelectorAll('a')].filter((a) => ASSET_LINK.test(a.getAttribute('href') || ''));
  return Promise.all(assetLinks.map(enrichAssetLink));
}

function buildFlyout(row) {
  const cols = [...row.querySelectorAll(':scope > div')];
  if (cols.length < 2) return null;

  const flyout = document.createElement('div');
  flyout.className = 'mnp-header-flyout';

  const heading = cols[1]?.textContent?.trim();
  if (heading) {
    const h3 = document.createElement('h3');
    h3.textContent = heading;
    flyout.append(h3);
  }

  const linksContainer = document.createElement('div');
  linksContainer.className = 'mnp-header-flyout-columns';

  cols.slice(2).forEach((col) => {
    const colDiv = document.createElement('div');
    colDiv.className = 'mnp-header-flyout-col';
    const links = col.querySelectorAll('a');
    links.forEach((link) => {
      const a = link.cloneNode(true);
      colDiv.append(a);
    });
    if (colDiv.children.length) linksContainer.append(colDiv);
  });

  flyout.append(linksContainer);
  return flyout;
}

export default async function init(el) {
  const rows = [...el.querySelectorAll(':scope > div')];
  el.innerHTML = '';

  const header = document.createElement('div');
  header.className = 'mnp-header-wrapper';

  // Row 1: Top bar (full-width container with inner child-wrapper)
  const topBar = document.createElement('div');
  topBar.className = 'mnp-header-top';
  const topBarInner = document.createElement('div');
  topBarInner.className = 'child-wrapper';

  const logo = document.createElement('a');
  logo.href = '/';
  logo.className = 'mnp-header-logo';
  logo.setAttribute('aria-label', 'MNP Home');
  logo.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 81.66 26.43"><path fill="#fff" d="M0,26.19V.24H5.71l7.44,15.41L20.62.24h5.71V26.19H21.21V8.94L14.34,22.76h-2.4L5,8.94V26.19Z"/><path fill="#fff" d="M30.43,26.19V.24h5.13L47.24,17V.24h5.13V26.19H47.24L35.56,9.47V26.19Z"/><path fill="#fff" d="M56.27,26.19V.24H66.53a10.08,10.08,0,0,1,7,2.4,8.18,8.18,0,0,1,2.68,6.39A8.18,8.18,0,0,1,73.5,15.42a10.08,10.08,0,0,1-7,2.4H61.39V26.19Zm5.12-13.1h4.8a5,5,0,0,0,3.47-1.12,4,4,0,0,0,1.25-3.1,4,4,0,0,0-1.25-3.1,5,5,0,0,0-3.47-1.12h-4.8Z"/></svg>';

  const utilityNav = document.createElement('nav');
  utilityNav.className = 'mnp-header-utility';
  const utilUl = document.createElement('ul');

  if (rows[0]) {
    const links = rows[0].querySelectorAll('a');
    links.forEach((link) => {
      const li = document.createElement('li');
      const a = link.cloneNode(true);
      li.append(a);
      utilUl.append(li);
    });
  }
  utilityNav.append(utilUl);
  topBarInner.append(logo, utilityNav);
  topBar.append(topBarInner);

  // Row 2: Main nav (full-width container with inner child-wrapper)
  const mainBar = document.createElement('div');
  mainBar.className = 'mnp-header-main';
  const mainBarInner = document.createElement('div');
  mainBarInner.className = 'child-wrapper';

  const mainNav = document.createElement('nav');
  mainNav.className = 'mnp-header-nav';
  const mainUl = document.createElement('ul');

  rows.slice(1).forEach((row) => {
    const cols = [...row.querySelectorAll(':scope > div')];
    if (cols.length === 0) return;

    const sectionName = cols[0]?.textContent?.trim();
    if (!sectionName) return;

    const li = document.createElement('li');
    li.className = 'mnp-header-nav-item';

    const sectionLink = cols[0].querySelector('a');
    const a = document.createElement('a');
    a.href = sectionLink?.href || '#';
    a.textContent = sectionName;
    a.className = 'mnp-header-nav-link';

    if (cols.length > 2) {
      a.setAttribute('aria-expanded', 'false');
      a.addEventListener('click', (e) => {
        e.preventDefault();
        const isOpen = li.classList.contains('is-open');
        mainUl.querySelectorAll('.is-open').forEach((open) => {
          open.classList.remove('is-open');
          open.querySelector('a')?.setAttribute('aria-expanded', 'false');
        });
        if (!isOpen) {
          li.classList.add('is-open');
          a.setAttribute('aria-expanded', 'true');
        }
      });

      const flyout = buildFlyout(row);
      if (flyout) li.append(flyout);
    }

    li.prepend(a);
    mainUl.append(li);
  });

  mainNav.append(mainUl);

  const searchBtn = document.createElement('button');
  searchBtn.className = 'mnp-header-search-btn';
  searchBtn.setAttribute('aria-label', 'Search');
  searchBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>';

  const searchFlyout = document.createElement('div');
  searchFlyout.className = 'mnp-header-search-flyout';
  searchFlyout.innerHTML = `<form class="mnp-header-search-form" action="/search">
    <input type="search" name="query" placeholder="Search MNP..." aria-label="Search" autocomplete="off"/>
    <button type="submit" aria-label="Submit search"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg></button>
  </form>`;

  searchBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = searchFlyout.classList.contains('is-open');
    mainUl.querySelectorAll('.is-open').forEach((open) => {
      open.classList.remove('is-open');
      open.querySelector('a')?.setAttribute('aria-expanded', 'false');
    });
    searchFlyout.classList.toggle('is-open', !isOpen);
    if (!isOpen) searchFlyout.querySelector('input')?.focus();
  });

  const toggle = document.createElement('button');
  toggle.className = 'mnp-header-toggle';
  toggle.setAttribute('aria-label', 'Toggle navigation');
  toggle.innerHTML = '<span></span><span></span><span></span>';
  toggle.addEventListener('click', () => {
    header.classList.toggle('is-mobile-open');
  });

  mainBarInner.append(mainNav, searchBtn, toggle);
  mainBar.append(mainBarInner);
  header.append(topBar, mainBar, searchFlyout);
  el.append(header);

  enrichAssetLinks(header);

  // Close flyouts on outside click
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.mnp-header')) {
      mainUl.querySelectorAll('.is-open').forEach((open) => {
        open.classList.remove('is-open');
        open.querySelector('a')?.setAttribute('aria-expanded', 'false');
      });
      searchFlyout.classList.remove('is-open');
    }
  });
}
