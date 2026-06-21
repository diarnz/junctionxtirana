<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import EmptyState from '@/components/ui/EmptyState.vue'
import { friendlyError, tasksApi } from '@/api/client'
import { useNotificationsStore } from '@/stores/notifications'
import type { TaskResponse, TaskStatus } from '@/types'

const notifications = useNotificationsStore()
const loading = ref(true)
const tasks = ref<TaskResponse[]>([])
const updatingTaskId = ref<string | null>(null)

const columns: { key: TaskStatus; label: string }[] = [
  { key: 'pending', label: 'Pending' },
  { key: 'assigned', label: 'Assigned' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'done', label: 'Done' },
  { key: 'blocked', label: 'Blocked' },
]

const grouped = computed(() =>
  Object.fromEntries(
    columns.map((column) => [
      column.key,
      tasks.value.filter((task) => task.status === column.key),
    ]),
  ) as Record<TaskStatus, TaskResponse[]>,
)

async function load() {
  loading.value = true
  try {
    tasks.value = await tasksApi.list()
  } finally {
    loading.value = false
  }
}

async function moveTask(task: TaskResponse, nextStatus: TaskStatus) {
  updatingTaskId.value = task.id
  try {
    const updated = await tasksApi.update(task.id, { status: nextStatus })
    const index = tasks.value.findIndex((item) => item.id === task.id)
    if (index >= 0) tasks.value[index] = updated
    notifications.push('Task updated.', 'success')
  } catch (err) {
    notifications.push(friendlyError(err, 'Task update failed.'), 'error')
  } finally {
    updatingTaskId.value = null
  }
}

onMounted(load)
</script>

<template>
  <section class="admin-page">
    <p class="admin-page-intro">
      Track operational tasks across pending, in-progress, and completed states.
    </p>

    <EmptyState v-if="loading" title="Loading tasks…" loading />

    <div v-else class="kanban">
      <div v-for="column in columns" :key="column.key" class="kanban-col">
        <div class="admin-section__head">
          <h3 class="kanban-col__title">{{ column.label }}</h3>
          <span class="badge badge-neutral">{{ grouped[column.key].length }}</span>
        </div>

        <p v-if="!grouped[column.key].length" class="muted">No tasks here.</p>

        <article
          v-for="task in grouped[column.key]"
          :key="task.id"
          class="card admin-section kanban-card"
        >
          <div class="admin-section__head">
            <span class="badge badge-info">{{ task.task_type }}</span>
            <span class="badge" :class="task.ai_generated ? 'badge-success' : 'badge-neutral'">
              {{ task.ai_generated ? 'AI' : 'Manual' }}
            </span>
          </div>

          <div>
            <strong>{{ task.title }}</strong>
            <div class="muted">{{ task.event_title || 'No event title' }}</div>
          </div>

          <div class="muted">
            Due {{ new Date(task.due_at).toLocaleString() }}
          </div>

          <select
            class="select"
            :disabled="updatingTaskId === task.id"
            :value="task.status"
            @change="moveTask(task, ($event.target as HTMLSelectElement).value as TaskStatus)"
          >
            <option v-for="option in columns" :key="option.key" :value="option.key">
              {{ option.label }}
            </option>
          </select>
        </article>
      </div>
    </div>
  </section>
</template>
