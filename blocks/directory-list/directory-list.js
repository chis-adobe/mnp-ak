const PIN_ICON = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z"/></svg>';
const PHONE_ICON = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6.62 10.79c1.44 2.83 3.76 5.15 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>';
const FILTER_ICON = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M3 5h18v2H3zm4 6h10v2H7zm3 6h4v2h-4z"/></svg>';

// Maps the 2-letter province codes stored in the index to full display names.
const PROVINCE_NAMES = {
  AB: 'Alberta',
  BC: 'British Columbia',
  MB: 'Manitoba',
  NB: 'New Brunswick',
  NL: 'Newfoundland and Labrador',
  NS: 'Nova Scotia',
  NT: 'Northwest Territories',
  NU: 'Nunavut',
  ON: 'Ontario',
  PE: 'Prince Edward Island',
  QC: 'Quebec',
  SK: 'Saskatchewan',
  YT: 'Yukon',
};

async function fetchIndex(url) {
  const resp = await fetch(url);
  if (!resp.ok) return [];
  const json = await resp.json();
  return json.data || [];
}

async function enrichOffices(offices) {
  const resp = await fetch('/fragments/addresses/query-index.json?limit=500');
  if (!resp.ok) return offices;
  const json = await resp.json();
  const map = {};
  (json.data || []).forEach((entry) => { map[entry.path] = entry; });
  offices.forEach((office) => {
    if (!office.city && office.addressFragment) {
      const fragment = map[office.addressFragment];
      if (fragment) {
        office.city = fragment.city || '';
        office.address = fragment.address || '';
        office.province = fragment.province || '';
        office.postalCode = fragment.postalCode || '';
        office.phone = fragment.phone || '';
        office.fax = fragment.fax || '';
      }
    }
  });
  return offices;
}

function renderOfficeCard(office) {
  const card = document.createElement('div');
  card.className = 'directory-list-card';
  const city = office.city || office.path.split('/').pop().replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  const fullAddress = [office.address, city, office.province, office.postalCode].filter(Boolean).join(', ');

  let contactHTML = '';
  if (office.phone) {
    contactHTML += `<div class="directory-list-card-contact-row"><span class="directory-list-card-icon">${PHONE_ICON}</span><a href="tel:${office.phone}">${office.phone}</a></div>`;
  }
  if (office.fax) {
    contactHTML += `<div class="directory-list-card-contact-row"><span>Fax: ${office.fax}</span></div>`;
  }

  card.innerHTML = `
    <h3 class="directory-list-card-title">${city}</h3>
    <div class="directory-list-card-address">
      <span class="directory-list-card-icon directory-list-card-pin">${PIN_ICON}</span>
      <span>${fullAddress}</span>
    </div>
    <div class="directory-list-card-contact">${contactHTML}</div>
    <a href="${office.path}" class="directory-list-card-details">Details &#9654;</a>
  `;
  return card;
}

function renderPersonnelCard(person) {
  const card = document.createElement('div');
  card.className = 'directory-list-card directory-list-card-person';
  const name = person.name || person.path.split('/').pop().replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  const role = person.role || '';
  const img = person.image || '';

  let thumbHTML = '';
  if (img) {
    const imgUrl = img.replace('author-p', 'publish-p');
    thumbHTML = `<a href="${person.path}" class="directory-list-card-photo"><img src="${imgUrl}" alt="${name}" loading="lazy"/></a>`;
  }

  let contactHTML = '';
  if (person.phone) {
    contactHTML += `<li><a href="tel:${person.phone}">${person.phone}</a></li>`;
  }
  if (person.tollFree) {
    contactHTML += `<li><a href="tel:${person.tollFree}">${person.tollFree}</a></li>`;
  }
  if (person.email) {
    contactHTML += `<li><a href="mailto:${person.email}">${person.email}</a></li>`;
  }

  card.innerHTML = `
    ${thumbHTML}
    <div class="directory-list-card-body">
      <h3 class="directory-list-card-title"><a href="${person.path}">${name}</a></h3>
      ${role ? `<p class="directory-list-card-role">${role}</p>` : ''}
      ${contactHTML ? `<ul class="directory-list-card-contacts">${contactHTML}</ul>` : ''}
      <a href="${person.path}" class="directory-list-card-details">More Details &#9654;</a>
    </div>
  `;
  return card;
}

