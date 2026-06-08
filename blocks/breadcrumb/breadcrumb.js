import { getMetadata } from '../../scripts/ak.js';

function formatSegment(slug) {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default async function init(el) {
  el.innerHTML = '';

  const { pathname } = window.location;
  const segments = pathname.split('/').filter(Boolean);

  const nav = document.createElement('nav');
  nav.setAttribute('aria-label', 'Breadcrumb');

  const ol = document.createElement('ol');
  ol.classList.add('breadcrumb-list');

  const homeLi = document.createElement('li');
  const homeLink = document.createElement('a');
  homeLink.href = '/';
  homeLink.textContent = 'Home';
  homeLi.append(homeLink);
  ol.append(homeLi);

  let path = '';
  for (let i = 0; i < segments.length - 1; i += 1) {
    path += `/${segments[i]}`;
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = path;
    a.textContent = formatSegment(segments[i]);
    li.append(a);
    ol.append(li);
  }

  if (segments.length > 0) {
    const currentLi = document.createElement('li');
    currentLi.setAttribute('aria-current', 'page');
    const city = getMetadata('city');
    currentLi.textContent = city || formatSegment(segments[segments.length - 1]);
    ol.append(currentLi);
  }

  nav.append(ol);
  el.append(nav);
}
