export default async function init(el) {
  const rows = [...el.querySelectorAll(':scope > div')];
  el.innerHTML = '';

  const wrapper = document.createElement('div');
  wrapper.className = 'offices-list-wrapper';

  const offices = [];

  rows.forEach((row) => {
    const cols = [...row.querySelectorAll(':scope > div')];
    const name = cols[0]?.textContent?.trim();
    const address = cols[1]?.textContent?.trim();
    const phone = cols[2]?.textContent?.trim();
    const link = cols[0]?.querySelector('a');
    if (name) {
      offices.push({ name, address, phone, href: link?.href || `/offices/${name.toLowerCase().replace(/\s+/g, '-')}` });
    }
  });

  if (offices.length === 0) {
    wrapper.innerHTML = '<p>No offices listed.</p>';
    el.append(wrapper);
    return;
  }

  offices.sort((a, b) => a.name.localeCompare(b.name));

  const alphabetNav = document.createElement('div');
  alphabetNav.className = 'offices-list-alpha';
  const letters = [...new Set(offices.map((o) => o.name.charAt(0).toUpperCase()))].sort();

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
    const firstLetter = office.name.charAt(0).toUpperCase();
    if (firstLetter !== currentLetter) {
      currentLetter = firstLetter;
      const letterMarker = document.createElement('div');
      letterMarker.className = 'offices-list-letter';
      letterMarker.dataset.letter = currentLetter;
      letterMarker.textContent = currentLetter;
      grid.append(letterMarker);
    }

    const card = document.createElement('div');
    card.className = 'offices-list-card';
    card.innerHTML = `
      <h3><a href="${office.href}">${office.name}</a></h3>
      ${office.address ? `<p class="offices-list-card-desc">${office.address}</p>` : ''}
      ${office.phone ? `<p class="offices-list-card-phone"><a href="tel:${office.phone}">${office.phone}</a></p>` : ''}
      <p class="offices-list-card-link"><a href="${office.href}">Details</a></p>
    `;
    grid.append(card);
  });

  wrapper.append(grid);
  el.append(wrapper);
}
