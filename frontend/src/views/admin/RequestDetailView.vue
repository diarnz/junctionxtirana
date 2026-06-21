<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'

import AiProposalCard from '@/components/requests/AiProposalCard.vue'
import ConflictAlert from '@/components/requests/ConflictAlert.vue'
import RequestStatusBadge from '@/components/requests/RequestStatusBadge.vue'
import BackLink from '@/components/ui/BackLink.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import LayoutCapture from '@/components/visualization/LayoutCapture.vue'
import {
  aiApi,
  friendlyError,
  layoutsApi,
  requestsApi,
  reservationsApi,
  tasksApi,
} from '@/api/client'
import { countItems } from '@/lib/layoutCatalog'
import { useAiStore } from '@/stores/ai'
import { useNotificationsStore } from '@/stores/notifications'
import { useRequestsStore } from '@/stores/requests'
import type {
  Conflict,
  ReservationResponse,
  RoomLayoutResponse,
  TaskResponse,
} from '@/types'

const route = useRoute()
const requestStore = useRequestsStore()
const notifications = useNotificationsStore()
const ai = useAiStore()

const conflicts = ref<Conflict[]>([])
const tasks = ref<TaskResponse[]>([])
const reservations = ref<ReservationResponse[]>([])
const layout = ref<RoomLayoutResponse | null>(null)
const rejectReason = ref('')
const showReject = ref(false)
const actioning = ref(false)
const loadingExtras = ref(false)

const requestId = computed(() => String(route.params.id))
const requestDetail = computed(() => requestStore.active)
const hasRequest = computed(() => Boolean(requestDetail.value))
const canApproveStatus = computed(() =>
  ['submitted', 'under_review', 'quotation_sent'].includes(requestDetail.value?.status ?? ''),
)
const canRejectStatus = computed(() =>
  ['submitted', 'under_review', 'quotation_sent'].includes(requestDetail.value?.status ?? ''),
)
const hasUnresolvedConflicts = computed(() => conflicts.value.length > 0)

async function loadDetail() {
  await requestStore.fetchOne(requestId.value)
  await loadExtras()
}

async function loadExtras() {
  loadingExtras.value = true
  try {
    const [conflictData, taskData, reservationData, layoutData] = await Promise.all([
      requestsApi.conflicts(requestId.value).catch(() => ({
        conflicts: [],
      })),
      tasksApi.list({ request_id: requestId.value }).catch(() => []),
      reservationsApi.list(requestId.value).catch(() => []),
      layoutsApi.byRequest(requestId.value).catch(() => null),
    ])
    conflicts.value = conflictData.conflicts ?? []
    tasks.value = taskData
    reservations.value = reservationData
    layout.value = layoutData
  } finally {
    loadingExtras.value = false
  }
}

async function approve() {
  if (loadingExtras.value || hasUnresolvedConflicts.value) {
    notifications.push('Resolve all conflicts before approving this request.', 'warning')
    return
  }

  actioning.value = true
  try {
    await requestsApi.approve(requestId.value)
    notifications.push('Request approved.', 'success')
    await loadDetail()
  } catch (err) {
    notifications.push(friendlyError(err, 'Approval failed.'), 'error')
  } finally {
    actioning.value = false
  }
}

async function reject() {
  if (!rejectReason.value.trim()) return
  actioning.value = true
  try {
    await requestsApi.reject(requestId.value, rejectReason.value)
    notifications.push('Request rejected.', 'warning')
    showReject.value = false
    rejectReason.value = ''
    await loadDetail()
  } catch (err) {
    notifications.push(friendlyError(err, 'Rejection failed.'), 'error')
  } finally {
    actioning.value = false
  }
}

async function generateTasks() {
  actioning.value = true
  try {
    tasks.value = await tasksApi.generate(requestId.value)
    notifications.push('Tasks generated.', 'success')
  } catch (err) {
    notifications.push(friendlyError(err, 'Task generation failed.'), 'error')
  } finally {
    actioning.value = false
  }
}

async function runConflictAgent() {
  actioning.value = true
  try {
    const result = await aiApi.detectConflicts(requestId.value)
    conflicts.value = result.conflicts ?? conflicts.value
    notifications.push('Conflict analysis completed.', 'success')
  } catch (err) {
    notifications.push(friendlyError(err, 'Conflict analysis failed.'), 'error')
  } finally {
    actioning.value = false
  }
}

const layoutCounts = computed(() => countItems(layout.value?.items_json ?? []))

function openSpecSheet() {
  window.open(`/admin/requests/${requestId.value}/spec`, '_blank')
}

function openAi() {
  ai.resetConversation()
  ai.setPanelState(true, 'copilot', {
    request_id: requestId.value,
    venue_name: requestDetail.value?.venue?.name,
    event_request_id: requestId.value,
  })
}

onMounted(loadDetail)
</script>

