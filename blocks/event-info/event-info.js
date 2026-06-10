import { getMetadata } from '../../scripts/ak.js';

export default async function init(el) {
  el.innerHTML = '';

  const eventDate = getMetadata('event-date');
  const eventTime = getMetadata('event-time');
  const agenda = getMetadata('agenda');
  const location = getMetadata('location');

  const wrapper = document.createElement('div');
  wrapper.className = 'event-info-wrapper';

  if (eventDate) {
    const row = document.createElement('div');
    row.className = 'event-info-row';
    row.innerHTML = `<strong>Date</strong><span>${eventDate}</span>`;
    wrapper.append(row);
  }

  if (eventTime) {
    const row = document.createElement('div');
    row.className = 'event-info-row';
    row.innerHTML = `<strong>Time</strong><span>${eventTime}</span>`;
    wrapper.append(row);
  }

  if (agenda) {
    const row = document.createElement('div');
    row.className = 'event-info-row event-info-agenda';
    row.innerHTML = `<strong>Agenda</strong><span>${agenda}</span>`;
    wrapper.append(row);
  }

  if (location) {
    const row = document.createElement('div');
    row.className = 'event-info-row';
    row.innerHTML = `<strong>Location</strong><span>${location}</span>`;
    wrapper.append(row);
  }

  el.append(wrapper);
}
