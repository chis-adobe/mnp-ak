export default async function init(el) {
  const items = [...el.querySelectorAll('p')].map((p) => p.textContent.trim()).filter(Boolean);
  el.innerHTML = '';

  const wrapper = document.createElement('div');
  wrapper.className = 'article-tags-wrapper';

  items.forEach((tag) => {
    const btn = document.createElement('button');
    btn.className = 'article-tags-tag';
    btn.textContent = tag;
    wrapper.append(btn);
  });

  el.append(wrapper);
}
