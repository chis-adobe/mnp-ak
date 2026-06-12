const PIN_ICON = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z"/></svg>';
const PHONE_ICON = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6.62 10.79c1.44 2.83 3.76 5.15 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>';
const FILTER_ICON = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M3 5h18v2H3zm4 6h10v2H7zm3 6h4v2h-4z"/></svg>';

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

export default async function init(el) {
  const typeInput = el.textContent.trim().toLowerCase();
  const type = CONFIG[typeInput] ? typeInput : 'offices';
  const config = CONFIG[type];

  el.innerHTML = '';

  const wrapper = document.createElement('div');
  wrapper.className = 'directory-list-wrapper';

  const loading = document.createElement('p');
  loading.textContent = 'Loading...';
  wrapper.append(loading);
  el.append(wrapper);

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

  const letters = [...new Set(items.map((i) => config.sortKey(i).charAt(0).toUpperCase()))].sort();

  const alphabetNav = document.createElement('div');
  alphabetNav.className = 'directory-list-alpha';
  letters.forEach((letter) => {
    const btn = document.createElement('button');
    btn.textContent = letter;
    btn.addEventListener('click', () => {
      const target = wrapper.querySelector(`[data-letter="${letter}"]`);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    alphabetNav.append(btn);
  });
  wrapper.append(alphabetNav);

  const filterBar = document.createElement('div');
  filterBar.className = 'directory-list-filter-bar';
  const filterBtn = document.createElement('button');
  filterBtn.className = 'directory-list-filter-btn';
  filterBtn.innerHTML = `Filter by <span class="directory-list-filter-icon">${FILTER_ICON}</span>`;
  filterBar.append(filterBtn);
  wrapper.append(filterBar);

  const grid = document.createElement('div');
  grid.className = `directory-list-grid directory-list-grid-${type}`;

  let currentLetter = '';
  items.forEach((item) => {
    const firstLetter = config.sortKey(item).charAt(0).toUpperCase();
    if (firstLetter !== currentLetter) {
      currentLetter = firstLetter;
      const marker = document.createElement('div');
      marker.className = 'directory-list-letter';
      marker.dataset.letter = currentLetter;
      marker.textContent = currentLetter;
      grid.append(marker);
    }
    grid.append(config.render(item));
  });

  wrapper.append(grid);
}
