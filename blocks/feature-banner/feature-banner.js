const COLOR_CLASSES = {
  teal: 'feature-banner-row-teal',
  'teal-light': 'feature-banner-row-teal-light',
  'teal-dark': 'feature-banner-row-teal-dark',
  grey: 'feature-banner-row-grey',
  gray: 'feature-banner-row-grey',
  white: 'feature-banner-row-white',
  'dark-teal': 'feature-banner-row-dark-teal',
};

export default async function init(el) {
  const rows = [...el.querySelectorAll(':scope > div')];
  if (rows.length === 0) return;

  rows.forEach((row) => {
    row.classList.add('feature-banner-row');
    const cols = [...row.querySelectorAll(':scope > div')];

    if (cols[0]) cols[0].classList.add('feature-banner-image');
    if (cols[1]) {
      cols[1].classList.add('feature-banner-content');
      const link = cols[1].querySelector('a');
      if (link) link.classList.add('feature-banner-cta');
    }

    // Optional third cell names a colour for the text-side background, then is removed.
    if (cols[2]) {
      const colorKey = cols[2].textContent.trim().toLowerCase();
      const colorClass = COLOR_CLASSES[colorKey];
      if (colorClass) row.classList.add(colorClass);
      cols[2].remove();
    }
  });
}
