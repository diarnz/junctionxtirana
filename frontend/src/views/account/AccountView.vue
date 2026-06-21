<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'

import AppNav from '@/components/layout/AppNav.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import ThreeDBookingLink from '@/components/ui/ThreeDBookingLink.vue'
import RecentRequestDisplayCards from '@/components/requests/RecentRequestDisplayCards.vue'
import { friendlyError, requestsApi } from '@/api/client'
import { useAuthStore } from '@/stores/auth'
import type { EventRequestSummary } from '@/types'

const auth = useAuthStore()

const saving = ref(false)
const profileMessage = ref('')
const recentRequests = ref<EventRequestSummary[]>([])
const loadingRequests = ref(true)

const form = ref({
  full_name: '',
  phone: '',
  organization: '',
})

const roleLabel = computed(() => {
  if (auth.user?.role === 'admin') return 'Administrator'
  if (auth.user?.role === 'staff') return 'Operations staff'
  return 'Client account'
})

onMounted(async () => {
  if (auth.user) {
    form.value = {
      full_name: auth.user.full_name,
      phone: auth.user.phone ?? '',
      organization: auth.user.organization ?? '',
    }
  }

  if (auth.isAuthenticated && !auth.isStaff) {
    try {
      const data = await requestsApi.list({ limit: 3 })
      recentRequests.value = data.items
    } catch {
      recentRequests.value = []
    }
  }
  loadingRequests.value = false
})

async function saveProfile() {
  saving.value = true
  profileMessage.value = ''
  try {
    await auth.updateProfile({
      full_name: form.value.full_name.trim(),
      phone: form.value.phone.trim() || null,
      organization: form.value.organization.trim() || null,
    })
    profileMessage.value = 'Profile updated.'
  } catch (err) {
    profileMessage.value = friendlyError(err, 'Unable to save profile.')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="public-page page-gradient">
    <AppNav />

    <section class="public-band">
      <div class="page-shell page-stack">
        <PageHeader
          :title="auth.displayName"
          :copy="auth.user?.email"
          :eyebrow="roleLabel"
        >
          <template #icon>
            <span class="account-avatar">{{ auth.initials }}</span>
          </template>
          <template #actions>
            <RouterLink v-if="auth.isStaff" to="/admin/dashboard" class="button button-primary">
              Admin dashboard
            </RouterLink>
            <RouterLink v-else to="/my-requests" class="button button-primary">
              My requests
            </RouterLink>
            <ThreeDBookingLink class="button button-secondary">
              Book a space
            </ThreeDBookingLink>
          </template>
        </PageHeader>

        <div class="split-grid two-col">
          <!-- PROFILE FORM -->
          <section class="card account-card fade-up-1">
            <h2 class="account-card__title">Profile</h2>
            <form class="account-form" @submit.prevent="saveProfile">
              <label class="field">
                <span class="field-label">Full name</span>
                <input v-model="form.full_name" class="input" required />
              </label>

              <label class="field">
                <span class="field-label">Email</span>
                <input :value="auth.user?.email" class="input" disabled />
                <span class="field-hint">Email is managed by your sign-in provider.</span>
              </label>

              <label class="field">
                <span class="field-label">Phone</span>
                <input v-model="form.phone" class="input" />
              </label>

              <label class="field">
                <span class="field-label">Organization</span>
                <input v-model="form.organization" class="input" />
              </label>

              <div v-if="profileMessage" class="account-msg">
                {{ profileMessage }}
              </div>

              <button type="submit" class="button button-primary button-block" :disabled="saving">
                {{ saving ? 'Saving…' : 'Save profile' }}
              </button>
            </form>
          </section>

          <!-- ACCESS -->
          <section class="card account-card fade-up-2">
            <h2 class="account-card__title">Your SpaceFlow access</h2>
            <ul class="access-list">
              <li v-if="auth.isStaff">Review and approve incoming event requests.</li>
              <li v-if="auth.isStaff">Manage inventory, quotations, tasks, and 3D layouts.</li>
              <li v-if="!auth.isStaff">Submit and track event requests for Pyramid spaces.</li>
              <li v-if="!auth.isStaff">Receive AI venue recommendations and conflict checks.</li>
              <li>Sign in with email/password or Google (when enabled in Supabase).</li>
            </ul>

            <div class="access-actions">
              <RouterLink to="/venues" class="button button-secondary button-block">Browse venues</RouterLink>
              <button type="button" class="button button-ghost button-block" @click="auth.logout(); $router.push('/login')">
                Sign out
              </button>
            </div>
          </section>
        </div>

        <!-- RECENT REQUESTS -->
        <section v-if="!auth.isStaff" class="fade-up-2">
          <div class="account-band-head">
            <h2 class="account-band-head__title">Recent requests</h2>
            <RouterLink to="/my-requests" class="link-arrow">
              View all
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </RouterLink>
          </div>

          <EmptyState v-if="loadingRequests" title="Loading requests…" loading />

          <EmptyState
            v-else-if="!recentRequests.length"
            title="No requests yet"
            message="You have not submitted any event requests yet."
          >
            <ThreeDBookingLink class="button button-primary">Submit your first request</ThreeDBookingLink>
          </EmptyState>

          <div v-else class="display-cards-section">
            <RecentRequestDisplayCards :requests="recentRequests" />
          </div>
        </section>
      </div>
    </section>
  </div>
</template>

<style scoped>
:deep(.page-header__icon) {
  background: transparent;
  border: none;
  padding: 0;
}

.account-avatar {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-full);
  background: var(--accent-gradient);
  color: #fff;
  display: grid;
  place-items: center;
  font-weight: 700;
  font-size: 1.1rem;
  box-shadow: var(--accent-glow);
}

.account-card {
  padding: var(--space-6);
}
.account-card__title {
  margin: 0 0 var(--space-5);
  font-size: 1.25rem;
}
.account-form {
  display: grid;
  gap: var(--space-4);
}
.account-msg {
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  background: var(--success-light);
  border: 1px solid rgba(46, 201, 138, 0.3);
  color: #18996a;
  font-size: 0.9rem;
  font-weight: 500;
}

.access-list {
  margin: 0;
  padding-left: 1.15rem;
  color: var(--text-secondary);
  display: grid;
  gap: var(--space-3);
}
.access-list li::marker {
  color: var(--accent);
}
.access-actions {
  margin-top: var(--space-6);
  display: grid;
  gap: var(--space-3);
}

.account-band-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}
.account-band-head__title {
  margin: 0;
  font-size: 1.25rem;
}
</style>
