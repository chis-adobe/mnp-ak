async function loadPersonnel(path) {
  try {
    const resp = await fetch(`${path}.plain.html`);
    if (!resp.ok) return null;
    const html = await resp.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const data = {};
    const basePath = path.substring(0, path.lastIndexOf('/') + 1);
    const block = doc.querySelector('.author-data');
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

function renderCard(person) {
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

export default async function init(el) {
  const rows = [...el.querySelectorAll(':scope > div')];
  if (rows.length === 0) return;

  // Check if the block contains a personnel reference path
  const firstText = rows[0]?.textContent?.trim();
  if (firstText && firstText.startsWith('/personnel/')) {
    el.innerHTML = '';
    const person = await loadPersonnel(firstText);
    if (person) {
      el.append(renderCard(person));
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
