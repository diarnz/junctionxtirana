import * as THREE from 'three';
import { scene } from './sceneSetup.js';
import { makeStuccoTexture, globalLuxuryTile, globalRawConcrete } from './materials.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export const boxData = []; // for raycasting

// --- GLTF Preloader & Cache ---
const modelCache = {};
const gltfLoader = new GLTFLoader();

const MODEL_LIST = [
  { key: 'office_table', url: 'assets/office_table.glb' },
  { key: 'office_chair', url: 'assets/office_chair_modern.glb' },
  { key: 'office_monitor', url: 'assets/office_monitor__workstation_monitor.glb' },
  { key: 'keyboard_mouse', url: 'assets/keyboard__magic_mouse_by_apple.glb' },
  { key: 'simple_table', url: 'assets/simple_table.glb' },
  { key: 'simple_chair', url: 'assets/simple_chair.glb' },
  { key: 'speaker', url: 'assets/speaker.glb' },
  { key: 'microphone_stand', url: 'assets/microphone_stand.glb' },
  { key: 'wall_flat_tv', url: 'assets/wall_flat_tv.glb' },
  { key: 'led_tv', url: 'assets/led_tv_free.glb' },
  { key: 'whiteboard', url: 'assets/whiteboard.glb' }
];

export const MODEL_CATALOG = {
  office_table:     { label: 'Office Table',     type: 'floor', defaultScale: { w: 1.5 },  color: '#8B7355' },
  office_chair:     { label: 'Office Chair',     type: 'floor', defaultScale: { h: 0.9 },  color: '#444444' },
  office_monitor:   { label: 'Monitor',          type: 'floor', defaultScale: { w: 0.52 }, color: '#222222' },
  keyboard_mouse:   { label: 'Keyboard & Mouse', type: 'floor', defaultScale: { w: 0.5 },  color: '#CCCCCC' },
  simple_table:     { label: 'Simple Table',     type: 'floor', defaultScale: { w: 1.2 },  color: '#A08060' },
  simple_chair:     { label: 'Simple Chair',     type: 'floor', defaultScale: { h: 0.8 },  color: '#555555' },
  speaker:          { label: 'Speaker',          type: 'floor', defaultScale: { h: 0.55 }, color: '#333333' },
  microphone_stand: { label: 'Mic Stand',        type: 'floor', defaultScale: { h: 1.45 }, color: '#666666' },
  led_tv:           { label: 'LED TV',           type: 'floor', defaultScale: { w: 1.0 },  color: '#111111' },
  wall_flat_tv:     { label: 'Wall TV',          type: 'wall',  defaultScale: { w: 1.3 },  color: '#1a1a1a' },
  whiteboard:       { label: 'Whiteboard',       type: 'floor', defaultScale: { w: 1.8 },  color: '#EEEEEE' }
};

/** Global scale applied to all placeable furniture (catalog defaults × this factor). */
export const FURNITURE_SIZE_FACTOR = 0.75;

export function getDefaultScale(modelKey, overrides) {
  const base = { ...(MODEL_CATALOG[modelKey]?.defaultScale ?? { w: 1.0 }), ...overrides };
  const scaled = {};
  if (base.w !== undefined) scaled.w = base.w * FURNITURE_SIZE_FACTOR;
  if (base.h !== undefined) scaled.h = base.h * FURNITURE_SIZE_FACTOR;
  if (base.d !== undefined) scaled.d = base.d * FURNITURE_SIZE_FACTOR;
  return scaled;
}

export function slugifyRoomName(name) {
  return name.toLowerCase().replace(/\s+/g, '-');
}

export function preloadModels(onProgress, onComplete) {
  let loadedCount = 0;
  const total = MODEL_LIST.length;
  if (total === 0) {
    onComplete();
    return;
  }
  MODEL_LIST.forEach(item => {
    gltfLoader.load(
      item.url,
      (gltf) => {
        modelCache[item.key] = gltf.scene;
        loadedCount++;
        if (onProgress) onProgress(Math.round((loadedCount / total) * 100), item.key);
        if (loadedCount === total) onComplete();
      },
      undefined,
      (err) => {
        console.error(`Failed to load model ${item.key}:`, err);
        loadedCount++;
        if (loadedCount === total) onComplete();
      }
    );
  });
}

