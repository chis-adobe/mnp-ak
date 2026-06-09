async function fetchAllPages() {
  const resp = await fetch('/query-index.json?limit=1000');
  if (!resp.ok) return [];
  const json = await resp.json();
  return json.data || [];
}

async function fetchOfficeData() {
  const resp = await fetch('/offices/query-index.json?limit=500');
  if (!resp.ok) return {};
  const json = await resp.json();
  const map = {};
  (json.data || []).forEach((o) => { map[o.path] = o; });
  return map;
}

function matchesQuery(page, query) {
  const q = query.toLowerCase();
  const title = (page.title || '').toLowerCase();
  const desc = (page.description || '').toLowerCase();
  const path = (page.path || '').toLowerCase();
  return title.includes(q) || desc.includes(q) || path.includes(q);
}

function getDisplayTitle(page, officeData) {
  if (page.path.startsWith('/offices/') && officeData[page.path]?.city) {
    return officeData[page.path].city;
  }
  return page.title || page.path.split('/').pop().replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function getDisplayDescription(page, officeData) {
  if (page.path.startsWith('/offices/') && officeData[page.path]) {
    const o = officeData[page.path];
    return [o.address, o.city, o.province, o.postalCode].filter(Boolean).join(', ');
  }
  return page.description || '';
}

function renderCard(page, officeData) {
  const card = document.createElement('div');
  card.className = 'search-results-card';

  const title = getDisplayTitle(page, officeData);
  const description = getDisplayDescription(page, officeData);
  const thumbnail = page.image || '';

  let thumbHTML = '';
  if (thumbnail && !thumbnail.includes('default-meta-image')) {
    thumbHTML = `<div class="search-results-card-thumb"><img src="${thumbnail}" alt="${title}" loading="lazy"/></div>`;
  }

  card.innerHTML = `
    ${thumbHTML}
    <div class="search-results-card-content">
      <h3><a href="${page.path}">${title}</a></h3>
      ${description ? `<p>${description}</p>` : ''}
    </div>
  `;
  return card;
}

export default async function init(el) {
  el.innerHTML = '';

  const params = new URLSearchParams(window.location.search);
  const query = params.get('query') || '';

  const wrapper = document.createElement('div');
  wrapper.className = 'search-results-wrapper';

  if (!query) {
    wrapper.innerHTML = '<p class="search-results-empty">Enter a search term to find content.</p>';
    el.append(wrapper);
    return;
  }

  const queryDisplay = document.createElement('p');
  queryDisplay.className = 'search-results-query';
  queryDisplay.innerHTML = `Results for: <strong>${query}</strong>`;
  wrapper.append(queryDisplay);

  const loading = document.createElement('p');
  loading.textContent = 'Searching...';
  wrapper.append(loading);
  el.append(wrapper);

  const [allPages, officeData] = await Promise.all([fetchAllPages(), fetchOfficeData()]);
  loading.remove();

  const results = allPages.filter((page) => matchesQuery(page, query));

  if (results.length === 0) {
    wrapper.innerHTML += '<p class="search-results-empty">No results found.</p>';
    return;
  }

  results.sort((a, b) => {
    const nameA = getDisplayTitle(a, officeData);
    const nameB = getDisplayTitle(b, officeData);
    return nameA.localeCompare(nameB);
  });

  const countEl = document.createElement('p');
  countEl.className = 'search-results-count';
  countEl.textContent = `${results.length} result${results.length !== 1 ? 's' : ''} found`;
  wrapper.append(countEl);

  const alphabetNav = document.createElement('div');
  alphabetNav.className = 'search-results-alpha';
  const letters = [...new Set(results.map((r) => {
    const title = getDisplayTitle(r, officeData);
    return title.charAt(0).toUpperCase();
  }))].sort();

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

  const grid = document.createElement('div');
  grid.className = 'search-results-grid';

  let currentLetter = '';
  results.forEach((page) => {
    const title = getDisplayTitle(page, officeData);
    const firstLetter = title.charAt(0).toUpperCase();
    if (firstLetter !== currentLetter) {
      currentLetter = firstLetter;
      const letterMarker = document.createElement('div');
      letterMarker.className = 'search-results-letter';
      letterMarker.dataset.letter = currentLetter;
      letterMarker.textContent = currentLetter;
      grid.append(letterMarker);
    }
    grid.append(renderCard(page, officeData));
  });

  wrapper.append(grid);
}
