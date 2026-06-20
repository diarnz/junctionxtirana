import { createBox, addRailing, addPlant, addTUMOSign, buildDome, addFloor } from './factories.js';

export const floorGroups = { floor0: [], floor1: [], floor3: [] };

const FLOOR_ORDER = { floor0: 0, floor1: 1, floor3: 2 };
let currentFloor = null;

export function buildWorld() {
  buildDome();
  addFloor();

  const SLAB = 0.18;
  const lgH = 2.6,  lgY = -6 + lgH / 2;
  const lgSlabTop = lgY + lgH / 2 + SLAB;
  const dgH = 2.60, dgY = -6 + dgH / 2;
  const orH = 3.0,  orY = lgSlabTop + orH / 2;
  const orSlabTop = orY + orH / 2 + SLAB;
  const rdH = 2.6,  rdY = orSlabTop + rdH / 2;
  const rdSlabTop = rdY + rdH / 2 + SLAB;
  const blH = 2.6,  blY = orSlabTop + blH / 2;
  const blSlabTop = blY + blH / 2 + SLAB;
  const puH = 2.2,  puY = rdSlabTop + puH / 2;

  // === FLOOR 0 ===
  floorGroups.floor0.push(createBox({ w: 5.5, h: lgH, d: 3.2, x: -3.5, y: lgY, z: 0.3, ry: -0.12, color: '#9dc918', name: 'Lime Green Box', desc: 'Lower left module' }));
  floorGroups.floor0.push(createBox({ w: 4.2, h: dgH, d: 4.0, x: 6.2, y: dgY, z: -0.2, ry: 0.15, color: '#1a5c2e', name: 'Dark Green Box', desc: 'Lower right module' }));
  floorGroups.floor0.push(addPlant(6.8, dgY + dgH / 2 + SLAB + 0.05, 1.6, 0.7));
  floorGroups.floor0.push(addPlant(-7, -5.6, 2.5, 1.2));
  floorGroups.floor0.push(addPlant(6.5, -5.6, 2.5, 1.0));
  floorGroups.floor0.push(addPlant(-2.5, -5.6, 5.5, 1.3));
  floorGroups.floor0.push(addPlant(2.5, -5.6, 5.5, 1.0));
  floorGroups.floor0.push(addPlant(-10, -5.6, 0.5, 1.4));
  floorGroups.floor0.push(addPlant(9.5, -5.6, -1, 1.1));

  // === FLOOR 1 ===
  floorGroups.floor1.push(createBox({ w: 8.0, h: orH, d: 4.2, x: 0, y: orY, z: 0, ry: 0.06, color: '#e85d20', name: 'Orange Box', desc: 'Main entrance level' }));
  floorGroups.floor1.push(addTUMOSign(0.1, orY + orH / 2 + SLAB - 0.36, 2.22 + 0.15, 0.06));

  // === FLOOR 3 ===
  floorGroups.floor3.push(createBox({ w: 3.8, h: rdH, d: 3.5, x: -3.0, y: rdY, z: -0.2, ry: -0.14, color: '#d42020', name: 'Red Box', desc: 'Upper left module' }));
  floorGroups.floor3.push(addRailing(-3.0, rdY + rdH / 2 + SLAB, 1.62, 3.8, 'x', -0.14));
  floorGroups.floor3.push(addPlant(-3.5, rdY + rdH / 2 + SLAB + 0.05, 1.3, 0.6));
  floorGroups.floor3.push(createBox({ w: 5.2, h: blH, d: 3.8, x: 3.5, y: blY, z: -0.4, ry: 0.18, color: '#1a5fc8', name: 'Blue Box', desc: 'Upper right module' }));
  floorGroups.floor3.push(addRailing(3.5, blY + blH / 2 + SLAB, 1.82, 5.2, 'x', 0.18));
  floorGroups.floor3.push(addPlant(3.8, blY + blH / 2 + SLAB + 0.05, 1.5, 0.55));
  floorGroups.floor3.push(createBox({ w: 4.8, h: puH, d: 2.8, x: -0.5, y: puY, z: -0.3, ry: 0.04, color: '#7b2fbe', name: 'Purple Box', desc: 'Top center module' }));
  floorGroups.floor3.push(addRailing(-0.5, puY + puH / 2 + SLAB, 1.12, 4.8, 'x', 0.04));
  floorGroups.floor3.push(addPlant(0.4, puY + puH / 2 + SLAB + 0.05, 0.8, 0.5));
  floorGroups.floor3.push(addPlant(-0.8, puY + puH / 2 + SLAB + 0.05, 0.7, 0.45));
  floorGroups.floor3.push(createBox({ w: 6.5, h: 1.9, d: 3.0, x: -11, y: 7.5, z: -4, ry: 0.52, color: '#c8d422', name: 'Floating Green Box', desc: 'Cantilevered – upper left' }));
  floorGroups.floor3.push(addRailing(-11, 7.5 + 1.9 / 2 + SLAB, -2.55, 6.5, 'x', 0.52));
}