const SEARCH_ICON = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M15.5 14h-.79l-.28-.27a6.5 6.5 0 1 0-.7.7l.27.28v.79l5 4.99L20.49 19zm-6 0A4.5 4.5 0 1 1 14 9.5 4.49 4.49 0 0 1 9.5 14z"/></svg>';

const GEOCODE_CACHE_KEY = 'mnp-office-geocode';

function getUserPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('no geolocation'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(err),
      { timeout: 10000, maximumAge: 600000 },
    );
  });
}

// Reverse-geocode the user's coordinates to a province code (no API key).
async function getUserProvince({ lat, lng }) {
  try {
    const resp = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`);
    if (!resp.ok) return null;
    const data = await resp.json();
    return data.principalSubdivisionCode ? data.principalSubdivisionCode.split('-').pop() : null;
  } catch {
    return null;
  }
}

function loadGeocodeCache() {
  try {
    return JSON.parse(localStorage.getItem(GEOCODE_CACHE_KEY)) || {};
  } catch {
    return {};
  }
}

function saveGeocodeCache(cache) {
  try {
    localStorage.setItem(GEOCODE_CACHE_KEY, JSON.stringify(cache));
  } catch { /* ignore quota errors */ }
}

// Forward-geocode via Photon (Komoot) — keyless and CORS-enabled, unlike
// Nominatim, whose policy blocks browser use and returns CORS-less 403s.
async function photonLookup(query) {
  try {
    const resp = await fetch(`https://photon.komoot.io/api/?limit=1&q=${encodeURIComponent(query)}`);
    if (!resp.ok) return null;
    const data = await resp.json();
    const feature = data.features?.[0];
    const coords = feature?.geometry?.coordinates;
    if (!coords || feature.properties?.countrycode !== 'CA') return null;
    const [lng, lat] = coords;
    return { lat, lng };
  } catch {
    return null;
  }
}

// Forward-geocode an office to coordinates (Photon, no key).
// Falls back to a city-level lookup when the full street address can't be resolved.
async function geocodeOffice(office, cache) {
  const key = office.path;
  if (cache[key]) return cache[key];

  const fullQuery = [office.address, office.city, office.province, 'Canada'].filter(Boolean).join(', ');
  const cityQuery = [office.city, office.province, 'Canada'].filter(Boolean).join(', ');
  if (!fullQuery) return null;

  let coords = await photonLookup(fullQuery);
  if (!coords && cityQuery && cityQuery !== fullQuery) {
    coords = await photonLookup(cityQuery);
  }
  if (!coords) return null;

  cache[key] = coords;
  saveGeocodeCache(cache);
  return coords;
}

// Haversine distance in km.
function distanceKm(a, b) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Resolve the 3 closest offices to the user, using a province pre-filter to limit geocoding calls.
async function findNearbyOffices(offices, userPos) {
  const province = await getUserProvince(userPos);
  let candidates = offices;
  if (province) {
    const inProvince = offices.filter((o) => (o.province || '').toUpperCase() === province.toUpperCase());
    if (inProvince.length >= 3) candidates = inProvince;
  }

  const cache = loadGeocodeCache();
  const located = [];
  // Sequential to respect the geocoder's rate limit; cache keeps repeat visits fast.
  for (const office of candidates) {
    // eslint-disable-next-line no-await-in-loop
    const coords = await geocodeOffice(office, cache);
    if (coords) located.push({ office, distance: distanceKm(userPos, coords) });
  }

  located.sort((a, b) => a.distance - b.distance);
  return located.slice(0, 3).map((entry) => entry.office);
}

// Renders the Nearby Offices panel asynchronously; removes it if nothing can be resolved.
async function renderNearbyPanel(wrapper, offices) {
  const panel = document.createElement('div');
  panel.className = 'directory-list-nearby';
  panel.innerHTML = `
    <h2 class="directory-list-nearby-title">Nearby Offices</h2>
    <p class="directory-list-nearby-loading">Finding nearby offices...</p>
  `;
  wrapper.prepend(panel);

  try {
    const userPos = await getUserPosition();
    const nearby = await findNearbyOffices(offices, userPos);
    if (!nearby.length) {
      panel.remove();
      return;
    }
    const grid = document.createElement('div');
    grid.className = 'directory-list-grid directory-list-grid-offices directory-list-nearby-grid';
    nearby.forEach((office) => grid.append(renderOfficeCard(office)));
    panel.querySelector('.directory-list-nearby-loading').remove();
    panel.append(grid);
  } catch {
    panel.remove();
  }
}

