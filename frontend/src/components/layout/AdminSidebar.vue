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
  { to: '/admin/dashboard', label: 'Dashboard', icon: 'D' },
  { to: '/admin/inventory', label: 'Inventory', icon: 'I' },
  { to: '/admin/calendar', label: 'Calendar', icon: 'C' },
  { to: '/admin/quotations', label: 'Quotations', icon: 'Q' },
  { to: '/admin/tasks', label: 'Tasks', icon: 'T' },
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

    <nav class="sidebar__nav">
      <RouterLink
        v-for="item in navItems"
        :key="item.to"
        :to="item.to"
        class="navitem"
        :class="{ 'is-active': isActive(item.to) }"
      >
        <span class="navitem__icon">{{ item.icon }}</span>
        <span class="navitem__label">{{ item.label }}</span>
      </RouterLink>
    </nav>

    <div class="sidebar__foot">
      <div class="sidebar__status" :class="websocket.connected ? 'is-live' : 'is-off'">
        <span class="sidebar__status-dot" />
        {{ websocket.connected ? 'Realtime connected' : 'Reconnecting…' }}
      </div>
      <div class="sidebar__user">
        <strong>{{ auth.user?.full_name }}</strong>
        <span class="sidebar__role">{{ auth.user?.role }}</span>
      </div>
      <button type="button" class="button button-secondary button-block" @click="handleLogout">
        Sign Out
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
}
.sidebar__brand {
  min-height: var(--topbar-height);
  display: flex;
  align-items: center;
  padding: 0 var(--space-5);
  border-bottom: 1px solid var(--border);
}
.sidebar__logo {
  height: 30px;
  width: auto;
  object-fit: contain;
}
.sidebar__nav {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: var(--space-4) var(--space-3);
}
.navitem {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.7rem;
  padding: 0.7rem 0.85rem;
  border-radius: var(--radius-md);
  font-weight: 600;
  font-size: 0.94rem;
  color: var(--text-secondary);
  transition: background var(--t-base) var(--ease-out), color var(--t-base) var(--ease-out);
}
.navitem__icon {
  width: 30px;
  height: 30px;
  display: grid;
  place-items: center;
  border-radius: var(--radius-sm);
  background: var(--bg-tertiary);
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.02em;
  transition: background var(--t-base) var(--ease-out), color var(--t-base) var(--ease-out);
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
  content: "";
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 22px;
  border-radius: var(--radius-full);
  background: var(--accent-gradient);
}
.navitem.is-active .navitem__icon {
  background: var(--accent);
  color: #fff;
}

.sidebar__foot {
  margin-top: auto;
  padding: var(--space-4);
  border-top: 1px solid var(--border);
  display: grid;
  gap: var(--space-3);
}
.sidebar__status {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  font-size: 0.8rem;
  font-weight: 600;
}
.sidebar__status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}
.sidebar__status.is-live {
  color: #18996a;
}
.sidebar__status.is-live .sidebar__status-dot {
  background: var(--success);
  box-shadow: 0 0 0 3px rgba(46, 201, 138, 0.2);
}
.sidebar__status.is-off {
  color: #b9791a;
}
.sidebar__status.is-off .sidebar__status-dot {
  background: var(--warning);
  box-shadow: 0 0 0 3px rgba(245, 166, 35, 0.2);
}
.sidebar__user {
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.sidebar__role {
  color: var(--text-tertiary);
  font-size: 0.82rem;
  text-transform: capitalize;
}
</style>