// --- Screen Texture Cache & Generators ---
const screenTextureCache = {};
function getScreenTexture(isTV) {
  const key = isTV ? 'tv' : 'monitor';
  if (screenTextureCache[key]) return screenTextureCache[key];

  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 256;
  const ctx = canvas.getContext('2d');

  if (isTV) {
    ctx.fillStyle = '#06060c'; ctx.fillRect(0, 0, 512, 256);
    ctx.strokeStyle = 'rgba(255, 90, 0, 0.25)'; ctx.lineWidth = 1;
    for (let i = 0; i < 512; i += 32) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 256); ctx.stroke();
    }
    for (let i = 0; i < 256; i += 32) {
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(512, i); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(255, 90, 0, 0.4)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(256, 128, 70, 0, Math.PI * 1.6); ctx.stroke();
    ctx.strokeStyle = 'rgba(0, 160, 255, 0.5)'; ctx.beginPath(); ctx.arc(256, 128, 85, Math.PI * 0.5, Math.PI * 1.9); ctx.stroke();
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 36px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('TUMO TIRANA', 256, 118);
    ctx.fillStyle = '#ff6400'; ctx.font = 'bold 13px monospace'; ctx.fillText('CREATIVE TECHNOLOGY CENTER', 256, 160);
    ctx.fillStyle = '#00ffcc'; ctx.font = '11px monospace'; ctx.fillText('STATUS: ONLINE  //  NODES: ACTIVE  //  LATENCY: 4ms', 256, 215);
  } else {
    ctx.fillStyle = '#181824'; ctx.fillRect(0, 0, 512, 256);
    ctx.fillStyle = '#11111a'; ctx.fillRect(0, 0, 512, 24);
    ctx.fillStyle = '#ff5f56'; ctx.beginPath(); ctx.arc(15, 12, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffbd2e'; ctx.beginPath(); ctx.arc(30, 12, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#27c93f'; ctx.beginPath(); ctx.arc(45, 12, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.font = '10px sans-serif'; ctx.fillText('tumo_3d_project - main.js', 65, 16);
    ctx.fillStyle = '#13131c'; ctx.fillRect(0, 24, 70, 232);
    ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.fillRect(8, 40, 50, 6); ctx.fillRect(8, 55, 40, 6); ctx.fillRect(8, 70, 45, 6); ctx.fillRect(8, 85, 30, 6);
    ctx.font = 'bold 12px Consolas, Monaco, monospace';
    const lines = [
      { text: '// TUMO Tirana learning center initialization', color: '#6a9955' },
      { text: 'import { CreativeLab } from "tumo-labs";', color: '#569cd6' },
      { text: 'const studentWorkspace = new CreativeLab();', color: '#4fc1ff' },
      { text: '', color: '' },
      { text: 'async function startProject() {', color: '#569cd6' },
      { text: '  await studentWorkspace.loadAssets();', color: '#dcdcaa' },
      { text: '  studentWorkspace.startIdea({', color: '#9cdcfe' },
      { text: '    field: "3D Modeling",', color: '#ce9178' },
      { text: '    duration: "2 hours",', color: '#ce9178' },
      { text: '    funLevel: 9000', color: '#b5cea8' },
      { text: '  });', color: '#9cdcfe' },
      { text: '}', color: '#569cd6' }
    ];
    let y = 45;
    lines.forEach(line => {
      if (line.text) {
        ctx.fillStyle = line.color;
        ctx.fillText(line.text, 85, y);
      }
      y += 16;
    });
  }
  const tex = new THREE.CanvasTexture(canvas);
  screenTextureCache[key] = tex;
  return tex;
}

// --- Model Default Rotation Offsets ---
const ROTATION_OFFSETS = {
  office_table: [0, 0, 0],
  office_chair: [0, 0, 0],
  office_monitor: [0, -Math.PI / 2, 0],
  keyboard_mouse: [0, 0, 0],
  simple_table: [0, 0, 0],
  simple_chair: [0, 0, 0],
  speaker: [0, 0, 0],
  microphone_stand: [0, 0, 0],
  wall_flat_tv: [0, 0, 0],
  led_tv: [0, 0, 0],
  whiteboard: [0, 0, 0]
};

export function getModelRotYOffset(modelKey) {
  return ROTATION_OFFSETS[modelKey]?.[1] ?? 0;
}

export function applyModelRotY(mesh, modelKey, rotY) {
  mesh.rotation.y = rotY + getModelRotYOffset(modelKey);
}

function createWallTvFallbackMesh(targetSize, rotX = 0, rotY = 0, rotZ = 0) {
  const width = targetSize.w ?? targetSize.h ?? 1.0;
  const height = width * 0.58;
  const depth = 0.05;
  const group = new THREE.Group();

  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.35, metalness: 0.15 })
  );
  frame.castShadow = true;
  frame.receiveShadow = true;

  const screenTex = getScreenTexture(true);
  const screen = new THREE.Mesh(
    new THREE.BoxGeometry(width * 0.9, height * 0.86, 0.012),
    new THREE.MeshStandardMaterial({
      map: screenTex,
      emissiveMap: screenTex,
      emissive: new THREE.Color(0xffffff),
      emissiveIntensity: 1.6,
      roughness: 0.15
    })
  );
  screen.position.z = depth * 0.55;
  screen.castShadow = true;

  group.add(frame, screen);
  group.rotation.set(rotX, rotY, rotZ);
  group.userData.isWallTvFallback = true;
  return group;
}

