import * as THREE from 'three';

// ─── Texture cache: generate once per color, reuse everywhere ─────────────────
const stuccoCache = new Map();

export function makeStuccoTexture(colorHex) {
  if (stuccoCache.has(colorHex)) return stuccoCache.get(colorHex);

  const size = 256; // reduced from 512 – still looks great, 4x less memory
  const cMap  = document.createElement('canvas'); cMap.width  = cMap.height  = size;
  const cBump = document.createElement('canvas'); cBump.width = cBump.height = size;
  const ctxM = cMap.getContext('2d');
  const ctxB = cBump.getContext('2d');

  ctxM.fillStyle = colorHex; ctxM.fillRect(0, 0, size, size);
  ctxB.fillStyle = '#808080'; ctxB.fillRect(0, 0, size, size);

  // Reduced from 80 000 → 12 000 – still gives micro-cement feel
  for (let i = 0; i < 12000; i++) {
    const x = Math.random() * size, y = Math.random() * size;
    const r = Math.random() * 1.2 + 0.2;
    const isDark = Math.random() > 0.5;
    ctxM.fillStyle = `rgba(${isDark ? 0 : 255},${isDark ? 0 : 255},${isDark ? 0 : 255},0.025)`;
    ctxM.fillRect(x, y, r, r);
    ctxB.fillStyle = isDark ? 'rgba(0,0,0,0.18)' : 'rgba(255,255,255,0.18)';
    ctxB.fillRect(x, y, r, r);
  }

  const map     = new THREE.CanvasTexture(cMap);
  const bumpMap = new THREE.CanvasTexture(cBump);
  map.wrapS = map.wrapT = bumpMap.wrapS = bumpMap.wrapT = THREE.RepeatWrapping;

  const result = { map, bumpMap };
  stuccoCache.set(colorHex, result);
  return result;
}

export function makeRawConcreteTexture(colorHex) {
  const size = 512; // reduced from 1024
  const cMap  = document.createElement('canvas'); cMap.width  = cMap.height  = size;
  const cBump = document.createElement('canvas'); cBump.width = cBump.height = size;
  const ctxM = cMap.getContext('2d');
  const ctxB = cBump.getContext('2d');

  ctxM.fillStyle = colorHex; ctxM.fillRect(0, 0, size, size);
  ctxB.fillStyle = '#808080'; ctxB.fillRect(0, 0, size, size);

  // Reduced from 60 000 → 10 000
  for (let i = 0; i < 10000; i++) {
    const x = Math.random() * size, y = Math.random() * size, r = Math.random() * 2;
    ctxM.fillStyle = `rgba(0,0,0,${Math.random() * 0.05})`; ctxM.fillRect(x, y, r, r);
    ctxB.fillStyle = `rgba(0,0,0,${Math.random() * 0.1})`;  ctxB.fillRect(x, y, r, r);
  }

  // Formwork lines
  for (let y = 0; y < size; y += 48) {
    ctxM.fillStyle = 'rgba(0,0,0,0.06)'; ctxM.fillRect(0, y, size, 2);
    ctxB.fillStyle = 'rgba(0,0,0,0.2)';  ctxB.fillRect(0, y, size, 2);
    for (let w = 0; w < 8; w++) { // reduced from 20
      ctxB.fillStyle = `rgba(0,0,0,${Math.random() * 0.05})`;
      ctxB.fillRect(Math.random() * size, y + Math.random() * 48, Math.random() * 80, 1);
    }
  }

  // Air bubbles – reduced from 4000 → 800
  for (let i = 0; i < 800; i++) {
    const x = Math.random() * size, y = Math.random() * size, r = Math.random() * 1.2;
    ctxM.fillStyle = 'rgba(0,0,0,0.15)'; ctxM.beginPath(); ctxM.arc(x, y, r, 0, Math.PI * 2); ctxM.fill();
    ctxB.fillStyle = 'rgba(0,0,0,0.4)';  ctxB.beginPath(); ctxB.arc(x, y, r, 0, Math.PI * 2); ctxB.fill();
  }

  // Aging stains
  for (let i = 0; i < 15; i++) {
    const x = Math.random() * size;
    const grad = ctxM.createLinearGradient(0, 0, 0, size);
    grad.addColorStop(0, 'rgba(0,0,0,0.0)');
    grad.addColorStop(1, `rgba(0,0,0,${Math.random() * 0.08})`);
    ctxM.fillStyle = grad; ctxM.fillRect(x, 0, Math.random() * 30 + 10, size);
  }

  const map     = new THREE.CanvasTexture(cMap);
  const bumpMap = new THREE.CanvasTexture(cBump);
  map.wrapS = map.wrapT = bumpMap.wrapS = bumpMap.wrapT = THREE.RepeatWrapping;
  return { map, bumpMap };
}

