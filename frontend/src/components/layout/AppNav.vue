<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'

import { useAuthStore } from '@/stores/auth'
import { useWebsocketStore } from '@/stores/websocket'

const auth = useAuthStore()
const websocket = useWebsocketStore()
const router = useRouter()

const dashboardTarget = computed(() =>
  auth.isStaff ? '/admin/dashboard' : '/account',
)

function handleLogout() {
  websocket.disconnect()
  auth.logout()
  router.push('/login')
}
</script>

<template>
  <header class="appnav">
    <div class="page-shell appnav__inner">
      <RouterLink to="/" class="brand">
        <img src="/logo.png" alt="SpaceFlo" class="brand__logo" />
      </RouterLink>

      <nav class="appnav__links">
        <RouterLink to="/venues" class="navlink">Venues</RouterLink>

        <template v-if="auth.isAuthenticated">
          <RouterLink v-if="!auth.isStaff" to="/my-requests" class="navlink">
            My Requests
          </RouterLink>
          <RouterLink :to="dashboardTarget" class="navlink">
            {{ auth.isStaff ? 'Admin' : 'Account' }}
          </RouterLink>

          <RouterLink to="/account" class="avatar-pill">
            <span class="avatar-pill__badge">{{ auth.initials }}</span>
            <span class="avatar-pill__name">{{ auth.displayName }}</span>
          </RouterLink>

          <button type="button" class="button button-secondary" @click="handleLogout">
            Sign Out
          </button>
        </template>

        <template v-else>
          <RouterLink to="/login" class="button button-secondary">Sign In</RouterLink>
          <RouterLink to="/register" class="button button-primary">Get Started</RouterLink>
        </template>
      </nav>
    </div>
  </header>
</template>

<style scoped>
.appnav {
  position: sticky;
  top: 0;
  z-index: 20;
  backdrop-filter: blur(18px) saturate(170%);
  -webkit-backdrop-filter: blur(18px) saturate(170%);
  background: var(--nav-bg);
  border-bottom: 1px solid var(--nav-border);
}

.appnav__inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 72px;
  gap: var(--space-4);
}

.brand {
  display: inline-flex;
  align-items: center;
  transition: opacity var(--t-fast) var(--ease-out);
}
.brand:hover {
  opacity: 0.82;
}
.brand__logo {
  height: 34px;
  width: auto;
  object-fit: contain;
}

.appnav__links {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.navlink {
  position: relative;
  color: var(--text-secondary);
  font-weight: 600;
  font-size: 0.94rem;
  padding: 0.5rem 0.7rem;
  border-radius: var(--radius-md);
  transition:
    color var(--t-base) var(--ease-out),
    background var(--t-base) var(--ease-out);
}

.navlink:hover {
  color: var(--text-primary);
  background: rgba(61, 169, 245, 0.06);
}

.navlink.router-link-active {
  color: var(--accent-dark);
  background: rgba(61, 169, 245, 0.1);
}

.avatar-pill {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: 0.3rem 0.7rem 0.3rem 0.3rem;
  border-radius: var(--radius-full);
  background: var(--surface);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-sm);
  font-weight: 600;
  transition: border-color var(--t-base) var(--ease-out), transform var(--t-base) var(--ease-out);
}
.avatar-pill:hover {
  border-color: rgba(61, 169, 245, 0.5);
  transform: translateY(-1px);
}
.avatar-pill__badge {
  width: 30px;
  height: 30px;
  border-radius: var(--radius-full);
  background: var(--accent-gradient);
  color: #fff;
  display: grid;
  place-items: center;
  font-size: 0.74rem;
  font-weight: 700;
}
.avatar-pill__name {
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.9rem;
}

@media (max-width: 640px) {
  .avatar-pill__name {
    display: none;
  }
}
</style>