// ── Collect { worldY, matInfos } for a set of floor keys ─────────────────────
function buildGroupInfos(floorKeys) {
  return floorKeys.flatMap(key =>
    (floorGroups[key] || []).filter(Boolean).map(group => {
      const seen = new Set();
      const matInfos = [];
      group.traverse(child => {
        if (!child.isMesh) return;
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach(mat => {
          if (!seen.has(mat)) {
            seen.add(mat);
            // Snapshot the TRUE original opacity right now (before any animation)
            matInfos.push({ mat, origOpacity: mat.opacity, origTransparent: mat.transparent });
          }
        });
      });
      return { worldY: group.position.y, matInfos };
    })
  );
}

// ── Restore materials to their original state ─────────────────────────────────
function restoreMaterials(groupInfos) {
  groupInfos.forEach(({ matInfos }) =>
    matInfos.forEach(({ mat, origOpacity, origTransparent }) => {
      mat.opacity = origOpacity;
      if (mat.transparent !== origTransparent) {
        mat.transparent = origTransparent;
        mat.needsUpdate = true; // recompile shader back to opaque
      }
    })
  );
}

// ── Staggered opacity animation ───────────────────────────────────────────────
// fadeOut=true: origOpacity→0 | fadeOut=false: 0→origOpacity
// direction: +1=bottom first, -1=top first, 0=all together
function animateStaggered(groupInfos, fadeOut, totalDuration, direction, onDone) {
  if (!groupInfos.length) { onDone && onDone(); return; }

  const ys   = groupInfos.map(g => g.worldY);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const range = maxY - minY || 1;

  const staggerSpan  = direction !== 0 ? totalDuration * 0.40 : 0;
  const fadeDuration = totalDuration * 0.65;

  // Prepare starting state
  groupInfos.forEach(({ matInfos }) =>
    matInfos.forEach(({ mat }) => {
      if (!mat.transparent) {
        mat.transparent = true;
        mat.needsUpdate = true; // recompile shader for transparency
      }
      mat.opacity = fadeOut ? mat.opacity : 0;
    })
  );

  const startTime = performance.now();

  function tick() {
    const now = performance.now();
    let anyRunning = false;

    groupInfos.forEach(({ worldY, matInfos }) => {
      const normY = (worldY - minY) / range;
      // +1: bottom (normY=0) starts first → staggerFactor=0 → delay=0 ✓
      // -1: top (normY=1) starts first → staggerFactor=0 → delay=0 ✓
      const staggerFactor = direction >= 0 ? normY : (1 - normY);
      const delay   = staggerFactor * staggerSpan;
      const elapsed = now - startTime - delay;

      if (elapsed < 0) { anyRunning = true; return; }

      const raw = Math.min(elapsed / fadeDuration, 1);
      const t   = raw < 0.5
        ? 4 * raw * raw * raw
        : 1 - Math.pow(-2 * raw + 2, 3) / 2; // cubic ease-in-out

      matInfos.forEach(({ mat, origOpacity }) => {
        mat.opacity = fadeOut
          ? origOpacity * (1 - t)   // origOpacity → 0
          : origOpacity * t;        // 0 → origOpacity
      });

      if (raw < 1) anyRunning = true;
    });

    if (anyRunning) requestAnimationFrame(tick);
    else onDone && onDone();
  }

  requestAnimationFrame(tick);
}

// ── Public: directional fade switch ──────────────────────────────────────────
export function setFloorVisibilityFade(activeFloor, totalDuration = 500) {
  const allKeys = ['floor0', 'floor1', 'floor3'];

  const currentOrder = currentFloor !== null ? FLOOR_ORDER[currentFloor] : 1;
  const nextOrder    = activeFloor  !== null ? FLOOR_ORDER[activeFloor]  : 1;
  const direction    = nextOrder > currentOrder ? 1 : nextOrder < currentOrder ? -1 : 0;

  const outKeys = currentFloor === null ? allKeys : [currentFloor];
  const inKeys  = activeFloor  === null ? allKeys : [activeFloor];

  const outInfos = buildGroupInfos(outKeys);

  animateStaggered(outInfos, true, totalDuration, direction, () => {
    // KEY FIX: restore hidden materials to their original opacity
    // so they are always "ready" for when they become visible again
    restoreMaterials(outInfos);

    // Switch Three.js object visibility
    allKeys.forEach(key => {
      const visible = activeFloor === null || key === activeFloor;
      floorGroups[key].forEach(obj => { if (obj) obj.visible = visible; });
    });
    currentFloor = activeFloor;

    // Fade in the new floor
    const inInfos = buildGroupInfos(inKeys);
    animateStaggered(inInfos, false, totalDuration, direction, () => {
      restoreMaterials(inInfos);
    });
  });
}
