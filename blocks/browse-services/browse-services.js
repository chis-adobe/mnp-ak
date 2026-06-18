// Sample data for standalone EDS preview (no bridge).
// In production, data comes dynamically from bridge.toolResult.
const SAMPLE_DATA = [
  {
    "name": "Audits",
    "description": "Comprehensive and independent audit to enhance the credibility and reliability of your financial statements.",
    "image_url": "https://www.mnp.ca/-/media/images/mnp/service/assurance-and-accounting/subpages/assurance-and-accounting-subpage-cta-audits-800x450-jpg.jpg?h=450&iar=0&w=800&hash=B8A75E0360DD3F42E9B009DCEB947FCE",
    "category": "Assurance and Accounting"
  },
  {
    "name": "Bookkeeping and Cloud Accounting",
    "description": "Cloud accounting and bookkeeping solution to manage your business finances faster than ever before, wherever business takes you.",
    "image_url": "https://www.mnp.ca/-/media/images/mnp/service/ease-bookkeeping-services/main-service-page/business-owner-drinking-a-coffee-working-on-a-tablet.webp?iar=0&hash=240E64792C20057EEDA5CEBCDBF699CE",
    "category": "Cloud Services"
  },
  {
    "name": "Value Creation",
    "description": "Unlock the potential of your value streams to help your business succeed with the right decisions to realize better value.",
    "image_url": "https://www.mnp.ca/-/media/images/mnp/service/consulting/subpages/4101-25-corp-consulting-sub-pages---value-creation.webp?iar=0&hash=78264711BCEB94C22A151347BEDF7983",
    "category": "Consulting"
  },
  {
    "name": "Program Excellence",
    "description": "Keep your projects on track to deliver impactful results and realize the full benefits of transformation projects and business objectives.",
    "image_url": "https://www.mnp.ca/-/media/images/mnp/service/consulting/subpages/consulting-program-excellence-header.webp?iar=0&hash=E45F30DA5E9414EC1CE8F2CF24BDB04F",
    "category": "Consulting"
  },
  {
    "name": "Custom Research and Economic Insights",
    "description": "Find the right information, understand it, and make sound decisions that help your organization reach its goals.",
    "image_url": "https://www.mnp.ca/-/media/images/mnp/service/consulting/campaign-pages/custom-research-and-economic-insights.webp?iar=0&hash=5C94D9DC1FEDE14EA47130562B885E57",
    "category": "Consulting"
  }
];

// Brand palette from BuildWidgetRequest
const PALETTE = ['#007bff','#6d6d6d','#cf4a0c','#0a3343','#212529'];

function getThemedCardBg(palette) {
  if (!palette || !palette[0]) return null;
  let hex = palette[0].replace('#','');
  if(hex.length===3)hex=hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
  if(hex.length!==6)return null;
  let [r,g,b]=[parseInt(hex.slice(0,2),16),parseInt(hex.slice(2,4),16),parseInt(hex.slice(4,6),16)];
  if(isNaN(r)||isNaN(g)||isNaN(b))return null;
  const lum=(c)=>{const s=c/255;return s<=0.03928?s/12.92:Math.pow((s+0.055)/1.055,2.4);};
  const relLum=(r,g,b)=>0.2126*lum(r)+0.7152*lum(g)+0.0722*lum(b);
  if(relLum(r,g,b)<=0.12)return{bg:`#${hex}`,fg:'#ffffff'};
  let lo=0,hi=1;
  for(let i=0;i<20;i++){const m=(lo+hi)/2;if(relLum(Math.round(r*m),Math.round(g*m),Math.round(b*m))>0.12)hi=m;else lo=m;}
  const dr=Math.round(r*lo),dg=Math.round(g*lo),db=Math.round(b*lo);
  return{bg:`#${dr.toString(16).padStart(2,'0')}${dg.toString(16).padStart(2,'0')}${db.toString(16).padStart(2,'0')}`,fg:'#ffffff'};
}

const theme = getThemedCardBg(PALETTE);

