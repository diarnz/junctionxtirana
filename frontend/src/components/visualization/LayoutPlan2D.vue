<script setup lang="ts">
import { computed } from 'vue'

import type { RoomLayoutItem } from '@/types'
import { ROOM_DIMS, metaFor, countItems } from '@/lib/layoutCatalog'

const props = withDefaults(
  defineProps<{
    items: RoomLayoutItem[]
    roomId?: string | null
    showLegend?: boolean
  }>(),
  {
    roomId: null,
    showLegend: true,
  },
)

const PAD = 0.6 // metres of margin around the room

const room = computed(() => (props.roomId && ROOM_DIMS[props.roomId]) || { w: 7, d: 5 })

const viewBox = computed(() => {
  const w = room.value.w + PAD * 2
  const d = room.value.d + PAD * 2
  return { w, d, str: `${-w / 2} ${-d / 2} ${w} ${d}` }
})

interface DrawnItem {
  key: string
  x: number
  z: number
  w: number
  d: number
  rot: number
  color: string
  isWall: boolean
}

const drawn = computed<DrawnItem[]>(() =>
  (props.items ?? []).map((item, idx) => {
    const meta = metaFor(item.modelKey)
    const isWall = item.type === 'wall'
    return {
      key: `${item.modelKey}-${idx}`,
      x: item.x ?? 0,
      z: item.z ?? 0,
      w: meta.w,
      d: meta.d,
      rot: ((item.rotY ?? 0) * 180) / Math.PI,
      color: meta.color,
      isWall,
    }
  }),
)

const legend = computed(() => countItems(props.items ?? []))

// Stroke scales with room size so lines look consistent at any viewBox.
const stroke = computed(() => Math.max(viewBox.value.w, viewBox.value.d) / 320)
</script>

<template>
  <div class="plan2d">
    <svg :viewBox="viewBox.str" class="plan2d__svg" preserveAspectRatio="xMidYMid meet">
      <!-- room floor -->
      <rect
        :x="-room.w / 2"
        :y="-room.d / 2"
        :width="room.w"
        :height="room.d"
        rx="0.1"
        fill="#f8fafc"
        stroke="#0f172a"
        :stroke-width="stroke * 2.4"
      />
      <!-- grid (1m) -->
      <g :stroke="'#e2e8f0'" :stroke-width="stroke">
        <line
          v-for="gx in Math.floor(room.w)"
          :key="`gx-${gx}`"
          :x1="-room.w / 2 + gx"
          :y1="-room.d / 2"
          :x2="-room.w / 2 + gx"
          :y2="room.d / 2"
        />
        <line
          v-for="gz in Math.floor(room.d)"
          :key="`gz-${gz}`"
          :x1="-room.w / 2"
          :y1="-room.d / 2 + gz"
          :x2="room.w / 2"
          :y2="-room.d / 2 + gz"
        />
      </g>
      <!-- items -->
      <g
        v-for="d in drawn"
        :key="d.key"
        :transform="`translate(${d.x} ${d.z}) rotate(${d.rot})`"
      >
        <rect
          :x="-d.w / 2"
          :y="-d.d / 2"
          :width="d.w"
          :height="d.d"
          :rx="Math.min(d.w, d.d) * 0.18"
          :fill="d.isWall ? d.color : `${d.color}cc`"
          :stroke="d.color"
          :stroke-width="stroke * 1.4"
          :stroke-dasharray="d.isWall ? `${stroke * 4} ${stroke * 2}` : '0'"
        />
      </g>
    </svg>

    <div v-if="showLegend && legend.length" class="plan2d__legend">
      <span v-for="entry in legend" :key="entry.modelKey" class="plan2d__legend-item">
        <span class="plan2d__swatch" :style="{ background: entry.color }" />
        {{ entry.label }}
        <strong>×{{ entry.count }}</strong>
      </span>
    </div>
    <p v-else-if="showLegend" class="plan2d__empty">No furniture placed in this layout yet.</p>
  </div>
</template>

<style scoped>
.plan2d {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.plan2d__svg {
  width: 100%;
  height: auto;
  max-height: 420px;
  background:
    radial-gradient(circle at 30% 20%, rgba(61, 169, 245, 0.06), transparent 60%),
    var(--surface);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-lg);
  padding: var(--space-3);
}
.plan2d__legend {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2) var(--space-4);
}
.plan2d__legend-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.84rem;
  color: var(--text-secondary);
}
.plan2d__legend-item strong {
  color: var(--text-primary);
}
.plan2d__swatch {
  width: 12px;
  height: 12px;
  border-radius: 3px;
  display: inline-block;
}
.plan2d__empty {
  margin: 0;
  color: var(--text-tertiary);
  font-size: 0.9rem;
}
</style>
