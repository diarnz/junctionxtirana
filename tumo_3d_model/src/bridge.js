import { applyLayoutFromPlan } from './furnishing.js';

class SpaceFloBridge {
  constructor() {
    this.ws = null;
    this.connected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 25;
    this.reconnectDelayMs = 3000;
    this.url = 'ws://localhost:8080/ws/3d-bridge';
  }

  connect(url = this.url) {
    this.url = url;
    try {
      this.ws = new WebSocket(url);
      this.ws.addEventListener('open', () => {
        this.connected = true;
        this.reconnectAttempts = 0;
        console.log('[SpaceFlo Bridge] Connected to backend');
      });

      this.ws.addEventListener('message', (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.warn('[SpaceFlo Bridge] Failed to parse incoming message', error);
        }
      });

      this.ws.addEventListener('close', () => {
        if (this.connected) {
          console.log('[SpaceFlo Bridge] Disconnected from backend');
        }
        this.connected = false;
        this.scheduleReconnect();
      });

      this.ws.addEventListener('error', () => {
        this.connected = false;
      });
    } catch (error) {
      this.connected = false;
      this.scheduleReconnect();
    }
  }

  scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) return;
    this.reconnectAttempts += 1;
    setTimeout(() => this.connect(this.url), this.reconnectDelayMs);
  }

  send(type, payload = {}) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify({ type, payload }));
  }

  handleMessage(message) {
    const { type, payload = {} } = message;
    if (type === 'CONNECTED') {
      const roomId = window._currentRoomId;
      if (roomId) this.send('REQUEST_LAYOUT', { roomId });
      return;
    }

    if (type === 'APPLY_LAYOUT') {
      if (window._currentRoomId === payload.roomId && Array.isArray(payload.items)) {
        applyLayoutFromPlan(payload.items, { relocate: true });
      } else {
        window._pendingBridgeLayouts = window._pendingBridgeLayouts || {};
        window._pendingBridgeLayouts[payload.roomId] = payload.items;
      }
      return;
    }
  }

  applyPendingLayout(roomId) {
    const pending = window._pendingBridgeLayouts?.[roomId];
    if (roomId && Array.isArray(pending)) {
      applyLayoutFromPlan(pending, { relocate: true });
      delete window._pendingBridgeLayouts[roomId];
    }
  }
}

export const bridge = new SpaceFloBridge();
window.spacefloBridge = bridge;
