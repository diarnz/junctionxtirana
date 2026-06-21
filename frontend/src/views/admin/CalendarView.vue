<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import FullCalendar from '@fullcalendar/vue3'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin, { type DateClickArg } from '@fullcalendar/interaction'
import timeGridPlugin from '@fullcalendar/timegrid'
import type {
  CalendarOptions,
  DayCellContentArg,
  EventClickArg,
  EventContentArg,
  EventInput,
} from '@fullcalendar/core'
import { useRouter } from 'vue-router'

import EmptyState from '@/components/ui/EmptyState.vue'
import { friendlyError, requestsApi } from '@/api/client'
import type { EventRequestSummary } from '@/types'

const router = useRouter()
const loading = ref(true)
const error = ref('')
const requests = ref<EventRequestSummary[]>([])
const selectedDate = ref(toDateKey(new Date()))

const scheduledStatuses = new Set([
  'under_review',
  'quotation_sent',
  'approved',
  'confirmed',
  'completed',
])

function toDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function parseLocalDate(date: string, time = '00:00:00') {
  return new Date(`${date}T${time}`)
}

function venueColor(name: string | null) {
  const value = (name ?? '').toLowerCase()
  if (value.includes('blue')) return '#3da9f5'
  if (value.includes('orange')) return '#ff6400'
  if (value.includes('green')) return '#2ec98a'
  if (value.includes('yellow')) return '#f5a623'
  return '#7a9bb5'
}

