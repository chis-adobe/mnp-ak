/*
 * Compatibility shim for blocks ported from the AEM boilerplate (e.g. the
 * Adaptive Forms `embedded-form` block) that import helpers from `scripts/aem.js`.
 *
 * This project runs on the custom `ak.js` framework, which has no `aem.js`.
 * Rather than rewrite every ported file, this shim provides the small set of
 * helpers those blocks import, using the canonical boilerplate implementations.
 */

/**
 * Loads a CSS file.
 * @param {string} href URL to the CSS file
 * @returns {Promise<void>}
 */
export function loadCSS(href) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`head > link[href="${href}"]`)) {
      resolve();
      return;
    }
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.onload = resolve;
    link.onerror = reject;
    document.head.append(link);
  });
}

/**
 * Returns a picture element with webp and fallbacks.
 * @param {string} src The image URL
 * @param {string} [alt] The image alternative text
 * @param {boolean} [eager] Load image eagerly
 * @param {Array} [breakpoints] Breakpoints and corresponding params (e.g. width)
 * @returns {Element} The picture element
 */
export function createOptimizedPicture(
  src,
  alt = '',
  eager = false,
  breakpoints = [{ media: '(min-width: 600px)', width: '2000' }, { width: '750' }],
) {
  const url = new URL(src, window.location.href);
  const picture = document.createElement('picture');
  const { pathname } = url;
  const ext = pathname.substring(pathname.lastIndexOf('.') + 1);

  // webp sources
  breakpoints.forEach((br) => {
    const source = document.createElement('source');
    if (br.media) source.setAttribute('media', br.media);
    source.setAttribute('type', 'image/webp');
    source.setAttribute('srcset', `${pathname}?width=${br.width}&format=webply&optimize=medium`);
    picture.appendChild(source);
  });

  // fallback sources + img
  breakpoints.forEach((br, i) => {
    if (i < breakpoints.length - 1) {
      const source = document.createElement('source');
      if (br.media) source.setAttribute('media', br.media);
      source.setAttribute('srcset', `${pathname}?width=${br.width}&format=${ext}&optimize=medium`);
      picture.appendChild(source);
    } else {
      const img = document.createElement('img');
      img.setAttribute('loading', eager ? 'eager' : 'lazy');
      img.setAttribute('alt', alt);
      picture.appendChild(img);
      img.setAttribute('src', `${pathname}?width=${br.width}&format=${ext}&optimize=medium`);
    }
  });

  return picture;
}

/**
 * Add <img> for icon, prefixed with codeBasePath and optionally prefixed with
 * the icon folder URL (defaults to /icons). Default '' is mapped to '/icons'.
 * @param {Element} [element] Element containing icons
 * @param {string} [prefix] Prefix to be added to icon src
 */
export function decorateIcons(element, prefix = '') {
  const icons = [...element.querySelectorAll('span.icon')];
  icons.forEach((span) => {
    const iconName = Array.from(span.classList)
      .find((c) => c.startsWith('icon-'))
      ?.substring(5);
    if (!iconName) return;
    const base = (window.hlx?.codeBasePath || '');
    const img = document.createElement('img');
    img.dataset.iconName = iconName;
    img.src = `${base}${prefix}/icons/${iconName}.svg`;
    img.alt = iconName;
    img.loading = 'lazy';
    span.append(img);
  });
}
