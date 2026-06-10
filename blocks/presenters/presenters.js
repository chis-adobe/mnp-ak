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
          } else if (field === 'profile') {
            data[field] = val.innerHTML;
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

export default async function init(el) {
  const rows = [...el.querySelectorAll(':scope > div')];
  const paths = [];
  rows.forEach((row) => {
    const text = row.textContent.trim();
    if (text.startsWith('/personnel/')) paths.push(text);
  });

  el.innerHTML = '';

  const h3 = document.createElement('h3');
  h3.textContent = 'Presenters';
  el.append(h3);

  const grid = document.createElement('div');
  grid.className = 'presenters-grid';

  const people = await Promise.all(paths.map((p) => loadPersonnel(p)));

  people.filter(Boolean).forEach((person) => {
    const card = document.createElement('div');
    card.className = 'presenters-card';

    if (person.thumbnail) {
      const img = document.createElement('img');
      img.src = person.thumbnail;
      img.alt = person.name || '';
      img.loading = 'lazy';
      card.append(img);
    }

    const info = document.createElement('div');
    info.className = 'presenters-info';

    const name = document.createElement('h4');
    name.textContent = person.certifications
      ? `${person.name}, ${person.certifications}`
      : person.name || '';
    info.append(name);

    if (person.role) {
      const role = document.createElement('span');
      role.className = 'presenters-role';
      role.textContent = person.role;
      info.append(role);
    }

    if (person.profile) {
      const bio = document.createElement('p');
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = person.profile;
      const firstP = tempDiv.querySelector('p');
      bio.textContent = firstP
        ? firstP.textContent.substring(0, 200)
        : person.profile.substring(0, 200);
      if (bio.textContent.length >= 200) bio.textContent += '...';
      info.append(bio);
    }

    card.append(info);
    grid.append(card);
  });

  el.append(grid);
}
