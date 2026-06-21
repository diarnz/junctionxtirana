import { bridge } from './bridge.js';
import { mountAiSearchBar } from './aiSearchBar.js';
import { getVenueNameForRoom, isAiSupportedRoom } from './roomVenues.js';
import { indoorState } from './ui.js';

const STORAGE_PREFIX = 'tumo_furniture_';
const DESIGN_TIMEOUT_MS = 30000;

let built = false;
let loading = false;
let designTimeout = null;
let lastLayoutStyle = null;
let pendingDesignRoomId = null;
let searchBar = null;

function getElements() {
  return {
    panelEl: document.querySelector('#ai-dock .ai-panel'),
    roomLabel: document.getElementById('ai-room-label'),
    messagesEl: document.getElementById('ai-messages'),
    statusEl: document.getElementById('ai-status'),
    searchMount: document.getElementById('ai-search-mount'),
  };
}

function sanitizeLayoutItems(items) {
  if (!Array.isArray(items)) return [];
  return items.map((item) => {
    const clean = {
      modelKey: item.modelKey,
      x: Number(item.x) || 0,
      y: Number(item.y) || 0,
      z: Number(item.z) || 0,
      rotY: Number(item.rotY) || 0,
      type: item.type || 'floor',
    };
    if (clean.type === 'wall') {
      clean.wallAxis = item.wallAxis;
      clean.wallCoord = Number(item.wallCoord) || 0;
      clean.isPositiveWall = Boolean(item.isPositiveWall);
      clean.mountY = Number(item.mountY) || clean.y;
    }
    if (item.scale) clean.scale = item.scale;
    return clean;
  }).filter((item) => item.modelKey);
}

function getExistingLayoutItems(roomId) {
  const live = typeof window.__spaceflowGetLayoutItems === 'function'
    ? window.__spaceflowGetLayoutItems()
    : [];
  if (live.length) return sanitizeLayoutItems(live);

  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + roomId);
    return raw ? sanitizeLayoutItems(JSON.parse(raw)) : [];
  } catch {
    return [];
  }
}

let statusResetTimer = null;

function showStatus(text, { busy = false } = {}) {
  const { statusEl } = getElements();
  if (!statusEl) return;
  statusEl.textContent = text;
  statusEl.classList.toggle('ai-status--busy', busy);
  statusEl.classList.toggle('ai-status--visible', Boolean(text));
}

function scheduleStatusReset(delayMs = 5000) {
  if (statusResetTimer) clearTimeout(statusResetTimer);
  statusResetTimer = setTimeout(() => {
    statusResetTimer = null;
    refreshAiRoomContext();
  }, delayMs);
}

function renderMessages() {
  const { messagesEl } = getElements();
  messagesEl?.classList.add('is-empty');
  if (messagesEl) messagesEl.innerHTML = '';
}

function canSend() {
  const room = indoorState.activeRoomData;
  return Boolean(room && isAiSupportedRoom(room.roomId) && bridge.connected && !loading);
}

function clearDesignTimeout() {
  if (designTimeout) {
    clearTimeout(designTimeout);
    designTimeout = null;
  }
}

function finishDesign(options = {}) {
  const { message, isError = false } = options;
  pendingDesignRoomId = null;
  setLoading(false);
  const text = message || (isError ? 'Could not update the layout. Please try again.' : '');
  if (text) {
    showStatus(text, { busy: false });
    scheduleStatusReset(isError ? 7000 : 5000);
  } else {
    refreshAiRoomContext();
  }
}

function setLoading(next) {
  loading = next;
  window._aiDesignInProgress = loading;
  if (loading) {
    showStatus('Designing layout…', { busy: true });
  }
  if (loading) {
    clearDesignTimeout();
    designTimeout = setTimeout(() => {
      if (!loading) return;
      finishDesign({ isError: true, message: 'Layout design timed out. Please try again.' });
    }, DESIGN_TIMEOUT_MS);
  } else {
    clearDesignTimeout();
  }
  searchBar?.refresh();
  renderMessages();
}

