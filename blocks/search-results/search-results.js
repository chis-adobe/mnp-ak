async function fetchArticles() {
  const resp = await fetch('/articles/query-index.json?limit=1000');
  if (!resp.ok) return [];
  const json = await resp.json();
  return json.data || [];
}

async function fetchTaxonomy() {
  try {
    const resp = await fetch('/taxonomy.json');
    if (!resp.ok) return [];
    const json = await resp.json();
    return json.data || [];
  } catch {
    return [];
  }
}

async function fetchAllPages() {
  const resp = await fetch('/query-index.json?limit=1000');
  if (!resp.ok) return [];
  const json = await resp.json();
  return json.data || [];
}

function getParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    query: params.get('query') || '',
    filter: params.get('filter') || '',
    service: params.get('service') || '',
    industry: params.get('industry') || '',
    theme: params.get('theme') || '',
  };
}

function buildFilterPills(container, p) {
  const pills = document.createElement('ul');
  pills.className = 'search-results-pills';

  const active = [];
  if (p.service) active.push({ label: `Service: ${p.service}`, param: 'service' });
  if (p.industry) active.push({ label: `Industry: ${p.industry}`, param: 'industry' });
  if (p.theme) active.push({ label: `Theme: ${p.theme}`, param: 'theme' });

  active.forEach(({ label, param }) => {
    const li = document.createElement('li');
    const link = document.createElement('a');
    link.href = '/search';
    link.textContent = label;
    link.className = 'search-results-pill';
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const params = new URLSearchParams(window.location.search);
      params.delete(param);
      params.delete('filter');
      window.location.search = params.toString();
    });
    li.append(link);
    pills.append(li);
  });

  if (active.length) {
    const clearLi = document.createElement('li');
    const clearLink = document.createElement('a');
    clearLink.href = '/search';
    clearLink.textContent = 'Clear all filters';
    clearLink.className = 'search-results-pill-clear';
    clearLi.append(clearLink);
    pills.append(clearLi);
  }

  if (active.length) container.append(pills);
}

function buildFilterPanel(container, taxonomy) {
  const filterBar = document.createElement('div');
  filterBar.className = 'search-results-filter-bar';

  const filterBtn = document.createElement('button');
  filterBtn.className = 'search-results-filter-btn';
  filterBtn.innerHTML = 'Filter by <span class="filter-icon">&#9776;</span>';
  filterBar.append(filterBtn);
  container.append(filterBar);

  const p = getParams();
  const hasActiveFilters = p.service || p.industry || p.theme;

  const panel = document.createElement('div');
  panel.className = 'search-results-filter-panel';
  panel.hidden = !hasActiveFilters;

  const tabs = document.createElement('div');
  tabs.className = 'search-results-filter-tabs';
  const tabNames = ['Offices', 'Personnel', 'Media', 'Insights'];
  tabNames.forEach((name) => {
    const btn = document.createElement('button');
    btn.textContent = name;
    btn.dataset.tab = name.toLowerCase();
    if (name === 'Insights') btn.classList.add('active');
    btn.addEventListener('click', () => {
      tabs.querySelectorAll('button').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      panel.querySelectorAll('.search-results-filter-content').forEach((c) => { c.hidden = true; });
      const target = panel.querySelector(`[data-content="${name.toLowerCase()}"]`);
      if (target) target.hidden = false;
    });
    tabs.append(btn);
  });
  panel.append(tabs);

  const categories = { Service: [], Industry: [], Theme: [] };
  taxonomy.forEach((entry) => {
    const cat = entry.Category;
    if (categories[cat]) categories[cat].push(entry.Tag);
  });

  const insightsContent = document.createElement('div');
  insightsContent.className = 'search-results-filter-content';
  insightsContent.dataset.content = 'insights';

  const dropdowns = [
    { label: 'Service Line', param: 'service', options: categories.Service, current: p.service },
    { label: 'Industry', param: 'industry', options: categories.Industry, current: p.industry },
    { label: 'Theme', param: 'theme', options: categories.Theme, current: p.theme },
  ];

  const form = document.createElement('div');
  form.className = 'search-results-filter-form';

  dropdowns.forEach(({ label, param, options, current }) => {
    const group = document.createElement('div');
    group.className = 'search-results-filter-group';

    const lbl = document.createElement('label');
    lbl.textContent = label;
    group.append(lbl);

    const select = document.createElement('select');
    select.dataset.param = param;
    const defaultOpt = document.createElement('option');
    defaultOpt.value = '';
    defaultOpt.textContent = `All ${label}s`;
    select.append(defaultOpt);

    options.forEach((opt) => {
      const option = document.createElement('option');
      option.value = opt;
      option.textContent = opt;
      if (current && current.toLowerCase() === opt.toLowerCase()) option.selected = true;
      select.append(option);
    });
    group.append(select);
    form.append(group);
  });

  const applyBtn = document.createElement('button');
  applyBtn.className = 'search-results-filter-apply';
  applyBtn.textContent = 'Apply Filters';
  applyBtn.addEventListener('click', () => {
    const params = new URLSearchParams();
    form.querySelectorAll('select').forEach((sel) => {
      if (sel.value) params.set(sel.dataset.param, sel.value);
    });
    if (params.toString()) params.set('filter', 'insights');
    window.location.search = params.toString();
  });
  form.append(applyBtn);
  insightsContent.append(form);
  panel.append(insightsContent);

  ['offices', 'personnel', 'media'].forEach((name) => {
    const content = document.createElement('div');
    content.className = 'search-results-filter-content';
    content.dataset.content = name;
    content.hidden = true;
    content.innerHTML = `<p class="search-results-placeholder">Filters for ${name} coming soon.</p>`;
    panel.append(content);
  });

  container.append(panel);

  if (hasActiveFilters) filterBtn.classList.add('active');

  filterBtn.addEventListener('click', () => {
    panel.hidden = !panel.hidden;
    filterBtn.classList.toggle('active');
  });
}

