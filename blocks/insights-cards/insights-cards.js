import { getMetadata } from '../../scripts/ak.js';

const MAX_CARDS = 3;

// Load all articles from the query-index (array, newest-first by date where available).
let indexPromise;
async function getArticles() {
  if (!indexPromise) {
    indexPromise = fetch('/articles/query-index.json?limit=500')
      .then((resp) => (resp.ok ? resp.json() : { data: [] }))
      .then((json) => json.data || [])
      .catch(() => []);
  }
  return indexPromise;
}

function tagList(insights) {
  return (insights || '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
}

function firstCategory(insights) {
  const tags = tagList(insights);
  return tags.length ? tags[0] : '';
}

function buildCardFromArticle(article) {
  const card = document.createElement('div');
  card.className = 'insights-card';

  const category = firstCategory(article.insights);
  const excerpt = article.synopsis || article.description || '';
  const image = (article.image || '').replace('author-p', 'publish-p');

  const imageHTML = image
    ? `<div class="insights-card-image"><a href="${article.path}"><img src="${image}" alt="${article.title || ''}" loading="lazy"></a></div>`
    : '';

  card.innerHTML = `
    ${imageHTML}
    <div class="insights-card-content">
      ${category ? `<p class="insights-card-category">${category}</p>` : ''}
      ${article.date ? `<p class="insights-card-date">${article.date}</p>` : ''}
      <h3 class="insights-card-title"><a href="${article.path}">${article.title || ''}</a></h3>
      ${excerpt ? `<p class="insights-card-excerpt">${excerpt}</p>` : ''}
    </div>
  `;
  return card;
}

function renderCards(el, articles) {
  el.innerHTML = '';
  articles.slice(0, MAX_CARDS).forEach((article) => el.append(buildCardFromArticle(article)));
}

// Mode 1: explicit article references (e.g. homepage).
async function renderFromPaths(el, paths) {
  const articles = await getArticles();
  const byPath = {};
  articles.forEach((a) => { byPath[a.path] = a; });
  const picked = paths
    .map((p) => byPath[p] || byPath[p.replace(/\/$/, '')])
    .filter(Boolean);
  renderCards(el, picked);
}

// Mode 2: filter by a tag (e.g. an office's province), newest first.
async function renderByTag(el, tag) {
  if (!tag) {
    el.remove();
    return;
  }
  const wanted = tag.trim().toLowerCase();
  const articles = await getArticles();
  const matches = articles.filter((a) => tagList(a.insights)
    .some((t) => t.toLowerCase() === wanted));
  if (!matches.length) {
    el.remove();
    return;
  }
  renderCards(el, matches);
}

// Mode 3: taxonomy overlap with the current page's insight tags (e.g. article pages).
async function renderByTaxonomy(el, currentTags, excludePath) {
  const wanted = currentTags.map((t) => t.toLowerCase());
  const articles = await getArticles();
  const scored = articles
    .filter((a) => a.path !== excludePath)
    .map((a) => {
      const tags = tagList(a.insights).map((t) => t.toLowerCase());
      const score = wanted.filter((t) => tags.includes(t)).length;
      return { article: a, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);
  if (!scored.length) {
    el.remove();
    return;
  }
  renderCards(el, scored.map((entry) => entry.article));
}

// Fallback: decorate manually-authored card rows (image cell + content cell).
function decorateAuthoredRows(rows) {
  rows.forEach((row) => {
    row.classList.add('insights-card');
    const cols = [...row.querySelectorAll(':scope > div')];

    if (cols[0]) {
      cols[0].classList.add('insights-card-image');
    }
    if (cols[1]) {
      cols[1].classList.add('insights-card-content');
      const category = cols[1].querySelector('p:first-child');
      if (category) category.classList.add('insights-card-category');
      const date = cols[1].querySelector('p:nth-child(2)');
      if (date) date.classList.add('insights-card-date');
      const heading = cols[1].querySelector('h3');
      if (heading) heading.classList.add('insights-card-title');
      const excerpt = cols[1].querySelector('p:nth-child(4), p:last-of-type');
      if (excerpt && excerpt !== category && excerpt !== date) {
        excerpt.classList.add('insights-card-excerpt');
      }
    }
  });
}

export default async function init(el) {
  el.classList.add('insights-cards-wrapper');
  const rows = [...el.querySelectorAll(':scope > div')];
  const firstText = (rows[0]?.textContent || '').trim().toLowerCase();

  // Mode 1 — explicit /articles/* references.
  const paths = rows
    .map((row) => row.textContent.trim())
    .filter((text) => text.startsWith('/articles/'));
  if (paths.length) {
    await renderFromPaths(el, paths);
    return;
  }

  // Mode 2 — province filter: reads the page's province metadata.
  if (firstText === 'province') {
    await renderByTag(el, getMetadata('province'));
    return;
  }

  // Mode 3 — taxonomy: matches articles sharing the page's insight tags.
  if (firstText === 'taxonomy') {
    await renderByTaxonomy(el, tagList(getMetadata('insights')), window.location.pathname);
    return;
  }

  // Fallback — decorate manually-authored card rows.
  decorateAuthoredRows(rows);
}
