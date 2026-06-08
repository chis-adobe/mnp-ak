function showSlide(slide) {
  const carousel = slide.closest('.carousel');
  if (!carousel) return;

  carousel.querySelectorAll('.carousel-slide').forEach((s) => s.classList.remove('is-active'));
  slide.classList.add('is-active');
}

function handleSelection(e) {
  const target = e.detail?.resource
    ? document.querySelector(`[data-aue-resource="${e.detail.resource}"]`)
    : e.target;
  if (!target) return;

  const slide = target.closest('.carousel-slide');
  if (slide) showSlide(slide);
}

function init() {
  document.querySelectorAll('.carousel').forEach((carousel) => {
    carousel.dataset.ueActive = 'true';
  });

  document.addEventListener('aue:ui-select', handleSelection);
  document.addEventListener('aue:content-update', handleSelection);

  const observer = new MutationObserver(() => {
    const selected = document.querySelector('.aue-asset-selector-active, [data-aue-selected="true"]');
    if (selected) {
      const slide = selected.closest('.carousel-slide');
      if (slide) showSlide(slide);
    }
  });

  observer.observe(document.body, {
    subtree: true,
    attributes: true,
    attributeFilter: ['data-aue-selected', 'class'],
  });
}

init();
