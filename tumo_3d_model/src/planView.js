import { mountReadonlyPlan, updateReadonlyPlan } from './floorPlanEditor.js';
import { getRoomPlanMeta } from './roomPlanMeta.js';

const params = new URLSearchParams(window.location.search);
const roomId = params.get('roomId');
const roomData = roomId ? getRoomPlanMeta(roomId) : null;
const canvas = document.getElementById('plan-canvas');
const wrap = document.getElementById('plan-wrap');

let editor = null;

function applyItems(items) {
  if (!roomData || !canvas) return;
  if (editor) {
    updateReadonlyPlan(editor, items);
    editor._resize();
    return;
  }
  document.documentElement.style.setProperty('--fp-accent', roomData.color || '#5b9cf5');
  editor = mountReadonlyPlan(canvas, roomData, items || []);
}

function notifyReady() {
  window.parent?.postMessage({ type: 'PLAN_VIEW_READY', payload: { roomId } }, '*');
}

window.addEventListener('message', (event) => {
  const { type, payload = {} } = event.data || {};
  if (type !== 'SET_PLAN_ITEMS') return;
  if (payload.roomId && payload.roomId !== roomId) return;
  applyItems(payload.items || []);
});

if (wrap && typeof ResizeObserver !== 'undefined') {
  new ResizeObserver(() => {
    editor?._resize();
  }).observe(wrap);
}

if (roomData) {
  applyItems([]);
  notifyReady();
}
