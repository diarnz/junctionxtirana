<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

import AuroraBackground from '@/components/layout/AuroraBackground.vue'
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
  <main class="public-page auth">
    <AuroraBackground />

    <section class="auth__card card fade-up">
      <RouterLink to="/" class="auth__brand">
        <img src="/logo.png" alt="SpaceFlo" class="auth__logo" />
      </RouterLink>

      <template v-if="successMessage">
        <div class="auth__check">✓</div>
        <h1 class="auth__title">Check your email</h1>
        <p class="auth__subtitle">{{ successMessage }}</p>
        <div class="auth__cta-row">
          <RouterLink to="/login" class="button button-primary button-lg">Go to login</RouterLink>
          <RouterLink to="/" class="button button-secondary button-lg">Back home</RouterLink>
        </div>
      </template>

      <template v-else>
        <h1 class="auth__title">Create your account</h1>
        <p class="auth__subtitle">
          Create an account to book Pyramid spaces and track requests.
        </p>

        <form class="auth__form" @submit.prevent="handleRegister">
          <div class="split-grid two-col">
            <label class="field">
              <span class="field-label">Full name</span>
              <input v-model="fullName" class="input" placeholder="Jane Doe" />
            </label>

            <label class="field">
              <span class="field-label">Email</span>
              <input v-model="email" class="input" type="email" placeholder="you@company.com" />
            </label>
          </div>

          <div class="split-grid two-col">
            <label class="field">
              <span class="field-label">Organization</span>
              <input v-model="organization" class="input" placeholder="Optional" />
            </label>

            <label class="field">
              <span class="field-label">Phone</span>
              <input v-model="phone" class="input" placeholder="Optional" />
            </label>
          </div>

          <label class="field">
            <span class="field-label">Password</span>
            <input v-model="password" class="input" type="password" placeholder="••••••••" />
            <span class="field-hint">Minimum 8 characters.</span>
          </label>

          <div v-if="auth.error" class="alert alert-error">
            {{ auth.error }}
          </div>

          <button type="submit" class="button button-primary button-block button-lg" :disabled="auth.loading">
            {{ auth.loading ? 'Creating account…' : 'Create account' }}
          </button>

          <div class="divider">or</div>

          <button type="button" class="button button-secondary button-block" :disabled="auth.loading" @click="handleGoogleRegister">
            <svg class="gicon" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.65l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
              <path fill="#FBBC05" d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84Z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.05l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z" />
            </svg>
            Continue with Google
          </button>
        </form>

        <div class="auth__foot">
          <span>Already have an account?</span>
          <RouterLink to="/login" class="auth__foot-link">Sign in →</RouterLink>
        </div>
      </template>
    </section>
  </main>
</template>

<style scoped>
.auth {
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-6);
}
.auth__card {
  position: relative;
  z-index: 1;
  width: min(520px, 100%);
  padding: var(--space-8);
  border-radius: var(--radius-2xl);
  box-shadow: var(--shadow-lg);
}
.auth__brand {
  display: inline-flex;
  align-items: center;
  margin-bottom: var(--space-6);
}
.auth__logo {
  height: 38px;
  width: auto;
  object-fit: contain;
}
.auth__title {
  margin: 0 0 var(--space-2);
  font-size: 1.85rem;
  font-weight: 800;
}
.auth__subtitle {
  margin: 0 0 var(--space-6);
  color: var(--text-secondary);
}
.auth__form {
  display: grid;
  gap: var(--space-4);
}
.gicon {
  width: 18px;
  height: 18px;
}
.auth__check {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: var(--success-light);
  color: var(--success);
  display: grid;
  place-items: center;
  font-size: 1.8rem;
  margin-bottom: var(--space-4);
}
.auth__cta-row {
  display: flex;
  gap: var(--space-3);
  flex-wrap: wrap;
}
.auth__foot {
  margin-top: var(--space-5);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-3);
  color: var(--text-secondary);
  font-size: 0.9rem;
}
.auth__foot-link {
  color: var(--accent-dark);
  font-weight: 700;
}
</style>
