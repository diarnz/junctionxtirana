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
    <div class="req__top">
      <RequestStatusBadge :status="request.status" />
      <span class="req__date">{{ request.requested_date }}</span>
    </div>

    <h3 class="req__title">{{ request.title }}</h3>
    <p class="req__sub">{{ request.event_type }} · {{ request.attendee_count }} attendees</p>

    <div class="req__meta">
      <span v-if="showClient && request.client_name">Client: {{ request.client_name }}</span>
      <span v-if="request.venue_name">Venue: {{ request.venue_name }}</span>
    </div>

    <div class="req__foot">
      <span
        class="badge"
        :class="request.has_conflicts ? 'badge-warning' : request.has_ai_proposal ? 'badge-success' : 'badge-neutral'"
      >
        {{
          request.has_conflicts
            ? 'AI flagged conflicts'
            : request.has_ai_proposal
              ? 'AI proposal ready'
              : 'AI analysis pending'
        }}
      </span>

      <span class="req__review">Review →</span>
    </div>
  </article>
</template>

<style scoped>
.req {
  padding: var(--space-5) var(--space-5) var(--space-4);
  cursor: pointer;
}
.req__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  margin-bottom: var(--space-3);
}
.req__date {
  font-size: 0.82rem;
  color: var(--text-tertiary);
}
.req__title {
  margin: 0 0 var(--space-2);
  font-size: 1.05rem;
  line-height: 1.35;
}
.req__sub {
  margin: 0 0 var(--space-3);
  color: var(--text-secondary);
  text-transform: capitalize;
}
.req__meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  color: var(--text-tertiary);
  font-size: 0.85rem;
}
.req__foot {
  margin-top: var(--space-4);
  padding-top: var(--space-4);
  border-top: 1px solid var(--border-light);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}
.req__review {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  color: var(--accent-dark);
  font-weight: 650;
  font-size: 0.88rem;
  transition: gap var(--t-base) var(--ease-out), opacity var(--t-base);
}

.req:hover .req__review,
.req:focus-visible .req__review {
  gap: 0.45rem;
  opacity: 0.82;
}
</style>
