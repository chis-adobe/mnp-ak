import { getPlaceholder } from '../../scripts/utils/placeholders.js';

const CHEVRON = '<svg class="contact-card-chevron" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8.59 16.59 13.17 12 8.59 7.41 10 6l6 6-6 6z"/></svg>';

async function loadPersonnel(path) {
  try {
    const resp = await fetch(`${path}.plain.html`);
    if (!resp.ok) return null;
    const html = await resp.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const data = {};
    const basePath = path.substring(0, path.lastIndexOf('/') + 1);
    const block = doc.querySelector('.author-data, .author-info');
    if (block) {
      [...block.querySelectorAll(':scope > div')].forEach((row) => {
        const key = row.querySelector(':scope > div:first-child');
        const val = row.querySelector(':scope > div:nth-child(2)');
        if (key && val) {
          const field = key.textContent.trim().toLowerCase();
          const img = val.querySelector('img');
          if (img) {
            const src = img.getAttribute('src');
            data[field] = src.startsWith('./')
              ? basePath + src.substring(2)
              : src;
          } else {
            data[field] = val.textContent.trim();
          }
        }
      });
    }
    return data;
  } catch {
    return null;
  }
}

function renderCard(person, path) {
  const card = document.createElement('div');
  card.className = 'contact-card-inner';

  if (person.thumbnail) {
    const imgWrap = document.createElement('div');
    imgWrap.className = 'contact-card-photo';
    const img = document.createElement('img');
    img.src = person.thumbnail;
    img.alt = person.name || '';
    img.loading = 'lazy';
    imgWrap.append(img);
    card.append(imgWrap);
  }

  const info = document.createElement('div');
  info.className = 'contact-card-info';

  const name = document.createElement('h3');
  name.className = 'contact-card-name';
  const displayName = person.certifications
    ? `${person.name}, ${person.certifications}`
    : person.name;
  name.textContent = displayName || '';
  info.append(name);

  if (person.role) {
    const role = document.createElement('p');
    role.className = 'contact-card-title';
    role.textContent = person.role;
    info.append(role);
  }

  if (person.phone) {
    const phone = document.createElement('p');
    const phoneLink = document.createElement('a');
    phoneLink.href = `tel:${person.phone}`;
    phoneLink.className = 'contact-card-phone';
    phoneLink.textContent = person.phone;
    phone.append(phoneLink);
    info.append(phone);
  }

  if (person['toll-free']) {
    const tf = document.createElement('p');
    const tfLink = document.createElement('a');
    tfLink.href = `tel:${person['toll-free']}`;
    tfLink.className = 'contact-card-phone';
    tfLink.textContent = person['toll-free'];
    tf.append(tfLink);
    info.append(tf);
  }

  if (person.email) {
    const email = document.createElement('p');
    const emailLink = document.createElement('a');
    emailLink.href = `mailto:${person.email}`;
    emailLink.className = 'contact-card-email';
    emailLink.textContent = person.email;
    email.append(emailLink);
    info.append(email);
  }

  if (path) {
    const more = document.createElement('a');
    more.href = path;
    more.className = 'contact-card-more';
    more.innerHTML = `<span>Read More</span>${CHEVRON}`;
    info.append(more);
  }

  card.append(info);

  if (person.profile) {
    const bio = document.createElement('div');
    bio.className = 'contact-card-bio';
    const p = document.createElement('p');
    p.textContent = person.profile;
    bio.append(p);
    card.append(bio);
  }

  return card;
}

function renderSecondaryCard(person, path) {
  const card = document.createElement('div');
  card.className = 'contact-card-secondary';

  if (person.thumbnail) {
    const img = document.createElement('img');
    img.src = person.thumbnail;
    img.alt = person.name || '';
    img.loading = 'lazy';
    card.append(img);
  }

  const info = document.createElement('div');
  info.className = 'contact-card-secondary-info';

  const name = document.createElement('strong');
  const displayName = person.certifications
    ? `${person.name}, ${person.certifications}`
    : person.name;
  name.textContent = displayName || '';
  info.append(name);

  if (person.role) {
    const role = document.createElement('span');
    role.textContent = person.role;
    info.append(role);
  }

  if (person.phone) {
    const phone = document.createElement('a');
    phone.href = `tel:${person.phone}`;
    phone.textContent = person.phone;
    info.append(phone);
  }

  if (person.email) {
    const email = document.createElement('a');
    email.href = `mailto:${person.email}`;
    email.textContent = person.email;
    info.append(email);
  }

  if (path) {
    const more = document.createElement('a');
    more.href = path;
    more.className = 'contact-card-more';
    more.innerHTML = `<span>Read More</span>${CHEVRON}`;
    info.append(more);
  }

  card.append(info);
  return card;
}

export default async function init(el) {
  const rows = [...el.querySelectorAll(':scope > div')];
  if (rows.length === 0) return;

  // Collect all personnel paths from the block
  const paths = [];
  rows.forEach((row) => {
    const text = row.textContent.trim();
    if (text.startsWith('/personnel/')) {
      paths.push(text);
    }
  });

  if (paths.length > 0) {
    el.innerHTML = '';

    // Section heading (e.g. "Contact an office member")
    const heading = document.createElement('h2');
    heading.className = 'contact-card-section-title';
    heading.textContent = await getPlaceholder('contact-office-member', 'Contact an office member');
    el.append(heading);

    // First path = primary contact
    const primary = await loadPersonnel(paths[0]);
    if (primary) {
      el.append(renderCard(primary, paths[0]));
    }

    // Remaining paths = secondary contacts
    if (paths.length > 1) {
      const secondaryGrid = document.createElement('div');
      secondaryGrid.className = 'contact-card-secondary-grid';

      const secondaryPaths = paths.slice(1);
      const secondaries = await Promise.all(
        secondaryPaths.map((p) => loadPersonnel(p)),
      );

      secondaries.forEach((person, i) => {
        if (person) secondaryGrid.append(renderSecondaryCard(person, secondaryPaths[i]));
      });

      el.append(secondaryGrid);
    }
    return;
  }

  // Fallback: decorate existing authored content
  const row = rows[0];
  const cols = [...row.querySelectorAll(':scope > div')];
  if (cols[0]) cols[0].classList.add('contact-card-photo');
  if (cols[1]) {
    cols[1].classList.add('contact-card-info');
    const heading = cols[1].querySelector('h3');
    if (heading) heading.classList.add('contact-card-name');
    const title = cols[1].querySelector('p:first-of-type');
    if (title) title.classList.add('contact-card-title');
    const links = cols[1].querySelectorAll('a');
    links.forEach((link) => {
      if (link.href.startsWith('tel:')) {
        link.classList.add('contact-card-phone');
      }
      if (link.href.startsWith('mailto:')) {
        link.classList.add('contact-card-email');
      }
    });
  }
  if (cols[2]) cols[2].classList.add('contact-card-bio');
}
