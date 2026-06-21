<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'

import { quotationsApi, requestsApi } from '@/api/client'
import EmptyState from '@/components/ui/EmptyState.vue'
import type { EventRequestSummary, QuotationResponse } from '@/types'

const requests = ref<EventRequestSummary[]>([])
const loading = ref(true)
const quotationByRequest = reactive<Record<string, QuotationResponse>>({})

async function ensureQuotation(requestId: string) {
  try {
    quotationByRequest[requestId] = await quotationsApi.generate(requestId)
  } catch {
    // Leave the row without a quotation if generation fails.
  }
}

async function load() {
  loading.value = true
  try {
    requests.value = (await requestsApi.list({ limit: 100, offset: 0 })).items
    await Promise.all(requests.value.map((item) => ensureQuotation(item.id)))
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <section class="admin-page">
    <p class="admin-page-intro">
      Formal quotations are generated automatically from request data and AI-backed pricing.
    </p>

    <div class="admin-section">
      <div class="admin-section__head">
        <div>
          <h2 class="admin-section__title">Quotations</h2>
          <p class="section-copy">
            Pricing is calculated automatically for each event request.
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
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>
</template>
