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

function buildTagHref(tag, category) {
  const catMap = {
    Service: 'service',
    Industry: 'industry',
    Theme: 'theme',
    'Content Type': 'type',
  };
  const param = catMap[category];
  if (param) {
    return `/search?filter=insights&${param}=${encodeURIComponent(tag)}`;
  }
  return `/search?filter=insights&query=${encodeURIComponent(tag)}`;
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
    link.href = entry ? buildTagHref(entry.Tag, entry.Category) : buildTagHref(tag, '');
    if (entry?.Category) link.dataset.category = entry.Category.toLowerCase().replace(/\s+/g, '-');
    wrapper.append(link);
  });

  el.append(wrapper);
}
