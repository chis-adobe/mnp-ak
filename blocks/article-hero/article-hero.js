import { getMetadata } from '../../scripts/ak.js';

export default async function init(el) {
  el.innerHTML = '';

  const title = getMetadata('og:title') || getMetadata('title');
  const date = getMetadata('publication-date');
  const image = getMetadata('hero-image');

  if (!title) return;

  const wrapper = document.createElement('div');
  wrapper.className = 'article-hero-wrapper';

  if (image) {
    const imgWrapper = document.createElement('div');
    imgWrapper.className = 'article-hero-image';
    const img = document.createElement('img');
    img.src = image;
    img.alt = title;
    img.loading = 'eager';
    imgWrapper.append(img);
    wrapper.append(imgWrapper);
  }

  const content = document.createElement('div');
  content.className = 'article-hero-content';

  const h1 = document.createElement('h1');
  h1.textContent = title;
  content.append(h1);

  if (date) {
    const time = document.createElement('time');
    time.textContent = date;
    content.append(time);
  }

  wrapper.append(content);
  el.append(wrapper);
}
