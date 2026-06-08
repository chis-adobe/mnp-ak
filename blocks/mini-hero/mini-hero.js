import { getMetadata } from '../../scripts/ak.js';

async function getCityFromFragment(fragmentPath) {
  try {
    const resp = await fetch(`${fragmentPath}.plain.html`);
    if (!resp.ok) return null;
    const html = await resp.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const cityRow = [...doc.querySelectorAll('div > div')].find((row) => {
      const firstCell = row.querySelector(':scope > div:first-child');
      return firstCell && firstCell.textContent.trim().toLowerCase() === 'city';
    });
    if (cityRow) {
      const valueCell = cityRow.querySelector(':scope > div:nth-child(2)');
      return valueCell ? valueCell.textContent.trim() : null;
    }
    return null;
  } catch {
    return null;
  }
}

export default async function init(el) {
  el.innerHTML = '';

  let city = getMetadata('city');

  if (!city) {
    const addressFragment = getMetadata('address-fragment');
    if (addressFragment) {
      city = await getCityFromFragment(addressFragment);
    }
  }

  if (!city) return;

  const content = document.createElement('div');
  content.classList.add('mini-hero-content');

  const h1 = document.createElement('h1');
  h1.classList.add('mini-hero-title');
  h1.innerHTML = `Professional Accounting Firm in <strong>${city}</strong>`;
  content.append(h1);

  el.append(content);
}
