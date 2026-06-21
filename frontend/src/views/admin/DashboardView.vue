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
  { label: 'Total requests', value: requests.total },
  { label: 'Pending review', value: pendingCount.value },
  { label: 'Approved', value: approvedCount.value },
  { label: 'Asset units tracked', value: assets.totalUnits },
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
    <p class="admin-page-intro">
      Review request volume and manage all booking activity.
    </p>

    <div class="admin-stat-grid">
      <article v-for="stat in stats" :key="stat.label" class="admin-stat">
        <p class="admin-stat__label">{{ stat.label }}</p>
        <p class="admin-stat__value">{{ stat.value }}</p>
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
            {{ status.replace('_', ' ') }}
          </button>
        </div>

        <label class="dashboard-search">
          <span class="sr-only">Search requests</span>
          <input
            v-model="search"
            class="input"
            type="search"
            placeholder="Search by title, client, or venue..."
          />
        </label>
      </div>

      <EmptyState v-if="requests.loading" title="Loading requests…" loading />

      <div v-else-if="!filteredRequests.length" class="card admin-panel">
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
.dash-list {
  display: grid;
  gap: var(--space-3);
}

.admin-panel {
  padding: var(--space-5);
  display: grid;
  gap: var(--space-3);
}

.dashboard-search {
  width: min(100%, 360px);
}

.dashboard-search .input {
  width: 100%;
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
</style>
