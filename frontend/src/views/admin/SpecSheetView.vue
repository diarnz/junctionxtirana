<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'

import {
  bookingsApi,
  layoutsApi,
  requestsApi,
  reservationsApi,
} from '@/api/client'
import { countItems } from '@/lib/layoutCatalog'
import type {
  BookingPreviewResponse,
  EventRequestDetail,
  ReservationResponse,
  RoomLayoutResponse,
} from '@/types'

const route = useRoute()
const requestId = computed(() => String(route.params.id))

const detail = ref<EventRequestDetail | null>(null)
const layout = ref<RoomLayoutResponse | null>(null)
const reservations = ref<ReservationResponse[]>([])
const pricing = ref<BookingPreviewResponse | null>(null)
const plan2d = ref<string | null>(null)
const snapshot3d = ref<string | null>(null)
const capturing = ref(false)
const loading = ref(true)

const threeDUrl = import.meta.env.VITE_THREE_D_URL ?? 'http://localhost:3000'

const roomId = computed(
  () => layout.value?.three_d_room_id ?? detail.value?.venue?.three_d_room_id ?? null,
)

const layoutCounts = computed(() => countItems(layout.value?.items_json ?? []))

const generatedAt = new Date().toLocaleString()

function fmtTime(t?: string | null) {
  return t ? t.slice(0, 5) : '—'
}

function reservedFor(modelKeyLabel: string): ReservationResponse | undefined {
  return reservations.value.find((r) => r.asset_name === modelKeyLabel)
}

async function loadPricing() {
  if (!layout.value || !detail.value) return
  const rid = layout.value.three_d_room_id
  if (!rid) return
  try {
    pricing.value = await bookingsApi.preview({
      three_d_room_id: rid,
      requested_date: detail.value.requested_date,
      start_time: `${fmtTime(detail.value.start_time)}:00`,
      end_time: `${fmtTime(detail.value.end_time)}:00`,
      event_type: detail.value.event_type,
      items: layout.value.items_json,
    })
  } catch {
    pricing.value = null
  }
}

function printSheet() {
  window.print()
}

let captureFrame: HTMLIFrameElement | null = null
let readyHandler: ((e: MessageEvent) => void) | null = null
let sentRequest = false

function handleMessage(event: MessageEvent) {
  const data = event.data
  if (data?.type === 'LAYOUT_CAPTURE_RESULT') {
    if (data.payload?.roomId && data.payload.roomId !== roomId.value) return
    capturing.value = false
    // Keep the plan captured at booking time; only fall back to the headless render.
    if (!layout.value?.thumbnail_url && data.payload?.plan2d) plan2d.value = data.payload.plan2d
    if (data.payload?.snapshot3d) snapshot3d.value = data.payload.snapshot3d
  }
}

function sendCapture() {
  if (sentRequest || !captureFrame?.contentWindow) return
  sentRequest = true
  // Deep-clone to strip Vue reactive proxies — postMessage can't structured-clone them.
  const items = JSON.parse(JSON.stringify(layout.value?.items_json ?? []))
  captureFrame.contentWindow.postMessage(
    { type: 'CAPTURE_LAYOUT', payload: { roomId: roomId.value, items } },
    '*',
  )
}

function captureLayout() {
  if (!roomId.value) return
  capturing.value = true
  sentRequest = false
  if (captureFrame) captureFrame.remove()
  if (readyHandler) window.removeEventListener('message', readyHandler)

  readyHandler = (event: MessageEvent) => {
    if (event.data?.type === 'VIEWER_READY') sendCapture()
  }
  window.addEventListener('message', readyHandler)

  const frame = document.createElement('iframe')
  frame.src = threeDUrl
  frame.width = '1000'
  frame.height = '640'
  frame.style.position = 'fixed'
  frame.style.left = '-10000px'
  frame.style.top = '0'
  frame.style.border = '0'
  frame.allow = 'fullscreen'
  frame.addEventListener('load', () => {
    setTimeout(sendCapture, 3500)
  })
  document.body.appendChild(frame)
  captureFrame = frame
}