// --- Model Decor Instantiation ---
export function createDecorMesh(modelKey, targetSize, rotX = 0, rotY = 0, rotZ = 0) {
  let cached = modelCache[modelKey];
  if (!cached && modelKey === 'wall_flat_tv' && modelCache.led_tv) {
    cached = modelCache.led_tv;
  }
  if (!cached) {
    if (modelKey === 'wall_flat_tv') {
      return createWallTvFallbackMesh(targetSize, rotX, rotY, rotZ);
    }
    console.warn(`Model not loaded: ${modelKey}`);
    return new THREE.Group();
  }
  
  const clone = cached.clone();

  clone.traverse(child => {
    if (child.isMesh && child.material) {
      if (Array.isArray(child.material)) {
        child.material = child.material.map(m => m.clone());
      } else {
        child.material = child.material.clone();
      }
    }
  });
  
  const box = new THREE.Box3().setFromObject(clone);
  const size = new THREE.Vector3();
  box.getSize(size);
  
  let scaleFactor = 1;
  const isDisplay = modelKey === 'office_monitor' || modelKey === 'led_tv' || modelKey === 'wall_flat_tv';
  const targetW = targetSize.w ?? targetSize.h;

  if (isDisplay && targetW !== undefined) {
    const horizontal = modelKey === 'wall_flat_tv'
      ? Math.max(size.x, size.y, size.z)
      : Math.max(size.x, size.z);
    if (horizontal > 0) scaleFactor = targetW / horizontal;
  } else if (typeof targetSize === 'number') {
    scaleFactor = targetSize / Math.max(size.x, Math.max(size.y, size.z));
  } else if (targetSize.w !== undefined && size.x > 0) {
    scaleFactor = targetSize.w / size.x;
  } else if (targetSize.h !== undefined && size.y > 0) {
    scaleFactor = targetSize.h / size.y;
  } else if (targetSize.d !== undefined && size.z > 0) {
    scaleFactor = targetSize.d / size.z;
  }
  
  clone.scale.set(scaleFactor, scaleFactor, scaleFactor);
  
  const rotOffsets = ROTATION_OFFSETS[modelKey] || [0, 0, 0];
  clone.rotation.x = rotX + rotOffsets[0];
  clone.rotation.y = rotY;
  clone.rotation.z = rotZ + rotOffsets[2];

  if (modelKey === 'wall_flat_tv' && !modelCache.wall_flat_tv) {
    clone.rotation.y += Math.PI;
  }
  
  const isTV = modelKey === 'led_tv' || modelKey === 'wall_flat_tv';
  
  clone.traverse(child => {
    if (child.isMesh) {
      child.userData.catalogGeometry = true;
    }
  });

  clone.traverse(child => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
      
      if (child.material) {
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach(mat => {
          if (mat.roughness !== undefined) {
            mat.roughness = Math.max(0.2, mat.roughness);
          }
          
          const nameLower = child.name.toLowerCase();
          const matNameLower = mat.name ? mat.name.toLowerCase() : '';
          
          if (nameLower.includes('screen') || nameLower.includes('display') ||
              nameLower.includes('monitor') || nameLower.includes('layar') ||
              matNameLower.includes('screen') || matNameLower.includes('display') ||
              matNameLower.includes('layar') ||
              nameLower.includes('glass_tv') || nameLower.includes('led_tv') ||
              nameLower.includes('tv') || nameLower.includes('flat')) {
            
            mat.map = getScreenTexture(isTV);
            mat.emissiveMap = mat.map;
            mat.emissive = new THREE.Color(0xffffff);
            mat.emissiveIntensity = isTV ? 1.5 : 1.0;
            mat.needsUpdate = true;
          }
        });
      }
    }
  });
  
  return clone;
}

// --- Room floor material (white luxury tile plates) ───────────────────────────
const FLOOR_TILE_SIZE = 1.05;

function makeRoomFloorMaterial(floorW, floorD) {
  const tileMap = globalLuxuryTile.map.clone();
  const tileBump = globalLuxuryTile.bumpMap.clone();
  tileMap.wrapS = tileMap.wrapT = tileBump.wrapS = tileBump.wrapT = THREE.RepeatWrapping;
  tileMap.repeat.set(Math.max(1, floorW / FLOOR_TILE_SIZE), Math.max(1, floorD / FLOOR_TILE_SIZE));
  tileBump.repeat.copy(tileMap.repeat);
  return new THREE.MeshStandardMaterial({
    map: tileMap,
    bumpMap: tileBump,
    bumpScale: 0.006,
    roughness: 0.16,
    metalness: 0.08,
    color: 0xffffff
  });
}

