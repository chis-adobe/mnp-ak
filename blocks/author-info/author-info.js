export default async function init(el) {
  const rows = [...el.querySelectorAll(':scope > div')];
  const data = {};

  rows.forEach((row) => {
    const key = row.querySelector(':scope > div:first-child');
    const val = row.querySelector(':scope > div:nth-child(2)');
    if (key && val) {
      const field = key.textContent.trim().toLowerCase();
      const img = val.querySelector('img');
      if (img) {
        data[field] = img.getAttribute('src');
      } else if (field === 'profile') {
        data[field] = val.innerHTML;
      } else {
        data[field] = val.textContent.trim();
      }
    }
  });

  el.innerHTML = '';

  const wrapper = document.createElement('div');
  wrapper.className = 'author-info-wrapper';

  // Photo + details section
  const header = document.createElement('div');
  header.className = 'author-info-header';

  if (data.thumbnail) {
    const photoWrap = document.createElement('div');
    photoWrap.className = 'author-info-photo';
    const img = document.createElement('img');
    img.src = data.thumbnail;
    img.alt = data.name || '';
    img.loading = 'eager';
    photoWrap.append(img);
    header.append(photoWrap);
  }

  const details = document.createElement('div');
  details.className = 'author-info-details';

  // Name + certs heading
  const nameHeading = document.createElement('h2');
  const displayName = data.certifications
    ? `${data.name}, ${data.certifications}`
    : data.name;
  nameHeading.textContent = displayName || '';
  details.append(nameHeading);

  if (data.role) {
    const role = document.createElement('h3');
    role.className = 'author-info-role';
    role.textContent = data.role;
    details.append(role);
  }

  // Contact details
  const contacts = document.createElement('ul');
  contacts.className = 'author-info-contacts';

  if (data.phone) {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = `tel:${data.phone}`;
    a.textContent = `Phone: ${data.phone}`;
    li.append(a);
    contacts.append(li);
  }

  if (data['toll-free']) {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = `tel:${data['toll-free']}`;
    a.textContent = `Toll Free: ${data['toll-free']}`;
    li.append(a);
    contacts.append(li);
  }

  if (data.email) {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = `mailto:${data.email}`;
    a.textContent = `Email: ${data.email}`;
    li.append(a);
    contacts.append(li);
  }

  if (data.fax) {
    const li = document.createElement('li');
    li.textContent = `Fax: ${data.fax}`;
    contacts.append(li);
  }

  if (contacts.children.length) details.append(contacts);

  if (data.address) {
    const addr = document.createElement('p');
    addr.className = 'author-info-address';
    addr.textContent = data.address;
    details.append(addr);
  }

  header.append(details);
  wrapper.append(header);

  // Profile bio
  if (data.profile) {
    const bio = document.createElement('div');
    bio.className = 'author-info-bio';
    bio.innerHTML = data.profile;
    wrapper.append(bio);
  }

  el.append(wrapper);
}
