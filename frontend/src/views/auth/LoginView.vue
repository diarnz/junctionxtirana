<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const email = ref('')
const password = ref('')

const redirectTarget = computed(() => {
  if (typeof route.query.redirect === 'string' && route.query.redirect.startsWith('/')) {
    return route.query.redirect
  }
  return ''
})

async function afterLogin() {
  if (redirectTarget.value) {
    router.push(redirectTarget.value)
    return
  }
  router.push(auth.isStaff ? '/admin/dashboard' : '/account')
}

async function handleLogin() {
  try {
    await auth.login(email.value, password.value)
    await afterLogin()
  } catch {
    // store already captures display error
  }
}

async function handleGoogleLogin() {
  try {
    const target = redirectTarget.value || (auth.isStaff ? '/admin/dashboard' : '/account')
    await auth.loginWithGoogle(target)
  } catch {
    // store already captures display error
  }
}
</script>

<template>
  <div class="auth-shell">
    <!-- Left panel: brand + features -->
    <aside class="auth-panel" aria-hidden="true">
      <div class="auth-panel__inner">
        <div class="auth-panel__brand">
          <img src="/logo.png" alt="SpaceFlo" class="auth-panel__logo" />
        </div>

        <div class="auth-panel__headline">
          <h2>Manage the Pyramid of Tirana's event spaces — from request to room layout.</h2>
          <p>One platform for booking, inventory, quotations, and AI-powered 3D design.</p>
        </div>

        <ul class="auth-panel__features">
          <li>
            <span class="auth-feat-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
            </span>
            <span><strong>3D Room Designer</strong> — configure layouts with AI in real time</span>
          </li>
          <li>
            <span class="auth-feat-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><polyline points="9 11 12 14 22 4"/></svg>
            </span>
            <span><strong>Smart Booking</strong> — conflict detection and instant quotations</span>
          </li>
          <li>
            <span class="auth-feat-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            </span>
            <span><strong>Live Operations</strong> — inventory tracking and task management</span>
          </li>
        </ul>

        <div class="auth-panel__stats">
          <div class="auth-stat">
            <strong>5</strong><span>Pyramid venues</span>
          </div>
          <div class="auth-stat">
            <strong>800+</strong><span>Asset units</span>
          </div>
          <div class="auth-stat">
            <strong>AI</strong><span>3D powered</span>
          </div>
        </div>
      </div>
    </aside>

    <!-- Right panel: form -->
    <main class="auth-form-panel">
      <div class="auth-form-wrap fade-up">
        <RouterLink to="/" class="auth-mobile-brand">
          <img src="/logo.png" alt="SpaceFlo" class="auth-mobile-logo" />
        </RouterLink>

        <h1 class="auth-form__title">Welcome back</h1>
        <p class="auth-form__sub">Sign in to book spaces and track your requests.</p>

        <form class="auth-form" @submit.prevent="handleLogin">
          <label class="field">
            <span class="field-label">Email</span>
            <input
              v-model="email"
              class="input"
              type="email"
              autocomplete="email"
              placeholder="you@company.com"
              required
            />
          </label>

          <label class="field">
            <span class="field-label">Password</span>
            <input
              v-model="password"
              class="input"
              type="password"
              autocomplete="current-password"
              placeholder="••••••••"
              required
            />
          </label>

          <div v-if="auth.error" class="alert alert-error">
            {{ auth.error }}
          </div>

          <button
            type="submit"
            class="button button-primary button-block button-lg"
            :disabled="auth.loading"
          >
            {{ auth.loading ? 'Signing in…' : 'Sign in' }}
          </button>

          <div class="divider">or</div>

          <button
            type="button"
            class="button button-secondary button-block auth-google"
            :disabled="auth.loading"
            @click="handleGoogleLogin"
          >
            <svg class="auth-google__icon" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.65l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
              <path fill="#FBBC05" d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84Z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.05l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z" />
            </svg>
            Continue with Google
          </button>
        </form>

        <p class="auth-form__foot">
          No account?
          <RouterLink to="/register" class="auth-form__link">Create one →</RouterLink>
        </p>
      </div>
    </main>
  </div>
</template>

