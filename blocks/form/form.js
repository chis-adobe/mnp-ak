import { getMetadata } from '../../scripts/ak.js';
import { getPlaceholder } from '../../scripts/utils/placeholders.js';

function toColumnName(label) {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

// Parse form field rows (label | type | options) from a set of row elements.
function parseFieldRows(rows) {
  const fields = [];
  let supabaseUrl = 'https://wdgjvnbgtulfuevdtvjk.supabase.co';
  let supabaseKey = 'sb_publishable_z3Bo2By780HZIQxZ7cf9vg_iTNLg-Cx';

  rows.forEach((row) => {
    const cols = [...row.querySelectorAll(':scope > div')];
    if (cols.length < 1) return;
    const label = cols[0]?.textContent?.trim();
    const type = cols[1]?.textContent?.trim()?.toLowerCase() || 'text';

    // Legacy: a heading row is ignored here (plain headings live on the page).
    if (type === 'heading') return;

    if (type === 'config') {
      if (label === 'supabase-url') supabaseUrl = cols[2]?.textContent?.trim() || supabaseUrl;
      if (label === 'supabase-key') supabaseKey = cols[2]?.textContent?.trim() || supabaseKey;
      return;
    }

    fields.push({ label, type, options: cols[2]?.textContent || '' });
  });

  return { fields, supabaseUrl, supabaseKey };
}

// If the block holds a single reference to a /forms/* fragment, fetch its field rows.
async function resolveFormFragment(el) {
  const text = el.textContent.trim();
  const link = el.querySelector('a');
  const ref = (link && link.getAttribute('href')) || text;
  if (!/^\/forms\//.test(ref)) return null;

  try {
    const resp = await fetch(`${ref}.plain.html`);
    if (!resp.ok) return null;
    const html = await resp.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const block = doc.querySelector('.form, .contact-form');
    if (!block) return null;
    return [...block.querySelectorAll(':scope > div')];
  } catch {
    return null;
  }
}

// Read the city from an address fragment (same shape office-info/mini-hero use).
async function getCityFromFragment(fragmentPath) {
  try {
    const resp = await fetch(`${fragmentPath}.plain.html`);
    if (!resp.ok) return null;
    const html = await resp.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const cityRow = [...doc.querySelectorAll('div > div')].find((row) => {
      const firstCell = row.querySelector(':scope > div:first-child');
      return firstCell && firstCell.textContent.trim().toLowerCase() === 'city';
    });
    const valueCell = cityRow?.querySelector(':scope > div:nth-child(2)');
    return valueCell ? valueCell.textContent.trim() : null;
  } catch {
    return null;
  }
}

// Resolve the office city across all runmodes:
//   1. page `city` metadata (standalone EDS office page)
//   2. `address-fragment` metadata (office page that defers its address)
//   3. bridge tool-result (llm-app embed — first office in structuredContent)
async function resolveCity(bridge) {
  let city = getMetadata('city');
  if (city) return city;

  const addressFragment = getMetadata('address-fragment');
  if (addressFragment) {
    city = await getCityFromFragment(addressFragment);
    if (city) return city;
  }

  if (bridge && !bridge.hostContext?.preview) {
    try {
      const result = await bridge.toolResult;
      const structuredContent = result?.structuredContent || result;
      const office = structuredContent?.offices?.[0] || structuredContent?.office;
      if (office?.city) return office.city;
      if (structuredContent?.office_name) return structuredContent.office_name;
    } catch {
      /* no tool result available */
    }
  }

  return '';
}

function buildField({ label, type, options }) {
  const fieldWrapper = document.createElement('div');
  fieldWrapper.className = 'form-field';

  const labelEl = document.createElement('label');
  labelEl.textContent = label;

  let input;
  if (type === 'textarea') {
    input = document.createElement('textarea');
    input.rows = 4;
  } else if (type === 'select') {
    input = document.createElement('select');
    const opts = options?.split(',') || ['Select One'];
    opts.forEach((opt) => {
      const option = document.createElement('option');
      option.textContent = opt.trim();
      input.append(option);
    });
  } else if (type === 'checkbox') {
    input = document.createElement('input');
    input.type = 'checkbox';
    fieldWrapper.classList.add('form-field-checkbox');
  } else {
    input = document.createElement('input');
    input.type = type;
  }

  input.name = label.toLowerCase().replace(/[^a-z]/g, '-');
  input.placeholder = label;
  labelEl.setAttribute('for', input.name);
  input.id = input.name;

  fieldWrapper.append(labelEl, input);
  return fieldWrapper;
}

export default async function init(el, bridge) {
  if (bridge) bridge.applyHostStyles();

  // Fields come either from a /forms/* fragment reference or from inline rows.
  let rows = await resolveFormFragment(el);
  if (!rows) rows = [...el.querySelectorAll(':scope > div')];

  el.innerHTML = '';

  const { fields, supabaseUrl, supabaseKey } = parseFieldRows(rows);

  // The office-header field is a dynamic heading, not an input — pull it out
  // and compose its text from the resolved office city.
  const headerField = fields.find((f) => f.type === 'office-header');
  const inputFields = fields.filter((f) => f.type !== 'office-header');

  const city = await resolveCity(bridge);

  if (headerField && city) {
    const heading = document.createElement('h3');
    heading.className = 'form-office-header';
    const template = await getPlaceholder('contact-team', 'Contact our {city} team today');
    heading.textContent = template.replace('{city}', city);
    el.append(heading);
  }

  const form = document.createElement('form');
  form.className = 'form-fields';
  inputFields.forEach((field) => form.append(buildField(field)));

  const submitBtn = document.createElement('button');
  submitBtn.type = 'submit';
  submitBtn.textContent = 'Submit';
  submitBtn.className = 'form-submit';
  form.append(submitBtn);

  const status = document.createElement('p');
  status.className = 'form-status';
  status.hidden = true;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!supabaseUrl || !supabaseKey) {
      // eslint-disable-next-line no-console
      console.warn('[form] Supabase config missing');
      return;
    }

    const COLUMN_ALIASES = { e_mail: 'email', e_mail_address: 'email', email_address: 'email' };
    const data = {};
    new FormData(form).forEach((value, key) => {
      const col = toColumnName(key);
      data[COLUMN_ALIASES[col] || col] = value;
    });
    if (city) data.office_name = city;

    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';
    status.hidden = true;

    try {
      const resp = await fetch(`${supabaseUrl}/rest/v1/contact_requests`, {
        method: 'POST',
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify(data),
      });

      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

      form.reset();
      status.textContent = 'Thank you, your message has been sent.';
      status.className = 'form-status form-status-success';
    } catch {
      status.textContent = 'Something went wrong. Please try again.';
      status.className = 'form-status form-status-error';
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit';
      status.hidden = false;
    }
  });

  el.append(form, status);

  if (bridge) {
    bridge.reportSize(el.offsetWidth, el.offsetHeight);
    const ro = new ResizeObserver(() => bridge.reportSize(el.offsetWidth, el.offsetHeight));
    ro.observe(el);
  }
}
