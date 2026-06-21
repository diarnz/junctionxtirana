<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'

import AppNav from '@/components/layout/AppNav.vue'
import BackLink from '@/components/ui/BackLink.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import RequestStatusBadge from '@/components/requests/RequestStatusBadge.vue'
import LayoutCapture from '@/components/visualization/LayoutCapture.vue'
import { friendlyError, layoutsApi, requestsApi } from '@/api/client'
import type { EventRequestDetail, RoomLayoutResponse } from '@/types'

const route = useRoute()

const loading = ref(true)
const error = ref('')
const request = ref<EventRequestDetail | null>(null)
const layout = ref<RoomLayoutResponse | null>(null)

const aiSummary = computed(() => {
  const proposal = request.value?.ai_proposal_json
  if (!proposal || typeof proposal !== 'object') return null
  const text = (proposal as Record<string, unknown>).summary
  return typeof text === 'string' ? text : null
})

const FLOW = [
  { key: 'submitted', label: 'Submitted', hint: 'Request received' },
  { key: 'under_review', label: 'Under review', hint: 'Team is reviewing' },
  { key: 'quotation_sent', label: 'Quotation', hint: 'Pricing prepared' },
  { key: 'approved', label: 'Approved', hint: 'Confirmed by staff' },
  { key: 'confirmed', label: 'Confirmed', hint: 'Locked in' },
]

const STEP_INDEX: Record<string, number> = {
  submitted: 0,
  under_review: 1,
  quotation_sent: 2,
  approved: 3,
  confirmed: 4,
  completed: 5,
}

const isNegative = computed(() =>
  ['rejected', 'cancelled'].includes(request.value?.status ?? ''),
)

const currentStep = computed(() => STEP_INDEX[request.value?.status ?? 'submitted'] ?? 0)

function stepState(index: number): 'done' | 'active' | 'todo' {
  if (isNegative.value) return index === 0 ? 'done' : 'todo'
  if (index < currentStep.value) return 'done'
  if (index === currentStep.value) return 'active'
  return 'todo'
}

