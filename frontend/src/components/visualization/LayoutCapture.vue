<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import type { RoomLayoutItem } from '@/types'

const props = withDefaults(
  defineProps<{
    roomId?: string | null
    items?: RoomLayoutItem[]
    planImage?: string | null
    show2d?: boolean
    show3d?: boolean
  }>(),
  {
    roomId: null,
    items: () => [],
    planImage: null,
    show2d: true,
    show3d: true,
  },
)

const threeDUrl = import.meta.env.VITE_THREE_D_URL ?? 'http://localhost:3000'

const plan2d = ref<string | null>(null)
const planLoading = ref(false)
const showcaseLoading = ref(true)

const planFrame = ref<HTMLIFrameElement | null>(null)
const showcaseFrame = ref<HTMLIFrameElement | null>(null)
let planReadyHandler: ((e: MessageEvent) => void) | null = null
let showcaseReadyHandler: ((e: MessageEvent) => void) | null = null
let planRetryTimer: ReturnType<typeof setTimeout> | null = null
let showcaseRetryTimer: ReturnType<typeof setTimeout> | null = null

const planViewUrl = computed(() => {
  if (!props.roomId) return ''
  const url = new URL(`${threeDUrl}/plan-view.html`)
  url.searchParams.set('roomId', props.roomId)
  return url.toString()
})

const showcaseViewUrl = computed(() => {
  if (!props.roomId) return ''
  const url = new URL(threeDUrl)
  url.searchParams.set('mode', 'showcase')
  url.searchParams.set('roomId', props.roomId)
  return url.toString()
})

const plan2dDisplay = computed(() => plan2d.value || props.planImage || null)

function cloneItems() {
  return JSON.parse(JSON.stringify(props.items ?? [])) as RoomLayoutItem[]
}

function sendPlanItems() {
  if (!planFrame.value?.contentWindow || !props.roomId) return
  planFrame.value.contentWindow.postMessage(
    { type: 'SET_PLAN_ITEMS', payload: { roomId: props.roomId, items: cloneItems() } },
    '*',
  )
}

function sendShowcaseItems() {
  if (!showcaseFrame.value?.contentWindow || !props.roomId) return
  showcaseFrame.value.contentWindow.postMessage(
    { type: 'SET_PLAN_ITEMS', payload: { roomId: props.roomId, items: cloneItems() } },
    '*',
  )
}

function scheduleRetries(send: () => void, timerRef: 'plan' | 'showcase') {
  const existing = timerRef === 'plan' ? planRetryTimer : showcaseRetryTimer
  if (existing) clearTimeout(existing)
  let attempt = 0
  const tick = () => {
    send()
    attempt += 1
    if (attempt < 10) {
      const t = setTimeout(tick, 500 * attempt)
      if (timerRef === 'plan') planRetryTimer = t
      else showcaseRetryTimer = t
    }
  }
  tick()
}

function setupListeners() {
  if (planReadyHandler) window.removeEventListener('message', planReadyHandler)
  planReadyHandler = (event: MessageEvent) => {
    if (event.data?.type !== 'PLAN_VIEW_READY') return
    if (event.data.payload?.roomId && event.data.payload.roomId !== props.roomId) return
    planLoading.value = false
    sendPlanItems()
  }
  window.addEventListener('message', planReadyHandler)

  if (showcaseReadyHandler) window.removeEventListener('message', showcaseReadyHandler)
  showcaseReadyHandler = (event: MessageEvent) => {
    if (event.data?.type !== 'SHOWCASE_VIEW_READY') return
    if (event.data.payload?.roomId && event.data.payload.roomId !== props.roomId) return
    showcaseLoading.value = false
    sendShowcaseItems()
  }
  window.addEventListener('message', showcaseReadyHandler)
}

function onPlanFrameLoad() {
  planLoading.value = true
  scheduleRetries(sendPlanItems, 'plan')
}

function onShowcaseFrameLoad() {
  showcaseLoading.value = true
  scheduleRetries(sendShowcaseItems, 'showcase')
}

