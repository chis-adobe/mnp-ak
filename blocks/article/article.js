import { getMetadata } from '../../scripts/ak.js';

async function loadAuthorFragment(path) {
  try {
    const resp = await fetch(`${path}.plain.html`);
    if (!resp.ok) return null;
    const html = await resp.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const data = {};
    [...doc.querySelectorAll('div > div')].forEach((row) => {
      const key = row.querySelector(':scope > div:first-child');
      const val = row.querySelector(':scope > div:nth-child(2)');
      if (key && val) {
        data[key.textContent.trim().toLowerCase()] = val.innerHTML.trim();
      }
    });
    return data;
  } catch {
    return null;
  }
}

function buildSynopsis() {
  const synopsis = getMetadata('synopsis');
  if (!synopsis) return null;

  const section = document.createElement('div');
  section.className = 'article-synopsis';

  const label = document.createElement('span');
  label.className = 'article-synopsis-label';
  label.textContent = 'Synopsis';

  const text = document.createElement('p');
  text.textContent = synopsis;

  section.append(label, text);
  return section;
}

async function buildAuthors(authorPaths) {
  const section = document.createElement('div');
  section.className = 'article-authors';

  const authors = await Promise.all(
    authorPaths.map((path) => loadAuthorFragment(path.trim())),
  );

  authors.filter(Boolean).forEach((author) => {
    const card = document.createElement('div');
    card.className = 'article-author-card';

    if (author.thumbnail) {
      const img = document.createElement('img');
      const src = author.thumbnail.match(/src="([^"]+)"/);
      img.src = src ? src[1] : author.thumbnail;
      img.alt = author.name || '';
      img.loading = 'lazy';
      card.append(img);
    }

    const info = document.createElement('div');
    info.className = 'article-author-info';

    if (author.name) {
      const name = document.createElement('strong');
      name.textContent = author.name.replace(/<[^>]+>/g, '');
      info.append(name);
    }

    if (author.certifications) {
      const certs = document.createElement('span');
      certs.className = 'article-author-certs';
      certs.textContent = author.certifications.replace(/<[^>]+>/g, '');
      info.append(certs);
    }

    if (author.role) {
      const role = document.createElement('span');
      role.className = 'article-author-role';
      role.textContent = author.role.replace(/<[^>]+>/g, '');
      info.append(role);
    }

    card.append(info);
    section.append(card);
  });

  return section;
}

function buildTags() {
  const tags = getMetadata('insights');
  if (!tags) return null;

  const section = document.createElement('div');
  section.className = 'article-tags';

  tags.split(',').forEach((tag) => {
    const btn = document.createElement('span');
    btn.className = 'article-tag';
    btn.textContent = tag.trim();
    section.append(btn);
  });

  return section;
}

export default async function init(el) {
  const rows = [...el.querySelectorAll(':scope > div')];
  el.innerHTML = '';

  const layout = document.createElement('div');
  layout.className = 'article-layout';

  const sidebar = document.createElement('aside');
  sidebar.className = 'article-sidebar';

  const main = document.createElement('div');
  main.className = 'article-main';

  // Synopsis
  const synopsis = buildSynopsis();
  if (synopsis) sidebar.append(synopsis);

  // Authors
  let authorPaths = [];
  rows.forEach((row) => {
    const label = row.querySelector(':scope > div:first-child');
    if (label && label.textContent.trim().toLowerCase() === 'authors') {
      const links = row.querySelectorAll('a');
      authorPaths = [...links].map((a) => {
        const href = a.getAttribute('href');
        return href.startsWith('http')
          ? new URL(href).pathname
          : href;
      });
    }
  });

  if (authorPaths.length) {
    const authors = await buildAuthors(authorPaths);
    sidebar.append(authors);
  }

  // Tags
  const tags = buildTags();
  if (tags) sidebar.append(tags);

  // Copy
  rows.forEach((row) => {
    const label = row.querySelector(':scope > div:first-child');
    if (label && label.textContent.trim().toLowerCase() === 'copy') {
      const content = row.querySelector(':scope > div:nth-child(2)');
      if (content) {
        const copy = document.createElement('div');
        copy.className = 'article-copy';
        copy.innerHTML = content.innerHTML;
        main.append(copy);
      }
    }
  });

  layout.append(sidebar, main);
  el.append(layout);
}