// --- Empty room interior shell (lighting + floor accent, no furniture) ---
function setupRoomInterior(roomGroup, name, w, h, d, colorHex, wallThickness = 0.2) {
  const interiorGroup = new THREE.Group();
  interiorGroup.name = 'roomInterior';

  const floorTopY = -h / 2 + wallThickness;
  const floorY = floorTopY + 0.02;
  const inset = 0.12;
  const roomVolume = w * h * d;
  const innerW = w - wallThickness * 2;
  const innerD = d - wallThickness * 2;

  const floorMat = makeRoomFloorMaterial(innerW, innerD);
  const floorMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(innerW - inset * 2, innerD - inset * 2),
    floorMat
  );
  floorMesh.rotation.x = -Math.PI / 2;
  floorMesh.position.y = floorTopY + 0.006;
  floorMesh.receiveShadow = true;
  floorMesh.renderOrder = 2;
  interiorGroup.add(floorMesh);

  // Baseboard trim ring
  const trimMat = new THREE.MeshStandardMaterial({
    color: 0xeae8e4,
    roughness: 0.32,
    metalness: 0.04
  });
  const trimH = 0.08;
  const trimT = 0.04;
  const halfW = w / 2 - inset;
  const halfD = d / 2 - inset;
  const trimY = floorTopY + trimH / 2 + 0.01;

  [
    [w - inset * 2, trimT, trimH, 0, trimY, halfD - trimT / 2],
    [w - inset * 2, trimT, trimH, 0, trimY, -halfD + trimT / 2],
    [trimT, trimT, trimH, halfW - trimT / 2, trimY, 0],
    [trimT, trimT, trimH, -halfW + trimT / 2, trimY, 0]
  ].forEach(([tw, td, th, tx, ty, tz]) => {
    const trim = new THREE.Mesh(new THREE.BoxGeometry(tw, th, td), trimMat);
    trim.position.set(tx, ty, tz);
    trim.receiveShadow = true;
    interiorGroup.add(trim);
  });

  // Room-tinted lighting
  const lightIntensity = Math.min(2.0, 1.2 + roomVolume * 0.008);
  const lightRange = Math.max(w, d) * 2.5;

  if (w >= 6) {
    const lightL = new THREE.PointLight(colorHex, lightIntensity, lightRange);
    lightL.position.set(-w * 0.25, h / 2 - 0.3, 0);
    interiorGroup.add(lightL);
    const lightR = new THREE.PointLight(colorHex, lightIntensity, lightRange);
    lightR.position.set(w * 0.25, h / 2 - 0.3, 0);
    interiorGroup.add(lightR);
  } else {
    const light = new THREE.PointLight(colorHex, lightIntensity, lightRange);
    light.position.set(0, h / 2 - 0.3, 0);
    interiorGroup.add(light);
  }

  // User-placed furniture container
  const userFurniture = new THREE.Group();
  userFurniture.name = 'userFurniture';
  userFurniture.position.y = floorY;
  userFurniture.userData.roomName = name;
  userFurniture.userData.isUserFurniture = true;
  interiorGroup.add(userFurniture);

  roomGroup.add(interiorGroup);
  roomGroup.userData.userFurniture = userFurniture;
  roomGroup.userData.floorY = floorY;
}

