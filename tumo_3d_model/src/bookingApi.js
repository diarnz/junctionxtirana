/**
 * REST bridge for booking from inside the 3D world.
 *
 * Identity is handed off from the parent SpaceFlow site (the Vue app embeds this
 * viewer in an iframe). The auth token arrives either as a `?token=` query param
 * or via a postMessage `SET_AUTH` event, so the 3D world can call the authed
 * booking API on the client's behalf without a second login.
 */

let authToken = null;

function params() {
  return new URLSearchParams(window.location.search);
}

export function getApiHost() {
  return params().get('apiHost') || 'localhost:8082';
}

export function getApiBase() {
  const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
  return `${protocol}//${getApiHost()}/api/v1`;
}

export function getToken() {
  if (authToken) return authToken;
  const fromQuery = params().get('token');
  if (fromQuery) authToken = fromQuery;
  return authToken;
}

export function setToken(token) {
  authToken = token || null;
}

export function isBookingEnabled() {
  return Boolean(getToken()) || params().get('mode') === 'book';
}

// Allow the parent window to push the auth token after load.
window.addEventListener('message', (event) => {
  const data = event.data;
  if (data && data.type === 'SET_AUTH' && data.payload?.token) {
    setToken(data.payload.token);
    window.dispatchEvent(new CustomEvent('spaceflow:auth-ready'));
  }
});

async function request(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${getApiBase()}${path}`, { ...options, headers });
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok) {
    const detail = data?.detail;
    const message = Array.isArray(detail)
      ? detail.map((d) => d.msg).join(' ')
      : typeof detail === 'string'
        ? detail
        : `Request failed (${res.status})`;
    throw new Error(message);
  }
  return data;
}

export function previewBooking(body) {
  return request('/bookings/preview', { method: 'POST', body: JSON.stringify(body) });
}

export function createBooking(body) {
  return request('/bookings', { method: 'POST', body: JSON.stringify(body) });
}
