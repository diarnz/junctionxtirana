<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'

import AppNav from '@/components/layout/AppNav.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import ThreeDBookingLink from '@/components/ui/ThreeDBookingLink.vue'
import RequestCard from '@/components/requests/RequestCard.vue'
import { friendlyError, requestsApi } from '@/api/client'
import type { EventRequestSummary } from '@/types'

const loading = ref(true)
const error = ref('')
const requests = ref<EventRequestSummary[]>([])
const statusFilter = ref('')

const statusOptions = [
  { value: '', label: 'All statuses' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'under_review', label: 'Under review' },
  { value: 'quotation_sent', label: 'Quotation sent' },
  { value: 'approved', label: 'Approved' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

async function loadRequests() {
  loading.value = true
  error.value = ''
  try {
    const data = await requestsApi.list({
      status: statusFilter.value || undefined,
      limit: 50,
    })
    requests.value = data.items
  } catch (err) {
    error.value = friendlyError(err, 'Unable to load your requests.')
  } finally {
    loading.value = false
  }
}

onMounted(loadRequests)
</script>

<template>
  <div class="public-page page-gradient">
    <AppNav />

    <section class="public-band">
      <div class="page-shell page-stack">
        <PageHeader
          title="My requests"
          copy="Track every booking request you have submitted to SpaceFlow."
        >
          <template #icon>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2"
              />
            </svg>
          </template>
          <template #actions>
            <ThreeDBookingLink class="button button-primary">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 5v14M5 12h14" />
              </svg>
              New request
            </ThreeDBookingLink>
          </template>
        </PageHeader>

        <div class="page-toolbar">
          <div class="filter-pills">
            <button
              v-for="option in statusOptions"
              :key="option.value || 'all'"
              type="button"
              class="filter-pill"
              :class="{ 'is-active': statusFilter === option.value }"
              @click="statusFilter = option.value; loadRequests()"
            >
              {{ option.label }}
            </button>
          </div>
        </div>

        <div v-if="error" class="alert alert-error">{{ error }}</div>

        <EmptyState v-if="loading" title="Loading your requests…" loading />

        <EmptyState
          v-else-if="!requests.length"
          title="No requests yet"
          message="Start by booking a Pyramid space for your next event."
        >
          <ThreeDBookingLink class="button button-primary">Book a space</ThreeDBookingLink>
        </EmptyState>

        <div v-else class="split-grid three-col">
          <RequestCard
            v-for="request in requests"
            :key="request.id"
            :request="request"
            :detail-path="`/my-requests/${request.id}`"
            :show-client="false"
          />
        </div>
      </div>
    </section>
  </div>
</template>
