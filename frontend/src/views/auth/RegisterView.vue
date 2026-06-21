<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()

const fullName = ref('')
const email = ref('')
const password = ref('')
const organization = ref('')
const phone = ref('')
const successMessage = ref('')

async function handleRegister() {
  try {
    const result = await auth.register({
      full_name: fullName.value,
      email: email.value,
      password: password.value,
      organization: organization.value || null,
      phone: phone.value || null,
    })

    if (result.requires_email_verification || !result.access_token) {
      successMessage.value =
        result.message ||
        'Account created. Check your email and use the confirmation link to finish signing in.'
      return
    }

    router.push('/account')
  } catch {
    // store exposes error
  }
}

async function handleGoogleRegister() {
  try {
    await auth.loginWithGoogle('/')
  } catch {
    // store exposes error
  }
}
</script>

<template>
  <div class="auth-shell">
    <!-- Left panel: form -->
    <main class="auth-form-panel">
      <div class="auth-form-wrap fade-up">
        <RouterLink to="/" class="auth-mobile-brand">
          <img src="/logo.png" alt="SpaceFlo" class="auth-mobile-logo" />
        </RouterLink>

        <!-- Success state -->
        <template v-if="successMessage">
          <div class="auth-success-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <h1 class="auth-form__title">Check your email</h1>
          <p class="auth-form__sub">{{ successMessage }}</p>
          <div class="auth-cta-row">
            <RouterLink to="/login" class="button button-primary button-lg">Back to login</RouterLink>
            <RouterLink to="/" class="button button-secondary button-lg">Go home</RouterLink>
          </div>
        </template>

        <!-- Registration form -->
        <template v-else>
          <h1 class="auth-form__title">Create account</h1>
          <p class="auth-form__sub">Book Pyramid spaces and track every request in one place.</p>

          <form class="auth-form" @submit.prevent="handleRegister">
            <div class="auth-two-col">
              <label class="field">
                <span class="field-label">Full name</span>
                <input v-model="fullName" class="input" placeholder="Jane Doe" required />
              </label>

              <label class="field">
                <span class="field-label">Email</span>
                <input v-model="email" class="input" type="email" autocomplete="email" placeholder="you@company.com" required />
              </label>
            </div>

            <div class="auth-two-col">
              <label class="field">
                <span class="field-label">Organization <span class="field-optional">optional</span></span>
                <input v-model="organization" class="input" placeholder="Your company" />
              </label>

              <label class="field">
                <span class="field-label">Phone <span class="field-optional">optional</span></span>
                <input v-model="phone" class="input" placeholder="+355 69 …" />
              </label>
            </div>

            <label class="field">
              <span class="field-label">Password</span>
              <input v-model="password" class="input" type="password" autocomplete="new-password" placeholder="••••••••" required />
              <span class="field-hint">Minimum 8 characters.</span>
            </label>

            <div v-if="auth.error" class="alert alert-error">
              {{ auth.error }}
            </div>

            <button
              type="submit"
              class="button button-primary button-block button-lg"
              :disabled="auth.loading"
            >
              {{ auth.loading ? 'Creating account…' : 'Create account' }}
            </button>

            <div class="divider">or</div>

            <button
              type="button"
              class="button button-secondary button-block auth-google"
              :disabled="auth.loading"
              @click="handleGoogleRegister"
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
            Already have an account?
            <RouterLink to="/login" class="auth-form__link">Sign in →</RouterLink>
          </p>
        </template>
      </div>
    </main>

    <!-- Right panel: brand info -->
    <aside class="auth-panel" aria-hidden="true">
      <div class="auth-panel__inner">
        <RouterLink to="/" class="auth-panel__brand">
          <img src="/logo.png" alt="SpaceFlo" class="auth-panel__logo" />
        </RouterLink>

        <div class="auth-panel__headline">
          <h2>Your gateway to Albania's premier event venue.</h2>
          <p>Submit requests, configure layouts in 3D, and track every detail of your event from a single dashboard.</p>
        </div>

        <ul class="auth-panel__steps">
          <li>
            <span class="auth-step-num">1</span>
            <div>
              <strong>Create your account</strong>
              <span>Free to register, no card required</span>
            </div>
          </li>
          <li>
            <span class="auth-step-num">2</span>
            <div>
              <strong>Browse &amp; request a venue</strong>
              <span>Choose the right space for your event</span>
            </div>
          </li>
          <li>
            <span class="auth-step-num">3</span>
            <div>
              <strong>Design your layout in 3D</strong>
              <span>AI-assisted room configuration</span>
            </div>
          </li>
          <li>
            <span class="auth-step-num">4</span>
            <div>
              <strong>Get a quotation &amp; confirm</strong>
              <span>Staff review with real-time updates</span>
            </div>
          </li>
        </ul>
      </div>
    </aside>
  </div>
