export default async function init(el) {
  const rows = [...el.querySelectorAll(':scope > div')];
  const data = {};

  rows.forEach((row) => {
    const key = row.querySelector(':scope > div:first-child')?.textContent?.trim().toLowerCase();
    const valCell = row.querySelector(':scope > div:nth-child(2)');
    if (!key || !valCell) return;
    const img = valCell.querySelector('img');
    if (img) {
      data[key] = img.getAttribute('src');
    } else if (key === 'profile') {
      const paras = valCell.querySelectorAll('p');
      data[key] = paras.length
        ? [...paras].map((p) => p.textContent.trim()).filter(Boolean)
        : [valCell.textContent.trim()];
    } else {
      data[key] = valCell.textContent.trim();
    }
  });

  el.innerHTML = '';

  const wrapper = document.createElement('div');
  wrapper.className = 'author-data-layout';

  const left = document.createElement('div');
  left.className = 'author-data-photo';
  if (data.thumbnail) {
    const img = document.createElement('img');
    img.src = data.thumbnail;
    img.alt = data.name || '';
    img.loading = 'eager';
    left.append(img);
  }

  const right = document.createElement('div');
  right.className = 'author-data-details';

  const title = document.createElement('h2');
  const fullName = data.certifications ? `${data.name}, ${data.certifications}` : data.name;
  title.textContent = fullName || '';
  right.append(title);

  if (data.role) {
    const role = document.createElement('p');
    role.className = 'author-data-role';
    role.textContent = data.role;
    right.append(role);
  }

  const divider1 = document.createElement('hr');
  right.append(divider1);

  const contactWrapper = document.createElement('div');
  contactWrapper.className = 'author-data-contact-wrapper';

  const contactList = document.createElement('ul');
  contactList.className = 'author-data-contact';

  if (data.phone) {
    const li = document.createElement('li');
    li.innerHTML = `<a href="tel:${data.phone}">Direct: ${data.phone}</a>`;
    contactList.append(li);
  }
  if (data['toll-free']) {
    const li = document.createElement('li');
    li.innerHTML = `<a href="tel:${data['toll-free']}">Toll-Free: ${data['toll-free']}</a>`;
    contactList.append(li);
  }
  if (data.email) {
    const li = document.createElement('li');
    li.innerHTML = `<a href="mailto:${data.email}">Email: ${data.email}</a>`;
    contactList.append(li);
  }
  if (data.fax) {
    const li = document.createElement('li');
    li.textContent = `Fax: ${data.fax}`;
    contactList.append(li);
  }
  contactWrapper.append(contactList);

  if (data.address) {
    const addr = document.createElement('p');
    addr.className = 'author-data-address';
    addr.textContent = data.address;
    contactWrapper.append(addr);
  }

  right.append(contactWrapper);

  const divider2 = document.createElement('hr');
  right.append(divider2);

  if (data.profile) {
    const profile = document.createElement('div');
    profile.className = 'author-data-profile';
    const paras = Array.isArray(data.profile) ? data.profile : [data.profile];
    paras.forEach((para) => {
      const p = document.createElement('p');
      p.textContent = para;
      profile.append(p);
    });
    right.append(profile);
  }

  wrapper.append(left, right);
  el.append(wrapper);
}
