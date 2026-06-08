function handleCarouselSelection(el) {
  const carousel = el.closest('.carousel');
  if (!carousel) return;

  const slides = [...carousel.querySelectorAll('.carousel-slide')];
  const selectedSlide = el.closest('.carousel-slide');
  if (!selectedSlide) return;

  slides.forEach((slide) => slide.classList.remove('is-active'));
  selectedSlide.classList.add('is-active');
}

function stopAutoplay() {
  document.querySelectorAll('.carousel').forEach((carousel) => {
    carousel.dataset.ueActive = 'true';
  });
}

function init() {
  stopAutoplay();

  document.addEventListener('click', (e) => {
    const target = e.target.closest('[data-aue-resource]') || e.target;
    handleCarouselSelection(target);
  });

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === 1 && node.matches('.aue-edit-indicator, [data-aue-selected]')) {
          const selected = node.closest('.carousel-slide') || document.querySelector('[data-aue-selected]')?.closest('.carousel-slide');
          if (selected) handleCarouselSelection(selected);
        }
      });
    });
  });

  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-aue-selected'] });
}

init();
