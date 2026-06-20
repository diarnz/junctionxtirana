import * as THREE from 'three';
import { createDecorMesh, getDefaultScale, applyModelRotY } from './factories.js';

const THUMB_SIZE = 128;
const cache = new Map();

let renderer = null;
let scene = null;
let camera = null;
let modelSlot = null;

function init() {
  if (renderer) return;
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setSize(THUMB_SIZE, THUMB_SIZE);
  renderer.setPixelRatio(1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  scene = new THREE.Scene();
  modelSlot = new THREE.Group();
  scene.add(modelSlot);

  scene.add(new THREE.AmbientLight(0xffffff, 0.75));
  const key = new THREE.DirectionalLight(0xffffff, 1.15);
  key.position.set(2.5, 4, 3);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xaaccff, 0.35);
  fill.position.set(-2, 1, -1);
  scene.add(fill);

  camera = new THREE.PerspectiveCamera(32, 1, 0.05, 30);
}

function clearModelSlot() {
  while (modelSlot.children.length) {
    const child = modelSlot.children[0];
    modelSlot.remove(child);
    child.traverse(c => {
      if (c.isMesh && c.geometry) c.geometry.dispose();
    });
  }
}

export function renderModelThumbnail(modelKey) {
  if (cache.has(modelKey)) return cache.get(modelKey);
  init();

  clearModelSlot();

  const mesh = createDecorMesh(modelKey, getDefaultScale(modelKey), 0, Math.PI / 5, 0);
  applyModelRotY(mesh, modelKey, Math.PI / 5);
  const box = new THREE.Box3().setFromObject(mesh);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  mesh.position.sub(center);
  mesh.position.y += size.y * 0.08;
  modelSlot.add(mesh);

  const maxDim = Math.max(size.x, size.y, size.z, 0.01);
  camera.position.set(maxDim * 1.05, maxDim * 0.72, maxDim * 1.35);
  camera.lookAt(0, size.y * 0.05, 0);
  camera.updateProjectionMatrix();

  renderer.render(scene, camera);
  const url = renderer.domElement.toDataURL('image/png');
  cache.set(modelKey, url);
  return url;
}

export function preloadAllThumbnails(keys, onProgress) {
  keys.forEach((key, i) => {
    renderModelThumbnail(key);
    onProgress?.(i + 1, keys.length, key);
  });
}
