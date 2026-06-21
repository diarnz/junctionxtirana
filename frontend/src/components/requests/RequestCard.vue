<script setup lang="ts">
import { useRouter } from 'vue-router'

import RequestStatusBadge from './RequestStatusBadge.vue'
import type { EventRequestSummary } from '@/types'

const props = withDefaults(
  defineProps<{
    request: EventRequestSummary
    detailPath?: string
    showClient?: boolean
  }>(),
  {
    detailPath: '',
    showClient: true,
  },
)

const router = useRouter()

function openDetail() {
  const path = props.detailPath || `/admin/requests/${props.request.id}`
  router.push(path)
}
</script>

<template>
  <article
    class="card card-interactive req"
    tabindex="0"
    role="link"
    @click="openDetail"
    @keydown.enter.prevent="openDetail"
    @keydown.space.prevent="openDetail"
  >
    <div class="req__header">
      <div class="req__left">
        <RequestStatusBadge :status="request.status" />
        <span class="badge" :class="request.has_conflicts ? 'badge-warning' : request.has_ai_proposal ? 'badge-success' : 'badge-neutral'">
          {{
            request.has_conflicts
              ? '⚠ Conflicts'
              : request.has_ai_proposal
                ? '✓ AI ready'
                : 'AI pending'
          }}
        </span>
      </div>
      <span class="req__date">{{ request.requested_date }}</span>
    </div>

    <div class="req__body">
      <h3 class="req__title">{{ request.title }}</h3>
      <p class="req__sub">
        <span class="text-capitalize">{{ request.event_type }}</span>
        &nbsp;·&nbsp;
        <strong>{{ request.attendee_count }}</strong> attendees
      </p>
    </div>

    <div class="req__meta">
      <span v-if="showClient && request.client_name" class="req__meta-item">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        {{ request.client_name }}
      </span>
      <span v-if="request.venue_name" class="req__meta-item">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6"/></svg>
        {{ request.venue_name }}
      </span>
      <span v-else class="req__meta-item req__meta-item--muted">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6"/></svg>
        No venue assigned
      </span>
    </div>

    <div class="req__cta">
      <span>Review request</span>
      <svg class="req__arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14M13 6l6 6-6 6" />
      </svg>
    </div>
  </article>
</template>

<style scoped>
.req {
  padding: var(--space-5);
  cursor: pointer;
  display: grid;
  gap: var(--space-3);
}

.req__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  flex-wrap: wrap;
}

.req__left {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.req__date {
  font-size: 0.8rem;
  color: var(--text-tertiary);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.req__body {
  display: grid;
  gap: var(--space-1);
}

.req__title {
  margin: 0;
  font-size: 1.02rem;
  font-weight: 700;
  line-height: 1.3;
  letter-spacing: -0.01em;
}

.req__sub {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.88rem;
}

.req__meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
}

.req__meta-item {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.82rem;
  color: var(--text-secondary);
}

.req__meta-item svg {
  width: 14px;
  height: 14px;
  color: var(--text-tertiary);
  flex-shrink: 0;
}

.req__meta-item--muted {
  color: var(--text-tertiary);
}

.req__cta {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--space-2);
  padding-top: var(--space-3);
  border-top: 1px solid var(--border-light);
  color: var(--accent-dark);
  font-weight: 650;
  font-size: 0.86rem;
}

.req__arrow {
  width: 15px;
  height: 15px;
  flex-shrink: 0;
  transition: transform var(--t-base) var(--ease-out);
}

.req:hover .req__arrow,
.req:focus-visible .req__arrow {
  transform: translateX(4px);
}
</style>