function refresh() {
  plan2d.value = props.planImage ?? null
  planLoading.value = Boolean(props.roomId && !plan2dDisplay.value)
  showcaseLoading.value = Boolean(props.roomId)
  scheduleRetries(sendPlanItems, 'plan')
  scheduleRetries(sendShowcaseItems, 'showcase')
}

onMounted(() => {
  plan2d.value = props.planImage ?? null
  setupListeners()
})

onBeforeUnmount(() => {
  if (planReadyHandler) window.removeEventListener('message', planReadyHandler)
  if (showcaseReadyHandler) window.removeEventListener('message', showcaseReadyHandler)
  if (planRetryTimer) clearTimeout(planRetryTimer)
  if (showcaseRetryTimer) clearTimeout(showcaseRetryTimer)
})

watch(
  () => [props.roomId, props.items, props.planImage],
  () => {
    plan2d.value = props.planImage ?? null
    refresh()
  },
  { deep: true },
)
</script>

<template>
  <div class="lc">
    <div class="lc__grid" :class="{ 'lc__grid--single': !(show2d && show3d) }">
      <figure v-if="show2d" class="lc__panel">
        <figcaption class="lc__cap">2D floor plan</figcaption>
        <div class="lc__media lc__media--plan">
          <img v-if="plan2dDisplay" :src="plan2dDisplay" alt="2D floor plan" class="lc__plan-img" />
          <iframe
            v-else-if="roomId"
            ref="planFrame"
            :src="planViewUrl"
            class="lc__embed-frame"
            title="2D floor plan"
            @load="onPlanFrameLoad"
          />
          <div v-else class="lc__placeholder">
            <span>No layout saved.</span>
          </div>
          <div v-if="planLoading && !plan2dDisplay && roomId" class="lc__overlay">
            <div class="spinner" />
          </div>
        </div>
      </figure>

      <figure v-if="show3d" class="lc__panel">
        <figcaption class="lc__cap">3D view from inside</figcaption>
        <div class="lc__media lc__media--3d">
          <iframe
            v-if="roomId"
            ref="showcaseFrame"
            :src="showcaseViewUrl"
            class="lc__embed-frame"
            title="3D room showcase"
            @load="onShowcaseFrameLoad"
          />
          <div v-else class="lc__placeholder lc__placeholder--dark">
            <span>No layout saved.</span>
          </div>
          <div v-if="showcaseLoading && roomId" class="lc__overlay">
            <div class="spinner" />
          </div>
        </div>
      </figure>
    </div>

    <div class="lc__foot">
      <span v-if="(planLoading && show2d) || (showcaseLoading && show3d)" class="lc__status">
        Loading your layout…
      </span>
      <button
        type="button"
        class="button button-secondary button-sm"
        :disabled="!roomId"
        @click="refresh"
      >
        Refresh visuals
      </button>
    </div>
  </div>
</template>

<style scoped>
.lc {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.lc__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-4);
}
.lc__grid--single {
  grid-template-columns: 1fr;
}
.lc__panel {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.lc__cap {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-tertiary);
}
.lc__media {
  position: relative;
  border: 1px solid var(--border-light);
  border-radius: var(--radius-lg);
  overflow: hidden;
  aspect-ratio: 16 / 11;
  display: grid;
  place-items: stretch;
}
.lc__media--plan {
  background: #08080c;
}
.lc__media--3d {
  background: #07070c;
}
.lc__embed-frame {
  width: 100%;
  height: 100%;
  min-height: 220px;
  border: 0;
  display: block;
  pointer-events: none;
}
.lc__plan-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}
.lc__overlay {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  background: rgba(8, 8, 12, 0.55);
  pointer-events: none;
}
.lc__placeholder {
  display: grid;
  place-items: center;
  gap: var(--space-2);
  color: var(--text-tertiary);
  font-size: 0.86rem;
  padding: var(--space-4);
  text-align: center;
}
.lc__placeholder--dark {
  color: rgba(255, 255, 255, 0.5);
}
.lc__foot {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--space-3);
}
.lc__status {
  font-size: 0.82rem;
  color: var(--text-tertiary);
}
@media (max-width: 720px) {
  .lc__grid {
    grid-template-columns: 1fr;
  }
}
</style>