onMounted(async () => {
  window.addEventListener('message', handleMessage)
  try {
    const [d, l, r] = await Promise.all([
      requestsApi.get(requestId.value),
      layoutsApi.byRequest(requestId.value).catch(() => null),
      reservationsApi.list(requestId.value).catch(() => []),
    ])
    detail.value = d
    layout.value = l
    reservations.value = r
    plan2d.value = l?.thumbnail_url ?? null
    await loadPricing()
    if (roomId.value) captureLayout()
  } finally {
    loading.value = false
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('message', handleMessage)
  if (readyHandler) window.removeEventListener('message', readyHandler)
  captureFrame?.remove()
})
</script>

<template>
  <div class="spec-wrap">
    <div class="spec-toolbar">
      <RouterLink :to="`/admin/requests/${requestId}`" class="button button-secondary">← Back</RouterLink>
      <div class="spec-toolbar__right">
        <button type="button" class="button button-secondary" :disabled="capturing" @click="captureLayout">
          {{ capturing ? 'Capturing…' : 'Recapture visuals' }}
        </button>
        <button type="button" class="button button-primary" @click="printSheet">
          Print / Save PDF
        </button>
      </div>
    </div>

    <div v-if="loading" class="spec-loading"><div class="spinner" /></div>

    <article v-else-if="detail" class="sheet">
      <header class="sheet-head">
        <div>
          <div class="sheet-brand">SpaceFlow · Pyramid of Tirana</div>
          <h1 class="sheet-title">Event Setup Spec Sheet</h1>
        </div>
        <div class="sheet-head-meta">
          <div><span>Generated</span><strong>{{ generatedAt }}</strong></div>
          <div><span>Status</span><strong style="text-transform: capitalize;">{{ detail.status.replace('_', ' ') }}</strong></div>
        </div>
      </header>

      <section class="sheet-grid">
        <div><span>Event</span><strong>{{ detail.title }}</strong></div>
        <div><span>Type</span><strong style="text-transform: capitalize;">{{ detail.event_type }}</strong></div>
        <div><span>Date</span><strong>{{ detail.requested_date }}</strong></div>
        <div><span>Time</span><strong>{{ fmtTime(detail.start_time) }} – {{ fmtTime(detail.end_time) }}</strong></div>
        <div><span>Venue</span><strong>{{ detail.venue?.name ?? 'Not assigned' }}</strong></div>
        <div><span>Attendees</span><strong>{{ detail.attendee_count }}</strong></div>
        <div><span>Client</span><strong>{{ detail.client?.full_name ?? '—' }}</strong></div>
        <div><span>Setup / Teardown</span><strong>{{ detail.setup_time_minutes }} / {{ detail.teardown_time_minutes }} min</strong></div>
      </section>

      <section class="sheet-visuals">
        <div class="sheet-visual">
          <h2>2D placement plan</h2>
          <div class="sheet-3d sheet-3d--plan">
            <img v-if="plan2d" :src="plan2d" alt="2D floor plan" />
            <div v-else class="sheet-3d-empty">
              <div v-if="capturing" class="spinner" />
              <span v-else>Plan unavailable. Use “Recapture visuals”.</span>
            </div>
          </div>
        </div>
        <div class="sheet-visual">
          <h2>3D view</h2>
          <div class="sheet-3d">
            <img v-if="snapshot3d" :src="snapshot3d" alt="3D room snapshot" />
            <div v-else class="sheet-3d-empty">
              <div v-if="capturing" class="spinner" />
              <span v-else>3D snapshot unavailable. Use “Recapture visuals”.</span>
            </div>
          </div>
        </div>
      </section>

      <section class="sheet-inventory">
        <h2>Inventory &amp; placement counts</h2>
        <table class="sheet-table">
          <thead>
            <tr><th>Item</th><th>Category</th><th>Placed</th><th>Reserved</th></tr>
          </thead>
          <tbody>
            <tr v-for="entry in layoutCounts" :key="entry.modelKey">
              <td>
                <span class="sheet-swatch" :style="{ background: entry.color }" />
                {{ entry.label }}
              </td>
              <td style="text-transform: capitalize;">{{ entry.category.replace('_', ' ') }}</td>
              <td><strong>{{ entry.count }}</strong></td>
              <td>{{ reservedFor(entry.label)?.quantity_confirmed ?? '—' }}</td>
            </tr>
            <tr v-if="!layoutCounts.length">
              <td colspan="4" class="sheet-empty">No furniture placed in this layout.</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section v-if="pricing" class="sheet-pricing">
        <h2>Cost summary</h2>
        <div class="sheet-cost-rows">
          <div><span>Venue ({{ pricing.venue?.hours }}h)</span><span>€{{ pricing.venue_subtotal }}</span></div>
          <div><span>Inventory</span><span>€{{ pricing.inventory_subtotal }}</span></div>
          <div><span>Services</span><span>€{{ pricing.services_subtotal }}</span></div>
          <div><span>Tax</span><span>€{{ pricing.tax_amount }}</span></div>
          <div class="grand"><span>Total</span><span>€{{ pricing.total }}</span></div>
        </div>
      </section>

      <footer class="sheet-foot">
        Request ID: {{ detail.id }} · This sheet reflects the client's customized layout for on-site setup.
      </footer>
    </article>
  </div>
</template>

<style scoped>
.spec-wrap {
  min-height: 100vh;
  background: var(--bg-secondary, #eef3f8);
  padding: var(--space-6);
}
.spec-toolbar {
  display: flex;
  justify-content: space-between;
  gap: var(--space-3);
  max-width: 820px;
  margin: 0 auto var(--space-5);
}
.spec-toolbar__right {
  display: flex;
  gap: var(--space-2);
}
.spec-loading {
  display: grid;
  place-items: center;
  padding: var(--space-12);
}

.sheet {
  background: #fff;
  color: #0f172a;
  width: 210mm;
  max-width: 100%;
  min-height: 297mm;
  margin: 0 auto;
  padding: 16mm;
  box-shadow: 0 18px 60px rgba(15, 23, 42, 0.18);
  border-radius: 6px;
}
.sheet-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  border-bottom: 2px solid #0f172a;
  padding-bottom: 12px;
}
.sheet-brand {
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #3da9f5;
}
.sheet-title {
  margin: 4px 0 0;
  font-size: 1.6rem;
}
.sheet-head-meta {
  text-align: right;
  display: grid;
  gap: 4px;
  font-size: 0.8rem;
}
.sheet-head-meta span {
  color: #64748b;
  margin-right: 6px;
}

.sheet-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px 16px;
  margin: 16px 0;
}
.sheet-grid > div {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.sheet-grid span {
  font-size: 0.66rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #64748b;
  font-weight: 700;
}
.sheet-grid strong {
  font-size: 0.92rem;
}

.sheet-visuals {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin: 8px 0 16px;
}
.sheet-visual h2,
.sheet-inventory h2,
.sheet-pricing h2 {
  font-size: 0.9rem;
  margin: 0 0 8px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #334155;
}
.sheet-3d {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  overflow: hidden;
  aspect-ratio: 16 / 10;
  background: #07070c;
  display: grid;
  place-items: center;
}
.sheet-3d img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.sheet-3d--plan {
  background: #0c0c12;
}
.sheet-3d--plan img {
  object-fit: contain;
}
.sheet-3d-empty {
  color: #94a3b8;
  font-size: 0.82rem;
  padding: 12px;
  text-align: center;
}

.sheet-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}
.sheet-table th,
.sheet-table td {
  text-align: left;
  padding: 7px 8px;
  border-bottom: 1px solid #e2e8f0;
}
.sheet-table th {
  font-size: 0.66rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #64748b;
}
.sheet-table td:nth-child(3),
.sheet-table td:nth-child(4),
.sheet-table th:nth-child(3),
.sheet-table th:nth-child(4) {
  text-align: center;
  width: 80px;
}
.sheet-swatch {
  display: inline-block;
  width: 11px;
  height: 11px;
  border-radius: 3px;
  margin-right: 7px;
  vertical-align: middle;
}
.sheet-empty {
  text-align: center;
  color: #94a3b8;
}

.sheet-pricing {
  margin-top: 16px;
}
.sheet-cost-rows {
  display: grid;
  gap: 4px;
  max-width: 320px;
  margin-left: auto;
  font-size: 0.88rem;
}
.sheet-cost-rows > div {
  display: flex;
  justify-content: space-between;
  color: #475569;
}
.sheet-cost-rows .grand {
  margin-top: 6px;
  padding-top: 8px;
  border-top: 2px solid #0f172a;
  font-size: 1.1rem;
  font-weight: 800;
  color: #0f172a;
}
.sheet-foot {
  margin-top: 20px;
  padding-top: 10px;
  border-top: 1px solid #e2e8f0;
  font-size: 0.72rem;
  color: #94a3b8;
}

@media print {
  .spec-wrap {
    background: #fff;
    padding: 0;
  }
  .spec-toolbar {
    display: none;
  }
  .sheet {
    box-shadow: none;
    border-radius: 0;
    width: auto;
    padding: 0;
  }
}
@page {
  size: A4;
  margin: 12mm;
}
</style>
