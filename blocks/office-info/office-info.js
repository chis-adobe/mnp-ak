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

async function buildInfoHeader(address) {
  const header = document.createElement('div');
  header.classList.add('office-info-header');

  const h2 = document.createElement('h2');
  h2.textContent = await getPlaceholder('office-heading', 'Office Information');
  header.append(h2);

  const fullAddress = `${address.address}, ${address.city}, ${address.province}, ${address['postal-code']}`;
  const p = document.createElement('p');
  p.textContent = fullAddress;
  header.append(p);

  const contactList = document.createElement('ul');
  if (address.phone) {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = `tel:${address.phone}`;
    a.textContent = `Phone: ${address.phone}`;
    li.append(a);
    contactList.append(li);
  }
  if (address.fax) {
    const li = document.createElement('li');
    li.textContent = `Fax: ${address.fax}`;
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
}
