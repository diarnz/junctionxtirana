<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import EmptyState from '@/components/ui/EmptyState.vue'
import RequestCard from '@/components/requests/RequestCard.vue'
import { useAssetsStore } from '@/stores/assets'
import { useRequestsStore } from '@/stores/requests'

const assets = useAssetsStore()
const requests = useRequestsStore()

const selectedStatus = ref('')
const search = ref('')

const filteredRequests = computed(() => {
  const query = search.value.trim().toLowerCase()
  return requests.list.filter((item) => {
    if (selectedStatus.value && item.status !== selectedStatus.value) return false
    if (!query) return true
    return (
      item.title.toLowerCase().includes(query) ||
      (item.client_name ?? '').toLowerCase().includes(query) ||
      (item.venue_name ?? '').toLowerCase().includes(query)
    )
  })
})

const approvedCount = computed(
  () => requests.list.filter((item) => item.status === 'approved').length,
)
const pendingCount = computed(
  () =>
    requests.list.filter((item) =>
      ['submitted', 'under_review', 'quotation_sent'].includes(item.status),
    ).length,
)

const stats = computed(() => [
  {
    label: 'Total requests',
    value: requests.total,
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/></svg>`,
    accent: 'accent',
  },
  {
    label: 'Pending review',
    value: pendingCount.value,
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
    accent: 'warning',
  },
  {
    label: 'Approved',
    value: approvedCount.value,
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
    accent: 'success',
  },
  {
    label: 'Assets tracked',
    value: assets.totalUnits,
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>`,
    accent: 'neutral',
  },
])

onMounted(async () => {
  await Promise.all([
    requests.fetchList({ limit: 100, offset: 0 }),
    assets.fetchAll(),
  ])
})
</script>

<template>
  <section class="admin-page">

    <div class="dash-stat-grid">
      <article
        v-for="stat in stats"
        :key="stat.label"
        class="dash-stat"
        :class="`dash-stat--${stat.accent}`"
      >
        <div class="dash-stat__icon" aria-hidden="true">
          <!-- eslint-disable-next-line vue/no-v-html -->
          <span v-html="stat.icon" />
        </div>
        <div>
          <p class="dash-stat__label">{{ stat.label }}</p>
          <p class="dash-stat__value">{{ stat.value }}</p>
        </div>
      </article>
    </div>

    <div class="admin-section">
      <div class="admin-section__head">
        <h2 class="admin-section__title">Event requests</h2>
      </div>

      <div class="page-toolbar">
        <div class="filter-pills" aria-label="Filter requests by status">
          <button
            type="button"
            class="filter-pill"
            :class="{ 'is-active': selectedStatus === '' }"
            @click="selectedStatus = ''"
          >
            All
          </button>
          <button
            v-for="status in ['submitted', 'under_review', 'quotation_sent', 'approved', 'completed', 'rejected']"
            :key="status"
            type="button"
            class="filter-pill text-capitalize"
            :class="{ 'is-active': selectedStatus === status }"
            @click="selectedStatus = status"
          >
            {{ status.replace(/_/g, ' ') }}
          </button>
        </div>

        <label class="dashboard-search">
          <span class="sr-only">Search requests</span>
          <div class="dashboard-search__wrap">
            <svg class="dashboard-search__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              v-model="search"
              class="input dashboard-search__input"
              type="search"
              placeholder="Search by title, client, or venue..."
            />
          </div>
        </label>
      </div>

      <EmptyState v-if="requests.loading" title="Loading requests…" loading />

      <div v-else-if="!filteredRequests.length" class="card dash-empty">
        <EmptyState
          title="No matching requests"
          message="No requests match the current search and status filters."
        />
      </div>

      <div v-else class="dash-list">
        <RequestCard v-for="item in filteredRequests" :key="item.id" :request="item" />
      </div>
    </div>
  </section>
</template>

<style scoped>
.dash-stat-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--space-4);
}

.dash-stat {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-5);
  border-radius: var(--radius-lg);
  background: var(--surface);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-sm);
  transition: transform var(--t-base) var(--ease-out), box-shadow var(--t-base) var(--ease-out);
}

.dash-stat:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.dash-stat__icon {
  width: 42px;
  height: 42px;
  flex-shrink: 0;
  border-radius: var(--radius-md);
  display: grid;
  place-items: center;
}

.dash-stat__icon :deep(svg) {
  width: 20px;
  height: 20px;
}

.dash-stat--accent .dash-stat__icon {
  background: var(--accent-light);
  color: var(--accent-dark);
  border: 1px solid rgba(61, 169, 245, 0.2);
}
.dash-stat--warning .dash-stat__icon {
  background: var(--warning-light);
  color: #b9791a;
  border: 1px solid rgba(245, 166, 35, 0.2);
}
.dash-stat--success .dash-stat__icon {
  background: var(--success-light);
  color: #18996a;
  border: 1px solid rgba(46, 201, 138, 0.2);
}
.dash-stat--neutral .dash-stat__icon {
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  border: 1px solid var(--border-light);
}

.dash-stat__label {
  margin: 0 0 var(--space-1);
  font-size: 0.76rem;
  font-weight: 600;
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.dash-stat__value {
  margin: 0;
  font-size: 1.8rem;
  font-weight: 800;
  letter-spacing: -0.04em;
  font-variant-numeric: tabular-nums;
}

.dash-list {
  display: grid;
  gap: var(--space-3);
}

.dash-empty {
  padding: var(--space-5);
}

.dashboard-search {
  width: min(100%, 340px);
}

.dashboard-search__wrap {
  position: relative;
}

.dashboard-search__icon {
  position: absolute;
  left: 0.85rem;
  top: 50%;
  transform: translateY(-50%);
  width: 16px;
  height: 16px;
  color: var(--text-tertiary);
  pointer-events: none;
}

.dashboard-search__input {
  width: 100%;
  padding-left: 2.4rem;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@media (max-width: 1024px) {
  .dash-stat-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .dash-stat-grid {
    grid-template-columns: 1fr;
  }
}
</style>