<template>
  <EmptyState v-if="requestStore.loading && !hasRequest" title="Loading request…" loading />

  <EmptyState
    v-else-if="!requestDetail"
    title="Request not found"
    message="This request may have been removed or you may not have access."
  >
    <RouterLink to="/admin/dashboard" class="button button-secondary">Back to dashboard</RouterLink>
  </EmptyState>

  <section v-else class="admin-page request-detail">
    <header class="card request-detail__header">
      <div class="request-detail__top">
        <div>
          <BackLink to="/admin/dashboard" label="Back to dashboard" />
          <h1 class="request-detail__title">{{ requestDetail.title }}</h1>
          <div class="request-detail__meta">
            <RequestStatusBadge :status="requestDetail.status" />
            <span class="muted text-capitalize">
              {{ requestDetail.event_type.replaceAll('_', ' ') }} · {{ requestDetail.attendee_count }} attendees · {{ requestDetail.requested_date }}
            </span>
          </div>
        </div>

        <div class="request-detail__action-stack">
          <div class="request-detail__actions">
            <button type="button" class="button button-secondary" @click="openAi">
              Ask AI
            </button>
            <button
              v-if="canApproveStatus"
              type="button"
              class="button button-primary"
              :disabled="actioning || loadingExtras || hasUnresolvedConflicts"
              :title="hasUnresolvedConflicts ? 'Resolve all conflicts before approval' : undefined"
              @click="approve"
            >
              Approve
            </button>
            <button
              v-if="canRejectStatus"
              type="button"
              class="button button-danger"
              :disabled="actioning"
              @click="showReject = true"
            >
              Reject
            </button>
          </div>
          <button
            type="button"
            class="button button-secondary request-detail__export"
            :disabled="!layout"
            @click="openSpecSheet"
          >
            Export A4 spec sheet
          </button>
        </div>
      </div>

    </header>

    <section class="request-detail__section split-grid two-col">
      <article class="card detail-panel">
        <h2 class="admin-section__title">Request details</h2>
        <div><strong>Client:</strong> {{ requestDetail.client?.full_name ?? 'Unknown' }}</div>
        <div><strong>Organization:</strong> {{ requestDetail.client?.organization ?? 'N/A' }}</div>
        <div><strong>Venue:</strong> {{ requestDetail.venue?.name ?? 'Not assigned' }}</div>
        <div><strong>Time:</strong> {{ requestDetail.start_time }} - {{ requestDetail.end_time }}</div>
        <div><strong>Setup / teardown:</strong> {{ requestDetail.setup_time_minutes }} / {{ requestDetail.teardown_time_minutes }} mins</div>
        <div><strong>Requirements:</strong> {{ requestDetail.special_requirements || 'None' }}</div>
        <div v-if="requestDetail.description"><strong>Description:</strong> {{ requestDetail.description }}</div>
      </article>

      <AiProposalCard
        v-if="requestDetail.ai_proposal_json"
        :proposal="requestDetail.ai_proposal_json"
      />
      <div v-else class="card detail-panel">
        <EmptyState title="AI proposal in progress" message="The AI proposal is still being prepared for this request." loading />
      </div>
    </section>

    <section class="request-detail__section admin-section">
      <div class="admin-section__head">
        <h2 class="admin-section__title">Conflict detection</h2>
        <button type="button" class="button button-secondary" :disabled="actioning" @click="runConflictAgent">
          Run AI conflict check
        </button>
      </div>

      <div
        v-if="canApproveStatus && hasUnresolvedConflicts"
        class="alert alert-error"
        role="alert"
      >
        Approval is blocked until all {{ conflicts.length }} conflict{{ conflicts.length === 1 ? '' : 's' }} below are resolved.
      </div>

      <EmptyState v-if="loadingExtras && !conflicts.length" title="Checking conflicts…" loading />

      <div v-else-if="!conflicts.length" class="alert alert-success">
        No conflicts detected for this request.
      </div>

      <ConflictAlert
        v-for="(conflict, index) in conflicts"
        :key="index"
        :conflict="conflict"
      />
    </section>

    <article class="card detail-panel request-detail__section">
      <h2 class="admin-section__title">Asset reservations</h2>

      <EmptyState v-if="loadingExtras && !reservations.length" title="Loading reservations…" loading />

      <EmptyState
        v-else-if="!reservations.length"
        title="No reservations yet"
        message="Asset reservations will appear here once they are created."
      />

      <div v-else class="detail-list">
        <div v-for="reservation in reservations" :key="reservation.id" class="card detail-list__item">
          <div>
            <strong>{{ reservation.asset_name }}</strong>
            <div class="muted">
              Requested {{ reservation.quantity_requested }} · confirmed {{ reservation.quantity_confirmed }}
            </div>
          </div>
          <span class="badge badge-neutral text-capitalize">{{ reservation.status.replaceAll('_', ' ') }}</span>
        </div>
      </div>
    </article>

    <section class="request-detail__section admin-section">
      <div class="admin-section__head">
        <h2 class="admin-section__title">Operational tasks</h2>
        <button
          type="button"
          class="button button-primary"
          :disabled="actioning"
          @click="generateTasks"
        >
          Generate task list
        </button>
      </div>

      <EmptyState v-if="loadingExtras && !tasks.length" title="Loading tasks…" loading />

      <EmptyState
        v-else-if="!tasks.length"
        title="No tasks yet"
        message="Generate a task list to plan setup and teardown for this event."
      />

      <div v-else class="detail-list">
        <article v-for="task in tasks" :key="task.id" class="card detail-list__item detail-list__item--stack">
          <div>
            <div class="detail-list__badges">
              <span class="badge badge-neutral text-capitalize">{{ task.task_type.replaceAll('_', ' ') }}</span>
              <span class="badge" :class="task.status === 'done' ? 'badge-success' : task.status === 'blocked' ? 'badge-error' : 'badge-info'">
                {{ task.status.replaceAll('_', ' ') }}
              </span>
            </div>
            <strong>{{ task.title }}</strong>
            <div class="muted">
              Due {{ new Date(task.due_at).toLocaleString() }}
            </div>
          </div>
          <div class="detail-list__aside">
            <div class="muted detail-list__aside-label">Priority</div>
            <strong class="text-capitalize">{{ task.priority }}</strong>
          </div>
        </article>
      </div>
    </section>

    <section class="request-detail__section admin-section">
      <div class="admin-section__head">
        <div>
          <h2 class="admin-section__title">Client layout</h2>
          <p class="section-copy">
            {{ layout ? `${layout.item_count} items · ${layout.source.replaceAll('_', ' ')}` : 'No saved layout yet' }}
          </p>
        </div>
      </div>

      <div class="split-grid two-col">
        <article class="card detail-panel">
          <h3 class="admin-section__title">Layout visuals</h3>
          <LayoutCapture
            :items="layout?.items_json ?? []"
            :room-id="layout?.three_d_room_id ?? requestDetail.venue?.three_d_room_id"
            :plan-image="layout?.thumbnail_url ?? null"
          />
        </article>

        <article class="card detail-panel">
          <h3 class="admin-section__title">Layout breakdown</h3>
          <div v-if="!layoutCounts.length" class="muted">
            The client has not placed any furniture yet.
          </div>
          <div v-else class="detail-breakdown">
            <div v-for="entry in layoutCounts" :key="entry.modelKey" class="detail-breakdown__row">
              <span class="detail-breakdown__label">
                <span class="detail-breakdown__swatch" :style="{ background: entry.color }" />
                {{ entry.label }}
              </span>
              <strong>×{{ entry.count }}</strong>
            </div>
          </div>
        </article>
      </div>
    </section>

    <div v-if="showReject" class="modal-backdrop">
      <div class="modal-card">
        <div class="modal-header">
          <strong>Reject request</strong>
          <button type="button" class="button button-ghost" @click="showReject = false">×</button>
        </div>
        <div class="modal-body">
          <label class="field">
            <span class="field-label">Reason</span>
            <textarea
              v-model="rejectReason"
              class="textarea"
              rows="4"
              placeholder="Explain why this request is being rejected."
            />
          </label>
        </div>
        <div class="modal-footer">
          <button type="button" class="button button-secondary" @click="showReject = false">
            Cancel
          </button>
          <button type="button" class="button button-danger" :disabled="actioning" @click="reject">
            Confirm rejection
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.request-detail__header {
  padding: var(--space-6);
  display: grid;
  gap: var(--space-5);
}