onMounted(async () => {
  const id = String(route.params.id)
  try {
    request.value = await requestsApi.get(id)
    layout.value = await layoutsApi.byRequest(id).catch(() => null)
  } catch (err) {
    error.value = friendlyError(err, 'Unable to load this request.')
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="public-page page-gradient">
    <AppNav />

    <section class="public-band">
      <div class="page-shell page-stack">
        <BackLink to="/my-requests" label="Back to my requests" />

        <EmptyState v-if="loading" title="Loading request…" loading />

        <div v-else-if="error" class="alert alert-error">{{ error }}</div>

        <template v-else-if="request">
          <header class="detail-header">
            <div>
              <RequestStatusBadge :status="request.status" />
              <h1 class="detail-header__title">{{ request.title }}</h1>
              <p class="section-copy detail-header__meta">
                {{ request.event_type }} · {{ request.attendee_count }} attendees
              </p>
            </div>
          </header>

          <!-- STATUS TIMELINE -->
          <section class="card admin-section status-card">
            <div v-if="isNegative" class="status-negative">
              <strong>{{ request.status === 'rejected' ? 'Request declined' : 'Request cancelled' }}</strong>
              <span v-if="request.rejection_reason">{{ request.rejection_reason }}</span>
            </div>
            <div v-else class="status-flow">
              <div
                v-for="(stepItem, index) in FLOW"
                :key="stepItem.key"
                class="status-step"
                :class="`is-${stepState(index)}`"
              >
                <div class="status-dot">
                  <span v-if="stepState(index) === 'done'">✓</span>
                  <span v-else>{{ index + 1 }}</span>
                </div>
                <div class="status-text">
                  <strong>{{ stepItem.label }}</strong>
                  <span>{{ stepItem.hint }}</span>
                </div>
                <div v-if="index < FLOW.length - 1" class="status-line" />
              </div>
            </div>
          </section>

          <div class="split-grid two-col">
            <section class="card admin-section detail-card">
              <h2 class="admin-section__title">Event details</h2>
              <div class="detail-fields">
                <div><strong>Date:</strong> {{ request.requested_date }}</div>
                <div><strong>Time:</strong> {{ request.start_time }} – {{ request.end_time }}</div>
                <div><strong>Venue:</strong> {{ request.venue?.name || 'To be assigned' }}</div>
                <div v-if="request.description"><strong>Description:</strong> {{ request.description }}</div>
                <div v-if="request.special_requirements"><strong>Special requirements:</strong> {{ request.special_requirements }}</div>
                <div v-if="request.rejection_reason" class="detail-rejection">
                  <strong>Rejection reason:</strong> {{ request.rejection_reason }}
                </div>
              </div>
            </section>

            <section class="card admin-section detail-card">
              <h2 class="admin-section__title">Review progress</h2>
              <p class="section-copy">
                Your request moves through AI analysis, staff review, quotation, and final confirmation.
              </p>
              <div class="badge badge-neutral">Submitted {{ new Date(request.created_at).toLocaleString() }}</div>
              <div v-if="aiSummary" class="detail-ai card">
                <strong>AI summary</strong>
                <p class="detail-ai__text">{{ aiSummary }}</p>
              </div>
              <p v-else class="detail-placeholder">
                AI analysis will appear here once processing completes.
              </p>
            </section>
          </div>

          <section v-if="layout" class="card admin-section detail-card">
            <div class="admin-section__head">
              <h2 class="admin-section__title">Your layout</h2>
              <span class="detail-layout-meta">{{ layout.item_count }} items placed</span>
            </div>
            <LayoutCapture
              :items="layout.items_json"
              :room-id="layout.three_d_room_id ?? request.venue?.three_d_room_id ?? null"
              :plan-image="layout.thumbnail_url ?? null"
            />
          </section>
        </template>
      </div>
    </section>
  </div>
</template>

<style scoped>
.detail-header__title {
  margin: var(--space-3) 0 0;
  font-size: clamp(1.5rem, 3vw, 2rem);
  font-weight: 800;
  letter-spacing: -0.02em;
}

.detail-header__meta {
  margin-top: var(--space-2);
}

.detail-card {
  padding: var(--space-6);
}

.detail-fields {
  display: grid;
  gap: var(--space-3);
}

.detail-rejection {
  color: var(--error);
}

.detail-ai {
  padding: var(--space-4);
  background: var(--bg-secondary);
}

.detail-ai__text {
  margin: var(--space-2) 0 0;
}

.detail-placeholder {
  margin: 0;
  color: var(--text-tertiary);
}

.detail-layout-meta {
  color: var(--text-tertiary);
  font-size: 0.85rem;
}

.status-card {
  padding: var(--space-6);
}
.status-flow {
  display: flex;
  gap: var(--space-2);
}
.status-step {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: var(--space-2);
}
.status-dot {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-weight: 700;
  font-size: 0.9rem;
  background: var(--bg-secondary);
  color: var(--text-tertiary);
  border: 2px solid var(--border-light);
  z-index: 1;
  transition: all 0.25s var(--ease, ease);
}
.status-line {
  position: absolute;
  top: 19px;
  left: 50%;
  width: 100%;
  height: 2px;
  background: var(--border-light);
  z-index: 0;
}
.status-text {
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.status-text strong {
  font-size: 0.86rem;
}
.status-text span {
  font-size: 0.74rem;
  color: var(--text-tertiary);
}
.status-step.is-done .status-dot {
  background: var(--accent-gradient, var(--accent));
  color: #fff;
  border-color: transparent;
}
.status-step.is-done .status-line {
  background: var(--accent);
}
.status-step.is-active .status-dot {
  background: #fff;
  color: var(--accent);
  border-color: var(--accent);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--accent) 18%, transparent);
}
.status-negative {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-4);
  border-radius: var(--radius-lg);
  background: var(--error-light);
  color: var(--error);
}
@media (max-width: 640px) {
  .status-flow {
    flex-direction: column;
  }
  .status-step {
    flex-direction: row;
    text-align: left;
    align-items: center;
  }
  .status-line {
    display: none;
  }
}
</style>
