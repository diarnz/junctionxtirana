<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'

import { useAuthStore } from '@/stores/auth'
import { useWebsocketStore } from '@/stores/websocket'

const auth = useAuthStore()
const websocket = useWebsocketStore()
const router = useRouter()

const menuOpen = ref(false)

const dashboardTarget = computed(() =>
  auth.isStaff ? '/admin/dashboard' : '/account',
)

function handleLogout() {
  websocket.disconnect()
  auth.logout()
  menuOpen.value = false
  router.push('/login')
}

function closeMenu() {
  menuOpen.value = false
}
</script>

<template>
  <header class="appnav">
    <div class="page-shell appnav__inner">
      <RouterLink to="/" class="brand" @click="closeMenu">
        <img src="/logo.png" alt="SpaceFlo" class="brand__logo" />
      </RouterLink>

      <!-- Desktop nav -->
      <nav class="appnav__links" aria-label="Main navigation">
        <RouterLink to="/venues" class="navlink">Venues</RouterLink>

        <template v-if="auth.isAuthenticated">
          <RouterLink v-if="!auth.isStaff" to="/my-requests" class="navlink">My Requests</RouterLink>

          <RouterLink :to="dashboardTarget" class="avatar-pill">
            <span class="avatar-pill__badge">{{ auth.initials }}</span>
            <span class="avatar-pill__name">{{ auth.isStaff ? 'Admin' : auth.displayName }}</span>
          </RouterLink>

          <button type="button" class="button button-ghost button-sm navlink" @click="handleLogout">
            Sign out
          </button>
        </template>

        <template v-else>
          <RouterLink to="/login" class="button button-secondary button-sm">Sign in</RouterLink>
          <RouterLink to="/register" class="button button-primary button-sm">Get started</RouterLink>
        </template>
      </nav>

      <!-- Mobile hamburger -->
      <button
        type="button"
        class="appnav__burger"
        :aria-expanded="menuOpen"
        aria-label="Toggle navigation"
        @click="menuOpen = !menuOpen"
      >
        <span class="burger-bar" />
        <span class="burger-bar" />
        <span class="burger-bar" />
      </button>
    </div>

    <!-- Mobile drawer -->
    <nav v-if="menuOpen" class="appnav__drawer" aria-label="Mobile navigation">
      <RouterLink to="/venues" class="drawer-link" @click="closeMenu">Venues</RouterLink>

      <template v-if="auth.isAuthenticated">
        <RouterLink v-if="!auth.isStaff" to="/my-requests" class="drawer-link" @click="closeMenu">My Requests</RouterLink>
        <RouterLink :to="dashboardTarget" class="drawer-link drawer-link--avatar" @click="closeMenu">
          <span class="avatar-pill__badge">{{ auth.initials }}</span>
          {{ auth.isStaff ? 'Admin panel' : auth.displayName }}
        </RouterLink>
        <button type="button" class="drawer-link drawer-link--signout" @click="handleLogout">
          Sign out
        </button>
      </template>

      <template v-else>
        <RouterLink to="/login" class="drawer-link" @click="closeMenu">Sign in</RouterLink>
        <RouterLink to="/register" class="drawer-link drawer-link--primary" @click="closeMenu">Get started</RouterLink>
      </template>
    </nav>
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

/* ---- Desktop links ---- */
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

/* ---- Avatar pill ---- */
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
  flex-shrink: 0;
}
.avatar-pill__name {
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.9rem;
}

/* ---- Hamburger ---- */
.appnav__burger {
  display: none;
  flex-direction: column;
  justify-content: center;
  gap: 5px;
  width: 38px;
  height: 38px;
  padding: 8px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--surface);
  cursor: pointer;
  transition: border-color var(--t-base) var(--ease-out), background var(--t-base) var(--ease-out);
}
.appnav__burger:hover {
  border-color: rgba(61, 169, 245, 0.45);
  background: var(--surface-hover);
}
.burger-bar {
  display: block;
  width: 100%;
  height: 2px;
  background: var(--text-primary);
  border-radius: 2px;
  transition: transform var(--t-base) var(--ease-out), opacity var(--t-base) var(--ease-out);
}

/* ---- Mobile drawer ---- */
.appnav__drawer {
  display: none;
  flex-direction: column;
  border-top: 1px solid var(--nav-border);
  padding: var(--space-4) 0;
  background: var(--nav-bg);
  backdrop-filter: blur(18px) saturate(170%);
  -webkit-backdrop-filter: blur(18px) saturate(170%);
  animation: fadeUp 0.22s var(--ease-out) both;
}

.drawer-link {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-4) calc((100vw - min(1200px, calc(100vw - 48px))) / 2 + 24px);
  font-weight: 600;
  font-size: 1rem;
  color: var(--text-secondary);
  border: none;
  background: none;
  cursor: pointer;
  text-align: left;
  transition: color var(--t-base) var(--ease-out), background var(--t-base) var(--ease-out);
}
.drawer-link:hover {
  color: var(--text-primary);
  background: rgba(61, 169, 245, 0.05);
}
.drawer-link.router-link-active {
  color: var(--accent-dark);
}
.drawer-link--primary {
  color: var(--accent-dark);
  font-weight: 700;
}
.drawer-link--avatar {
  color: var(--text-primary);
}
.drawer-link--signout {
  color: var(--error);
  font-size: 0.94rem;
}

/* ---- Responsive breakpoints ---- */
@media (max-width: 720px) {
  .appnav__links {
    display: none;
  }
  .appnav__burger {
    display: flex;
  }
  .appnav__drawer {
    display: flex;
  }
  .avatar-pill__name {
    display: none;
  }
}

@media (min-width: 721px) {
  .appnav__drawer {
    display: none !important;
  }
}

@media (max-width: 640px) {
  .avatar-pill__name {
    display: none;
  }
}
</style>