.request-detail__section {
  scroll-margin-top: calc(var(--topbar-height) + var(--space-4));
}

.request-detail__top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-4);
  flex-wrap: wrap;
}

.request-detail__title {
  margin: 0 0 var(--space-2);
  font-size: clamp(1.5rem, 2.5vw, 2rem);
}

.request-detail__meta {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-wrap: wrap;
}

.request-detail__actions {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.request-detail__action-stack {
  display: grid;
  justify-items: end;
  gap: var(--space-2);
}

.request-detail__export {
  width: 100%;
}

.detail-panel {
  padding: var(--space-6);
  display: grid;
  gap: var(--space-3);
}

.detail-list {
  display: grid;
  gap: var(--space-3);
}

.detail-list__item {
  padding: var(--space-4);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
}

.detail-list__item--stack {
  align-items: flex-start;
}

.detail-list__badges {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-1);
}

.detail-list__aside {
  text-align: right;
}

.detail-list__aside-label {
  font-size: 0.82rem;
  margin-bottom: 0.15rem;
}

.detail-breakdown {
  display: grid;
  gap: var(--space-2);
}

.detail-breakdown__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.detail-breakdown__label {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.detail-breakdown__swatch {
  width: 12px;
  height: 12px;
  border-radius: 3px;
  flex-shrink: 0;
}

@media (max-width: 640px) {
  .request-detail__action-stack {
    width: 100%;
    justify-items: stretch;
  }

  .request-detail__actions {
    display: grid;
  }
}
</style>
