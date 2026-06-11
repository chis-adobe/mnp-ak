const SAMPLE_DATA = [
  {
    name: 'Value Creation',
    description: 'Unlock more value from your business, discover opportunities for improvement, and achieve better results with a tailored value creation strategy.',
    image_url: 'https://www.mnp.ca/-/media/images/mnp/service/consulting/subpages/4101-25-corp-consulting-sub-pages---value-creation.webp?iar=0&hash=78264711BCEB94C22A151347BEDF7983',
    category: 'Consulting'
  },
  {
    name: 'Assurance and Accounting',
    description: 'Comprehensive audits and reviews to enhance the credibility and reliability of your financial statements.',
    image_url: 'https://www.mnp.ca/-/media/images/mnp/service/assurance-and-accounting/subpages/assurance-and-accounting-subpage-cta-audits-800x450-jpg.jpg?h=450&iar=0&w=800&hash=B8A75E0360DD3F42E9B009DCEB947FCE',
    category: 'Assurance'
  },
  {
    name: 'Bookkeeping and Cloud Accounting',
    description: 'Cloud accounting and bookkeeping solution to manage your business finances faster than ever before, wherever business takes you.',
    image_url: 'https://www.mnp.ca/-/media/images/mnp/service/ease-bookkeeping-services/main-service-page/business-owner-drinking-a-coffee-working-on-a-tablet.webp?iar=0&hash=240E64792C20057EEDA5CEBCDBF699CE',
    category: 'Cloud Accounting'
  },
  {
    name: 'Program Excellence',
    description: 'Keep your projects on track to deliver impactful results with a comprehensive program delivery approach.',
    image_url: 'https://www.mnp.ca/-/media/images/mnp/service/consulting/subpages/consulting-program-excellence-header.webp?iar=0&hash=E45F30DA5E9414EC1CE8F2CF24BDB04F',
    category: 'Consulting'
  },
  {
    name: 'Custom Research and Economic Insights',
    description: 'Find the right information, understand it, and make sound decisions that help you reach your goals.',
    image_url: 'https://www.mnp.ca/-/media/images/mnp/service/consulting/campaign-pages/custom-research-and-economic-insights.webp?iar=0&hash=5C94D9DC1FEDE14EA47130562B885E57',
    category: 'Consulting'
  }
];

const PALETTE = ['#007bff', '#cf4a0c', '#0a3343', '#6d6d6d', '#212529'];

const CARD_COLORS = ['#378ef0', '#9256d9', '#0fb5ae', '#e68619', '#d83790', '#2dca72', '#4046ca', '#72b340'];

function getThemedCardBg(palette) {
  if (!palette || !palette[0]) return null;
  let hex = palette[0].replace('#', '');
  if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  if (hex.length !== 6) return null;
  let [r, g, b] = [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
  if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
  const lum = (c) => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); };
  const relLum = (r, g, b) => 0.2126 * lum(r) + 0.7152 * lum(g) + 0.0722 * lum(b);
  if (relLum(r, g, b) <= 0.12) return { bg: `#${hex}`, fg: '#ffffff' };
  let lo = 0, hi = 1;
  for (let i = 0; i < 20; i++) {
    const m = (lo + hi) / 2;
    if (relLum(Math.round(r * m), Math.round(g * m), Math.round(b * m)) > 0.12) hi = m; else lo = m;
  }
  const dr = Math.round(r * lo), dg = Math.round(g * lo), db = Math.round(b * lo);
  return {
    bg: `#${dr.toString(16).padStart(2, '0')}${dg.toString(16).padStart(2, '0')}${db.toString(16).padStart(2, '0')}`,
    fg: '#ffffff'
  };
}

const theme = getThemedCardBg(PALETTE);

export default async function decorate(block, bridge) {
  let items;

  if (bridge) {
    bridge.applyHostStyles();
    const isPreview = bridge.hostContext?.preview === true;
    if (isPreview) {
      items = SAMPLE_DATA;
    } else {
      const _result = await bridge.toolResult;
      const structuredContent = _result?.structuredContent || _result;
      items = structuredContent?.services || [];
    }
  } else {
    items = SAMPLE_DATA;
  }

  block.textContent = '';
  renderCarousel(block, items, bridge);

  if (bridge) {
    bridge.reportSize(block.offsetWidth, block.offsetHeight);
    let resizeTimer;
    const ro = new ResizeObserver(() => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => bridge.reportSize(block.offsetWidth, block.offsetHeight), 150);
    });
    ro.observe(block);
  }
}

