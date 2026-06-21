<script setup lang="ts">
import { computed } from 'vue'
import { RouterView, useRoute } from 'vue-router'

import AdminSidebar from './AdminSidebar.vue'
import { useWebsocketStore } from '@/stores/websocket'

const route = useRoute()
const websocket = useWebsocketStore()

const pageTitle = computed(() => {
  if (route.path.startsWith('/admin/requests/') && route.params.id) {
    return 'Request Detail'
  }
  const titles: Record<string, string> = {
    '/admin/dashboard': 'Dashboard',
    '/admin/requests': 'Requests',
    '/admin/inventory': 'Inventory',
    '/admin/calendar': 'Calendar',
    '/admin/quotations': 'Quotations',
    '/admin/tasks': 'Tasks',
  }
  return titles[route.path] ?? 'Admin'
})

const pageSubtitle = computed(() => {
  const subs: Record<string, string> = {
    '/admin/dashboard': 'Event requests and booking activity',
    '/admin/requests': 'Review and manage all event requests',
    '/admin/inventory': 'Assets, availability, and stock levels',
    '/admin/calendar': 'Live operations schedule',
    '/admin/quotations': 'Quotes, pricing, and approvals',
    '/admin/tasks': 'Setup, teardown, and coordination',
  }
  return subs[route.path] ?? 'Pyramid of Tirana · SpaceFlow'
})
</script>

<template>
  <div class="admin-shell">
    <AdminSidebar />

    <div class="admin-content-shell">
      <header class="admin-topbar">
        <div class="topbar__left">
          <div class="topbar__title">
            <h1 class="topbar__page-name">{{ pageTitle }}</h1>
            <p class="topbar__page-sub">{{ pageSubtitle }}</p>
          </div>
        </div>

        <div class="topbar__right">
          <div
            class="topbar__ws-badge"
            :class="websocket.connected ? 'is-live' : 'is-off'"
            :title="websocket.connected ? 'Realtime updates active' : 'Reconnecting to realtime…'"
          >
            <span class="topbar__ws-dot" aria-hidden="true" />
            {{ websocket.connected ? 'Live' : 'Reconnecting' }}
          </div>
        </div>
      </header>

      <main class="admin-main">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<style scoped>
.topbar__left {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  min-width: 0;
}

.topbar__title {
  min-width: 0;
}

.topbar__page-name {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.topbar__page-sub {
  margin: 0;
  color: var(--text-tertiary);
  font-size: 0.8rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.topbar__right {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-shrink: 0;
}

.topbar__ws-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: 0.35rem 0.8rem;
  border-radius: var(--radius-full);
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0.01em;
}

.topbar__ws-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
  background: currentColor;
}

.topbar__ws-badge.is-live {
  background: var(--success-light);
  color: #18996a;
}
.topbar__ws-badge.is-live .topbar__ws-dot {
  animation: dot-pulse 2s ease-in-out infinite;
}

@keyframes dot-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.topbar__ws-badge.is-off {
  background: var(--warning-light);
  color: #b9791a;
}
</style>
