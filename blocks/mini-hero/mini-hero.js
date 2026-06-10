import { getMetadata } from '../../scripts/ak.js';
import { getPlaceholder } from '../../scripts/utils/placeholders.js';

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

  const content = document.createElement('div');
  content.classList.add('mini-hero-content');

  const h1 = document.createElement('h1');
  h1.classList.add('mini-hero-title');

  if (city) {
    const template = await getPlaceholder('office-hero-title', 'Professional Accounting Firm in {city}');
    h1.innerHTML = template.replace('{city}', `<strong>${city}</strong>`);
  } else {
    const title = getMetadata('title') || document.title;
    if (!title) return;
    h1.textContent = title;
  }

  content.append(h1);
  el.append(content);
}