// Global cached concrete texture
export const globalRawConcrete = makeRawConcreteTexture('#c9c2b8');

const woodCache = new Map();

export function makeWoodTexture(baseColorHex = '#A67B5B') {
  if (woodCache.has(baseColorHex)) return woodCache.get(baseColorHex);

  const size = 512;
  const cMap = document.createElement('canvas');
  cMap.width = cMap.height = size;
  const cBump = document.createElement('canvas');
  cBump.width = cBump.height = size;
  const ctxM = cMap.getContext('2d');
  const ctxB = cBump.getContext('2d');

  const base = baseColorHex;
  ctxM.fillStyle = base;
  ctxM.fillRect(0, 0, size, size);
  ctxB.fillStyle = '#808080';
  ctxB.fillRect(0, 0, size, size);

  const plankH = 64;
  const plankCount = Math.ceil(size / plankH);

  for (let p = 0; p < plankCount; p++) {
    const y = p * plankH;
    const shade = p % 2 === 0 ? 1.0 : 0.9;
    ctxM.fillStyle = p % 2 === 0 ? 'rgba(196,152,106,0.18)' : 'rgba(74,48,28,0.08)';
    ctxM.fillRect(0, y, size, plankH);
    ctxM.fillStyle = `rgba(0,0,0,${(1 - shade) * 0.1})`;
    ctxM.fillRect(0, y, size, plankH);

    // Plank end joints (staggered)
    const jointX = ((p * 137) % 7) * (size / 8) + 20;
    ctxM.fillStyle = 'rgba(0,0,0,0.08)';
    ctxM.fillRect(jointX, y, 2, plankH);
    ctxB.fillStyle = 'rgba(0,0,0,0.25)';
    ctxB.fillRect(jointX, y, 2, plankH);

    // Grain lines along plank
    for (let g = 0; g < 18; g++) {
      const gx = Math.random() * size;
      const gy = y + Math.random() * plankH;
      const gw = Math.random() * 120 + 40;
      ctxM.strokeStyle = `rgba(0,0,0,${Math.random() * 0.06 + 0.02})`;
      ctxM.lineWidth = Math.random() * 1.2 + 0.4;
      ctxM.beginPath();
      ctxM.moveTo(gx, gy);
      ctxM.lineTo(gx + gw, gy + (Math.random() - 0.5) * 4);
      ctxM.stroke();

      ctxB.strokeStyle = `rgba(${Math.random() > 0.5 ? 0 : 255},${Math.random() > 0.5 ? 0 : 255},${Math.random() > 0.5 ? 0 : 255},0.12)`;
      ctxB.lineWidth = ctxM.lineWidth;
      ctxB.beginPath();
      ctxB.moveTo(gx, gy);
      ctxB.lineTo(gx + gw, gy + (Math.random() - 0.5) * 4);
      ctxB.stroke();
    }

    // Plank seam
    ctxM.fillStyle = 'rgba(0,0,0,0.12)';
    ctxM.fillRect(0, y + plankH - 1, size, 1);
    ctxB.fillStyle = 'rgba(0,0,0,0.3)';
    ctxB.fillRect(0, y + plankH - 1, size, 1);
  }

  // Subtle knots
  for (let i = 0; i < 12; i++) {
    const kx = Math.random() * size;
    const ky = Math.random() * size;
    const kr = Math.random() * 6 + 3;
    ctxM.fillStyle = 'rgba(60,35,15,0.15)';
    ctxM.beginPath();
    ctxM.ellipse(kx, ky, kr, kr * 0.6, Math.random(), 0, Math.PI * 2);
    ctxM.fill();
    ctxB.fillStyle = 'rgba(0,0,0,0.2)';
    ctxB.beginPath();
    ctxB.ellipse(kx, ky, kr, kr * 0.6, Math.random(), 0, Math.PI * 2);
    ctxB.fill();
  }

  const map = new THREE.CanvasTexture(cMap);
  const bumpMap = new THREE.CanvasTexture(cBump);
  map.wrapS = map.wrapT = bumpMap.wrapS = bumpMap.wrapT = THREE.RepeatWrapping;

  const result = { map, bumpMap };
  woodCache.set(baseColorHex, result);
  return result;
}

export const globalWood = makeWoodTexture('#A67B5B');

const tileCache = new Map();