// ─── Box factory ───────────────────────────────────────────────────────────────
export function createBox({ w, h, d, x, y, z, ry = 0, color, name, desc, windows = true }) {
  const group = new THREE.Group();
  group.position.set(x, y, z);
  group.rotation.y = ry;

  // Main body - Vibrant Stucco / Micro-cement
  const stucco = makeStuccoTexture(color);
  const mat = new THREE.MeshPhysicalMaterial({
    map: stucco.map,
    bumpMap: stucco.bumpMap,
    bumpScale: 0.008, // micro-imperfections
    roughness: 0.85,
    metalness: 0.0,
    clearcoat: 0.05,
    clearcoatRoughness: 0.8
  });

  const t = 0.2; // wall thickness

  if (windows) {
    const walls = new THREE.Group();
    
    // Lightweight architectural glass – no transmission render pass
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xaaddff,
      opacity: 0.25,
      transparent: true,
      metalness: 0.1,
      roughness: 0.05,
      envMapIntensity: 1.0,
      side: THREE.DoubleSide
    });

    // Helper to build a wall with N windows
    function buildWall(wallW, wallH, xPos, zPos, ry, isSide) {
      // 50% chance for side walls to have windows, front/back always have them
      const hasWindows = !isSide || Math.random() > 0.5;
      const wallGroup = new THREE.Group();
      wallGroup.position.set(xPos, 0, zPos);
      wallGroup.rotation.y = ry;

      if (!hasWindows) {
         const mesh = new THREE.Mesh(new THREE.BoxGeometry(wallW, wallH, t), mat);
         wallGroup.add(mesh);
         walls.add(wallGroup);
         return;
      }

      // 2 or 3 windows in a row
      const numWin = Math.random() > 0.5 ? 3 : 2;
      const margin = wallW * 0.12; // 12% margin on sides
      const gap = 0.3; // 30cm pillar width between windows
      const totalGap = gap * (numWin - 1);
      const wW = (wallW - (margin * 2) - totalGap) / numWin;
      const hW = wallH * 0.55; 
      
      const topH = (wallH - hW)/2;
      const botH = (wallH - hW)/2;
      
      const top = new THREE.Mesh(new THREE.BoxGeometry(wallW, topH, t), mat);
      top.position.set(0, wallH/2 - topH/2, 0);
      wallGroup.add(top);

      const bot = new THREE.Mesh(new THREE.BoxGeometry(wallW, botH, t), mat);
      bot.position.set(0, -wallH/2 + botH/2, 0);
      wallGroup.add(bot);

      // Pillars (left margin, gaps, right margin)
      for (let i = 0; i <= numWin; i++) {
        const pW = (i === 0 || i === numWin) ? margin : gap;
        let pX;
        if (i === 0) pX = -wallW/2 + margin/2;
        else if (i === numWin) pX = wallW/2 - margin/2;
        else {
          pX = -wallW/2 + margin + wW + gap/2 + (i-1)*(wW + gap);
        }
        const pillar = new THREE.Mesh(new THREE.BoxGeometry(pW, hW, t), mat);
        pillar.position.set(pX, 0, 0);
        wallGroup.add(pillar);
      }

      // Add Glass Panes
      for(let i=0; i<numWin; i++) {
        const gX = -wallW/2 + margin + wW/2 + i*(wW + gap);
        const glass = new THREE.Mesh(new THREE.PlaneGeometry(wW, hW), glassMat);
        // local +z points outward, so t/2 - 0.05 is slightly recessed
        glass.position.set(gX, 0, t/2 - 0.05); 
        wallGroup.add(glass);
      }
      
      walls.add(wallGroup);
    }

    // Front, Back, Left, Right walls
    buildWall(w, h, 0, d/2 - t/2, 0, false);            // Front
    buildWall(w, h, 0, -d/2 + t/2, Math.PI, false);       // Back
    buildWall(d - t*2, h, -w/2 + t/2, 0, -Math.PI/2, true); // Left
    buildWall(d - t*2, h, w/2 - t/2, 0, Math.PI/2, true);   // Right

    // Inner Tube Top and Bottom Floors
    const topGeo = new THREE.BoxGeometry(w - t*2, t, d - t*2);
    const botGeo = new THREE.BoxGeometry(w - t*2, t, d - t*2);

    const topMesh = new THREE.Mesh(topGeo, mat); topMesh.position.set(0, h/2 - t/2, 0); walls.add(topMesh);
    const botMesh = new THREE.Mesh(botGeo, makeRoomFloorMaterial(w - t * 2, d - t * 2));
    botMesh.position.set(0, -h/2 + t/2, 0);
    botMesh.receiveShadow = true;
    walls.add(botMesh);

    // Apply shadows and raycast data to all wall meshes
    walls.traverse(child => { 
      if (child.isMesh) {
        child.castShadow = true; 
        child.receiveShadow = true; 
        child.userData = { name, desc, color };
      }
    });
    group.add(walls);

    // Invisible block for mouse-hover label raycasting over the whole volume
    const hitGeo = new THREE.BoxGeometry(w, h, d);
    const hitMesh = new THREE.Mesh(hitGeo, new THREE.MeshBasicMaterial({visible: false}));
    hitMesh.userData = { name, desc, color, glowMat: mat, w, h, d, x, y, z, ry, roomId: slugifyRoomName(name) };
    group.add(hitMesh);
    boxData.push(hitMesh);


  } else {
    // Solid block if no windows
    const geo = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData = { name, desc, color, glowMat: mat, w, h, d, x, y, z, ry, roomId: slugifyRoomName(name) };
    group.add(mesh);
    boxData.push(mesh);
  }

  // Flat roof slab (for stacking look)
  const slabGeo = new THREE.BoxGeometry(w + 0.2, 0.18, d + 0.2);
  const slabMat = new THREE.MeshStandardMaterial({ color: 0x999999, roughness: 0.9 });
  const slab = new THREE.Mesh(slabGeo, slabMat);
  slab.position.y = h / 2 + 0.09;
  slab.castShadow = true;
  slab.receiveShadow = true;
  group.add(slab);
  setupRoomInterior(group, name, w, h, d, color, t);

  scene.add(group);
  return group;
}

