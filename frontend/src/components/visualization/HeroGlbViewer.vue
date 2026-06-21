<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const props = withDefaults(
  defineProps<{
    src?: string
    /** Uniform scale applied after auto-fit. */
    scale?: number
    /** Offset from the auto-centered origin (meters). */
    offsetX?: number
    offsetY?: number
    offsetZ?: number
    /** Y-axis rotation in radians. */
    rotationY?: number
    autoRotate?: boolean
    /** Subtle cursor follow inside the hero section. */
    mouseParallax?: boolean
  }>(),
  {
    src: '/models/hero-scene.glb',
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    offsetZ: 0,
    rotationY: 0,
    autoRotate: false,
    mouseParallax: false,
  },
)

const host = ref<HTMLElement | null>(null)

let renderer: THREE.WebGLRenderer | null = null
let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let controls: OrbitControls | null = null
let modelRoot: THREE.Object3D | null = null
let modelPivot: THREE.Group | null = null
let baseMaxDim = 1
let raf = 0
let resizeObserver: ResizeObserver | null = null
let parallaxArea: HTMLElement | null = null

const mouseTarget = { x: 0, y: 0 }
const mouseCurrent = { x: 0, y: 0 }
const PARALLAX_MOVE = 0.022
const PARALLAX_TILT = 0.016
const PARALLAX_LERP = 0.06

function applyModelTransform() {
  if (!modelPivot) return
  const fitScale = (2.2 / baseMaxDim) * props.scale
  modelPivot.scale.setScalar(fitScale)
  modelPivot.position.set(
    props.offsetX + mouseCurrent.x * PARALLAX_MOVE,
    props.offsetY - mouseCurrent.y * PARALLAX_MOVE * 0.65,
    props.offsetZ,
  )
  modelPivot.rotation.x = mouseCurrent.y * PARALLAX_TILT
  modelPivot.rotation.y = props.rotationY + mouseCurrent.x * PARALLAX_TILT
}

function mountModel(object: THREE.Object3D) {
  const box = new THREE.Box3().setFromObject(object)
  const center = box.getCenter(new THREE.Vector3())
  object.position.sub(center)

  const size = box.getSize(new THREE.Vector3())
  baseMaxDim = Math.max(size.x, size.y, size.z) || 1

  modelPivot = new THREE.Group()
  modelRoot = object
  modelPivot.add(object)
  applyModelTransform()
  scene!.add(modelPivot)
}

function resize() {
  if (!host.value || !renderer || !camera) return
  const { clientWidth, clientHeight } = host.value
  if (!clientWidth || !clientHeight) return
  camera.aspect = clientWidth / clientHeight
  camera.updateProjectionMatrix()
  renderer.setSize(clientWidth, clientHeight, false)
}

function animate() {
  if (props.mouseParallax) {
    mouseCurrent.x += (mouseTarget.x - mouseCurrent.x) * PARALLAX_LERP
    mouseCurrent.y += (mouseTarget.y - mouseCurrent.y) * PARALLAX_LERP
    applyModelTransform()
  }

  if (props.autoRotate && modelPivot) {
    modelPivot.rotation.y += 0.004
  }
  controls?.update()
  renderer?.render(scene!, camera!)
  raf = requestAnimationFrame(animate)
}

function updateMouseTarget(clientX: number, clientY: number) {
  if (!parallaxArea) return
  const rect = parallaxArea.getBoundingClientRect()
  if (!rect.width || !rect.height) return
  mouseTarget.x = Math.max(-1, Math.min(1, ((clientX - rect.left) / rect.width) * 2 - 1))
  mouseTarget.y = Math.max(-1, Math.min(1, ((clientY - rect.top) / rect.height) * 2 - 1))
}

function onMouseMove(event: MouseEvent) {
  updateMouseTarget(event.clientX, event.clientY)
}

function onMouseLeave() {
  mouseTarget.x = 0
  mouseTarget.y = 0
}

function bindMouseParallax() {
  if (!props.mouseParallax || !host.value) return
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  parallaxArea = host.value.closest('.hero') ?? host.value
  parallaxArea.addEventListener('mousemove', onMouseMove)
  parallaxArea.addEventListener('mouseleave', onMouseLeave)
}

function unbindMouseParallax() {
  parallaxArea?.removeEventListener('mousemove', onMouseMove)
  parallaxArea?.removeEventListener('mouseleave', onMouseLeave)
  parallaxArea = null
  mouseTarget.x = 0
  mouseTarget.y = 0
  mouseCurrent.x = 0
  mouseCurrent.y = 0
}

function dispose() {
  cancelAnimationFrame(raf)
  unbindMouseParallax()
  resizeObserver?.disconnect()
  controls?.dispose()
  modelRoot?.traverse((child) => {
    const mesh = child as THREE.Mesh
    if (mesh.isMesh) {
      mesh.geometry?.dispose()
      const mat = mesh.material
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose())
      else mat?.dispose()
    }
  })
  renderer?.dispose()
  renderer = null
  scene = null
  camera = null
  controls = null
  modelRoot = null
  modelPivot = null
}

function init() {
  if (!host.value) return

  scene = new THREE.Scene()
  scene.background = null

  camera = new THREE.PerspectiveCamera(38, 1, 0.01, 100)
  camera.position.set(0, 0.35, 1.75)

  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    premultipliedAlpha: false,
  })
  renderer.setClearColor(0x000000, 0)
  renderer.domElement.style.border = 'none'
  renderer.domElement.style.outline = 'none'
  renderer.domElement.style.boxShadow = 'none'
  renderer.domElement.style.background = 'transparent'
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.05
  host.value.appendChild(renderer.domElement)

  scene.add(new THREE.AmbientLight(0xffffff, 0.85))
  const key = new THREE.DirectionalLight(0xffffff, 1.15)
  key.position.set(2, 4, 3)
  scene.add(key)
  const fill = new THREE.DirectionalLight(0x9fd4ff, 0.45)
  fill.position.set(-3, 1, -2)
  scene.add(fill)

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.06
  controls.enablePan = false
  controls.enableRotate = !props.mouseParallax
  controls.enableZoom = false
  controls.minDistance = 0.6
  controls.maxDistance = 5
  controls.target.set(0, 0.08, 0)

  const loader = new GLTFLoader()
  loader.load(
    props.src,
    (gltf) => {
      mountModel(gltf.scene)
    },
    undefined,
    () => {
      /* keep empty canvas on load failure */
    },
  )

  resize()
  resizeObserver = new ResizeObserver(resize)
  resizeObserver.observe(host.value)
  bindMouseParallax()
  animate()
}

onMounted(init)
onBeforeUnmount(dispose)

watch(
  () => [props.scale, props.offsetX, props.offsetY, props.offsetZ, props.rotationY],
  () => applyModelTransform(),
)
</script>

<template>
  <div ref="host" class="hero-glb" aria-hidden="true" />
</template>

<style scoped>
.hero-glb {
  width: 100%;
  height: 100%;
  overflow: visible;
  background: transparent;
  border: none;
  outline: none;
  box-shadow: none;
}
.hero-glb :deep(canvas) {
  display: block;
  width: 100% !important;
  height: 100% !important;
  background: transparent !important;
  border: none !important;
  outline: none !important;
  box-shadow: none !important;
}
</style>
