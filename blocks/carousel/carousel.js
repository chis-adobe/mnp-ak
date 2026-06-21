// Named Dynamic Media smart crops (Scene7), ordered widest-first.
// Each crop is content-aware so the focal subject stays in frame.
const SMART_CROPS = [
  { name: 'Large', width: 1260, minViewport: 900 },
  { name: 'Medium', width: 700, minViewport: 600 },
  { name: 'Portait', width: 550, minViewport: 400 },
  { name: 'Small', width: 400, minViewport: 0 },
];

function isScene7Url(url) {
  return /scene7\.com\/is\/image\//.test(url);
}

// Build a Scene7 rendition URL for a named smart crop at a target width (webp).
function s7Url(base, cropName, width) {
  const clean = base.split('?')[0].replace(/:[A-Za-z]+$/, '');
  return `${clean}:${cropName}?wid=${width}&fmt=webp-alpha`;
}

// Replace an authored <picture>/<img> that points at a Scene7 asset with a
// responsive <picture> whose sources pick the best smart crop per viewport width.
function buildSmartCropPicture(originalImg, base, altOverride) {
  const picture = document.createElement('picture');

  SMART_CROPS.forEach((crop) => {
    const source = document.createElement('source');
    source.type = 'image/webp';
    // Serve at 2x the crop's native width for crisp rendering on hi-dpi.
    source.srcset = s7Url(base, crop.name, crop.width * 2);
    if (crop.minViewport > 0) source.media = `(min-width: ${crop.minViewport}px)`;
    picture.append(source);
  });

  const img = document.createElement('img');
  // Default/fallback: the smallest crop.
  img.src = s7Url(base, 'Small', 800);
  img.alt = altOverride || originalImg?.getAttribute('alt') || '';
  img.loading = originalImg?.getAttribute('loading') || 'lazy';
  picture.append(img);

  return picture;
}

function applySmartCrops(imageCol) {
  // Scene7 assets are authored as a link (EDS rehosts <img> srcs, stripping the
  // Scene7 URL, but leaves link hrefs untouched).
  const link = [...imageCol.querySelectorAll('a')].find((a) => isScene7Url(a.href));
  if (link) {
    const href = link.getAttribute('href');
    // Use the link's text as alt only when the author gave it a real label
    // (not the URL itself, which EDS uses as default link text).
    const linkText = link.textContent.trim();
    const alt = linkText && linkText !== href ? linkText : '';
    const picture = buildSmartCropPicture(null, href, alt);
    link.replaceWith(picture);
    return;
  }

  // Fallback: a direct Scene7 <img> src (e.g. local preview that doesn't rehost).
  const img = imageCol.querySelector('img');
  if (!img) return;
  const src = img.getAttribute('src') || '';
  if (!isScene7Url(src)) return;
  const oldPicture = img.closest('picture') || img;
  const newPicture = buildSmartCropPicture(img, src);
  oldPicture.replaceWith(newPicture);
}

export default async function init(el) {
  const slides = [...el.querySelectorAll(':scope > div')];
  el.innerHTML = '';

  const track = document.createElement('div');
  track.className = 'carousel-track';

  slides.forEach((slide, idx) => {
    slide.classList.add('carousel-slide');
    if (idx === 0) slide.classList.add('is-active');
    const cols = [...slide.querySelectorAll(':scope > div')];
    if (cols[0]) {
      cols[0].classList.add('carousel-slide-image');
      applySmartCrops(cols[0]);
    }
    if (cols[1]) {
      cols[1].classList.add('carousel-slide-content');
      const detail = cols[1].querySelector('p:first-child');
      if (detail) detail.classList.add('carousel-slide-date');
      const heading = cols[1].querySelector('h1, h2');
      if (heading) heading.classList.add('carousel-slide-heading');
      const desc = cols[1].querySelector('p:nth-child(3), p:last-of-type');
      if (desc && desc !== detail) desc.classList.add('carousel-slide-desc');
    }
    track.append(slide);
  });

  el.append(track);

  const prevBtn = document.createElement('button');
  prevBtn.className = 'carousel-prev';
  prevBtn.setAttribute('aria-label', 'Previous slide');
  prevBtn.textContent = '‹';

  const nextBtn = document.createElement('button');
  nextBtn.className = 'carousel-next';
  nextBtn.setAttribute('aria-label', 'Next slide');
  nextBtn.textContent = '›';

  el.append(prevBtn, nextBtn);

  let current = 0;
  const total = slides.length;

  function showSlide(index) {
    slides[current].classList.remove('is-active');
    current = (index + total) % total;
    slides[current].classList.add('is-active');
  }

  prevBtn.addEventListener('click', () => showSlide(current - 1));
  nextBtn.addEventListener('click', () => showSlide(current + 1));

  const isUE = /\.(stage-ue|ue)\.da\.live$/.test(window.location.hostname);
  if (!isUE) {
    const timer = setInterval(() => {
      if (el.dataset.ueActive) {
        clearInterval(timer);
        return;
      }
      showSlide(current + 1);
    }, 6000);
  }
}
