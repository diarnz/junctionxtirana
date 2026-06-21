<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import AssetAvailabilityBar from '@/components/inventory/AssetAvailabilityBar.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import { assetsApi, friendlyError } from '@/api/client'
import { useAssetsStore } from '@/stores/assets'
import { useNotificationsStore } from '@/stores/notifications'

const assets = useAssetsStore()
const notifications = useNotificationsStore()
const category = ref('')

const categories = [
  { value: '', label: 'All' },
  { value: 'seating', label: 'Seating' },
  { value: 'tables', label: 'Tables' },
  { value: 'av_equipment', label: 'AV Equipment' },
  { value: 'staging', label: 'Staging' },
  { value: 'lighting', label: 'Lighting' },
  { value: 'misc', label: 'Misc' },
]

const filteredItems = computed(() =>
  category.value
    ? assets.items.filter((item) => item.category === category.value)
    : assets.items,
)

const today = new Date().toISOString().slice(0, 10)
const inTwoDays = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10)
const rangeStart = ref(today)
const rangeEnd = ref(inTwoDays)
const checking = ref(false)
const rangeActive = ref(false)
const rangeAvail = ref<Record<string, { available: number; reserved: number; total: number }>>({})

const rangeValid = computed(() => Boolean(rangeStart.value && rangeEnd.value && rangeEnd.value >= rangeStart.value))

function availableFor(assetId: string, fallback: number): number {
  if (rangeActive.value && rangeAvail.value[assetId]) return rangeAvail.value[assetId].available
  return assets.summary.find((item) => item.asset_id === assetId)?.available_quantity ?? fallback
}

function reservedFor(assetId: string): number | null {
  if (rangeActive.value && rangeAvail.value[assetId]) return rangeAvail.value[assetId].reserved
  return assets.summary.find((item) => item.asset_id === assetId)?.reserved_quantity ?? null
}

async function checkRange() {
  if (!rangeValid.value) {
    notifications.push('End date must be on or after the start date.', 'warning')
    return
  }
  checking.value = true
  try {
    const start = `${rangeStart.value}T00:00:00`
    const end = `${rangeEnd.value}T23:59:59`
    const results = await Promise.all(
      assets.items.map((asset) =>
        assetsApi
          .availability(asset.id, start, end)
          .then((r) => ({ id: asset.id, ok: true as const, r }))
          .catch(() => ({ id: asset.id, ok: false as const })),
      ),
    )
    const map: Record<string, { available: number; reserved: number; total: number }> = {}
    for (const res of results) {
      if (res.ok) {
        map[res.id] = {
          available: res.r.available_quantity,
          reserved: res.r.reserved_quantity,
          total: res.r.total_quantity,
        }
      }
    }
    rangeAvail.value = map
    rangeActive.value = true
  } catch (err) {
    notifications.push(friendlyError(err, 'Could not check availability.'), 'error')
  } finally {
    checking.value = false
  }
}

function clearRange() {
  rangeActive.value = false
  rangeAvail.value = {}
}

const rangeConflicts = computed(() =>
  rangeActive.value
    ? assets.items.filter((a) => (rangeAvail.value[a.id]?.available ?? 1) <= 0).length
    : 0,
)

onMounted(async () => {
  await Promise.all([assets.fetchAll(), assets.fetchSummary()])
})
</script>

