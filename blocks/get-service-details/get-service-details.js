// Sample data for standalone/preview mode
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

const PALETTE = ['#007bff','#6d6d6d','#cf4a0c','#0a3343','#212529'];

function getThemedCardBg(palette) {
  if (!palette || !palette[0]) return null;
  let hex = palette[0].replace('#', '');
  if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
  if (hex.length !== 6) return null;
  let [r, g, b] = [parseInt(hex.slice(0,2),16), parseInt(hex.slice(2,4),16), parseInt(hex.slice(4,6),16)];
  if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
  const lum = (c) => { const s=c/255; return s<=0.03928?s/12.92:Math.pow((s+0.055)/1.055,2.4); };
  const relLum = (r,g,b) => 0.2126*lum(r)+0.7152*lum(g)+0.0722*lum(b);
  if (relLum(r,g,b) <= 0.12) return { bg: `#${hex}`, fg: '#ffffff' };
  let lo=0, hi=1;
  for (let i=0; i<20; i++) {
    const m=(lo+hi)/2;
    if (relLum(Math.round(r*m),Math.round(g*m),Math.round(b*m)) > 0.12) hi=m; else lo=m;
  }
  const dr=Math.round(r*lo), dg=Math.round(g*lo), db=Math.round(b*lo);
  return {
    bg:`#${dr.toString(16).padStart(2,'0')}${dg.toString(16).padStart(2,'0')}${db.toString(16).padStart(2,'0')}`,
    fg:'#ffffff'
  };
}

export default async function decorate(block, bridge) {
  let service;

  if (bridge) {
    bridge.applyHostStyles();
    const isPreview = bridge.hostContext?.preview === true;
    if (isPreview) {
      service = SAMPLE_DATA[0];
    } else {
      const _result = await bridge.toolResult;
      const structuredContent = _result?.structuredContent || _result;
      service = structuredContent;
    }
  } else {
    service = SAMPLE_DATA[0];
  }

  block.textContent = '';

  const theme = getThemedCardBg(PALETTE);

  const card = document.createElement('div');
  card.className = 'service-card';

  const imageSection = document.createElement('div');
  imageSection.className = 'service-image';

  if (service.image_url) {
    const img = document.createElement('img');
    img.src = service.image_url;
    img.alt = service.name || 'Service image';
    img.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;';

    const fallbackColor = '#378ef0';
    img.onerror = () => {
      const colorDiv = document.createElement('div');
      colorDiv.style.cssText = `width:100%;height:100%;background-color:${fallbackColor};`;
      img.parentNode.replaceChild(colorDiv, img);
    };

    imageSection.appendChild(img);
  } else {
    const colorDiv = document.createElement('div');
    colorDiv.style.cssText = 'width:100%;height:100%;background-color:#378ef0;';
    imageSection.appendChild(colorDiv);
  }

  const ctaBtn = document.createElement('button');
  ctaBtn.className = 'cta-btn';
  ctaBtn.textContent = 'Contact Our Team';
  if (bridge) {
    ctaBtn.addEventListener('click', () => {
      bridge.sendMessage(`I'd like to contact your team about ${service.name}`);
    });
  }
  imageSection.appendChild(ctaBtn);

  card.appendChild(imageSection);

  const contentSection = document.createElement('div');
  contentSection.className = 'service-content';
  contentSection.style.cssText = `background:${theme?.bg ?? '#1a1a1a'};color:${theme?.fg ?? '#fff'}`;

  const nameHeading = document.createElement('h3');
  nameHeading.className = 'service-name';
  nameHeading.textContent = service.name || '';
  contentSection.appendChild(nameHeading);

  const description = document.createElement('p');
  description.className = 'service-description';
  description.textContent = service.description || '';
  contentSection.appendChild(description);

  if (service.category) {
    const categoryBadge = document.createElement('span');
    categoryBadge.className = 'category-badge';
    categoryBadge.textContent = service.category;
    contentSection.appendChild(categoryBadge);
  }

  card.appendChild(contentSection);
  block.appendChild(card);

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