<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import EmptyState from '@/components/ui/EmptyState.vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const errorMessage = ref('')

const redirectTarget = computed(() =>
  typeof route.query.redirect === 'string' && route.query.redirect.startsWith('/')
    ? route.query.redirect
    : null,
)

onMounted(async () => {
  try {
    const code = typeof route.query.code === 'string' ? route.query.code : null
    await auth.completeSupabaseCallback(code)

    const target =
      redirectTarget.value ??
      (auth.isStaff ? '/admin/dashboard' : '/')

    router.replace(target)
  } catch {
    errorMessage.value =
      auth.error || 'We could not finish your sign-in. Please try again.'
  }
})
</script>

<template>
  <div class="callback-shell">
    <div class="callback-card fade-up">
      <RouterLink to="/" class="callback-brand">
        <img src="/logo.png" alt="SpaceFlo" class="callback-logo" />
      </RouterLink>

      <template v-if="!errorMessage">
        <div class="callback-spinner" role="status" aria-label="Completing sign in">
          <span class="spinner" />
        </div>
        <h1 class="callback-title">Completing sign in</h1>
        <p class="callback-sub">Just a moment while we finalize your session…</p>
      </template>

      <template v-else>
        <div class="callback-error-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        </div>
        <h1 class="callback-title">Sign-in failed</h1>
        <div class="alert alert-error callback-alert">{{ errorMessage }}</div>
        <div class="callback-actions">
          <RouterLink to="/login" class="button button-primary button-lg">Back to login</RouterLink>
          <RouterLink to="/register" class="button button-secondary button-lg">Create account</RouterLink>
        </div>
      </template>
    </div>

    <!-- Ambient background blobs -->
    <div class="callback-bg" aria-hidden="true">
      <div class="callback-bg__blob callback-bg__blob--1" />
      <div class="callback-bg__blob callback-bg__blob--2" />
    </div>
  </div>
</template>

<style scoped>
.callback-shell {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-6);
  position: relative;
  background: var(--bg-primary);
  overflow: hidden;
}

.callback-card {
  position: relative;
  z-index: 1;
  width: min(460px, 100%);
  padding: var(--space-10) var(--space-8);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-2xl);
  box-shadow: var(--shadow-lg);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: var(--space-5);
}

.callback-brand {
  display: inline-flex;
  margin-bottom: var(--space-2);
}
.callback-logo {
  height: 34px;
  width: auto;
}

.callback-spinner {
  display: flex;
  justify-content: center;
}
.callback-spinner .spinner {
  width: 40px;
  height: 40px;
  border-width: 3px;
}

.callback-title {
  margin: 0;
  font-size: 1.65rem;
  font-weight: 800;
  letter-spacing: -0.03em;
}

.callback-sub {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.96rem;
}

.callback-error-icon {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: var(--error-light);
  color: var(--error);
  display: grid;
  place-items: center;
}
.callback-error-icon svg {
  width: 30px;
  height: 30px;
}

.callback-alert {
  width: 100%;
  text-align: left;
}

.callback-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--space-3);
}

/* Decorative blobs */
.callback-bg {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  overflow: hidden;
}
.callback-bg__blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
}
.callback-bg__blob--1 {
  width: 540px;
  height: 400px;
  top: -120px;
  right: -120px;
  background: radial-gradient(circle, rgba(61,169,245,.12) 0%, transparent 70%);
}
.callback-bg__blob--2 {
  width: 400px;
  height: 360px;
  bottom: -80px;
  left: -80px;
  background: radial-gradient(circle, rgba(46,201,138,.08) 0%, transparent 70%);
}
</style>