function filterArticles(articles, p) {
  return articles.filter((a) => {
    const tags = (a.insights || '').toLowerCase();
    if (p.service && !tags.includes(p.service.toLowerCase())) return false;
    if (p.industry && !tags.includes(p.industry.toLowerCase())) return false;
    if (p.theme && !tags.includes(p.theme.toLowerCase())) return false;
    if (p.query) {
      const q = p.query.toLowerCase();
      const title = (a.title || '').toLowerCase();
      const desc = (a.synopsis || a.description || '').toLowerCase();
      if (!title.includes(q) && !desc.includes(q) && !tags.includes(q)) return false;
    }
    return true;
  });
}

function renderArticleCard(article) {
  const card = document.createElement('div');
  card.className = 'search-results-card';
  const title = article.title || '';
  const desc = article.synopsis || article.description || '';
  const date = article.date || '';
  const img = article.image || '';

  let thumbHTML = '';
  if (img && !img.includes('default-meta-image')) {
    const imgUrl = img.replace('author-p', 'publish-p');
    thumbHTML = `<div class="search-results-card-thumb"><img src="${imgUrl}" alt="${title}" loading="lazy"/></div>`;
  }

  card.innerHTML = `
    ${thumbHTML}
    <div class="search-results-card-content">
      <h3><a href="${article.path}">${title}</a></h3>
      ${date ? `<span class="search-results-card-date">${date}</span>` : ''}
      ${desc ? `<p>${desc}</p>` : ''}
    </div>
  `;
  return card;
}

export default async function init(el) {
  el.innerHTML = '';
  const p = getParams();
  const isFilterMode = p.filter || p.service || p.industry || p.theme;

  const wrapper = document.createElement('div');
  wrapper.className = 'search-results-wrapper';

  const [taxonomy, articles, allPages] = await Promise.all([
    fetchTaxonomy(),
    fetchArticles(),
    isFilterMode ? Promise.resolve([]) : fetchAllPages(),
  ]);

  buildFilterPanel(wrapper, taxonomy);
  buildFilterPills(wrapper, p);

  if (isFilterMode) {
    const results = filterArticles(articles, p);
    const heading = document.createElement('p');
    heading.className = 'search-results-query';
    heading.innerHTML = `Displaying <strong>${results.length}</strong> result${results.length !== 1 ? 's' : ''}`;
    wrapper.append(heading);

    const grid = document.createElement('div');
    grid.className = 'search-results-grid';
    results.forEach((a) => grid.append(renderArticleCard(a)));
    if (!results.length) {
      grid.innerHTML = '<p class="search-results-empty">No articles match the selected filters.</p>';
    }
    wrapper.append(grid);
  } else if (p.query) {
    const queryDisplay = document.createElement('p');
    queryDisplay.className = 'search-results-query';
    queryDisplay.innerHTML = `Results for: <strong>${p.query}</strong>`;
    wrapper.append(queryDisplay);

    const results = allPages.filter((page) => {
      const q = p.query.toLowerCase();
      return (page.title || '').toLowerCase().includes(q)
        || (page.description || '').toLowerCase().includes(q);
    });

    const countEl = document.createElement('p');
    countEl.className = 'search-results-count';
    countEl.textContent = `${results.length} result${results.length !== 1 ? 's' : ''} found`;
    wrapper.append(countEl);

    const grid = document.createElement('div');
    grid.className = 'search-results-grid';
    results.forEach((page) => {
      const card = document.createElement('div');
      card.className = 'search-results-card';
      card.innerHTML = `
        <div class="search-results-card-content">
          <h3><a href="${page.path}">${page.title || ''}</a></h3>
          ${page.description ? `<p>${page.description}</p>` : ''}
        </div>
      `;
      grid.append(card);
    });
    if (!results.length) {
      grid.innerHTML = '<p class="search-results-empty">No results found.</p>';
    }
    wrapper.append(grid);
  } else {
    wrapper.innerHTML += '<p class="search-results-empty">Enter a search term or use filters to find content.</p>';
  }

  el.append(wrapper);
}