</template>

<style scoped>
.auth-shell {
  display: grid;
  grid-template-columns: 1fr 1fr;
  min-height: 100vh;
}

/* ---- Right brand panel ---- */
.auth-panel {
  position: relative;
  background: linear-gradient(145deg, #0f2030 0%, #12263a 50%, #0d1e2e 100%);
  display: flex;
  align-items: center;
  overflow: hidden;
}
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
  bottom: -120px;
  right: -120px;
  background: radial-gradient(circle, rgba(61,169,245,.18) 0%, transparent 70%);
}
.auth-panel::after {
  width: 280px;
  height: 280px;
  top: -60px;
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

.auth-panel__brand { display: flex; }
.auth-panel__logo {
  height: 34px;
  width: auto;
  filter: brightness(0) invert(1);
  opacity: 0.92;
}

.auth-panel__headline h2 {
  margin: 0 0 0.75rem;
  font-size: clamp(1.3rem, 2vw, 1.6rem);
  font-weight: 750;
  letter-spacing: -0.025em;
  line-height: 1.3;
  color: #fff;
}
.auth-panel__headline p {
  margin: 0;
  font-size: 0.92rem;
  color: rgba(255,255,255,.5);
  line-height: 1.65;
}

.auth-panel__steps {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 1.25rem;
}
.auth-panel__steps li {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  font-size: 0.88rem;
}
.auth-panel__steps li div {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.auth-panel__steps li strong {
  color: rgba(255,255,255,.9);
  font-size: 0.9rem;
}
.auth-panel__steps li span {
  color: rgba(255,255,255,.45);
  font-size: 0.82rem;
}

.auth-step-num {
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 0.78rem;
  font-weight: 800;
  background: rgba(61,169,245,.2);
  border: 1.5px solid rgba(61,169,245,.35);
  color: #6ec6f8;
}

/* ---- Left form panel ---- */
.auth-form-panel {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: clamp(1.5rem, 4vw, 3rem);
  background: var(--bg-primary);
}
.auth-form-wrap {
  width: min(480px, 100%);
  display: grid;
  gap: 0;
}

.auth-mobile-brand {
  display: none;
  margin-bottom: var(--space-6);
}
.auth-mobile-logo { height: 32px; }

.auth-form__title {
  margin: 0 0 var(--space-2);
  font-size: 2rem;
  font-weight: 800;
  letter-spacing: -0.03em;
}
.auth-form__sub {
  margin: 0 0 var(--space-7, 1.75rem);
  color: var(--text-secondary);
  font-size: 0.95rem;
}

.auth-form {
  display: grid;
  gap: var(--space-4);
}
.auth-two-col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-4);
}

.field-optional {
  font-size: 0.78rem;
  color: var(--text-tertiary);
  font-weight: 400;
  margin-left: 4px;
}

.auth-google__icon {
  width: 18px;
  height: 18px;
}

.auth-success-icon {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: var(--success-light);
  color: var(--success);
  display: grid;
  place-items: center;
  margin-bottom: var(--space-5);
}
.auth-success-icon svg {
  width: 28px;
  height: 28px;
}

.auth-cta-row {
  display: flex;
  gap: var(--space-3);
  flex-wrap: wrap;
  margin-top: var(--space-6);
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
}
.auth-form__link:hover {
  opacity: 0.75;
}

@media (max-width: 900px) {
  .auth-shell {
    grid-template-columns: 1fr;
  }
  .auth-panel {
    display: none;
  }
  .auth-mobile-brand {
    display: flex;
  }
  .auth-two-col {
    grid-template-columns: 1fr;
  }
}
</style>
