// Sample data for standalone/preview mode.
// In production, data comes dynamically from bridge.toolResult.
const SAMPLE_DATA = {
  "name": "Value Creation",
  "description": "Unlock more value from your business, discover opportunities for improvement, and achieve better results with a tailored value creation strategy.",
  "image_url": "https://www.mnp.ca/-/media/images/mnp/service/consulting/subpages/4101-25-corp-consulting-sub-pages---value-creation.webp?iar=0&hash=78264711BCEB94C22A151347BEDF7983",
  "category": "Consulting"
};

// Brand palette from BuildWidgetRequest.
const PALETTE = ['#007bff','#cf4a0c','#0a3343','#6d6d6d','#212529'];

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
    const mid=(lo+hi)/2;
    if (relLum(Math.round(r*mid),Math.round(g*mid),Math.round(b*mid)) > 0.12) hi=mid; else lo=mid;
  }
  const dr=Math.round(r*lo), dg=Math.round(g*lo), db=Math.round(b*lo);
  return { bg:`#${dr.toString(16).padStart(2,'0')}${dg.toString(16).padStart(2,'0')}${db.toString(16).padStart(2,'0')}`, fg:'#ffffff' };
}

const theme = getThemedCardBg(PALETTE);

export default async function decorate(block, bridge) {
  let service;

  if (bridge) {
    bridge.applyHostStyles();
    const isPreview = bridge.hostContext?.preview === true;
    if (isPreview) {
      service = SAMPLE_DATA;
    } else {
      const _result = await bridge.toolResult;
      const structuredContent = _result?.structuredContent || _result;
      service = structuredContent || SAMPLE_DATA;
    }
  } else {
    service = SAMPLE_DATA;
  }

  block.textContent = '';
  renderService(block, service, bridge);

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

function renderService(block, service, bridge) {
  const card = document.createElement('div');
  card.className = 'service-card';

  // Image container (left side)
  const imageContainer = document.createElement('div');
  imageContainer.className = 'service-image';

  const CARD_COLORS = ['#378ef0','#9256d9','#0fb5ae','#e68619','#d83790','#2dca72','#4046ca','#72b340'];
  const fallbackColor = CARD_COLORS[0];
  const colorDiv = () => {
    const d = document.createElement('div');
    d.style.cssText = `width:100%;height:100%;background-color:${fallbackColor};`;
    return d;
  };

  if (service.image_url) {
    const img = document.createElement('img');
    img.src = service.image_url;
    img.alt = service.name || 'Service image';
    img.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;';
    img.onerror = () => img.parentNode.replaceChild(colorDiv(), img);
    imageContainer.appendChild(img);

    // CTA button on image
    const ctaOnImage = document.createElement('button');
    ctaOnImage.className = 'cta-on-image';
    ctaOnImage.textContent = 'Contact Our Team';
    ctaOnImage.setAttribute('aria-label', 'Contact our team about this service');
    if (bridge) {
      ctaOnImage.addEventListener('click', () => {
        bridge.sendMessage(`I'd like to contact your team about ${service.name || 'this service'}`);
      });
    }
    imageContainer.appendChild(ctaOnImage);
  } else {
    imageContainer.appendChild(colorDiv());
  }

  card.appendChild(imageContainer);

  // Content container (right side)
  const content = document.createElement('div');
  content.className = 'service-content';
  content.style.cssText = `background:${theme?.bg ?? '#1a1a1a'};color:${theme?.fg ?? '#fff'}`;

  // Category badge
  if (service.category) {
    const badge = document.createElement('span');
    badge.className = 'category-badge';
    badge.textContent = service.category;
    content.appendChild(badge);
  }

  // Service name
  const name = document.createElement('h3');
  name.className = 'service-name';
  name.textContent = service.name || 'Service';
  content.appendChild(name);

  // Description
  if (service.description) {
    const desc = document.createElement('p');
    desc.className = 'service-description';
    desc.textContent = service.description;
    content.appendChild(desc);
  }

  // Contact info (if available)
  if (service.contact_name || service.contact_phone) {
    const contactInfo = document.createElement('div');
    contactInfo.className = 'contact-info';

    if (service.contact_name) {
      const contactName = document.createElement('p');
      contactName.className = 'contact-name';
      contactName.textContent = `Contact: ${service.contact_name}`;
      contactInfo.appendChild(contactName);
    }

    if (service.contact_phone) {
      const contactPhone = document.createElement('p');
      contactPhone.className = 'contact-phone';
      contactPhone.textContent = service.contact_phone;
      contactInfo.appendChild(contactPhone);
    }

    content.appendChild(contactInfo);
  }

  // Capabilities (if available)
  if (service.capabilities && service.capabilities.length > 0) {
    const capList = document.createElement('ul');
    capList.className = 'capabilities-list';
    service.capabilities.slice(0, 3).forEach(cap => {
      const li = document.createElement('li');
      li.textContent = cap;
      capList.appendChild(li);
    });
    content.appendChild(capList);
  }

  card.appendChild(content);
  block.appendChild(card);
}