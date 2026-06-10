export default async function init(el) {
  el.id = 'event-registration';
  const rows = [...el.querySelectorAll(':scope > div')];
  el.innerHTML = '';

  const wrapper = document.createElement('div');
  wrapper.className = 'event-registration-wrapper';

  const h2 = document.createElement('h2');
  h2.textContent = 'Register now';
  wrapper.append(h2);

  const form = document.createElement('form');
  form.className = 'event-registration-form';

  const fields = [
    { name: 'firstName', label: 'First Name', type: 'text' },
    { name: 'lastName', label: 'Last Name', type: 'text' },
    { name: 'email', label: 'Email', type: 'email' },
    { name: 'jobTitle', label: 'Job Title', type: 'text' },
    { name: 'role', label: 'Role', type: 'select',
      options: ['Owner/Executive', 'Director', 'Manager', 'Other'] },
    { name: 'organization', label: 'Organization', type: 'text' },
    { name: 'city', label: 'City', type: 'text' },
  ];

  fields.forEach((field) => {
    const group = document.createElement('div');
    group.className = 'event-registration-field';

    const label = document.createElement('label');
    label.textContent = field.label;
    label.setAttribute('for', field.name);
    group.append(label);

    if (field.type === 'select') {
      const select = document.createElement('select');
      select.name = field.name;
      select.id = field.name;
      field.options.forEach((opt) => {
        const option = document.createElement('option');
        option.value = opt;
        option.textContent = opt;
        select.append(option);
      });
      group.append(select);
    } else {
      const input = document.createElement('input');
      input.type = field.type;
      input.name = field.name;
      input.id = field.name;
      input.required = true;
      group.append(input);
    }

    form.append(group);
  });

  const submit = document.createElement('button');
  submit.type = 'submit';
  submit.textContent = 'Register Now';
  form.append(submit);

  wrapper.append(form);
  el.append(wrapper);
}
