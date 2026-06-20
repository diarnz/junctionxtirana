import * as THREE from 'three';
import { createDecorMesh, getDefaultScale } from './factories.js';

const SPRITE_SIZE = 256;
const cache = new Map();
const imageCache = new Map();

let renderer = null;
let scene = null;
let camera = null;
let modelSlot = null;

function init() {
  if (renderer) return;
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setSize(SPRITE_SIZE, SPRITE_SIZE);
  renderer.setPixelRatio(1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;

  scene = new THREE.Scene();
  modelSlot = new THREE.Group();
  scene.add(modelSlot);

  scene.add(new THREE.AmbientLight(0xffffff, 1.05));
  const top = new THREE.DirectionalLight(0xffffff, 0.65);
  top.position.set(0, 12, 0);
  scene.add(top);
  const rim = new THREE.DirectionalLight(0xc8d8ff, 0.35);
  rim.position.set(4, 6, -3);
  scene.add(rim);

  camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.05, 80);
  camera.position.set(0, 20, 0);
  camera.up.set(0, 0, -1);
  camera.lookAt(0, 0, 0);
}

function clearSlot() {
  while (modelSlot.children.length) {
    const child = modelSlot.children[0];
    modelSlot.remove(child);
    child.traverse(node => {
      if (node.isMesh && node.geometry) node.geometry.dispose();
    });
  }
}

/** Orthographic top-down PNG + footprint (meters, X×Z). */
export function renderModelTopView(modelKey) {
  if (cache.has(modelKey)) return cache.get(modelKey);

  init();
  clearSlot();

  const mesh = createDecorMesh(modelKey, getDefaultScale(modelKey), 0, 0, 0);
  const box = new THREE.Box3().setFromObject(mesh);
  const center = box.getCenter(new THREE.Vector3());
  mesh.position.sub(center);
  modelSlot.add(mesh);

  const size = box.getSize(new THREE.Vector3());
  const pad = Math.max(size.x, size.z) * 0.12;
  const half = Math.max(size.x, size.z) * 0.5 + pad;

  camera.left = -half;
  camera.right = half;
  camera.top = half;
  camera.bottom = -half;
  camera.updateProjectionMatrix();

  renderer.render(scene, camera);

  const meta = {
    url: renderer.domElement.toDataURL('image/png'),
    w: Math.max(size.x, 0.15),
    d: Math.max(size.z, 0.15),
    isWall: false
  };
  cache.set(modelKey, meta);
  return meta;
}

export function loadTopViewImage(modelKey) {
  if (imageCache.has(modelKey)) return imageCache.get(modelKey);

  const meta = renderModelTopView(modelKey);
  const img = new Image();
  const promise = new Promise((resolve, reject) => {
    img.onload = () => resolve({ img, ...meta });
    img.onerror = reject;
    img.src = meta.url;
  });
  imageCache.set(modelKey, promise);
  return promise;
}

export function preloadTopViews(modelKeys) {
  return Promise.all(modelKeys.map(key => loadTopViewImage(key).catch(() => null)));
}
