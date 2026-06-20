const COLOR_CLASSES = {
  teal: 'cta-rows-row-teal',
  'teal-light': 'cta-rows-row-teal-light',
  grey: 'cta-rows-row-grey',
  gray: 'cta-rows-row-grey',
  white: 'cta-rows-row-white',
  'dark-teal': 'cta-rows-row-dark-teal',
};

export default async function init(el) {
  const rows = [...el.querySelectorAll(':scope > div')];

  rows.forEach((row) => {
    row.classList.add('cta-rows-row');
    const cols = [...row.querySelectorAll(':scope > div')];

    if (cols[0]) cols[0].classList.add('cta-rows-image');
    if (cols[1]) cols[1].classList.add('cta-rows-content');

    // Third cell holds the colour name; it sets the row background, then is removed.
    if (cols[2]) {
      const colorKey = cols[2].textContent.trim().toLowerCase();
      const colorClass = COLOR_CLASSES[colorKey];
      if (colorClass) row.classList.add(colorClass);
      cols[2].remove();
    }
  });
}
