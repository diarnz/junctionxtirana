<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'

import EmptyState from '@/components/ui/EmptyState.vue'
import ThreeDBookingLink from '@/components/ui/ThreeDBookingLink.vue'
import RequestCard from '@/components/requests/RequestCard.vue'
import { useAiStore } from '@/stores/ai'
import { useAssetsStore } from '@/stores/assets'
import { useRequestsStore } from '@/stores/requests'
import { useWebsocketStore } from '@/stores/websocket'

const ai = useAiStore()
const assets = useAssetsStore()
const requests = useRequestsStore()
const websocket = useWebsocketStore()

const recentRequests = computed(() => requests.list.slice(0, 5))
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
  { label: 'Total requests', value: requests.total },
  { label: 'Pending review', value: pendingCount.value },
  { label: 'Approved', value: approvedCount.value },
  { label: 'Asset units tracked', value: assets.totalUnits },
])

onMounted(async () => {
  await Promise.all([
    requests.fetchList({ limit: 20, offset: 0 }),
    assets.fetchAll(),
  ])
})
</script>

<template>
  <section class="admin-page">
    <p class="admin-page-intro">
      Overview of request volume, quick actions, and live operations status.
    </p>

    <div class="admin-stat-grid">
      <article v-for="stat in stats" :key="stat.label" class="admin-stat">
        <p class="admin-stat__label">{{ stat.label }}</p>
        <p class="admin-stat__value">{{ stat.value }}</p>
      </article>
    </div>

    <div class="split-grid two-col">
      <div class="admin-section">
        <div class="admin-section__head">
          <h2 class="admin-section__title">Recent requests</h2>
          <RouterLink to="/admin/requests" class="link-arrow">
            View all
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </RouterLink>
        </div>

        <EmptyState v-if="requests.loading" title="Loading requests…" loading />

        <div v-else-if="!recentRequests.length" class="card admin-panel">
          <EmptyState title="No requests yet" message="New booking requests will appear here." />
        </div>

        <div v-else class="dash-list">
          <RequestCard v-for="item in recentRequests" :key="item.id" :request="item" />
        </div>
      </div>

      <div class="admin-section">
        <h2 class="admin-section__title">Quick actions</h2>
        <div class="card admin-panel">
          <ThreeDBookingLink class="button button-secondary button-block">New booking request</ThreeDBookingLink>
          <RouterLink to="/admin/inventory" class="button button-secondary button-block">Open inventory</RouterLink>
          <RouterLink to="/admin/calendar" class="button button-secondary button-block">View calendar</RouterLink>
          <RouterLink to="/admin/visualization" class="button button-secondary button-block">Open 3D view</RouterLink>
          <button type="button" class="button button-primary button-block" @click="ai.setPanelState(true, 'copilot', {})">
            Ask AI copilot
          </button>
        </div>

        <div class="card admin-panel">
          <h3 class="admin-section__title">Realtime status</h3>
          <div class="dash-status">
            <span
              class="dash-status__dot"
              :class="websocket.connected ? 'is-live' : 'is-off'"
            />
            {{ websocket.connected ? 'Admin websocket connected' : 'Admin websocket reconnecting' }}
          </div>
          <p class="muted dash-status__meta">
            Active 3D bridge connections: {{ websocket.active3dConnections }}
          </p>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.dash-list {
  display: grid;
  gap: var(--space-3);
}

.admin-panel {
  padding: var(--space-5);
  display: grid;
  gap: var(--space-3);
}

.dash-status {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--text-secondary);
  font-weight: 600;
}

.dash-status__dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.dash-status__dot.is-live {
  background: var(--success);
  box-shadow: 0 0 0 3px rgba(46, 201, 138, 0.2);
}

.dash-status__dot.is-off {
  background: var(--warning);
  box-shadow: 0 0 0 3px rgba(245, 166, 35, 0.2);
}

.dash-status__meta {
  margin: 0;
  font-size: 0.88rem;
}
</style>