const CONFIG = {
  offices: {
    indexUrl: '/offices/query-index.json?limit=500',
    sortKey: (o) => o.city || o.path.split('/').pop().replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    render: renderOfficeCard,
    enrich: enrichOffices,
    resultLabel: 'offices',
  },
  personnel: {
    indexUrl: '/personnel/query-index.json?limit=2000',
    sortKey: (p) => p.name || p.path.split('/').pop().replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    render: renderPersonnelCard,
    enrich: null,
    resultLabel: 'personnel',
  },
};

async function renderWidget(block, bridge) {
  bridge.applyHostStyles();

  let offices = [];
  if (!bridge.hostContext?.preview) {
    const result = await bridge.toolResult;
    const structuredContent = result?.structuredContent || result;
    offices = structuredContent?.offices || [];
  }

  block.classList.add('directory-list-widget');
  block.innerHTML = '';

  if (offices.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'directory-list-empty';
    empty.textContent = 'No offices found. Try asking me to search by city or province.';
    block.append(empty);
  } else {
    const grid = document.createElement('div');
    grid.className = 'directory-list-grid directory-list-grid-offices';
    offices.forEach((office) => grid.append(renderOfficeCard(office)));
    block.append(grid);
  }

  bridge.reportSize(block.offsetWidth, block.offsetHeight);
  const ro = new ResizeObserver(() => bridge.reportSize(block.offsetWidth, block.offsetHeight));
  ro.observe(block);
}

