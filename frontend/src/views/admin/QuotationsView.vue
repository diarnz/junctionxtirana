<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'

import { friendlyError, quotationsApi, requestsApi } from '@/api/client'
import EmptyState from '@/components/ui/EmptyState.vue'
import { useNotificationsStore } from '@/stores/notifications'
import type { EventRequestSummary, QuotationResponse } from '@/types'

const notifications = useNotificationsStore()
const requests = ref<EventRequestSummary[]>([])
const loading = ref(true)
const quotationByRequest = reactive<Record<string, QuotationResponse>>({})
const generatingFor = ref<string | null>(null)

async function load() {
  loading.value = true
  try {
    requests.value = (await requestsApi.list({ limit: 100, offset: 0 })).items
  } finally {
    loading.value = false
  }
}

async function generateQuotation(requestId: string) {
  generatingFor.value = requestId
  try {
    quotationByRequest[requestId] = await quotationsApi.generate(requestId)
    notifications.push('Quotation generated.', 'success')
  } catch (err) {
    notifications.push(friendlyError(err, 'Quotation generation failed.'), 'error')
  } finally {
    generatingFor.value = null
  }
}

async function sendQuotation(requestId: string) {
  const quotation = quotationByRequest[requestId]
  if (!quotation) return
  try {
    quotationByRequest[requestId] = await quotationsApi.send(quotation.id)
    notifications.push('Quotation marked as sent.', 'success')
  } catch (err) {
    notifications.push(friendlyError(err, 'Unable to send quotation.'), 'error')
  }
}

onMounted(load)
</script>

<template>
  <section class="admin-page">
    <p class="admin-page-intro">
      Generate and send formal quotations from request data and AI-backed pricing.
    </p>

    <div class="admin-section">
      <div class="admin-section__head">
        <div>
          <h2 class="admin-section__title">Quotations</h2>
          <p class="section-copy">
            Generate formal quotations from request data and AI-backed pricing logic.
          </p>
        </div>
      </div>

      <EmptyState v-if="loading" title="Loading quotations…" loading />

      <div v-else class="table-shell">
        <table class="data-table">
          <thead>
            <tr>
              <th>Request</th>
              <th>Date</th>
              <th>Status</th>
              <th>Quotation</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in requests" :key="item.id">
              <td>
                <strong>{{ item.title }}</strong>
                <div class="muted">{{ item.attendee_count }} attendees</div>
              </td>
              <td>{{ item.requested_date }}</td>
              <td class="text-capitalize">{{ item.status.replace('_', ' ') }}</td>
              <td>
                <template v-if="quotationByRequest[item.id]">
                  <strong>EUR {{ quotationByRequest[item.id].total_amount }}</strong>
                  <div class="muted">{{ quotationByRequest[item.id].status }}</div>
                </template>
                <span v-else class="muted">Not generated</span>
              </td>
              <td>
                <button
                  type="button"
                  class="button button-secondary"
                  :disabled="generatingFor === item.id"
                  @click="generateQuotation(item.id)"
                >
                  {{ generatingFor === item.id ? 'Generating...' : 'Generate' }}
                </button>
                <button
                  v-if="quotationByRequest[item.id]"
                  type="button"
                  class="button button-primary"
                  @click="sendQuotation(item.id)"
                >
                  Send
                </button>
                <RouterLink
                  :to="`/admin/requests/${item.id}`"
                  class="button button-ghost"
                >
                  Review
                </RouterLink>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>
</template>