function formatClock(time: string) {
  return parseLocalDate('2000-01-01', time).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatDuration(item: EventRequestSummary) {
  const start = parseLocalDate(item.requested_date, item.start_time)
  const end = parseLocalDate(item.requested_date, item.end_time)
  const minutes = Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000))
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  if (!hours) return `${remainder}m`
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`
}

function formatStatus(status: string) {
  return status.replaceAll('_', ' ')
}

function eventContent(info: EventContentArg) {
  const item = info.event.extendedProps.request as EventRequestSummary
  const wrapper = document.createElement('div')
  wrapper.className = 'calendar-event'

  const time = document.createElement('strong')
  time.className = 'calendar-event__time'
  time.textContent = `${formatClock(item.start_time)}–${formatClock(item.end_time)}`

  const title = document.createElement('span')
  title.className = 'calendar-event__title'
  title.textContent = item.title

  const room = document.createElement('span')
  room.className = 'calendar-event__room'
  room.textContent = item.venue_name || 'Room not assigned'

  wrapper.append(time, title, room)
  return { domNodes: [wrapper] }
}

const scheduledRequests = computed(() =>
  requests.value
    .filter((item) => scheduledStatuses.has(item.status))
    .sort((a, b) =>
      `${a.requested_date}T${a.start_time}`.localeCompare(
        `${b.requested_date}T${b.start_time}`,
      ),
    ),
)

const selectedEvents = computed(() =>
  scheduledRequests.value.filter((item) => item.requested_date === selectedDate.value),
)

const selectedDateLabel = computed(() =>
  parseLocalDate(selectedDate.value).toLocaleDateString([], {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }),
)

const selectedStats = computed(() => {
  const items = selectedEvents.value
  const rooms = new Set(items.map((item) => item.venue_name).filter(Boolean))
  const totalMinutes = items.reduce((total, item) => {
    const start = parseLocalDate(item.requested_date, item.start_time)
    const end = parseLocalDate(item.requested_date, item.end_time)
    return total + Math.max(0, (end.getTime() - start.getTime()) / 60000)
  }, 0)

  return [
    { label: 'Events', value: String(items.length) },
    { label: 'Rooms active', value: String(rooms.size) },
    { label: 'Conflicts', value: String(items.filter((item) => item.has_conflicts).length) },
    { label: 'Booked time', value: `${Math.round((totalMinutes / 60) * 10) / 10}h` },
  ]
})

const calendarEvents = computed<EventInput[]>(() =>
  scheduledRequests.value.map((item) => ({
    id: item.id,
    title: item.title,
    start: `${item.requested_date}T${item.start_time}`,
    end: `${item.requested_date}T${item.end_time}`,
    backgroundColor: venueColor(item.venue_name),
    borderColor: item.has_conflicts ? '#d83d3d' : venueColor(item.venue_name),
    textColor: '#10283c',
    extendedProps: { request: item },
  })),
)

const calendarOptions = computed<CalendarOptions>(() => ({
  plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
  initialView: 'dayGridMonth',
  height: 'auto',
  contentHeight: 'auto',
  allDaySlot: false,
  nowIndicator: true,
  navLinks: true,
  selectable: true,
  dayMaxEvents: 3,
  slotMinTime: '07:00:00',
  slotMaxTime: '23:00:00',
  slotDuration: '00:30:00',
  slotLabelInterval: '01:00',
  slotLabelFormat: {
    hour: 'numeric',
    minute: '2-digit',
    meridiem: 'short',
  },
  eventDisplay: 'block',
  displayEventTime: false,
  headerToolbar: {
    left: 'prev,next today',
    center: 'title',
    right: 'dayGridMonth,timeGridWeek,timeGridDay',
  },
  buttonText: {
    today: 'Today',
    month: 'Month',
    week: 'Week',
    day: 'Day',
  },
  events: calendarEvents.value,
  eventContent,
  dateClick: (info: DateClickArg) => {
    selectedDate.value = info.dateStr.slice(0, 10)
  },
  eventClick: (info: EventClickArg) => {
    router.push(`/admin/requests/${info.event.id}`)
  },
  dayCellClassNames: (info: DayCellContentArg) =>
    toDateKey(info.date) === selectedDate.value ? ['is-selected-date'] : [],
}))

async function loadCalendar() {
  loading.value = true
  error.value = ''
  try {
    const PAGE_SIZE = 100
    let offset = 0
    let allItems: EventRequestSummary[] = []
    while (true) {
      const data = await requestsApi.list({ limit: PAGE_SIZE, offset })
      allItems = allItems.concat(data.items)
      if (allItems.length >= data.total || data.items.length < PAGE_SIZE) break
      offset += PAGE_SIZE
    }
    requests.value = allItems

    const today = toDateKey(new Date())
    const hasToday = allItems.some((item) => item.requested_date === today)
    if (!hasToday) {
      const firstUpcoming = allItems
        .filter((item) => scheduledStatuses.has(item.status) && item.requested_date >= today)
        .sort((a, b) => a.requested_date.localeCompare(b.requested_date))[0]
      if (firstUpcoming) selectedDate.value = firstUpcoming.requested_date
    }
  } catch (err) {
    error.value = friendlyError(err, 'Unable to load the operations calendar.')
  } finally {
    loading.value = false
  }
}

onMounted(loadCalendar)
</script>

<template>
  <section class="admin-page calendar-page">
    <div class="calendar-intro">
      <div>
        <p class="calendar-eyebrow">Live schedule</p>
        <h2>Operations calendar</h2>
        <p class="admin-page-intro">
          See exact event times, active rooms, conflicts, and the operational agenda for
          any selected date.
        </p>
      </div>
      <button type="button" class="button button-secondary" :disabled="loading" @click="loadCalendar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M20 12a8 8 0 1 1-2.34-5.66M20 4v6h-6" />
        </svg>
        Refresh
      </button>
    </div>

    <EmptyState v-if="loading" title="Loading operations calendar…" loading />

    <div v-else-if="error" class="alert alert-error" role="alert">
      {{ error }}
      <button type="button" class="button button-secondary" @click="loadCalendar">Try again</button>
    </div>

    <template v-else>
      <div class="calendar-stat-grid" aria-label="Selected date summary">
        <article v-for="stat in selectedStats" :key="stat.label" class="calendar-stat">
          <span>{{ stat.label }}</span>
          <strong>{{ stat.value }}</strong>
        </article>
      </div>

      <div class="calendar-workspace">
        <article class="card calendar-panel">
          <div class="calendar-panel__head">
            <div>
              <h3>Venue schedule</h3>
              <p>Click a date for its agenda. Click an event to open the request.</p>
            </div>
            <div class="calendar-legend" aria-label="Calendar legend">
              <span><i class="legend-dot legend-dot--normal" /> Scheduled</span>
              <span><i class="legend-dot legend-dot--conflict" /> Conflict</span>
              <span><i class="legend-ring" /> Selected date</span>
            </div>
          </div>

          <div class="calendar-wrapper">
            <FullCalendar :options="calendarOptions" />
          </div>
        </article>

        <aside class="card agenda-panel" aria-labelledby="agenda-title">
          <div class="agenda-panel__head">
            <p class="calendar-eyebrow">Daily agenda</p>
            <h3 id="agenda-title">{{ selectedDateLabel }}</h3>
            <p>{{ selectedEvents.length }} scheduled {{ selectedEvents.length === 1 ? 'event' : 'events' }}</p>
          </div>

          <div v-if="selectedEvents.length" class="agenda-list">
            <button
              v-for="item in selectedEvents"
              :key="item.id"
              type="button"
              class="agenda-item"
              :class="{ 'has-conflict': item.has_conflicts }"
              @click="router.push(`/admin/requests/${item.id}`)"
            >
              <span class="agenda-item__rail" :style="{ background: venueColor(item.venue_name) }" />
              <span class="agenda-item__time">
                <strong>{{ formatClock(item.start_time) }}</strong>
                <span>{{ formatClock(item.end_time) }}</span>
              </span>
              <span class="agenda-item__body">
                <span class="agenda-item__badges">
                  <span class="agenda-status">{{ formatStatus(item.status) }}</span>
                  <span v-if="item.has_conflicts" class="agenda-conflict">Conflict</span>
                </span>
                <strong>{{ item.title }}</strong>
                <span>{{ item.venue_name || 'Room not assigned' }}</span>
                <small>
                  {{ formatDuration(item) }} · {{ item.attendee_count }} attendees ·
                  {{ item.client_name || 'Unknown client' }}
                </small>
              </span>
              <svg class="agenda-item__arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="m9 18 6-6-6-6" />
              </svg>
            </button>
          </div>

          <div v-else class="agenda-empty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">
              <rect x="3" y="5" width="18" height="16" rx="2" />
              <path d="M16 3v4M8 3v4M3 10h18" />
            </svg>
            <strong>No events scheduled</strong>
            <span>Select another highlighted date to inspect its operations.</span>
          </div>
        </aside>
      </div>
    </template>
  </section>
</template>

<style scoped>
.calendar-page {
  --calendar-blue: #267fc2;
  --calendar-blue-soft: #eef7fd;
  --calendar-red: #c54141;
}

.calendar-intro,
.calendar-panel__head,
.calendar-legend,
.agenda-item__badges {
  display: flex;
  align-items: center;
}

.calendar-intro,
.calendar-panel__head {
  justify-content: space-between;
  gap: var(--space-4);
}

.calendar-intro {
  align-items: flex-start;
}

.calendar-intro h2 {
  margin: 0 0 var(--space-2);
  font-size: clamp(1.35rem, 2vw, 1.8rem);
  letter-spacing: -0.035em;
}

.calendar-eyebrow {
  margin: 0 0 var(--space-1);
  color: var(--calendar-blue);
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.09em;
  text-transform: uppercase;
}

.calendar-stat-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--space-3);
}

.calendar-stat {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 72px;
  padding: var(--space-4);
  border: 1px solid var(--border);
  border-left: 4px solid var(--calendar-blue);
  border-radius: var(--radius-lg);
  background: var(--surface);
}

.calendar-stat span {
  color: var(--text-secondary);
  font-size: 0.82rem;
  font-weight: 650;
}

.calendar-stat strong {
  font-size: 1.55rem;
  font-variant-numeric: tabular-nums;
}

.calendar-workspace {
  display: grid;
  grid-template-columns: minmax(0, 1.75fr) minmax(300px, 0.75fr);
  gap: var(--space-4);
  align-items: start;
}

.calendar-panel,
.agenda-panel {
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  background: var(--surface);
}

.calendar-panel__head,
.agenda-panel__head {
  padding: var(--space-5);
  border-bottom: 1px solid var(--border);
}

.calendar-panel__head h3,
.agenda-panel__head h3 {
  margin: 0 0 var(--space-1);
  font-size: 1.05rem;
}

.calendar-panel__head p,
.agenda-panel__head p:not(.calendar-eyebrow) {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.84rem;
}

.calendar-legend {
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: var(--space-3);
  color: var(--text-secondary);
  font-size: 0.76rem;
  font-weight: 650;
}

.calendar-legend span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.legend-dot,
.legend-ring {
  width: 10px;
  height: 10px;
  border-radius: 3px;
}

.legend-dot--normal { background: var(--calendar-blue); }
.legend-dot--conflict { background: var(--calendar-red); }
.legend-ring { border: 2px solid var(--calendar-blue); background: transparent; }

.calendar-wrapper {
  padding: var(--space-3);
}

.agenda-panel {
  position: sticky;
  top: calc(var(--topbar-height) + var(--space-4));
}

.agenda-list {
  display: grid;
  padding: var(--space-3);
  gap: var(--space-2);
}

.agenda-item {
  position: relative;
  display: grid;
  grid-template-columns: 62px minmax(0, 1fr) 22px;
  align-items: center;
  gap: var(--space-3);
  min-height: 112px;
  padding: var(--space-3);
  padding-left: calc(var(--space-3) + 4px);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--surface);
  color: var(--text-primary);
  text-align: left;
  cursor: pointer;
  transition: border-color var(--t-base) var(--ease-out), box-shadow var(--t-base) var(--ease-out);
}

.agenda-item:hover,
.agenda-item:focus-visible {
  border-color: rgba(38, 127, 194, 0.45);
  box-shadow: var(--shadow-sm);
  outline: 0;
}

.agenda-item.has-conflict {
  border-color: rgba(197, 65, 65, 0.35);
}

.agenda-item__rail {
  position: absolute;
  inset: 0 auto 0 0;
  width: 4px;
}

.agenda-item__time {
  display: grid;
  gap: 2px;
  align-self: start;
  padding-top: 2px;
  font-size: 0.76rem;
  font-variant-numeric: tabular-nums;
}

.agenda-item__time strong {
  color: var(--calendar-blue);
  font-size: 0.86rem;
}

.agenda-item__time span {
  color: var(--text-tertiary);
}

.agenda-item__body {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.agenda-item__body > strong {
  line-height: 1.3;
}

.agenda-item__body > span:not(.agenda-item__badges) {
  color: var(--text-secondary);
  font-size: 0.84rem;
}

.agenda-item__body small {
  color: var(--text-tertiary);
  line-height: 1.4;
}

.agenda-item__badges {
  flex-wrap: wrap;
  gap: 5px;
}

.agenda-status,
.agenda-conflict {
  padding: 3px 7px;
  border-radius: var(--radius-full);
  font-size: 0.65rem;
  font-weight: 750;
  text-transform: capitalize;
}

.agenda-status {
  background: var(--calendar-blue-soft);
  color: #1b6b9f;
}

.agenda-conflict {
  background: #fff0f0;
  color: #a72f2f;
}

.agenda-item__arrow {
  width: 20px;
  color: var(--text-tertiary);
}

.agenda-empty {
  display: grid;
  justify-items: center;
  gap: var(--space-2);
  padding: var(--space-10) var(--space-5);
  color: var(--text-secondary);
  text-align: center;
}

.agenda-empty svg {
  width: 42px;
  color: var(--text-tertiary);
}

.agenda-empty span {
  max-width: 26ch;
  color: var(--text-tertiary);
  font-size: 0.84rem;
  line-height: 1.5;
}

:deep(.fc) {
  --fc-border-color: var(--border);
  --fc-page-bg-color: var(--surface);
  --fc-neutral-bg-color: var(--bg-secondary);
  font-size: 0.875rem;
}

:deep(.fc .fc-button-primary) {
  min-height: 38px;
  padding: 0.4rem 0.75rem;
  border-color: var(--primary);
  background-color: var(--primary);
  font-size: 0.75rem;
  font-weight: 700;
}

:deep(.fc .fc-button-primary:not(:disabled):hover),
:deep(.fc .fc-button-primary.fc-button-active) {
  border-color: var(--primary-dark);
  background-color: var(--primary-dark);
}

:deep(.fc-toolbar) {
  gap: var(--space-3);
  margin-bottom: var(--space-3);
}

:deep(.fc-toolbar-chunk) {
  display: flex;
  gap: 4px;
  align-items: center;
}

:deep(.fc-toolbar-title) {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 750;
}

:deep(.fc-daygrid-day-frame) {
  min-height: 126px;
}

:deep(.fc-daygrid-day-number) {
  min-width: 30px;
  padding: 5px 8px;
  color: var(--text-secondary);
  font-size: 0.76rem;
  font-weight: 700;
}

:deep(.fc-col-header-cell) {
  padding: var(--space-2);
  color: var(--text-secondary);
  font-size: 0.72rem;
  font-weight: 750;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

:deep(.fc-daygrid-day.is-selected-date) {
  background: rgba(38, 127, 194, 0.06);
  box-shadow: inset 0 0 0 2px rgba(38, 127, 194, 0.58);
}

:deep(.fc-day-today) {
  background: rgba(245, 166, 35, 0.08) !important;
}

:deep(.fc-event) {
  margin: 2px 3px;
  overflow: hidden;
  border-width: 1px 1px 1px 4px;
  border-radius: 5px;
  background: color-mix(in srgb, var(--fc-event-bg-color) 18%, white) !important;
  box-shadow: 0 1px 2px rgba(16, 40, 60, 0.08);
  cursor: pointer;
}

:deep(.fc-event-main) {
  color: #10283c !important;
}

:deep(.calendar-event) {
  display: grid;
  gap: 1px;
  min-width: 0;
  padding: 4px 5px;
}

:deep(.calendar-event__time) {
  font-size: 0.66rem;
  font-variant-numeric: tabular-nums;
}

:deep(.calendar-event__title),
:deep(.calendar-event__room) {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

:deep(.calendar-event__title) {
  font-size: 0.72rem;
  font-weight: 750;
}

:deep(.calendar-event__room) {
  color: #476274;
  font-size: 0.64rem;
}

:deep(.fc-timegrid-event .calendar-event__room) {
  white-space: normal;
}

:deep(.fc-timegrid-now-indicator-line) {
  border-color: var(--calendar-red);
}

:deep(.fc-timegrid-now-indicator-arrow) {
  border-color: var(--calendar-red);
  border-top-color: transparent;
  border-bottom-color: transparent;
}

@media (max-width: 1180px) {
  .calendar-workspace {
    grid-template-columns: 1fr;
  }

  .agenda-panel {
    position: static;
  }

  .agenda-list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .calendar-intro,
  .calendar-panel__head {
    align-items: stretch;
    flex-direction: column;
  }

  .calendar-stat-grid,
  .agenda-list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .calendar-legend {
    justify-content: flex-start;
  }

  :deep(.fc-toolbar) {
    align-items: stretch;
    flex-direction: column;
  }

  :deep(.fc-toolbar-chunk) {
    justify-content: center;
  }
}

@media (max-width: 520px) {
  .calendar-stat-grid,
  .agenda-list {
    grid-template-columns: 1fr;
  }

  .agenda-item {
    grid-template-columns: 58px minmax(0, 1fr) 18px;
  }

  :deep(.fc-daygrid-day-frame) {
    min-height: 108px;
  }

  :deep(.calendar-event__room) {
    display: none;
  }
}
</style>
