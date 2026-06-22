import { getMetadata } from '../../scripts/ak.js';
import { getPlaceholder } from '../../scripts/utils/placeholders.js';

async function getAddressFromFragment(fragmentPath) {
  try {
    const resp = await fetch(`${fragmentPath}.plain.html`);
    if (!resp.ok) return null;
    const html = await resp.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const data = {};
    [...doc.querySelectorAll('div > div')].forEach((row) => {
      const key = row.querySelector(':scope > div:first-child');
      const val = row.querySelector(':scope > div:nth-child(2)');
      if (key && val) {
        data[key.textContent.trim().toLowerCase()] = val.textContent.trim();
      }
    });
    return data;
  } catch {
    return null;
  }
}

const PIN_ICON = '<svg class="office-info-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z"/></svg>';
const PHONE_ICON = '<svg class="office-info-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6.62 10.79c1.44 2.83 3.76 5.15 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>';
const FAX_ICON = '<svg class="office-info-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M19 8h-1V3H6v5H5a3 3 0 0 0-3 3v6h4v3h12v-3h4v-6a3 3 0 0 0-3-3zM8 5h8v3H8V5zm8 14H8v-4h8v4zm4-7a1 1 0 1 1-2 0 1 1 0 0 1 2 0z"/></svg>';

async function buildInfoHeader(address) {
  const header = document.createElement('div');
  header.classList.add('office-info-header');

  const h2 = document.createElement('h2');
  h2.textContent = await getPlaceholder('office-heading', 'Office Information');
  header.append(h2);

  const fullAddress = `${address.address}, ${address.city}, ${address.province}, ${address['postal-code']}`;
  const p = document.createElement('p');
  p.className = 'office-info-address';
  p.innerHTML = `${PIN_ICON}<span>${fullAddress}</span>`;
  header.append(p);

  const contactList = document.createElement('ul');
  contactList.className = 'office-info-contact-list';
  if (address.phone) {
    const li = document.createElement('li');
    li.innerHTML = `${PHONE_ICON}<a href="tel:${address.phone}">Phone: ${address.phone}</a>`;
    contactList.append(li);
  }
  if (address['toll-free']) {
    const li = document.createElement('li');
    li.innerHTML = `${PHONE_ICON}<a href="tel:${address['toll-free']}">Toll Free: ${address['toll-free']}</a>`;
    contactList.append(li);
  }
  if (address.fax) {
    const li = document.createElement('li');
    li.innerHTML = `${FAX_ICON}<span>Fax: ${address.fax}</span>`;
    contactList.append(li);
  }
  header.append(contactList);

  return header;
}

export default async function init(el) {
  let address = null;

  const city = getMetadata('city');
  if (city) {
    address = {
      city,
      address: getMetadata('address') || '',
      province: getMetadata('province') || '',
      'postal-code': getMetadata('postal-code') || '',
      phone: getMetadata('phone') || '',
      fax: getMetadata('fax') || '',
    };
  } else {
    const fragmentPath = getMetadata('address-fragment');
    if (fragmentPath) {
      address = await getAddressFromFragment(fragmentPath);
    }
  }

  if (address) {
    const infoHeader = await buildInfoHeader(address);
    el.prepend(infoHeader);
  }

  const rows = [...el.querySelectorAll(':scope > div')];
  rows.forEach((row) => {
    if (row.classList.contains('office-info-header')) return;
    const cols = [...row.querySelectorAll(':scope > div')];
    if (cols[0]) {
      const paragraphs = cols[0].querySelectorAll('p');
      if (paragraphs.length > 0) {
        row.classList.add('office-info-description');
      }
    }
  });

  // Two-column layout: text content on the left, Google map on the right
  if (address) {
    const fullAddress = [address.address, address.city, address.province, address['postal-code']]
      .filter(Boolean)
      .join(', ');

    const content = document.createElement('div');
    content.className = 'office-info-content';
    [...el.children].forEach((child) => content.append(child));

    const layout = document.createElement('div');
    layout.className = 'office-info-layout';
    layout.append(content);

    if (fullAddress) {
      const mapCol = document.createElement('div');
      mapCol.className = 'office-info-map';
      const iframe = document.createElement('iframe');
      iframe.title = `Map of MNP ${address.city || ''} office`.trim();
      iframe.src = `https://www.google.com/maps?q=${encodeURIComponent(fullAddress)}&output=embed`;
      iframe.loading = 'lazy';
      iframe.allowFullscreen = true;
      iframe.referrerPolicy = 'no-referrer-when-downgrade';
      mapCol.append(iframe);
      layout.append(mapCol);
    }

    el.append(layout);
  }
}
