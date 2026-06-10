let taxonomyCache;

async function loadTaxonomy() {
  if (taxonomyCache) return taxonomyCache;
  try {
    const resp = await fetch('/taxonomy.json');
    if (!resp.ok) return [];
    const json = await resp.json();
    taxonomyCache = json.data || [];
  } catch {
    taxonomyCache = [];
  }
  return taxonomyCache;
}

export default async function init(el) {
  const items = [...el.querySelectorAll('p')].map((p) => p.textContent.trim()).filter(Boolean);
  el.innerHTML = '';

  const taxonomy = await loadTaxonomy();

  const wrapper = document.createElement('div');
  wrapper.className = 'article-tags-wrapper';

  items.forEach((tag) => {
    const entry = taxonomy.find((t) => t.Tag.toLowerCase() === tag.toLowerCase());
    const link = document.createElement('a');
    link.className = 'article-tags-tag';
    link.textContent = tag;
    link.href = entry?.Path || `/insights/directory?tag=${encodeURIComponent(tag.toLowerCase())}`;
    if (entry?.Category) link.dataset.category = entry.Category.toLowerCase().replace(/\s+/g, '-');
    wrapper.append(link);
  });

  el.append(wrapper);
}
