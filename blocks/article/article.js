import { getMetadata } from '../../scripts/ak.js';

const LINKEDIN_ICON = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>';
const FACEBOOK_ICON = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>';
const X_ICON = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>';

async function loadAuthorFragment(path) {
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

function buildTitleBar() {
  const title = getMetadata('og:title') || getMetadata('title');
  if (!title) return null;

  const bar = document.createElement('div');
  bar.className = 'article-title-bar';

  const h2 = document.createElement('h2');
  h2.textContent = title;
  bar.append(h2);

  const social = document.createElement('div');
  social.className = 'article-social';
  const url = encodeURIComponent(window.location.href);
  social.innerHTML = `
    <a href="https://www.linkedin.com/shareArticle?url=${url}" aria-label="Share on LinkedIn">${LINKEDIN_ICON}</a>
    <a href="https://www.facebook.com/sharer/sharer.php?u=${url}" aria-label="Share on Facebook">${FACEBOOK_ICON}</a>
    <a href="https://twitter.com/intent/tweet?url=${url}" aria-label="Share on X">${X_ICON}</a>
  `;
  bar.append(social);

  return bar;
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
      img.src = author.thumbnail.replace('author-p', 'publish-p');
      img.alt = author.name || '';
      img.loading = 'lazy';
      card.append(img);
    }

    const info = document.createElement('div');
    info.className = 'article-author-info';

    if (author.name) {
      const name = document.createElement('strong');
      const displayName = author.certifications
        ? `${author.name}, ${author.certifications}`
        : author.name;
      name.textContent = displayName;
      info.append(name);
    }

    if (author.role) {
      const role = document.createElement('span');
      role.className = 'article-author-role';
      role.textContent = author.role;
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

function buildRelatedContent() {
  const section = document.createElement('div');
  section.className = 'article-related';
  section.innerHTML = `
    <h4>You might also be interested in</h4>
    <p class="article-placeholder">Related content will be displayed here.</p>
  `;
  return section;
}

function buildInsights() {
  const section = document.createElement('div');
  section.className = 'article-insights';
  section.innerHTML = `
    <h2>Insights</h2>
    <p class="article-placeholder">Latest insights will be displayed here.</p>
  `;
  return section;
}

export default async function init(el) {
  const rows = [...el.querySelectorAll(':scope > div')];
  el.innerHTML = '';

  // Title bar with social icons
  const titleBar = buildTitleBar();
  if (titleBar) el.append(titleBar);

  // Synopsis + Authors row
  const synopsisAuthorsRow = document.createElement('div');
  synopsisAuthorsRow.className = 'article-synopsis-authors';

  const synopsis = buildSynopsis();
  if (synopsis) synopsisAuthorsRow.append(synopsis);

  // Authors
  let authorPaths = [];
  rows.forEach((row) => {
    const label = row.querySelector(':scope > div:first-child');
    if (label && label.textContent.trim().toLowerCase() === 'authors') {
      const valueCell = row.querySelector(':scope > div:nth-child(2)');
      if (valueCell) {
        const paragraphs = valueCell.querySelectorAll('p');
        authorPaths = [...paragraphs]
          .map((p) => p.textContent.trim())
          .filter((t) => t.startsWith('/'));
      }
    }
  });

  if (authorPaths.length) {
    const authors = await buildAuthors(authorPaths);
    synopsisAuthorsRow.append(authors);
  }

  el.append(synopsisAuthorsRow);

  // Tags
  const tags = buildTags();
  if (tags) el.append(tags);

  // Copy + Related content layout
  const layout = document.createElement('div');
  layout.className = 'article-layout';

  const main = document.createElement('div');
  main.className = 'article-main';

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

  const sidebar = document.createElement('aside');
  sidebar.className = 'article-sidebar';
  sidebar.append(buildRelatedContent());

  layout.append(main, sidebar);
  el.append(layout);

  // Insights at the bottom
  el.append(buildInsights());
}