export function refreshAiRoomContext() {
  if (loading || statusResetTimer) return;

  const room = indoorState.activeRoomData;
  const { roomLabel } = getElements();
  if (!roomLabel) return;

  if (!room) {
    roomLabel.textContent = 'Enter a room to use AI';
  } else if (!isAiSupportedRoom(room.roomId)) {
    roomLabel.textContent = `${room.name} — AI layout not available here`;
  } else {
    const venue = getVenueNameForRoom(room.roomId);
    roomLabel.textContent = `${room.name} · ${venue}`;
    roomLabel.style.setProperty('--room-accent', room.color || '#3da9f5');
  }

  const placeholder = !room
    ? 'Enter a room to use AI'
    : !isAiSupportedRoom(room.roomId)
      ? 'AI layout not available in this room'
      : !bridge.connected
        ? 'Connecting to SpaceFlow backend…'
        : 'Ask for anything — clear room, add chairs, office setup…';

  searchBar?.setPlaceholder(placeholder);
  searchBar?.refresh();
  showStatus('', { busy: false });
}

function sendPrompt(rawPrompt) {
  const prompt = String(rawPrompt || '').trim();
  const room = indoorState.activeRoomData;
  if (!prompt || loading || !room || !isAiSupportedRoom(room.roomId)) return;

  if (!bridge.connected) {
    showStatus('Not connected to SpaceFlow backend. Reconnecting…', { busy: false });
    scheduleStatusReset(6000);
    return;
  }

  pendingDesignRoomId = room.roomId;
  setLoading(true);

  const existingItems = getExistingLayoutItems(room.roomId);

  try {
    bridge.send('AI_DESIGN', {
      roomId: room.roomId,
      prompt,
      venueName: getVenueNameForRoom(room.roomId),
      roomName: room.name,
      existingItems,
      previousLayoutStyle: lastLayoutStyle,
    });
  } catch (error) {
    console.warn('[AI Panel] Failed to send design request', error);
    finishDesign({ isError: true, message: 'Could not send the design request. Please try again.' });
  }
}

function bindBridgeEvents() {
  bridge.on('CONNECTED', () => {
    if (loading && !pendingDesignRoomId) {
      setLoading(false);
    }
    refreshAiRoomContext();
  });

  bridge.on('AI_DESIGN_STARTED', (payload) => {
    if (payload.roomId !== indoorState.activeRoomData?.roomId) return;
    pendingDesignRoomId = payload.roomId;
    setLoading(true);
  });

  bridge.on('APPLY_LAYOUT', (payload) => {
    if (payload.source !== 'ai_agent') return;
    if (payload.roomId !== pendingDesignRoomId) return;
    // Layout reached the scene — unlock the input even if DONE is delayed.
    if (loading) {
      clearDesignTimeout();
      loading = false;
      window._aiDesignInProgress = false;
      searchBar?.refresh();
      renderMessages();
    }
  });

  bridge.on('AI_DESIGN_DONE', (payload) => {
    if (payload.roomId !== indoorState.activeRoomData?.roomId) return;
    if (payload.layout_style === 'empty' || payload.cleared) {
      lastLayoutStyle = null;
    } else if (payload.layout_style) {
      lastLayoutStyle = payload.layout_style;
    }
    finishDesign({ message: payload.message || 'Layout updated.' });
  });

  bridge.on('AI_DESIGN_ERROR', (payload) => {
    if (payload.roomId && payload.roomId !== indoorState.activeRoomData?.roomId) return;
    finishDesign({ message: payload.message || 'Could not generate a layout.' });
  });
}

export function initAiPanel() {
  if (built) {
    refreshAiRoomContext();
    return;
  }
  built = true;

  const { searchMount } = getElements();
  searchBar = mountAiSearchBar(searchMount, {
    placeholder: 'Design this room…',
    onSearch: sendPrompt,
    getDisabled: () => !canSend(),
  });

  bindBridgeEvents();
  renderMessages();
  refreshAiRoomContext();
  setLoading(false);
}

export function resetAiConversation() {
  lastLayoutStyle = null;
  pendingDesignRoomId = null;
  if (statusResetTimer) {
    clearTimeout(statusResetTimer);
    statusResetTimer = null;
  }
  searchBar?.clear();
  renderMessages();
  refreshAiRoomContext();
}