<style scoped>
.auth-shell {
  display: grid;
  grid-template-columns: 1fr 1fr;
  min-height: 100vh;
}

/* ---- Left brand panel ---- */
.auth-panel {
  position: relative;
  background: linear-gradient(145deg, #0f2030 0%, #12263a 50%, #0d1e2e 100%);
  display: flex;
  align-items: center;
  overflow: hidden;
}

/* Decorative circles */
.auth-panel::before,
.auth-panel::after {
  content: '';
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
}
.auth-panel::before {
  width: 420px;
  height: 420px;
  top: -120px;
  right: -120px;
  background: radial-gradient(circle, rgba(61,169,245,.18) 0%, transparent 70%);
}
.auth-panel::after {
  width: 300px;
  height: 300px;
  bottom: -60px;
  left: -60px;
  background: radial-gradient(circle, rgba(46,201,138,.12) 0%, transparent 70%);
}

.auth-panel__inner {
  position: relative;
  z-index: 1;
  padding: clamp(2rem, 6vw, 4rem);
  display: grid;
  gap: 2.5rem;
}

.auth-panel__brand {
  display: flex;
}
.auth-panel__logo {
  height: 34px;
  width: auto;
  filter: brightness(0) invert(1);
  opacity: 0.92;
}

.auth-panel__headline h2 {
  margin: 0 0 0.75rem;
  font-size: clamp(1.35rem, 2.2vw, 1.65rem);
  font-weight: 750;
  letter-spacing: -0.025em;
  line-height: 1.3;
  color: #ffffff;
}
.auth-panel__headline p {
  margin: 0;
  font-size: 0.96rem;
  color: rgba(255,255,255,.55);
  line-height: 1.65;
}

.auth-panel__features {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 1rem;
}
.auth-panel__features li {
  display: flex;
  align-items: flex-start;
  gap: 0.85rem;
  font-size: 0.9rem;
  color: rgba(255,255,255,.7);
  line-height: 1.55;
}
.auth-panel__features li strong {
  color: rgba(255,255,255,.95);
}

.auth-feat-icon {
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border-radius: 0.6rem;
  background: rgba(61,169,245,.15);
  border: 1px solid rgba(61,169,245,.25);
  color: #6ec6f8;
}
.auth-feat-icon svg {
  width: 17px;
  height: 17px;
}

.auth-panel__stats {
  display: flex;
  gap: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid rgba(255,255,255,.1);
}
.auth-stat {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.auth-stat strong {
  font-size: 1.5rem;
  font-weight: 800;
  color: #fff;
  letter-spacing: -0.03em;
}
.auth-stat span {
  font-size: 0.75rem;
  color: rgba(255,255,255,.45);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 600;
}

/* ---- Right form panel ---- */
.auth-form-panel {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: clamp(1.5rem, 4vw, 3rem);
  background: var(--bg-primary);
}

.auth-form-wrap {
  width: min(420px, 100%);
  display: grid;
  gap: 0;
}

.auth-mobile-brand {
  display: none;
  margin-bottom: var(--space-6);
}
.auth-mobile-logo {
  height: 32px;
}

.auth-form__title {
  margin: 0 0 var(--space-2);
  font-size: 2rem;
  font-weight: 800;
  letter-spacing: -0.03em;
}
.auth-form__sub {
  margin: 0 0 var(--space-7, 1.75rem);
  color: var(--text-secondary);
  font-size: 0.97rem;
}

.auth-form {
  display: grid;
  gap: var(--space-4);
}

.auth-google__icon {
  width: 18px;
  height: 18px;
}

.auth-form__foot {
  margin-top: var(--space-6);
  font-size: 0.9rem;
  color: var(--text-secondary);
  text-align: center;
}
.auth-form__link {
  color: var(--accent-dark);
  font-weight: 700;
  transition: opacity var(--t-fast) var(--ease-out);
}
.auth-form__link:hover {
  opacity: 0.75;
}

/* ---- Responsive: collapse to single column ---- */
@media (max-width: 860px) {
  .auth-shell {
    grid-template-columns: 1fr;
  }
  .auth-panel {
    display: none;
  }
  .auth-mobile-brand {
    display: flex;
  }
}
</style>
