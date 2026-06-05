function buildFlyout(row) {
  const cols = [...row.querySelectorAll(':scope > div')];
  if (cols.length < 2) return null;

  const flyout = document.createElement('div');
  flyout.className = 'mnp-header-flyout';

  const heading = cols[1]?.textContent?.trim();
  if (heading) {
    const h3 = document.createElement('h3');
    h3.textContent = heading;
    flyout.append(h3);
  }

  const linksContainer = document.createElement('div');
  linksContainer.className = 'mnp-header-flyout-columns';

  cols.slice(2).forEach((col) => {
    const colDiv = document.createElement('div');
    colDiv.className = 'mnp-header-flyout-col';
    const links = col.querySelectorAll('a');
    links.forEach((link) => {
      const a = link.cloneNode(true);
      colDiv.append(a);
    });
    if (colDiv.children.length) linksContainer.append(colDiv);
  });

  flyout.append(linksContainer);
  return flyout;
}

export default async function init(el) {
  const headerStyle = document.querySelector('meta[name="header-style"]')?.content;
  if (headerStyle === 'static') {
    el.classList.add('mnp-header-static');
  }

  const rows = [...el.querySelectorAll(':scope > div')];
  el.innerHTML = '';

  const header = document.createElement('div');
  header.className = 'mnp-header-wrapper';

  // Row 1: Top bar (full-width container with inner child-wrapper)
  const topBar = document.createElement('div');
  topBar.className = 'mnp-header-top';
  const topBarInner = document.createElement('div');
  topBarInner.className = 'child-wrapper';

  const logo = document.createElement('a');
  logo.href = '/';
  logo.className = 'mnp-header-logo';
  logo.setAttribute('aria-label', 'MNP Home');
  logo.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 81.66 26.43"><path fill="#fff" d="M0,26.19V.24H5.71l7.44,15.41L20.62.24h5.71V26.19H21.21V8.94L14.34,22.76h-2.4L5,8.94V26.19Z"/><path fill="#fff" d="M30.43,26.19V.24h5.13L47.24,17V.24h5.13V26.19H47.24L35.56,9.47V26.19Z"/><path fill="#fff" d="M56.27,26.19V.24H66.53a10.08,10.08,0,0,1,7,2.4,8.18,8.18,0,0,1,2.68,6.39A8.18,8.18,0,0,1,73.5,15.42a10.08,10.08,0,0,1-7,2.4H61.39V26.19Zm5.12-13.1h4.8a5,5,0,0,0,3.47-1.12,4,4,0,0,0,1.25-3.1,4,4,0,0,0-1.25-3.1,5,5,0,0,0-3.47-1.12h-4.8Z"/></svg>';

  const utilityNav = document.createElement('nav');
  utilityNav.className = 'mnp-header-utility';
  const utilUl = document.createElement('ul');

  if (rows[0]) {
    const links = rows[0].querySelectorAll('a');
    links.forEach((link) => {
      const li = document.createElement('li');
      const a = link.cloneNode(true);
      li.append(a);
      utilUl.append(li);
    });
  }
  utilityNav.append(utilUl);
  topBarInner.append(logo, utilityNav);
  topBar.append(topBarInner);

  // Row 2: Main nav (full-width container with inner child-wrapper)
  const mainBar = document.createElement('div');
  mainBar.className = 'mnp-header-main';
  const mainBarInner = document.createElement('div');
  mainBarInner.className = 'child-wrapper';

  const mainNav = document.createElement('nav');
  mainNav.className = 'mnp-header-nav';
  const mainUl = document.createElement('ul');

  rows.slice(1).forEach((row) => {
    const cols = [...row.querySelectorAll(':scope > div')];
    if (cols.length === 0) return;

    const sectionName = cols[0]?.textContent?.trim();
    if (!sectionName) return;

    const li = document.createElement('li');
    li.className = 'mnp-header-nav-item';

    const sectionLink = cols[0].querySelector('a');
    const a = document.createElement('a');
    a.href = sectionLink?.href || '#';
    a.textContent = sectionName;
    a.className = 'mnp-header-nav-link';

    if (cols.length > 2) {
      a.setAttribute('aria-expanded', 'false');
      a.addEventListener('click', (e) => {
        e.preventDefault();
        const isOpen = li.classList.contains('is-open');
        mainUl.querySelectorAll('.is-open').forEach((open) => {
          open.classList.remove('is-open');
          open.querySelector('a')?.setAttribute('aria-expanded', 'false');
        });
        if (!isOpen) {
          li.classList.add('is-open');
          a.setAttribute('aria-expanded', 'true');
        }
      });

      const flyout = buildFlyout(row);
      if (flyout) li.append(flyout);
    }

    li.prepend(a);
    mainUl.append(li);
  });

  mainNav.append(mainUl);

  const toggle = document.createElement('button');
  toggle.className = 'mnp-header-toggle';
  toggle.setAttribute('aria-label', 'Toggle navigation');
  toggle.innerHTML = '<span></span><span></span><span></span>';
  toggle.addEventListener('click', () => {
    header.classList.toggle('is-mobile-open');
  });

  mainBarInner.append(mainNav, toggle);
  mainBar.append(mainBarInner);
  header.append(topBar, mainBar);
  el.append(header);

  // Close flyouts on outside click
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.mnp-header')) {
      mainUl.querySelectorAll('.is-open').forEach((open) => {
        open.classList.remove('is-open');
        open.querySelector('a')?.setAttribute('aria-expanded', 'false');
      });
    }
  });

  // Scroll behavior: hide utility nav, show sticky main nav with solid bg
  window.addEventListener('scroll', () => {
    if (window.scrollY > 80) {
      el.classList.add('is-scrolled');
    } else {
      el.classList.remove('is-scrolled');
    }
  });
}
