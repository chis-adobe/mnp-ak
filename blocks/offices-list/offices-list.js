async function fetchOfficePages() {
  const resp = await fetch('/query-index.json');
  if (!resp.ok) return [];
  const json = await resp.json();
  return json.data.filter((page) => page.path.startsWith('/offices/') && page.path !== '/offices');
}

function renderOfficeCard(office) {
  const card = document.createElement('div');
  card.className = 'offices-list-card';

  const name = office.path.split('/').pop().replace(/-/g, ' ');
  const displayName = name.charAt(0).toUpperCase() + name.slice(1);

  card.innerHTML = `
    <h3><a href="${office.path}">${office.title || displayName}</a></h3>
    <p class="offices-list-card-desc">${office.description || ''}</p>
    <p class="offices-list-card-link"><a href="${office.path}">Details</a></p>
  `;
  return card;
}

export default async function init(el) {
  el.innerHTML = '';

  const wrapper = document.createElement('div');
  wrapper.className = 'offices-list-wrapper';

  const loading = document.createElement('p');
  loading.textContent = 'Loading offices...';
  wrapper.append(loading);
  el.append(wrapper);

  const offices = await fetchOfficePages();
  wrapper.innerHTML = '';

  if (offices.length === 0) {
    wrapper.innerHTML = '<p>No offices found.</p>';
    return;
  }

  const alphabetNav = document.createElement('div');
  alphabetNav.className = 'offices-list-alpha';
  const letters = [...new Set(offices.map((o) => {
    const name = o.title || o.path.split('/').pop();
    return name.charAt(0).toUpperCase();
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
  grid.className = 'offices-list-grid';

  offices.sort((a, b) => {
    const nameA = (a.title || a.path).toLowerCase();
    const nameB = (b.title || b.path).toLowerCase();
    return nameA.localeCompare(nameB);
  });

  let currentLetter = '';
  offices.forEach((office) => {
    const name = office.title || office.path.split('/').pop();
    const firstLetter = name.charAt(0).toUpperCase();
    if (firstLetter !== currentLetter) {
      currentLetter = firstLetter;
      const letterMarker = document.createElement('div');
      letterMarker.className = 'offices-list-letter';
      letterMarker.dataset.letter = currentLetter;
      letterMarker.textContent = currentLetter;
      grid.append(letterMarker);
    }
    grid.append(renderOfficeCard(office));
  });

  wrapper.append(grid);
}
