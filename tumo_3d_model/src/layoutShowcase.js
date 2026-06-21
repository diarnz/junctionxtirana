import * as THREE from 'three';

import { camera, setCameraFov } from './sceneSetup.js';
import { navState } from './ui.js';

export const SHOWCASE_FOV = 56;
export let layoutCaptureActive = false;

const _lookTarget = new THREE.Vector3();
const _camPos = new THREE.Vector3();

function roomFloorY(room) {
  return room.y - room.h / 2 + 0.2;
}

/** Map room-local XZ (metres, origin at room centre) to world coordinates. */
function localXZToWorld(room, lx, lz, out = _camPos) {
  const cos = Math.cos(room.ry);
  const sin = Math.sin(room.ry);
  out.set(
    room.x + lx * cos - lz * sin,
    out.y,
    room.z + lx * sin + lz * cos,
  );
  return out;
}

function layoutCentroid(items) {
  if (!items?.length) return { x: 0, z: 0 };
  let sx = 0;
  let sz = 0;
  for (const item of items) {
    sx += item.x ?? 0;
    sz += item.z ?? 0;
  }
  return { x: sx / items.length, z: sz / items.length };
}

/** Pick the elevated corner that best frames all placed items. */
function pickShowcaseCorner(room, items) {
  const { x: cx, z: cz } = layoutCentroid(items);
  const corners = [
    { lx: -1, lz: -1 },
    { lx: -1, lz: 1 },
    { lx: 1, lz: -1 },
    { lx: 1, lz: 1 },
  ];

  const insetW = room.w * 0.38;
  const insetD = room.d * 0.38;
  let best = corners[0];
  let bestScore = -Infinity;

  for (const corner of corners) {
    const px = corner.lx * insetW;
    const pz = corner.lz * insetD;
    const dist = Math.hypot(px - cx, pz - cz);
    // Prefer corners that are far from the layout centroid and slightly higher diagonal.
    const score = dist + room.w * 0.05;
    if (score > bestScore) {
      bestScore = score;
      best = { lx: px, lz: pz, cx, cz };
    }
  }
  return best;
}

/**
 * Place the camera in an elevated room corner, looking across the full layout —
 * like an architectural showcase shot of every component.
 */
export function applyLayoutShowcaseCamera(room, items = []) {
  if (!room) return;

  layoutCaptureActive = true;
  navState.isNavigating = false;
  navState.onComplete = null;
  const floorY = roomFloorY(room);
  const corner = pickShowcaseCorner(room, items);

  const camHeight = floorY + Math.min(room.h * 0.78, room.h - 0.35);
  const lookHeight = floorY + Math.min(room.h * 0.42, 1.35);

  localXZToWorld(room, corner.lx, corner.lz, _camPos);
  _camPos.y = camHeight;

  localXZToWorld(room, corner.cx, corner.cz, _lookTarget);
  _lookTarget.y = lookHeight;

  camera.position.copy(_camPos);
  camera.lookAt(_lookTarget);
  setCameraFov(SHOWCASE_FOV);
  camera.updateProjectionMatrix();
}

export function clearLayoutShowcaseCamera() {
  layoutCaptureActive = false;
}

/**
 * Render a high-quality PNG of the current scene from the showcase camera.
 */
export async function renderLayoutShowcaseSnapshot(renderer, scene) {
  const prevRatio = renderer.getPixelRatio();
  const prevSize = new THREE.Vector2();
  renderer.getSize(prevSize);
  const prevAspect = camera.aspect;

  const captureW = 1280;
  const captureH = 800;

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(captureW, captureH, false);
  camera.aspect = captureW / captureH;
  camera.updateProjectionMatrix();

  // A few synchronous passes so capture works even when rAF is throttled offscreen.
  for (let i = 0; i < 3; i += 1) {
    renderer.render(scene, camera);
  }

  let dataUrl = null;
  try {
    dataUrl = renderer.domElement.toDataURL('image/png');
  } catch {
    dataUrl = null;
  }

  renderer.setPixelRatio(prevRatio);
  renderer.setSize(prevSize.x, prevSize.y, false);
  camera.aspect = prevAspect;
  camera.updateProjectionMatrix();

  return dataUrl;
}
