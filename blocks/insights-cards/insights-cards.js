// Resolve article metadata from the articles query-index, keyed by path.
let indexPromise;
async function getArticleIndex() {
  if (!indexPromise) {
    indexPromise = fetch('/articles/query-index.json?limit=500')
      .then((resp) => (resp.ok ? resp.json() : { data: [] }))
      .then((json) => {
        const map = {};
        (json.data || []).forEach((entry) => { map[entry.path] = entry; });
        return map;
      })
      .catch(() => ({}));
  }
  return indexPromise;
}

function firstCategory(insights) {
  if (!insights) return '';
  return insights.split(',')[0].trim();
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

// Decorate manually-authored card rows (image cell + content cell). Legacy mode.
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

  // Article-fragment mode: each row's text is a path like /articles/<slug>.
  const paths = rows
    .map((row) => row.textContent.trim())
    .filter((text) => text.startsWith('/articles/'));

  if (paths.length) {
    const index = await getArticleIndex();
    el.innerHTML = '';
    paths.slice(0, 3).forEach((path) => {
      const article = index[path] || index[path.replace(/\/$/, '')];
      if (article) el.append(buildCardFromArticle(article));
    });
    return;
  }

  // Legacy mode: decorate manually-authored card rows.
  decorateAuthoredRows(rows);
}
