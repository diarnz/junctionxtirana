<script setup lang="ts">
import { computed } from 'vue'

import DisplayCards, { type DisplayCardItem } from '@/components/ui/DisplayCards.vue'
import type { EventRequestSummary } from '@/types'

const props = withDefaults(
  defineProps<{
    requests: EventRequestSummary[]
    detailPathPrefix?: string
  }>(),
  {
    detailPathPrefix: '/my-requests',
  },
)

function toneFor(status: EventRequestSummary['status']): DisplayCardItem['tone'] {
  if (['approved', 'confirmed', 'completed'].includes(status)) return 'success'
  if (['rejected', 'cancelled'].includes(status)) return 'neutral'
  if (status === 'quotation_sent') return 'warning'
  return 'accent'
}

const cards = computed<DisplayCardItem[]>(() =>
  props.requests.map((request) => {
    const venue = request.venue_name ?? 'Venue TBD'
    return {
      title: request.title,
      description: `${request.event_type} · ${request.attendee_count} attendees · ${venue}`,
      date: request.requested_date,
      to: `${props.detailPathPrefix}/${request.id}`,
      tone: request.has_conflicts ? 'warning' : toneFor(request.status),
    }
  }),
)
</script>

<template>
  <DisplayCards :cards="cards" />
</template>