const CARD_COLORS = ['#378ef0','#9256d9','#0fb5ae','#e68619','#d83790','#2dca72','#4046ca','#72b340'];

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
      // structuredContent.services — bare array outputSchema; key derived from actionName "browse_services"
      items = structuredContent?.services || [];
    }
  } else {
    items = SAMPLE_DATA;
  }

  block.textContent = '';

  const wrapper = document.createElement('div');
  wrapper.className = 'services-carousel-wrapper';

  const carousel = document.createElement('div');
  carousel.className = 'services-carousel';
  carousel.setAttribute('role', 'region');
  carousel.setAttribute('aria-label', 'Services carousel');

  items.slice(0, 5).forEach((item, i) => {
    const card = document.createElement('div');
    card.className = 'service-card';

    const imageContainer = document.createElement('div');
    imageContainer.className = 'service-image';

    const fallbackColor = CARD_COLORS[i % CARD_COLORS.length];
    const colorDiv = () => {
      const d = document.createElement('div');
      d.style.cssText = `width:100%;height:100%;background-color:${fallbackColor};`;
      return d;
    };

    if (item.image_url) {
      const img = document.createElement('img');
      img.src = item.image_url;
      img.alt = item.name || '';
      img.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;';
      img.onerror = () => img.parentNode.replaceChild(colorDiv(), img);
      imageContainer.appendChild(img);
    } else {
      imageContainer.appendChild(colorDiv());
    }

    const ctaBtn = document.createElement('button');
    ctaBtn.className = 'service-cta';
    ctaBtn.textContent = 'Learn More';
    ctaBtn.setAttribute('aria-label', `Learn more about ${item.name}`);
    if (bridge) {
      ctaBtn.addEventListener('click', () => {
        bridge.sendMessage(`Tell me more about ${item.name}`);
      });
    }
    imageContainer.appendChild(ctaBtn);

    card.appendChild(imageContainer);

    const content = document.createElement('div');
    content.className = 'service-content';
    content.style.cssText = `background:${theme?.bg ?? '#1a1a1a'};color:${theme?.fg ?? '#fff'}`;

    if (item.category) {
      const badge = document.createElement('span');
      badge.className = 'service-badge';
      badge.textContent = item.category;
      content.appendChild(badge);
    }

    const name = document.createElement('h3');
    name.className = 'service-name';
    name.textContent = item.name;
    content.appendChild(name);

    const desc = document.createElement('p');
    desc.className = 'service-desc';
    desc.textContent = item.description;
    content.appendChild(desc);

    card.appendChild(content);
    carousel.appendChild(card);
  });

  wrapper.appendChild(carousel);

  const fade = document.createElement('div');
  fade.className = 'carousel-fade';
  fade.style.cssText = `position:absolute;top:0;right:0;height:100%;width:60px;background:linear-gradient(to right,transparent,${theme?.bg ?? '#1a1a1a'}cc);pointer-events:none;border-radius:0 10px 10px 0;`;
  wrapper.appendChild(fade);

  const leftArrow = document.createElement('button');
  leftArrow.className = 'carousel-arrow carousel-arrow-left';
  leftArrow.innerHTML = '&#9664;';
  leftArrow.setAttribute('aria-label', 'Scroll left');
  leftArrow.style.display = 'none';

  const rightArrow = document.createElement('button');
  rightArrow.className = 'carousel-arrow carousel-arrow-right';
  rightArrow.innerHTML = '&#9654;';
  rightArrow.setAttribute('aria-label', 'Scroll right');

  const updateArrows = () => {
    const scrollLeft = carousel.scrollLeft;
    const scrollWidth = carousel.scrollWidth;
    const clientWidth = carousel.clientWidth;
    leftArrow.style.display = scrollLeft <= 1 ? 'none' : 'flex';
    rightArrow.style.display = scrollLeft + clientWidth >= scrollWidth - 1 ? 'none' : 'flex';
  };

  const scrollByCard = (direction) => {
    const cardWidth = 220 + 16;
    carousel.scrollBy({ left: direction * cardWidth, behavior: 'smooth' });
  };

  leftArrow.addEventListener('click', () => scrollByCard(-1));
  rightArrow.addEventListener('click', () => scrollByCard(1));

  leftArrow.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      scrollByCard(-1);
    }
  });

  rightArrow.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      scrollByCard(1);
    }
  });

  carousel.addEventListener('scroll', updateArrows);

  wrapper.appendChild(leftArrow);
  wrapper.appendChild(rightArrow);

  block.appendChild(wrapper);

  updateArrows();

  if (bridge) {
    bridge.reportSize(block.offsetWidth, block.offsetHeight);
    let resizeTimer;
    const ro = new ResizeObserver(() => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        bridge.reportSize(block.offsetWidth, block.offsetHeight);
        updateArrows();
      }, 150);
    });
    ro.observe(block);
  }
}
