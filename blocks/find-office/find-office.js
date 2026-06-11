// Sample data for standalone EDS preview (no bridge).
// In production, data comes dynamically from bridge.toolResult.
const SAMPLE_DATA = [
  {
    name: 'MNP Calgary Downtown',
    address: '1500, 640 - 5th Avenue SW',
    city: 'Calgary',
    province: 'AB',
    phone: '403-263-3385',
    toll_free: '1-877-500-0792'
  },
  {
    name: 'MNP Calgary North',
    address: '200, 5403 Crowchild Trail NW',
    city: 'Calgary',
    province: 'AB',
    phone: '403-263-3385',
    toll_free: '1-877-500-0792'
  }
];

// Brand palette from BuildWidgetRequest.
// getThemedCardBg() darkens palette[0] to luminance ≤ 0.12 for WCAG AA contrast.
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
    const m=(lo+hi)/2;
    if (relLum(Math.round(r*m),Math.round(g*m),Math.round(b*m)) > 0.12) hi=m; else lo=m;
  }
  const dr=Math.round(r*lo), dg=Math.round(g*lo), db=Math.round(b*lo);
  return {
    bg:`#${dr.toString(16).padStart(2,'0')}${dg.toString(16).padStart(2,'0')}${db.toString(16).padStart(2,'0')}`,
    fg:'#ffffff'
  };
}

const theme = getThemedCardBg(PALETTE);

export default async function decorate(block, bridge) {
  let offices;

  if (bridge) {
    bridge.applyHostStyles();
    const isPreview = bridge.hostContext?.preview === true;
    if (isPreview) {
      offices = SAMPLE_DATA;
    } else {
      // structuredContent.offices — bare array outputSchema; key derived from actionName "find_office"
      const _result = await bridge.toolResult;
      const structuredContent = _result?.structuredContent || _result;
      offices = structuredContent?.offices || [];
    }
  } else {
    offices = SAMPLE_DATA;
  }

  block.textContent = '';
  
  if (!offices || offices.length === 0) {
    renderSearchCard(block, bridge);
  } else {
    renderOffices(block, offices, bridge);
  }

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

function renderSearchCard(block, bridge) {
  const card = document.createElement('div');
  card.className = 'search-card';
  card.style.cssText = `background:${theme?.bg ?? '#1a3a5c'};color:${theme?.fg ?? '#fff'}`;

  const pinIcon = document.createElement('div');
  pinIcon.className = 'pin-icon';
  pinIcon.innerHTML = `<svg fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>`;
  card.appendChild(pinIcon);

  const heading = document.createElement('h2');
  heading.textContent = 'Find an office near you';
  card.appendChild(heading);

  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'Enter city or province...';
  input.setAttribute('aria-label', 'City or province');
  card.appendChild(input);

  const button = document.createElement('button');
  button.textContent = 'Find Offices';
  button.setAttribute('aria-label', 'Search for offices');
  
  if (bridge) {
    button.addEventListener('click', () => {
      const query = input.value.trim();
      if (query) {
        bridge.sendMessage(`Find offices in ${query}`);
      }
    });
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const query = input.value.trim();
        if (query) {
          bridge.sendMessage(`Find offices in ${query}`);
        }
      }
    });
  }
  
  card.appendChild(button);
  block.appendChild(card);
}

function renderOffices(block, offices, bridge) {
  const container = document.createElement('div');
  container.className = 'results-container';

  const displayOffices = offices.slice(0, 2);

  displayOffices.forEach((office) => {
    const card = document.createElement('div');
    card.className = 'office-card';
    card.style.cssText = `background:${theme?.bg ?? '#1a3a5c'};color:${theme?.fg ?? '#fff'}`;

    const pinCircle = document.createElement('div');
    pinCircle.className = 'pin-circle';
    pinCircle.innerHTML = `<svg fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>`;
    card.appendChild(pinCircle);

    const name = document.createElement('div');
    name.className = 'office-name';
    name.textContent = office.name || '';
    card.appendChild(name);

    const address = document.createElement('div');
    address.className = 'office-address';
    const fullAddress = [office.address, office.city, office.province].filter(Boolean).join(', ');
    address.textContent = fullAddress;
    card.appendChild(address);

    if (office.phone) {
      const phone = document.createElement('a');
      phone.className = 'office-phone';
      phone.href = `tel:${office.phone.replace(/[^0-9+]/g, '')}`;
      phone.textContent = office.phone;
      card.appendChild(phone);
    }

    if (office.toll_free) {
      const tollFree = document.createElement('div');
      tollFree.className = 'office-hours';
      tollFree.textContent = `Toll-free: ${office.toll_free}`;
      card.appendChild(tollFree);
    }

    container.appendChild(card);
  });

  block.appendChild(container);
}