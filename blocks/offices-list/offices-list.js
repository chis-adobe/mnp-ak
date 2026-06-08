const PIN_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z"/></svg>`;
const PHONE_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6.62 10.79c1.44 2.83 3.76 5.15 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>`;
const FAX_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10A15.3 15.3 0 0 1 12 2z" fill="none" stroke="white" stroke-width="1.5"/></svg>`;

async function fetchOffices() {
  const resp = await fetch('/offices/query-index.json?limit=500');
  if (!resp.ok) return [];
  const json = await resp.json();
  return json.data || [];
}

function renderOfficeCard(office) {
  const card = document.createElement('div');
  card.className = 'offices-list-card';

  const city = office.city || office.path.split('/').pop().replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  const fullAddress = [office.address, city, office.province, office.postalCode]
    .filter(Boolean)
    .join(', ');

  let contactHTML = '';
  if (office.phone) {
    contactHTML += `<div class="offices-list-card-contact-row"><span class="offices-list-card-icon">${PHONE_ICON}</span><a href="tel:${office.phone}">${office.phone}</a></div>`;
  }
  if (office.fax) {
    contactHTML += `<div class="offices-list-card-contact-row"><span class="offices-list-card-icon">${FAX_ICON}</span><span>${office.fax}</span></div>`;
  }

  card.innerHTML = `
    <h3 class="offices-list-card-city">${city}</h3>
    <div class="offices-list-card-address">
      <span class="offices-list-card-icon offices-list-card-pin">${PIN_ICON}</span>
      <span>${fullAddress}</span>
    </div>
    ${contactHTML ? `<div class="offices-list-card-contact">${contactHTML}<a href="${office.path}" class="offices-list-card-details">Details &#9654;</a></div>` : `<a href="${office.path}" class="offices-list-card-details">Details &#9654;</a>`}
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

  const offices = await fetchOffices();
  wrapper.innerHTML = '';

  if (offices.length === 0) {
    wrapper.innerHTML = '<p>No offices found.</p>';
    return;
  }

  offices.sort((a, b) => {
    const nameA = a.city || a.path;
    const nameB = b.city || b.path;
    return nameA.localeCompare(nameB);
  });

  const alphabetNav = document.createElement('div');
  alphabetNav.className = 'offices-list-alpha';
  const letters = [...new Set(offices.map((o) => {
    const name = o.city || o.path.split('/').pop();
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

  let currentLetter = '';
  offices.forEach((office) => {
    const name = office.city || office.path.split('/').pop().replace(/-/g, ' ');
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
