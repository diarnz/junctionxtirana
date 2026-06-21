<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { RouterView, useRoute } from 'vue-router'

import AdminSidebar from './AdminSidebar.vue'
import AiChatPanel from '@/components/ai/AiChatPanel.vue'
import { useAiStore } from '@/stores/ai'
import { useWebsocketStore } from '@/stores/websocket'

const route = useRoute()
const ai = useAiStore()
const websocket = useWebsocketStore()

const pageTitle = computed(() => {
  if (route.path.startsWith('/admin/requests/') && route.params.id) {
    return 'Request Detail'
  }
  const titles: Record<string, string> = {
    '/admin/dashboard': 'Dashboard',
    '/admin/requests': 'Event Requests',
    '/admin/inventory': 'Inventory',
    '/admin/calendar': 'Calendar',
    '/admin/quotations': 'Quotations',
    '/admin/tasks': 'Operational Tasks',
    '/admin/visualization': '3D Visualization',
  }
  return titles[route.path] ?? 'Admin'
})

onMounted(() => {
  ;(window as any).__openAiPanel = () => {
    ai.setPanelState(true, ai.agentType, ai.context)
  }
})
</script>

<template>
  <div class="admin-shell">
    <AdminSidebar />

    <div class="admin-content-shell">
      <header class="admin-topbar">
        <div class="topbar__title">
          <h1>{{ pageTitle }}</h1>
          <span>Pyramid of Tirana · operations console</span>
        </div>

        <div class="topbar__actions">
          <div class="badge" :class="websocket.connected ? 'badge-success' : 'badge-warning'">
            <span class="topbar__dot" />
            {{ websocket.connected ? 'Live' : 'Reconnecting' }}
          </div>

          <button
            type="button"
            class="button button-primary"
            @click="ai.setPanelState(true, ai.agentType, ai.context)"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="m12 3-1.9 5.8H4.5L10 14.2 8.1 20 12 16.8 15.9 20 14 14.2l5.5-5.4h-5.6z" />
            </svg>
            AI Copilot
          </button>
        </div>
      </header>

      <main class="admin-main">
        <RouterView />
      </main>
    </div>

    <AiChatPanel />
  </div>
</template>

<style scoped>
.topbar__title h1 {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 800;
  letter-spacing: -0.03em;
}

.topbar__title span {
  color: var(--text-tertiary);
  font-size: 0.84rem;
}

.topbar__actions {
  display: inline-flex;
  align-items: center;
  gap: var(--space-3);
  flex-wrap: wrap;
}

.topbar__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
  display: inline-block;
}
</style>
