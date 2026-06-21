<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { useAuthStore } from '@/stores/auth'
import { useWebsocketStore } from '@/stores/websocket'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const websocket = useWebsocketStore()

const navItems = computed(() => [
  {
    to: '/admin/dashboard',
    label: 'Dashboard',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="8" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="15" width="7" height="6" rx="1.5"/></svg>`,
  },
  {
    to: '/admin/requests',
    label: 'Requests',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/></svg>`,
  },
  {
    to: '/admin/inventory',
    label: 'Inventory',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>`,
  },
  {
    to: '/admin/calendar',
    label: 'Calendar',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
  },
  {
    to: '/admin/quotations',
    label: 'Quotations',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`,
  },
  {
    to: '/admin/tasks',
    label: 'Tasks',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>`,
  },
])

function isActive(to: string) {
  return route.path === to || route.path.startsWith(to + '/')
}

function handleLogout() {
  websocket.disconnect()
  auth.logout()
  router.push('/login')
}
</script>

<template>
  <aside class="sidebar">
    <RouterLink to="/admin/dashboard" class="sidebar__brand">
      <img src="/logo.png" alt="SpaceFlo" class="sidebar__logo" />
    </RouterLink>

    <nav class="sidebar__nav" aria-label="Admin navigation">
      <RouterLink
        v-for="item in navItems"
        :key="item.to"
        :to="item.to"
        class="navitem"
        :class="{ 'is-active': isActive(item.to) }"
      >
        <!-- eslint-disable-next-line vue/no-v-html -->
        <span class="navitem__icon" aria-hidden="true" v-html="item.icon" />
        <span class="navitem__label">{{ item.label }}</span>
      </RouterLink>
    </nav>

    <div class="sidebar__foot">
      <div class="sidebar__status" :class="websocket.connected ? 'is-live' : 'is-off'">
        <span class="sidebar__status-dot" aria-hidden="true" />
        <span>{{ websocket.connected ? 'Realtime connected' : 'Reconnecting…' }}</span>
      </div>

      <div class="sidebar__user">
        <div class="sidebar__avatar">{{ auth.initials }}</div>
        <div class="sidebar__user-info">
          <strong>{{ auth.user?.full_name }}</strong>
          <span class="sidebar__role">{{ auth.user?.role }}</span>
        </div>
      </div>

      <button type="button" class="button button-ghost sidebar__signout" @click="handleLogout">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
          <polyline points="16 17 21 12 16 7"/>
          <line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
        Sign out
      </button>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  background: var(--surface);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  position: sticky;
  top: 0;
  overflow-y: auto;
}

.sidebar__brand {
  height: var(--topbar-height);
  display: flex;
  align-items: center;
  padding: 0 var(--space-5);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
  transition: opacity var(--t-fast) var(--ease-out);
}
.sidebar__brand:hover {
  opacity: 0.8;
}
.sidebar__logo {
  height: 28px;
  width: auto;
  object-fit: contain;
}

.sidebar__nav {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: var(--space-3) var(--space-3);
  flex: 1;
}

.navitem {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.65rem 0.85rem;
  border-radius: var(--radius-md);
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--text-secondary);
  transition:
    background var(--t-base) var(--ease-out),
    color var(--t-base) var(--ease-out);
}

.navitem__icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color var(--t-base) var(--ease-out);
}

.navitem__icon :deep(svg) {
  width: 18px;
  height: 18px;
}

.navitem:hover {
  background: var(--surface-hover);
  color: var(--text-primary);
}

.navitem.is-active {
  background: var(--accent-light);
  color: var(--accent-dark);
}

.navitem.is-active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 20px;
  border-radius: 0 var(--radius-full) var(--radius-full) 0;
  background: var(--accent-gradient);
}

.navitem:focus-visible {
  outline: 2px solid rgba(61, 169, 245, 0.4);
  outline-offset: 1px;
}

.sidebar__foot {
  margin-top: auto;
  padding: var(--space-4);
  border-top: 1px solid var(--border);
  display: grid;
  gap: var(--space-3);
  flex-shrink: 0;
}

.sidebar__status {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  font-size: 0.76rem;
  font-weight: 600;
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-full);
}

.sidebar__status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}

.sidebar__status.is-live {
  background: var(--success-light);
  color: #18996a;
}
.sidebar__status.is-live .sidebar__status-dot {
  background: var(--success);
  box-shadow: 0 0 0 2px rgba(46, 201, 138, 0.25);
  animation: pulse-green 2s ease-in-out infinite;
}

@keyframes pulse-green {
  0%, 100% { box-shadow: 0 0 0 2px rgba(46, 201, 138, 0.25); }
  50% { box-shadow: 0 0 0 4px rgba(46, 201, 138, 0.12); }
}

.sidebar__status.is-off {
  background: var(--warning-light);
  color: #b9791a;
}
.sidebar__status.is-off .sidebar__status-dot {
  background: var(--warning);
}

.sidebar__user {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) 0;
}

.sidebar__avatar {
  width: 34px;
  height: 34px;
  border-radius: var(--radius-full);
  background: var(--accent-gradient);
  color: #fff;
  display: grid;
  place-items: center;
  font-size: 0.72rem;
  font-weight: 700;
  flex-shrink: 0;
}

.sidebar__user-info {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.sidebar__user-info strong {
  font-size: 0.88rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sidebar__role {
  color: var(--text-tertiary);
  font-size: 0.76rem;
  text-transform: capitalize;
}

.sidebar__signout {
  color: var(--text-tertiary);
  font-size: 0.88rem;
  justify-content: flex-start;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-2);
}
.sidebar__signout:hover:enabled {
  color: var(--error);
  background: var(--error-light);
}
.sidebar__signout svg {
  width: 16px;
  height: 16px;
}
</style>
