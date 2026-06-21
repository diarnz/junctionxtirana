<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'

import RequestCard from '@/components/requests/RequestCard.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import { useRequestsStore } from '@/stores/requests'

const requests = useRequestsStore()

const selectedStatus = ref('')
const search = ref('')

const filteredRequests = computed(() => {
  const query = search.value.trim().toLowerCase()
  return requests.list.filter((item) => {
    const statusMatch = !selectedStatus.value || item.status === selectedStatus.value
    if (!statusMatch) return false
    if (!query) return true
    return (
      item.title.toLowerCase().includes(query) ||
      (item.client_name ?? '').toLowerCase().includes(query) ||
      (item.venue_name ?? '').toLowerCase().includes(query)
    )
  })
})

async function load() {
  await requests.fetchList({
    status: selectedStatus.value || undefined,
    limit: 100,
    offset: 0,
  })
}

watch(selectedStatus, () => {
  load()
})

onMounted(load)
</script>

<template>
  <section class="admin-page">
    <p class="admin-page-intro">
      Filter and review incoming event requests from clients and the 3D booking flow.
    </p>

    <div class="page-toolbar">
      <div class="filter-pills">
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

      <input
        v-model="search"
        class="input"
        placeholder="Search by title, client, or venue..."
      />
    </div>

    <EmptyState v-if="requests.loading" title="Loading requests…" loading />

    <EmptyState
      v-else-if="!filteredRequests.length"
      title="No matching requests"
      message="No requests match the current filters."
    />

    <div v-else class="admin-section">
      <RequestCard
        v-for="item in filteredRequests"
        :key="item.id"
        :request="item"
      />
    </div>
  </section>
</template>
