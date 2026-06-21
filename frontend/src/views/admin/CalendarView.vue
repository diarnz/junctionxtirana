<script setup lang="ts">
import { computed } from 'vue'
import FullCalendar from '@fullcalendar/vue3'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import timeGridPlugin from '@fullcalendar/timegrid'
import { useRouter } from 'vue-router'

import { requestsApi } from '@/api/client'

const router = useRouter()

function venueColor(name: string | null) {
  const value = (name ?? '').toLowerCase()
  if (value.includes('blue')) return '#3da9f5'
  if (value.includes('orange')) return '#ff6400'
  if (value.includes('green')) return '#2ec98a'
  if (value.includes('yellow')) return '#f5a623'
  return '#7a9bb5'
}

const calendarOptions = computed(() => ({
  plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
  initialView: 'dayGridMonth',
  height: 'auto',
  contentHeight: 'auto',
  allDaySlot: false,
  slotMinTime: '08:00:00',
  slotMaxTime: '22:00:00',
  slotLabelInterval: '01:00',
  slotLabelFormat: {
    hour: 'numeric' as const,
    meridiem: 'short' as const,
  },
  eventDisplay: 'block',
  eventTimeFormat: {
    hour: 'numeric' as const,
    minute: '2-digit' as const,
    meridiem: 'short' as const,
    omitZeroMinute: true,
  },
  headerToolbar: {
    left: 'prev,next',
    center: 'title',
    right: 'dayGridMonth,timeGridWeek',
  },
  events: async (
    _info: unknown,
    successCallback: (events: Record<string, unknown>[]) => void,
  ) => {
    try {
      const data = await requestsApi.list({ limit: 200, offset: 0 })
      successCallback(
        data.items
          .filter((item) =>
            ['approved', 'confirmed', 'completed', 'quotation_sent', 'under_review'].includes(item.status),
          )
          .map((item) => ({
            id: item.id,
            title: item.title,
            start: `${item.requested_date}T${item.start_time}`,
            end: `${item.requested_date}T${item.end_time}`,
            backgroundColor: venueColor(item.venue_name),
            borderColor: item.has_conflicts ? '#f04848' : venueColor(item.venue_name),
            extendedProps: item,
          })),
      )
    } catch {
      successCallback([])
    }
  },
  eventClick: (info: { event: { id: string } }) => {
    router.push(`/admin/requests/${info.event.id}`)
  },
}))
</script>

<template>
  <section class="admin-page">
    <p class="admin-page-intro">
      View scheduled events and conflicts across Pyramid venues.
    </p>

    <article class="card admin-section admin-section--card admin-section--card--flush">
      <div class="admin-section__head">
        <div>
          <h2 class="admin-section__title">Event calendar</h2>
          <p class="section-copy">
            Click an event to open the full request detail.
          </p>
        </div>
      </div>

      <div class="calendar-wrapper">
        <FullCalendar :options="calendarOptions" />
      </div>
    </article>
  </section>
</template>

<style scoped>
.calendar-wrapper {
  padding: var(--space-3);
}

:deep(.fc) {
  font-size: 0.875rem;
}

:deep(.fc .fc-button-primary) {
  background-color: var(--primary);
  border-color: var(--primary);
  padding: 0.4rem 0.8rem;
  font-size: 0.75rem;
}

:deep(.fc .fc-button-primary:not(:disabled):hover) {
  background-color: var(--primary-dark);
  border-color: var(--primary-dark);
}

:deep(.fc .fc-button-primary.fc-button-active) {
  background-color: var(--primary-dark);
  border-color: var(--primary-dark);
}

:deep(.fc-toolbar) {
  gap: var(--space-2);
  margin-bottom: var(--space-3);
}

:deep(.fc-toolbar-chunk) {
  display: flex;
  gap: var(--space-2);
  align-items: center;
}

:deep(.fc-toolbar-title) {
  font-size: 1.125rem;
  font-weight: 700;
  margin: 0;
}

:deep(.fc-daygrid-day) {
  padding: 0;
}

:deep(.fc-daygrid-day-frame) {
  min-height: 100px;
}

:deep(.fc-daygrid-day-number) {
  padding: var(--space-1) var(--space-2);
  font-size: 0.75rem;
}

:deep(.fc-col-header-cell) {
  padding: var(--space-2);
  font-size: 0.75rem;
  font-weight: 600;
}

:deep(.fc-event) {
  margin: 2px 2px;
  border-radius: 3px;
}

:deep(.fc-event-title) {
  font-size: 0.7rem;
  padding: 2px 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

:deep(.fc-timegrid-event-harness) {
  font-size: 0.7rem;
}

:deep(.fc-event.fc-event-start.fc-event-end) {
  border-width: 2px;
}
</style>
