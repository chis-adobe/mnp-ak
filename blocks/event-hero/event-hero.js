import { getMetadata } from '../../scripts/ak.js';

export default async function init(el) {
  el.innerHTML = '';

  const title = getMetadata('og:title') || getMetadata('title');
  const eventDate = getMetadata('event-date');
  const eventTime = getMetadata('event-time');

  if (!title) return;

  const wrapper = document.createElement('div');
  wrapper.className = 'event-hero-wrapper';

  const h1 = document.createElement('h1');
  h1.textContent = title;
  wrapper.append(h1);

  const isPast = eventDate && new Date(eventDate) < new Date();

  if (isPast) {
    const notice = document.createElement('p');
    notice.className = 'event-hero-passed';
    notice.textContent = 'This event has passed';
    wrapper.append(notice);
  } else {
    const details = document.createElement('div');
    details.className = 'event-hero-details';

    if (eventDate) {
      const dateEl = document.createElement('span');
      dateEl.className = 'event-hero-date';
      dateEl.textContent = eventDate;
      details.append(dateEl);
    }

    if (eventTime) {
      const timeEl = document.createElement('span');
      timeEl.className = 'event-hero-time';
      timeEl.textContent = eventTime;
      details.append(timeEl);
    }

    wrapper.append(details);

    const btn = document.createElement('a');
    btn.href = '#event-registration';
    btn.className = 'event-hero-cta';
    btn.textContent = 'Register now';
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const reg = document.getElementById('event-registration');
      if (reg) reg.scrollIntoView({ behavior: 'smooth' });
    });
    wrapper.append(btn);
  }

  el.append(wrapper);
}
