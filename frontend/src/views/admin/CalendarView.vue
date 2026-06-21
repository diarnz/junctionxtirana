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
  initialView: 'timeGridWeek',
  height: 'auto',
  allDaySlot: false,
  slotMinTime: '07:00:00',
  slotMaxTime: '23:00:00',
  headerToolbar: {
    left: 'prev,next today',
    center: 'title',
    right: 'dayGridMonth,timeGridWeek,timeGridDay',
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

      <FullCalendar :options="calendarOptions" />
    </article>
  </section>
</template>
