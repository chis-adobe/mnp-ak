function toColumnName(label) {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

export default async function init(el, bridge) {
  if (bridge) bridge.applyHostStyles();

  const rows = [...el.querySelectorAll(':scope > div')];
  el.innerHTML = '';

  const heading = document.createElement('h3');
  heading.className = 'contact-form-heading';

  const form = document.createElement('form');
  form.className = 'contact-form-fields';

  let supabaseUrl = 'https://wdgjvnbgtulfuevdtvjk.supabase.co';
  let supabaseKey = 'sb_publishable_z3Bo2By780HZIQxZ7cf9vg_iTNLg-Cx';
  let officeNameFromBridge = '';

  if (bridge) {
    bridge.toolResult.then((result) => {
      const sc = result?.structuredContent || result;
      officeNameFromBridge = sc?.office_name || '';
    });
  }

  rows.forEach((row) => {
    const cols = [...row.querySelectorAll(':scope > div')];
    if (cols.length >= 2) {
      const label = cols[0]?.textContent?.trim();
      const type = cols[1]?.textContent?.trim()?.toLowerCase() || 'text';

      if (type === 'heading') {
        heading.textContent = label;
        return;
      }

      if (type === 'config') {
        if (label === 'supabase-url') supabaseUrl = cols[2]?.textContent?.trim() || '';
        if (label === 'supabase-key') supabaseKey = cols[2]?.textContent?.trim() || '';
        return;
      }

      const fieldWrapper = document.createElement('div');
      fieldWrapper.className = 'contact-form-field';

      const labelEl = document.createElement('label');
      labelEl.textContent = label;

      let input;
      if (type === 'textarea') {
        input = document.createElement('textarea');
        input.rows = 4;
      } else if (type === 'select') {
        input = document.createElement('select');
        const options = cols[2]?.textContent?.split(',') || ['Select One'];
        options.forEach((opt) => {
          const option = document.createElement('option');
          option.textContent = opt.trim();
          input.append(option);
        });
      } else if (type === 'checkbox') {
        input = document.createElement('input');
        input.type = 'checkbox';
        fieldWrapper.classList.add('contact-form-field-checkbox');
      } else {
        input = document.createElement('input');
        input.type = type;
      }

      input.name = label.toLowerCase().replace(/[^a-z]/g, '-');
      input.placeholder = label;
      labelEl.setAttribute('for', input.name);
      input.id = input.name;

      fieldWrapper.append(labelEl, input);
      form.append(fieldWrapper);
    }
  });

  const submitBtn = document.createElement('button');
  submitBtn.type = 'submit';
  submitBtn.textContent = 'Submit';
  submitBtn.className = 'contact-form-submit';
  form.append(submitBtn);

  const status = document.createElement('p');
  status.className = 'contact-form-status';
  status.hidden = true;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!supabaseUrl || !supabaseKey) {
      // eslint-disable-next-line no-console
      console.warn('[contact-form] Supabase config missing');
      return;
    }

    const data = {};
    new FormData(form).forEach((value, key) => {
      data[toColumnName(key)] = value;
    });
    if (officeNameFromBridge) data.office_name = officeNameFromBridge;

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
      status.className = 'contact-form-status contact-form-status-success';
    } catch {
      status.textContent = 'Something went wrong. Please try again.';
      status.className = 'contact-form-status contact-form-status-error';
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit';
      status.hidden = false;
    }
  });

  el.append(heading, form, status);

  if (bridge) {
    bridge.reportSize(el.offsetWidth, el.offsetHeight);
    const ro = new ResizeObserver(() => bridge.reportSize(el.offsetWidth, el.offsetHeight));
    ro.observe(el);
  }
}
