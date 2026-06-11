// Sample data for standalone EDS preview (no bridge).
// In production, data comes dynamically from bridge.toolResult.
const SAMPLE_DATA = [];

// Brand palette from BuildWidgetRequest.
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
  return { bg:`#${dr.toString(16).padStart(2,'0')}${dg.toString(16).padStart(2,'0')}${db.toString(16).padStart(2,'0')}`, fg:'#ffffff' };
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
      const _result = await bridge.toolResult;
      const structuredContent = _result?.structuredContent || _result;
      // structuredContent.offices — bare array outputSchema; key derived from actionName "find_office"
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
  pinIcon.innerHTML = '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>';
  card.appendChild(pinIcon);

  const heading = document.createElement('h3');
  heading.textContent = 'Find an office near you';
  card.appendChild(heading);

  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'Enter city or province...';
  input.className = 'search-input';
  card.appendChild(input);

  const button = document.createElement('button');
  button.className = 'search-button';
  button.textContent = 'Find Offices';
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
  container.className = 'offices-container';

  const displayOffices = offices.slice(0, 2);

  displayOffices.forEach(office => {
    const card = document.createElement('div');
    card.className = 'office-card';
    card.style.cssText = `background:${theme?.bg ?? '#1a3a5c'};color:${theme?.fg ?? '#fff'}`;

    const pinCircle = document.createElement('div');
    pinCircle.className = 'pin-circle';
    pinCircle.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>';
    card.appendChild(pinCircle);

    const name = document.createElement('div');
    name.className = 'office-name';
    name.textContent = office.name || 'Office';
    card.appendChild(name);

    const address = document.createElement('div');
    address.className = 'office-address';
    address.textContent = office.address || '';
    card.appendChild(address);

    if (office.phone) {
      const phone = document.createElement('div');
      phone.className = 'office-phone';
      phone.textContent = office.phone;
      card.appendChild(phone);
    }

    if (office.toll_free) {
      const tollFree = document.createElement('div');
      tollFree.className = 'office-toll-free';
      tollFree.textContent = `Toll-free: ${office.toll_free}`;
      card.appendChild(tollFree);
    }

    const ctaBtn = document.createElement('button');
    ctaBtn.className = 'directions-btn';
    ctaBtn.textContent = 'Get Directions';
    if (bridge && office.address) {
      ctaBtn.addEventListener('click', () => {
        bridge.sendMessage(`Get directions to ${office.name} at ${office.address}`);
      });
    }
    card.appendChild(ctaBtn);

    container.appendChild(card);
  });

  block.appendChild(container);
}