<template>
  <section class="admin-page">
    <p class="admin-page-intro">
      Track furniture, AV, and staging inventory with availability across booking windows.
    </p>

    <div class="admin-stat-grid">
      <article class="admin-stat">
        <p class="admin-stat__label">Asset types</p>
        <p class="admin-stat__value">{{ assets.items.length }}</p>
      </article>
      <article class="admin-stat">
        <p class="admin-stat__label">Units tracked</p>
        <p class="admin-stat__value">{{ assets.totalUnits }}</p>
      </article>
      <article class="admin-stat">
        <p class="admin-stat__label">Conflict risk next 7 days</p>
        <p class="admin-stat__value">
          {{ assets.summary.filter((item) => item.has_conflict_next_7_days).length }}
        </p>
      </article>
      <article class="admin-stat">
        <p class="admin-stat__label">
          {{ rangeActive ? 'Fully booked in window' : '3D-linked assets' }}
        </p>
        <p class="admin-stat__value" :class="{ 'admin-stat__value--alert': rangeActive && rangeConflicts }">
          {{ rangeActive ? rangeConflicts : assets.items.filter((item) => item.three_d_item_key).length }}
        </p>
      </article>
    </div>

    <article class="card admin-panel admin-panel--range">
      <div class="admin-panel__intro">
        <h2 class="admin-section__title">Check availability for a date range</h2>
        <p class="section-copy">
          See what's free across overlapping bookings for your selected dates.
        </p>
      </div>
      <div class="admin-panel__fields">
        <label class="field">
          <span class="field-label">From</span>
          <input v-model="rangeStart" type="date" class="input" />
        </label>
        <label class="field">
          <span class="field-label">To</span>
          <input v-model="rangeEnd" type="date" :min="rangeStart" class="input" />
        </label>
        <button type="button" class="button button-primary" :disabled="checking || !rangeValid" @click="checkRange">
          {{ checking ? 'Checking…' : 'Check availability' }}
        </button>
        <button v-if="rangeActive" type="button" class="button button-secondary" @click="clearRange">
          Reset view
        </button>
        <span v-if="rangeActive" class="badge badge-info">
          {{ rangeStart }} → {{ rangeEnd }}
        </span>
      </div>
    </article>

    <div class="filter-pills">
      <button
        v-for="item in categories"
        :key="item.value || 'all'"
        type="button"
        class="filter-pill"
        :class="{ 'is-active': category === item.value }"
        @click="category = item.value"
      >
        {{ item.label }}
      </button>
    </div>

    <EmptyState v-if="assets.loading" title="Loading inventory…" loading />

    <div v-else class="split-grid three-col">
      <article v-for="asset in filteredItems" :key="asset.id" class="card asset-card">
        <div class="asset-card__head">
          <div>
            <h3 class="asset-card__title">{{ asset.name }}</h3>
            <p class="muted text-capitalize">{{ asset.category.replaceAll('_', ' ') }}</p>
          </div>
          <span class="badge badge-neutral text-capitalize">{{ asset.tracking_type.replaceAll('_', ' ') }}</span>
        </div>

        <div>
          <div class="asset-card__count">
            {{ availableFor(asset.id, asset.total_quantity) }}
            <span class="asset-card__total">/ {{ asset.total_quantity }}</span>
          </div>
          <p class="muted asset-card__hint">
            {{ rangeActive ? 'Available in selected window' : 'Available (next 7 days)' }}
          </p>
        </div>

        <AssetAvailabilityBar
          :available="availableFor(asset.id, asset.total_quantity)"
          :total="asset.total_quantity"
        />

        <div class="asset-card__foot">
          <span class="muted">€{{ asset.unit_price }} / unit</span>
          <span v-if="reservedFor(asset.id) !== null" class="badge badge-neutral">
            {{ reservedFor(asset.id) }} reserved
          </span>
        </div>
      </article>
    </div>
  </section>
</template>

<style scoped>
.admin-panel {
  padding: var(--space-5);
  display: grid;
  gap: var(--space-4);
}

.admin-panel--range {
  gap: var(--space-5);
}

.admin-panel__fields {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: var(--space-4);
}

.admin-panel__fields .field {
  min-width: 150px;
}

.admin-stat__value--alert {
  color: var(--error);
}

.asset-card {
  padding: var(--space-5);
  display: grid;
  gap: var(--space-4);
}

.asset-card__head {
  display: flex;
  justify-content: space-between;
  gap: var(--space-3);
}

.asset-card__title {
  margin: 0 0 var(--space-1);
  font-size: 1rem;
}

.asset-card__count {
  font-size: 1.85rem;
  font-weight: 750;
  letter-spacing: -0.03em;
}

.asset-card__total {
  font-size: 0.95rem;
  font-weight: 500;
  color: var(--text-tertiary);
}

.asset-card__hint {
  margin: 0.15rem 0 0;
  font-size: 0.88rem;
}

.asset-card__foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-3);
  font-size: 0.9rem;
}
</style>