// (Re)builds the alphabet quick-nav for the given list.
function renderAlpha(alphaEl, list, config, wrapper) {
  alphaEl.innerHTML = '';
  const letters = [...new Set(list.map((i) => config.sortKey(i).charAt(0).toUpperCase()))].sort();
  letters.forEach((letter) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = letter;
    btn.addEventListener('click', () => {
      const target = wrapper.querySelector(`[data-letter="${letter}"]`);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    alphaEl.append(btn);
  });
}

// (Re)builds the card grid with letter section markers for the given list.
function renderGrid(gridEl, list, config) {
  gridEl.innerHTML = '';
  let currentLetter = '';
  list.forEach((item) => {
    const firstLetter = config.sortKey(item).charAt(0).toUpperCase();
    if (firstLetter !== currentLetter) {
      currentLetter = firstLetter;
      const marker = document.createElement('div');
      marker.className = 'directory-list-letter';
      marker.dataset.letter = currentLetter;
      marker.textContent = currentLetter;
      gridEl.append(marker);
    }
    gridEl.append(config.render(item));
  });
}

export default async function init(block, bridge) {
  if (bridge) {
    await renderWidget(block, bridge);
    return;
  }

  const typeInput = block.textContent.trim().toLowerCase();
  const type = CONFIG[typeInput] ? typeInput : 'offices';
  const config = CONFIG[type];

  block.innerHTML = '';

  const wrapper = document.createElement('div');
  wrapper.className = 'directory-list-wrapper';

  const loading = document.createElement('p');
  loading.textContent = 'Loading...';
  wrapper.append(loading);
  block.append(wrapper);

  let items = await fetchIndex(config.indexUrl);
  if (config.enrich) items = await config.enrich(items);
  items = items.filter((i) => i.path !== `/${type}` && i.path !== `/${type}/`);
  wrapper.innerHTML = '';

  if (items.length === 0) {
    wrapper.innerHTML = '<p>No results found.</p>';
    return;
  }

  items.sort((a, b) => config.sortKey(a).localeCompare(config.sortKey(b)));

  const header = document.createElement('div');
  header.className = 'directory-list-header';
  const headerText = document.createElement('div');
  headerText.className = 'directory-list-header-text';
  headerText.innerHTML = `
    <h2 class="directory-list-header-title">Displaying results for:</h2>
    <p class="directory-list-header-count">Showing ${items.length} ${config.resultLabel}</p>
  `;
  const searchBar = document.createElement('div');
  searchBar.className = 'directory-list-search';
  searchBar.innerHTML = `
    <input type="search" placeholder="Search..." aria-label="Search ${config.resultLabel}" />
    <button type="button" aria-label="Submit search">${SEARCH_ICON}</button>
  `;
  header.append(headerText, searchBar);
  wrapper.append(header);

  const alphabetNav = document.createElement('div');
  alphabetNav.className = 'directory-list-alpha';
  wrapper.append(alphabetNav);

  const grid = document.createElement('div');
  grid.className = `directory-list-grid directory-list-grid-${type}`;

  const count = headerText.querySelector('.directory-list-header-count');

  // Re-renders the list (grid + alpha nav + count) for the current selection.
  const applyFilter = (code) => {
    const list = code
      ? items.filter((i) => (i.province || '').toUpperCase() === code)
      : items;
    renderGrid(grid, list, config);
    renderAlpha(alphabetNav, list, config, wrapper);
    count.textContent = `Showing ${list.length} ${config.resultLabel}`;
  };

  // The region filter is province-based, so it only applies to offices.
  const provinceCodes = [...new Set(items
    .map((i) => (i.province || '').toUpperCase())
    .filter((code) => PROVINCE_NAMES[code]))]
    .sort((a, b) => PROVINCE_NAMES[a].localeCompare(PROVINCE_NAMES[b]));

  if (type === 'offices' && provinceCodes.length > 0) {
    const filterBar = document.createElement('div');
    filterBar.className = 'directory-list-filter-bar';

    const filterBtn = document.createElement('button');
    filterBtn.type = 'button';
    filterBtn.className = 'directory-list-filter-btn';
    filterBtn.setAttribute('aria-expanded', 'false');
    filterBtn.setAttribute('aria-controls', 'directory-list-filter-panel');
    filterBtn.innerHTML = `Filter by <span class="directory-list-filter-icon">${FILTER_ICON}</span>`;
    filterBar.append(filterBtn);

    const options = ['<option value="">Regions</option>']
      .concat(provinceCodes.map((c) => `<option value="${c}">${PROVINCE_NAMES[c] || c}</option>`))
      .join('');

    const panel = document.createElement('div');
    panel.className = 'directory-list-filter-panel';
    panel.id = 'directory-list-filter-panel';
    panel.hidden = true;
    panel.innerHTML = `
      <section class="directory-list-filter-tabs">
        <ul class="directory-list-filter-nav" role="tablist">
          <li><button type="button" class="directory-list-filter-tab active" role="tab" aria-selected="true">Offices</button></li>
        </ul>
        <div class="directory-list-filter-content">
          <div class="directory-list-filter-pane" role="tabpanel">
            <h3 class="directory-list-filter-heading">Offices</h3>
            <div class="directory-list-filter-field">
              <div class="directory-list-select">
                <select id="directory-list-regions" name="regions" aria-label="Filter by region">${options}</select>
              </div>
            </div>
          </div>
        </div>
        <div class="directory-list-filter-actions">
          <button type="button" class="directory-list-filter-cancel">Cancel</button>
          <button type="button" class="directory-list-filter-apply">Apply filters</button>
        </div>
      </section>
    `;

    const select = panel.querySelector('#directory-list-regions');
    let appliedValue = '';

    const setPanelOpen = (open) => {
      panel.hidden = !open;
      filterBtn.setAttribute('aria-expanded', String(open));
    };

    filterBtn.addEventListener('click', () => setPanelOpen(panel.hidden));
    panel.querySelector('.directory-list-filter-cancel').addEventListener('click', () => {
      select.value = appliedValue; // discard unapplied changes
      setPanelOpen(false);
    });
    panel.querySelector('.directory-list-filter-apply').addEventListener('click', () => {
      appliedValue = select.value;
      applyFilter(appliedValue);
      setPanelOpen(false);
    });

    filterBar.append(panel);
    wrapper.append(filterBar);
  }

  wrapper.append(grid);
  applyFilter('');

  // Offices mode: surface the 3 closest offices to the user at the very top.
  if (type === 'offices') {
    renderNearbyPanel(wrapper, items);
  }
}