function renderCarousel(block, items, bridge) {
  const wrapper = document.createElement('div');
  wrapper.className = 'carousel-wrapper';

  const container = document.createElement('div');
  container.className = 'carousel-container';

  items.slice(0, 5).forEach((item, index) => {
    const card = document.createElement('div');
    card.className = 'service-card';

    const imageContainer = document.createElement('div');
    imageContainer.className = 'card-image';

    const fallbackColor = CARD_COLORS[index % CARD_COLORS.length];
    const createColorDiv = () => {
      const d = document.createElement('div');
      d.className = 'image-fallback';
      d.style.cssText = `width:100%;height:100%;background-color:${fallbackColor};`;
      return d;
    };

    if (item.image_url) {
      const img = document.createElement('img');
      img.src = item.image_url;
      img.alt = item.name || 'Service image';
      img.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;';
      img.onerror = () => {
        if (img.parentNode) {
          img.parentNode.replaceChild(createColorDiv(), img);
        }
      };
      imageContainer.appendChild(img);
    } else {
      imageContainer.appendChild(createColorDiv());
    }

    const ctaBtn = document.createElement('button');
    ctaBtn.className = 'cta-button';
    ctaBtn.textContent = 'Learn More';
    ctaBtn.setAttribute('aria-label', `Learn more about ${item.name || 'this service'}`);
    if (bridge) {
      ctaBtn.addEventListener('click', () => {
        bridge.sendMessage(`Tell me more about ${item.name || 'this service'}`);
      });
    }
    imageContainer.appendChild(ctaBtn);

    card.appendChild(imageContainer);

    const content = document.createElement('div');
    content.className = 'card-content';
    content.style.cssText = `background: ${theme?.bg ?? '#1a1a1a'}; color: ${theme?.fg ?? '#fff'}`;

    const name = document.createElement('h3');
    name.className = 'service-name';
    name.textContent = item.name || 'Service';
    name.style.color = theme?.fg ?? '#fff';
    content.appendChild(name);

    const description = document.createElement('p');
    description.className = 'service-description';
    description.textContent = item.description || '';
    description.style.color = theme?.fg ?? '#fff';
    content.appendChild(description);

    if (item.category) {
      const category = document.createElement('span');
      category.className = 'service-category';
      category.textContent = item.category;
      content.appendChild(category);
    }

    card.appendChild(content);
    container.appendChild(card);
  });

  wrapper.appendChild(container);

  const leftBtn = document.createElement('button');
  leftBtn.className = 'nav-button nav-left hidden';
  leftBtn.innerHTML = '◀';
  leftBtn.setAttribute('aria-label', 'Scroll left');
  leftBtn.addEventListener('click', () => {
    container.scrollBy({ left: -220, behavior: 'smooth' });
  });
  leftBtn.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      container.scrollBy({ left: -220, behavior: 'smooth' });
    }
  });
  wrapper.appendChild(leftBtn);

  const rightBtn = document.createElement('button');
  rightBtn.className = 'nav-button nav-right';
  rightBtn.innerHTML = '▶';
  rightBtn.setAttribute('aria-label', 'Scroll right');
  rightBtn.addEventListener('click', () => {
    container.scrollBy({ left: 220, behavior: 'smooth' });
  });
  rightBtn.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      container.scrollBy({ left: 220, behavior: 'smooth' });
    }
  });
  wrapper.appendChild(rightBtn);

  const fade = document.createElement('div');
  fade.className = 'fade-gradient';
  fade.style.cssText = `background: linear-gradient(to right, transparent, ${theme?.bg ?? '#1a1a1a'}cc);`;
  wrapper.appendChild(fade);

  const updateNavButtons = () => {
    const atStart = container.scrollLeft <= 5;
    const atEnd = container.scrollLeft >= container.scrollWidth - container.clientWidth - 5;
    leftBtn.classList.toggle('hidden', atStart);
    rightBtn.classList.toggle('hidden', atEnd);
    fade.style.display = atEnd ? 'none' : 'block';
  };

  container.addEventListener('scroll', updateNavButtons);
  updateNavButtons();

  block.appendChild(wrapper);
}