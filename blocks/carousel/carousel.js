export default async function init(el) {
  const slides = [...el.querySelectorAll(':scope > div')];
  el.innerHTML = '';

  const track = document.createElement('div');
  track.className = 'carousel-track';

  slides.forEach((slide, idx) => {
    slide.classList.add('carousel-slide');
    if (idx === 0) slide.classList.add('is-active');
    const cols = [...slide.querySelectorAll(':scope > div')];
    if (cols[0]) cols[0].classList.add('carousel-slide-image');
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
      if (el.dataset.ueActive) { clearInterval(timer); return; }
      showSlide(current + 1);
    }, 6000);
  }
}