// ─── Railing factory ──────────────────────────────────────────────────────────────
export function addRailing(x, y, z, length, axis = 'x', ry = 0) {
  const group = new THREE.Group();
  group.position.set(x, y, z);
  group.rotation.y = ry;

  const postH = 0.95;
  const spacing = 0.42;
  const count = Math.max(2, Math.round(length / spacing));

  // Powder-coated steel: semi-matte satin finish, bright crisp white
  const postMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.45, metalness: 0.1 });
  const railMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.40, metalness: 0.1 });

  // Vertical balusters — start AT slab surface (y=0 in group space)
  for (let i = 0; i <= count; i++) {
    const t = i / count;
    const postGeo = new THREE.CylinderGeometry(0.022, 0.022, postH, 8);
    const post = new THREE.Mesh(postGeo, postMat);
    if (axis === 'x') post.position.set(t * length - length / 2, postH / 2, 0);
    else               post.position.set(0, postH / 2, t * length - length / 2);
    post.castShadow = true;
    group.add(post);
  }

  // Top handrail
  const topGeo = new THREE.CylinderGeometry(0.035, 0.035, length, 8);
  if (axis === 'x') topGeo.rotateZ(Math.PI / 2);
  else              topGeo.rotateX(Math.PI / 2);
  const topRail = new THREE.Mesh(topGeo, railMat);
  topRail.position.y = postH;
  group.add(topRail);

  // Mid horizontal rail
  const midGeo = new THREE.CylinderGeometry(0.018, 0.018, length, 8);
  if (axis === 'x') midGeo.rotateZ(Math.PI / 2);
  else              midGeo.rotateX(Math.PI / 2);
  const midRail = new THREE.Mesh(midGeo, railMat);
  midRail.position.y = postH * 0.5;
  group.add(midRail);

  scene.add(group);
  return group;
}

// ─── Staircase factory ──────────────────────────────────────────────────────────────
export function addStaircase(x, yBottom, yTop, z, ry = 0) {
  const group = new THREE.Group();
  group.position.set(x, yBottom, z);
  group.rotation.y = ry;

  const totalH   = yTop - yBottom;
  const steps    = Math.max(4, Math.round(totalH / 0.29));
  const stepH    = totalH / steps;
  const stepD    = 0.40;
  const stepW    = 2.0;
  const totalD   = steps * stepD;

  const treadMat = new THREE.MeshStandardMaterial({ color: 0xcecac3, roughness: 0.85 });
  const slabMat  = new THREE.MeshStandardMaterial({ color: 0xbcb8b1, roughness: 0.9 });
  const postMat  = new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.2, metalness: 0.75 });
  const railMat  = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.15, metalness: 0.85 });

  for (let i = 0; i < steps; i++) {
    const tGeo = new THREE.BoxGeometry(stepW, 0.06, stepD + 0.03);
    const tMesh = new THREE.Mesh(tGeo, treadMat);
    tMesh.position.set(0, (i + 1) * stepH - 0.03, -(i + 0.5) * stepD);
    tMesh.castShadow = true; tMesh.receiveShadow = true;
    group.add(tMesh);

    const rGeo = new THREE.BoxGeometry(stepW, stepH, 0.03);
    const rMesh = new THREE.Mesh(rGeo, treadMat);
    rMesh.position.set(0, (i + 0.5) * stepH, -i * stepD - stepD);
    rMesh.castShadow = true;
    group.add(rMesh);
  }

  const slantAngle = Math.atan2(totalH, totalD);
  const slantLen   = Math.sqrt(totalH * totalH + totalD * totalD);
  const sGeo  = new THREE.BoxGeometry(stepW - 0.2, 0.22, slantLen);
  const sMesh = new THREE.Mesh(sGeo, slabMat);
  sMesh.rotation.x = -slantAngle;
  sMesh.position.set(0, totalH / 2 - 0.12, -totalD / 2);
  sMesh.castShadow = true; sMesh.receiveShadow = true;
  group.add(sMesh);

  [-(stepW / 2 - 0.05), (stepW / 2 - 0.05)].forEach(px => {
    const postCount = Math.floor(steps / 2);
    for (let i = 0; i <= postCount; i++) {
      const t  = i / postCount;
      const pg = new THREE.CylinderGeometry(0.02, 0.02, 0.95, 8);
      const pm = new THREE.Mesh(pg, postMat);
      pm.position.set(px, t * totalH + 0.475, -t * totalD);
      pm.castShadow = true;
      group.add(pm);
    }
    const hrGeo = new THREE.BoxGeometry(0.04, 0.04, slantLen);
    const hr    = new THREE.Mesh(hrGeo, railMat);
    hr.rotation.x = -slantAngle;
    hr.position.set(px, totalH / 2 + 0.95, -totalD / 2);
    group.add(hr);
  });

  scene.add(group);
}

