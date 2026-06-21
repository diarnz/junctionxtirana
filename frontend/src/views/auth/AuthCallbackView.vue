<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import AuroraBackground from '@/components/layout/AuroraBackground.vue'
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
  <main class="public-page auth">
    <AuroraBackground />

    <section class="auth__card card fade-up">
      <RouterLink to="/" class="auth__brand">
        <img src="/logo.png" alt="SpaceFlo" class="auth__logo" />
      </RouterLink>

      <template v-if="!errorMessage">
        <h1 class="auth__title">Completing sign in</h1>
        <EmptyState title="Finalizing your SpaceFlow session…" loading />
      </template>

      <template v-else>
        <h1 class="auth__title">Sign-in failed</h1>
        <div class="alert alert-error auth__alert">{{ errorMessage }}</div>
        <div class="auth__cta-row">
          <RouterLink to="/login" class="button button-primary button-lg">Back to login</RouterLink>
          <RouterLink to="/register" class="button button-secondary button-lg">Create account</RouterLink>
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
  width: min(460px, 100%);
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
  margin: 0 0 var(--space-4);
  font-size: 1.85rem;
  font-weight: 800;
}
.auth__alert {
  margin-bottom: var(--space-6);
}
.auth__cta-row {
  display: flex;
  justify-content: center;
  gap: var(--space-3);
  flex-wrap: wrap;
}
</style>
