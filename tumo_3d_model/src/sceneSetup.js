import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111118);
scene.fog = new THREE.Fog(0x111118, 40, 90);

export const OUTDOOR_FOV = 48;
export const INDOOR_FOV = 40;

export const camera = new THREE.PerspectiveCamera(OUTDOOR_FOV, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(0, 0.5, 20.5);

export function setCameraFov(fov) {
  camera.fov = fov;
  camera.updateProjectionMatrix();
}

export const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;

const container = document.getElementById('canvas-container');
container.appendChild(renderer.domElement);

export const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 6;
controls.maxDistance = 55;
controls.target.set(0, -1.5, 0);
controls.update();

export function setupLighting() {
  const ambient = new THREE.AmbientLight(0xfff5e0, 0.6);
  scene.add(ambient);

  // Main warm overhead light (simulating dome light from above)
  const domeLight = new THREE.PointLight(0xfff3cc, 2.5, 60, 1.5);
  domeLight.position.set(0, 20, 0);
  domeLight.castShadow = true;
  scene.add(domeLight);

  // Fill lights
  const fillA = new THREE.PointLight(0xff6622, 1.2, 30);
  fillA.position.set(-8, 2, 5);
  scene.add(fillA);

  const fillB = new THREE.PointLight(0x2266ff, 0.8, 30);
  fillB.position.set(8, 4, -3);
  scene.add(fillB);

  const groundBounce = new THREE.HemisphereLight(0x334455, 0x221100, 0.5);
  scene.add(groundBounce);

  return domeLight;
}