/** Large-format white porcelain / marble apartment floor plates. */
export function makeLuxuryTileTexture(baseHex = '#F8F8F6') {
  if (tileCache.has(baseHex)) return tileCache.get(baseHex);

  const size = 512;
  const cMap = document.createElement('canvas');
  cMap.width = cMap.height = size;
  const cBump = document.createElement('canvas');
  cBump.width = cBump.height = size;
  const ctxM = cMap.getContext('2d');
  const ctxB = cBump.getContext('2d');

  const tileCount = 4;
  const tileSize = size / tileCount;
  const grout = 3;
  const groutColor = '#D6D4D0';
  const groutBump = '#666666';

  ctxM.fillStyle = groutColor;
  ctxM.fillRect(0, 0, size, size);
  ctxB.fillStyle = groutBump;
  ctxB.fillRect(0, 0, size, size);

  for (let row = 0; row < tileCount; row++) {
    for (let col = 0; col < tileCount; col++) {
      const x = col * tileSize + grout;
      const y = row * tileSize + grout;
      const w = tileSize - grout * 2;
      const h = tileSize - grout * 2;

      const shade = 0.97 + ((row + col) % 3) * 0.012;
      ctxM.fillStyle = baseHex;
      ctxM.globalAlpha = shade;
      ctxM.fillRect(x, y, w, h);
      ctxM.globalAlpha = 1;

      ctxB.fillStyle = '#909090';
      ctxB.fillRect(x, y, w, h);

      // Soft polished highlight gradient
      const gloss = ctxM.createLinearGradient(x, y, x + w, y + h);
      gloss.addColorStop(0, 'rgba(255,255,255,0.22)');
      gloss.addColorStop(0.45, 'rgba(255,255,255,0.04)');
      gloss.addColorStop(1, 'rgba(0,0,0,0.03)');
      ctxM.fillStyle = gloss;
      ctxM.fillRect(x, y, w, h);

      // Subtle marble veining
      for (let v = 0; v < 5; v++) {
        ctxM.strokeStyle = `rgba(190,188,184,${Math.random() * 0.08 + 0.03})`;
        ctxM.lineWidth = Math.random() * 1.4 + 0.5;
        ctxM.beginPath();
        const sx = x + Math.random() * w;
        const sy = y + Math.random() * h;
        ctxM.moveTo(sx, sy);
        ctxM.bezierCurveTo(
          sx + (Math.random() - 0.5) * w * 0.5, sy + (Math.random() - 0.5) * h * 0.4,
          sx + (Math.random() - 0.5) * w * 0.6, sy + (Math.random() - 0.5) * h * 0.5,
          sx + (Math.random() - 0.5) * w * 0.8, sy + (Math.random() - 0.5) * h * 0.8
        );
        ctxM.stroke();

        ctxB.strokeStyle = 'rgba(120,120,120,0.08)';
        ctxB.lineWidth = ctxM.lineWidth * 0.8;
        ctxB.beginPath();
        ctxB.moveTo(sx, sy);
        ctxB.bezierCurveTo(
          sx + (Math.random() - 0.5) * w * 0.5, sy + (Math.random() - 0.5) * h * 0.4,
          sx + (Math.random() - 0.5) * w * 0.6, sy + (Math.random() - 0.5) * h * 0.5,
          sx + (Math.random() - 0.5) * w * 0.8, sy + (Math.random() - 0.5) * h * 0.8
        );
        ctxB.stroke();
      }

      // Micro surface noise for realism
      for (let i = 0; i < 120; i++) {
        const px = x + Math.random() * w;
        const py = y + Math.random() * h;
        const pr = Math.random() * 1.2 + 0.2;
        ctxM.fillStyle = `rgba(255,255,255,${Math.random() * 0.06})`;
        ctxM.fillRect(px, py, pr, pr);
        ctxB.fillStyle = `rgba(${Math.random() > 0.5 ? 255 : 0},${Math.random() > 0.5 ? 255 : 0},${Math.random() > 0.5 ? 255 : 0},0.05)`;
        ctxB.fillRect(px, py, pr, pr);
      }
    }
  }

  const map = new THREE.CanvasTexture(cMap);
  const bumpMap = new THREE.CanvasTexture(cBump);
  map.wrapS = map.wrapT = bumpMap.wrapS = bumpMap.wrapT = THREE.RepeatWrapping;

  const result = { map, bumpMap };
  tileCache.set(baseHex, result);
  return result;
}

export const globalLuxuryTile = makeLuxuryTileTexture('#F8F8F6');