// ─── Plant factory ─────────────────────────────────────────────────────────────
export function addPlant(x, y, z, scale = 1) {
  const group = new THREE.Group();
  group.position.set(x, y, z);

  // pot
  const potGeo = new THREE.CylinderGeometry(0.2 * scale, 0.15 * scale, 0.3 * scale, 8);
  const potMat = new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.9 });
  const pot = new THREE.Mesh(potGeo, potMat);
  pot.position.y = 0.15 * scale;
  group.add(pot);

  // trunk
  const trunkGeo = new THREE.CylinderGeometry(0.05 * scale, 0.07 * scale, 1.2 * scale, 6);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5C3D11, roughness: 1 });
  const trunk = new THREE.Mesh(trunkGeo, trunkMat);
  trunk.position.y = (0.3 + 0.6) * scale;
  group.add(trunk);

  // leaves (layered cones)
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x2d7a1f, roughness: 0.9 });
  const leafMat2 = new THREE.MeshStandardMaterial({ color: 0x3aad28, roughness: 0.9 });
  const leafSizes = [[0.7, 0.55, leafMat], [0.55, 0.5, leafMat2], [0.4, 0.45, leafMat]];
  leafSizes.forEach(([r, h, mat], i) => {
    const lg = new THREE.ConeGeometry(r * scale, h * scale, 8);
    const lm = new THREE.Mesh(lg, mat);
    lm.position.y = (1.2 + 0.3 + i * 0.3) * scale;
    group.add(lm);
  });

  scene.add(group);
  return group;
}

// ─── Dome ceiling ──────────────────────────────────────────────────────────────
export function buildDome() {
  // Dome shell – rendered from inside
  globalRawConcrete.map.repeat.set(6, 6);
  globalRawConcrete.bumpMap.repeat.set(6, 6);
  const domeMat = new THREE.MeshStandardMaterial({
    map: globalRawConcrete.map,
    bumpMap: globalRawConcrete.bumpMap,
    bumpScale: 0.02,
    roughness: 0.95,
    metalness: 0.0,
    side: THREE.BackSide,
  });
  const domeGeo = new THREE.SphereGeometry(34, 32, 16, 0, Math.PI * 2, 0, Math.PI / 1.9);
  const dome = new THREE.Mesh(domeGeo, domeMat);
  dome.position.y = 0;
  scene.add(dome);

  // Thick radial ribs converging at peak
  const ribMat = new THREE.MeshStandardMaterial({ 
    map: globalRawConcrete.map, bumpMap: globalRawConcrete.bumpMap, bumpScale: 0.02, roughness: 0.9 
  });
  const ribCount = 10;
  for (let i = 0; i < ribCount; i++) {
    const angle = (i / ribCount) * Math.PI * 2;
    const ribGeo = new THREE.BoxGeometry(0.5, 0.4, 36);
    const rib = new THREE.Mesh(ribGeo, ribMat);
    rib.position.set(Math.sin(angle) * 15, 10, Math.cos(angle) * 15);
    rib.lookAt(0, 27, 0);
    rib.castShadow = true;
    scene.add(rib);
  }

  // Ring beam at mid-dome
  const ringGeo = new THREE.TorusGeometry(18, 0.35, 8, 60);
  const ringMat = new THREE.MeshStandardMaterial({ color: 0x9a9088, roughness: 0.9 });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.position.y = 8;
  ring.rotation.x = Math.PI / 2;
  scene.add(ring);

  // Second ring near top
  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(8, 0.25, 8, 48), ringMat);
  ring2.position.y = 20;
  ring2.rotation.x = Math.PI / 2;
  scene.add(ring2);

  // Central oculus warm glow
  const ocuGeo = new THREE.CircleGeometry(3.5, 40);
  const ocuMat = new THREE.MeshStandardMaterial({
    color: 0xfff8e8,
    emissive: new THREE.Color(0xffe8a0),
    emissiveIntensity: 2.0,
    side: THREE.DoubleSide,
  });
  const ocu = new THREE.Mesh(ocuGeo, ocuMat);
  ocu.rotation.x = Math.PI / 2;
  ocu.position.y = 30;
  scene.add(ocu);

  // Warm oculus point light
  const ocus = new THREE.PointLight(0xfff0c0, 3.0, 50, 1.2);
  ocus.position.set(0, 28, 0);
  scene.add(ocus);

  // Structural concrete columns around perimeter
  const colMat = new THREE.MeshStandardMaterial({ color: 0xb0a898, roughness: 0.9 });
  const colCount = 12;
  for (let i = 0; i < colCount; i++) {
    const a = (i / colCount) * Math.PI * 2;
    const colGeo = new THREE.CylinderGeometry(0.45, 0.55, 18, 8);
    const col = new THREE.Mesh(colGeo, colMat);
    col.position.set(Math.sin(a) * 24, 3, Math.cos(a) * 24);
    col.castShadow = true;
    col.receiveShadow = true;
    scene.add(col);
  }


}

