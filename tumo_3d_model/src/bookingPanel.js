import { indoorState } from './ui.js';
import { getVenueNameForRoom, isAiSupportedRoom } from './roomVenues.js';
import { previewBooking, createBooking, isBookingEnabled, getToken } from './bookingApi.js';

let built = false;
let busy = false;
let lastPreview = null;
let submitted = false;

function el(id) {
  return document.getElementById(id);
}

function getEls() {
  return {
    section: el('furnish-section-booking'),
    roomLabel: el('booking-room-label'),
    status: el('booking-status'),
    body: el('booking-body'),
    title: el('bk-title'),
    type: el('bk-type'),
    attendees: el('bk-attendees'),
    date: el('bk-date'),
    start: el('bk-start'),
    end: el('bk-end'),
    calc: el('bk-calc'),
    results: el('bk-results'),
    submit: el('bk-submit'),
  };
}

function fmt(value) {
  const n = Number(value);
  if (Number.isNaN(n)) return '0.00';
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function currentRoom() {
  return indoorState.activeRoomData || null;
}

function isBookableRoom(room) {
  return Boolean(room && isAiSupportedRoom(room.roomId));
}

function getLayoutItems() {
  return typeof window.__spaceflowGetLayoutItems === 'function'
    ? window.__spaceflowGetLayoutItems()
    : [];
}

function setStatus(text, tone = '') {
  const { status } = getEls();
  if (!status) return;
  status.textContent = text || '';
  status.className = `booking-status${tone ? ` booking-status--${tone}` : ''}`;
}

function setBusy(next) {
  busy = next;
  const { calc, submit } = getEls();
  if (calc) calc.disabled = busy;
  updateSubmitState();
  if (calc) calc.textContent = busy ? 'Calculating…' : 'Calculate inventory & price';
}

function updateSubmitState() {
  const { submit } = getEls();
  if (!submit) return;
  const room = currentRoom();
  submit.disabled = busy || !lastPreview || !isBookableRoom(room) || !getToken();
}

function buildPayload() {
  const { title, type, attendees, date, start, end } = getEls();
  const room = currentRoom();
  return {
    three_d_room_id: room?.roomId,
    title: (title?.value || '').trim(),
    event_type: type?.value || 'other',
    attendee_count: Math.max(1, Number(attendees?.value) || 1),
    requested_date: date?.value || '',
    start_time: start?.value ? `${start.value}:00` : '',
    end_time: end?.value ? `${end.value}:00` : '',
    items: getLayoutItems(),
  };
}

function validateForBooking(payload) {
  if (!payload.three_d_room_id) return 'Enter a bookable venue first.';
  if (!payload.requested_date) return 'Choose an event date.';
  if (!payload.start_time || !payload.end_time) return 'Choose a start and end time.';
  if (payload.end_time <= payload.start_time) return 'End time must be after start time.';
  if (payload.title.length < 3) return 'Add an event title (3+ characters).';
  return null;
}

function renderResults(preview) {
  const { results } = getEls();
  if (!results) return;
  if (!preview) {
    results.innerHTML = '';
    return;
  }

  const invLines = preview.lines
    .map((line) => {
      const shortfall = line.shortfall > 0;
      const meta = line.is_inventory
        ? `${line.available} available${shortfall ? ` · short ${line.shortfall}` : ''}`
        : 'no charge';
      return `
        <div class="bk-line${shortfall ? ' bk-line--short' : ''}">
          <div class="bk-line-main">
            <span class="bk-line-qty">${line.requested}×</span>
            <span class="bk-line-name">${escapeHtml(line.label)}</span>
          </div>
          <div class="bk-line-end">
            <span class="bk-line-meta">${meta}</span>
            <span class="bk-line-price">${line.is_inventory ? `€${fmt(line.line_total)}` : '—'}</span>
          </div>
        </div>`;
    })
    .join('');

  const venue = preview.venue;
  const venueLine = venue
    ? `<div class="bk-line">
         <div class="bk-line-main">
           <span class="bk-line-qty">1×</span>
           <span class="bk-line-name">${escapeHtml(venue.venue_name)} · ${fmt(venue.hours)}h</span>
         </div>
         <div class="bk-line-end">
           <span class="bk-line-meta">€${fmt(venue.rate_per_hour)}/h</span>
           <span class="bk-line-price">€${fmt(venue.total)}</span>
         </div>
       </div>`
    : '';

  const shortfallWarn = preview.has_shortfall
    ? `<div class="bk-warn">Some items exceed what's available for these dates. They'll be reserved up to the remaining stock — reduce quantities or change dates for a full booking.</div>`
    : '';

  results.innerHTML = `
    <div class="bk-results-head">
      <span>${preview.item_count} items placed</span>
      <span>Estimate</span>
    </div>
    <div class="bk-lines">
      ${venueLine}
      ${invLines || '<div class="bk-empty">No furniture placed yet — design the room, then recalculate.</div>'}
    </div>
    <div class="bk-totals">
      <div class="bk-total-row"><span>Inventory</span><span>€${fmt(preview.inventory_subtotal)}</span></div>
      <div class="bk-total-row"><span>Venue</span><span>€${fmt(preview.venue_subtotal)}</span></div>
      <div class="bk-total-row"><span>Services</span><span>€${fmt(preview.services_subtotal)}</span></div>
      <div class="bk-total-row"><span>Tax (${Math.round(Number(preview.tax_rate) * 100)}%)</span><span>€${fmt(preview.tax_amount)}</span></div>
      <div class="bk-total-row bk-total-row--grand"><span>Total</span><span>€${fmt(preview.total)}</span></div>
    </div>
    ${shortfallWarn}
  `;
}

async function runPreview({ silent = false } = {}) {
  const room = currentRoom();
  if (!isBookableRoom(room)) return;
  const payload = buildPayload();
  if (!payload.requested_date || !payload.start_time || !payload.end_time) {
    if (!silent) setStatus('Add date and times to calculate.', 'warn');
    return;
  }
  if (payload.end_time <= payload.start_time) {
    if (!silent) setStatus('End time must be after start time.', 'warn');
    return;
  }

  setBusy(true);
  setStatus('Checking live availability…');
  try {
    const preview = await previewBooking({
      three_d_room_id: payload.three_d_room_id,
      requested_date: payload.requested_date,
      start_time: payload.start_time,
      end_time: payload.end_time,
      event_type: payload.event_type,
      items: payload.items,
    });
    lastPreview = preview;
    renderResults(preview);
    setStatus(preview.has_shortfall ? 'Some items are limited for these dates.' : 'Availability confirmed.', preview.has_shortfall ? 'warn' : 'ok');
  } catch (error) {
    lastPreview = null;
    renderResults(null);
    setStatus(error.message || 'Could not check availability.', 'error');
  } finally {
    setBusy(false);
  }
}

async function submitBooking() {
  const payload = buildPayload();
  const validationError = validateForBooking(payload);
  if (validationError) {
    setStatus(validationError, 'warn');
    return;
  }
  if (!getToken()) {
    setStatus('Sign in on SpaceFlow to book.', 'error');
    return;
  }

  setBusy(true);
  setStatus('Submitting your booking…');
  try {
    const result = await createBooking(payload);
    submitted = true;
    lastPreview = result.preview || lastPreview;
    const requestId = result?.request?.id;
    renderResults(lastPreview);
    setStatus('Booking submitted! Track it under My Requests.', 'ok');
    const { submit } = getEls();
    if (submit) {
      submit.textContent = 'Booked ✓';
      submit.disabled = true;
    }
    window.parent?.postMessage(
      { type: 'BOOKING_CREATED', payload: { requestId, roomId: payload.three_d_room_id } },
      '*',
    );
  } catch (error) {
    setStatus(error.message || 'Could not submit booking.', 'error');
  } finally {
    busy = false;
    const { calc } = getEls();
    if (calc) {
      calc.disabled = false;
      calc.textContent = 'Calculate inventory & price';
    }
  }
}

export function refreshBookingContext() {
  const { roomLabel, body, title } = getEls();
  if (!roomLabel || !body) return;
  const room = currentRoom();

  if (!room) {
    roomLabel.textContent = 'Enter a venue to book';
    body.classList.add('booking-body--locked');
    setStatus('Step into a bookable room to start.', '');
    updateSubmitState();
    return;
  }

  if (!isBookableRoom(room)) {
    roomLabel.textContent = `${room.name} — not bookable`;
    body.classList.add('booking-body--locked');
    setStatus('This box is not a bookable venue.', '');
    updateSubmitState();
    return;
  }

  const venueName = getVenueNameForRoom(room.roomId);
  roomLabel.textContent = `${room.name} · ${venueName}`;
  roomLabel.style.setProperty('--room-accent', room.color || '#3da9f5');
  body.classList.remove('booking-body--locked');

  if (!getToken()) {
    setStatus('Sign in on SpaceFlow to book this venue.', 'warn');
  } else if (!submitted) {
    setStatus('Design the room, then calculate your booking.', '');
  }

  if (title && !title.value) {
    title.value = `${venueName} event`;
  }
  updateSubmitState();
}

export function initBookingPanel() {
  if (built) {
    refreshBookingContext();
    return;
  }

  // Hide the Book tab entirely when no auth handoff is present (e.g. the admin
  // visualization iframe or the standalone viewer) — booking needs a signed-in client.
  if (!isBookingEnabled()) {
    document.querySelector('.furnish-section--book')?.classList.add('hidden');
    document.getElementById('furnish-section-booking')?.classList.add('hidden');
    return;
  }

  built = true;

  const { date, calc, submit, title, type, attendees, start, end } = getEls();

  if (date && !date.value) {
    date.value = new Date().toISOString().slice(0, 10);
    date.min = date.value;
  }

  calc?.addEventListener('click', (e) => {
    e.stopPropagation();
    runPreview();
  });
  submit?.addEventListener('click', (e) => {
    e.stopPropagation();
    submitBooking();
  });

  // Recalculate when the booking inputs change (debounced).
  let debounce = null;
  const onChange = () => {
    if (submitted) return;
    clearTimeout(debounce);
    debounce = setTimeout(() => runPreview({ silent: true }), 500);
  };
  [type, attendees, date, start, end].forEach((node) => {
    node?.addEventListener('change', onChange);
  });

  // Keep panel clicks from leaking to the 3D look/placement handlers.
  getEls().section?.addEventListener('pointerdown', (e) => e.stopPropagation());

  refreshBookingContext();
}

export function resetBookingPanel() {
  submitted = false;
  lastPreview = null;
  renderResults(null);
  const { submit, title } = getEls();
  if (submit) {
    submit.textContent = 'Book this venue';
    submit.disabled = true;
  }
  if (title) title.value = '';
  refreshBookingContext();
}