export function addFloor() {
  const floorGeo = new THREE.CircleGeometry(32, 64);
  const tileMap = globalLuxuryTile.map.clone();
  const tileBump = globalLuxuryTile.bumpMap.clone();
  tileMap.wrapS = tileMap.wrapT = tileBump.wrapS = tileBump.wrapT = THREE.RepeatWrapping;
  tileMap.repeat.set(24, 24);
  tileBump.repeat.copy(tileMap.repeat);
  const floorMat = new THREE.MeshStandardMaterial({
    map: tileMap,
    bumpMap: tileBump,
    bumpScale: 0.005,
    roughness: 0.18,
    metalness: 0.07,
    color: 0xffffff
  });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -6.02;
  floor.receiveShadow = true;
  scene.add(floor);

  // Upper balcony ring
  const walkMat = new THREE.MeshStandardMaterial({ color: 0xd0c8be, roughness: 0.85 });
  const walk2Geo = new THREE.RingGeometry(14, 17, 64);
  const walk2 = new THREE.Mesh(walk2Geo, walkMat);
  walk2.rotation.x = -Math.PI / 2;
  walk2.position.y = 4.5;
  walk2.receiveShadow = true;
  scene.add(walk2);
}

// ─── TUMO Sign (logo image) ────────────────────────────────────────────────────
const tumoLogoLoader = new THREE.TextureLoader();
let tumoLogoTexture = null;

/** Strip solid black PNG background so only the white wordmark remains. */
function buildTransparentLogoTexture(img) {
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);

  const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < data.length; i += 4) {
    const lum = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    if (lum < 55) {
      data[i + 3] = 0;
    } else {
      data[i] = 255;
      data[i + 1] = 255;
      data[i + 2] = 255;
      data[i + 3] = Math.min(255, Math.round((lum - 55) * 4.5));
    }
  }
  ctx.putImageData(new ImageData(data, width, height), 0, 0);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

function loadTumoLogo(onLoad) {
  if (tumoLogoTexture) {
    onLoad(tumoLogoTexture);
    return;
  }
  tumoLogoLoader.load('./tumo.png', (tex) => {
    tumoLogoTexture = buildTransparentLogoTexture(tex.image);
    onLoad(tumoLogoTexture);
  });
}

function makeLogoMaterial(tex, { glow = false, opacity = 1 } = {}) {
  return new THREE.MeshBasicMaterial({
    map: tex,
    color: glow ? new THREE.Color(0xffaa44) : 0xffffff,
    transparent: true,
    opacity,
    alphaTest: 0.08,
    depthWrite: !glow,
    blending: glow ? THREE.AdditiveBlending : THREE.NormalBlending,
    side: THREE.DoubleSide
  });
}

export function addTUMOSign(x, y, z, ry = 0) {
  const group = new THREE.Group();
  group.position.set(x, y, z);
  group.rotation.y = ry;
  scene.add(group);

  loadTumoLogo((tex) => {
    const img = tex.image;
    const aspect = img?.width && img?.height ? img.width / img.height : 4;
    const signH = 0.85;
    const signW = signH * aspect;

    const glowLayers = [
      { scale: 1.18, opacity: 0.22, z: -0.04 },
      { scale: 1.1, opacity: 0.45, z: -0.025 },
      { scale: 1.04, opacity: 0.7, z: -0.012 }
    ];

    glowLayers.forEach(({ scale, opacity, z }) => {
      const glow = new THREE.Mesh(
        new THREE.PlaneGeometry(signW * scale, signH * scale),
        makeLogoMaterial(tex, { glow: true, opacity })
      );
      glow.position.z = z;
      group.add(glow);
    });

    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(signW, signH),
      makeLogoMaterial(tex, { glow: false })
    );
    sign.position.z = 0.01;
    group.add(sign);

    group.userData.tumoGlowMeshes = [...group.children].filter(c => c !== sign);
    group.userData.tumoGlowBase = glowLayers.map(g => g.opacity);
  });

  return group;
}
