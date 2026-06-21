<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'

import AppNav from '@/components/layout/AppNav.vue'
import AuroraBackground from '@/components/layout/AuroraBackground.vue'
import HeroGlbViewer from '@/components/visualization/HeroGlbViewer.vue'
import RecentRequestDisplayCards from '@/components/requests/RecentRequestDisplayCards.vue'
import ThreeDBookingLink from '@/components/ui/ThreeDBookingLink.vue'
import { buildThreeDBookingUrl } from '@/composables/useThreeDBookingUrl'
import { requestsApi } from '@/api/client'
import { useAuthStore } from '@/stores/auth'
import type { EventRequestSummary } from '@/types'

const auth = useAuthStore()
const recentRequests = ref<EventRequestSummary[]>([])

const threeDBookingUrl = computed(() => buildThreeDBookingUrl())

const heroPrimaryLabel = computed(() =>
  auth.isAuthenticated ? 'New request' : 'Submit request',
)

const heroEyebrow = 'Pyramid of Tirana · SpaceFlow'

const heroTitle = computed(() => {
  if (auth.isAuthenticated && auth.isStaff) {
    return 'Manage Pyramid bookings'
  }
  if (auth.isAuthenticated) {
    return `Welcome back, ${auth.displayName.split(' ')[0]}`
  }
  return 'Book and plan events with ease'
})

const heroText = computed(() => {
  if (auth.isAuthenticated && auth.isStaff) {
    return 'Review event requests, check room availability, and manage inventory from one dashboard.'
  }
  if (auth.isAuthenticated) {
    return 'Submit a new booking request or check the status of your events.'
  }
  return 'Submit a request, choose a room, and plan your layout in 3D. Booking, quotes, and updates — all in one place.'
})

const heroSecondary = computed(() => {
  if (auth.isAuthenticated && auth.isStaff) {
    return { to: '/admin/dashboard', label: 'Admin dashboard' }
  }
  if (auth.isAuthenticated) {
    return { to: '/my-requests', label: 'My requests' }
  }
  return { to: '/venues', label: 'Browse venues' }
})

onMounted(async () => {
  if (auth.isAuthenticated && !auth.isStaff) {
    const data = await requestsApi.list({ limit: 3 }).catch(() => null)
    recentRequests.value = data?.items ?? []
  }
})
</script>

<template>
  <div class="public-page home">
    <AppNav />

    <section class="hero">
      <HeroGlbViewer
        class="hero__model fade-up-2"
        :auto-rotate="false"
        :mouse-parallax="true"
        :scale="2"
        :offset-x="0.42"
        :offset-y="0.06"
        :rotation-y="0.32"
      />

      <AuroraBackground :fixed="false" class="hero__aurora" />

      <div class="page-shell hero__inner">
        <div class="hero__copy">
          <span class="eyebrow fade-up">{{ heroEyebrow }}</span>
          <h1 class="hero__title fade-up-1">
            <span class="text-gradient">{{ heroTitle }}</span>
          </h1>
          <p class="hero__text fade-up-2">{{ heroText }}</p>

          <div class="hero__actions fade-up-3">
            <ThreeDBookingLink class="button button-primary button-lg">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 5v14M5 12h14" />
              </svg>
              {{ heroPrimaryLabel }}
            </ThreeDBookingLink>
            <RouterLink :to="heroSecondary.to" class="button button-secondary button-lg">
              {{ heroSecondary.label }}
            </RouterLink>
          </div>

          <p v-if="!auth.isAuthenticated" class="hero__hint fade-up-3">
            Already have an account?
            <RouterLink to="/login" class="hero__hint-link">Sign in</RouterLink>
            or
            <RouterLink to="/register" class="hero__hint-link">create one</RouterLink>
          </p>
        </div>
      </div>
    </section>

    <section
      v-if="auth.isAuthenticated && !auth.isStaff && recentRequests.length"
      class="public-band public-band--alt band--requests"
    >
      <div class="page-shell page-stack">
        <div class="section-head">
          <div class="section-head__main">
            <div class="section-head__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2"
                />
              </svg>
            </div>
            <div>
              <h2 class="section-title">Your recent requests</h2>
              <p class="section-copy">
                Your latest booking requests. Click one to see details and status.
              </p>
            </div>
          </div>
          <RouterLink to="/my-requests" class="link-arrow">
            View all
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </RouterLink>
        </div>

        <div class="display-cards-section">
          <RecentRequestDisplayCards :requests="recentRequests" />
        </div>
      </div>
    </section>

    <!-- HOW IT WORKS — unauthenticated visitors -->
    <section v-if="!auth.isAuthenticated" class="public-band how-band">
      <div class="page-shell page-stack">
        <div class="how-intro">
          <span class="eyebrow">How it works</span>
          <h2 class="section-title how-intro__title">
            Book the Pyramid in three steps
          </h2>
          <p class="section-copy">
            From submitting a request to walking your configured layout in 3D — everything lives in one streamlined platform.
          </p>
        </div>

        <div class="how-grid">
          <div class="how-step fade-up">
            <div class="how-step__num">01</div>
            <div class="how-step__icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
                <rect x="9" y="3" width="6" height="4" rx="1"/>
                <line x1="9" y1="12" x2="15" y2="12"/>
                <line x1="9" y1="16" x2="13" y2="16"/>
              </svg>
            </div>
            <h3 class="how-step__title">Request a space</h3>
            <p class="how-step__text">Browse all five Pyramid venues, pick the right one for your event, and submit a detailed booking request with your dates, attendees, and requirements.</p>
          </div>

          <div class="how-step fade-up-1">
            <div class="how-step__num">02</div>
            <div class="how-step__icon how-step__icon--green">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                <path d="M3.3 7.5 12 12l8.7-4.5M12 22V12"/>
              </svg>
            </div>
            <h3 class="how-step__title">Design in 3D</h3>
            <p class="how-step__text">Walk through a photorealistic 3D model of the Pyramid. Drag furniture, set up your stage or tables, and let AI suggest the ideal room configuration.</p>
          </div>

          <div class="how-step fade-up-2">
            <div class="how-step__num">03</div>
            <div class="how-step__icon how-step__icon--warning">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            </div>
            <h3 class="how-step__title">Confirm &amp; go</h3>
            <p class="how-step__text">Staff review your request, resolve any conflicts with AI, send a custom quotation, and lock your event in — all tracked in real time from your dashboard.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- 3D BANNER — shown to all users -->
    <section class="public-band public-band--alt">
      <div class="page-shell">
        <a
          :href="threeDBookingUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="book-3d-banner"
          aria-label="Open 3D booking — walk the building and book a room"
        >
          <div class="book-3d-banner__mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"
              />
              <path stroke-linecap="round" stroke-linejoin="round" d="M3.3 7.5 12 12l8.7-4.5M12 22V12" />
            </svg>
          </div>

          <div class="book-3d-banner__body">
            <span class="eyebrow">Book in 3D</span>
            <h2 class="book-3d-banner__title">Walk the building and book a room</h2>
            <p class="book-3d-banner__text">
              Choose a room, design your layout, and submit your request — all in one immersive view.
            </p>
            <p class="book-3d-banner__steps">Enter a room · Arrange layout · Book and submit</p>
          </div>

          <span class="book-3d-banner__launch" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </span>
        </a>
      </div>
    </section>
  </div>
</template>

<style scoped>
.hero {
  position: relative;
  overflow: hidden;
  min-height: clamp(520px, 72vh, 760px);
  padding: var(--space-16) 0;
  background-color: var(--hero-gradient-end);
}

.hero :deep(.hero__aurora) {
  z-index: 2;
  background-color: transparent;
  background-image: linear-gradient(
    to bottom,
    rgba(255, 255, 255, 0.78) 0%,
    rgba(255, 255, 255, 0.52) 30%,
    rgba(220, 237, 251, 0.32) 62%,
    rgba(204, 232, 248, 0.1) 100%
  );
}

.hero :deep(.hero__aurora .aurora__blob) {
  opacity: 0.55;
}

.hero__inner {
  position: relative;
  z-index: 3;
  display: flex;
  align-items: center;
  min-height: clamp(420px, 60vh, 640px);
}

.hero__copy {
  max-width: 620px;
}

.hero__model {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
}

.hero__model :deep(canvas) {
  pointer-events: none;
}

.hero__title {
  font-size: clamp(2.35rem, 5vw, 3.5rem);
  line-height: 1.06;
  font-weight: 800;
  margin: var(--space-5) 0 var(--space-4);
}

.hero__text {
  margin: 0 0 var(--space-8);
  max-width: 540px;
  font-size: 1.06rem;
  line-height: 1.65;
  color: var(--text-secondary);
  text-wrap: pretty;
}

.hero__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
}

.hero__hint {
  margin: var(--space-4) 0 0;
  font-size: 0.92rem;
  color: var(--text-tertiary);
}

.hero__hint-link {
  color: var(--accent-dark);
  font-weight: 650;
  text-decoration: underline;
  text-underline-offset: 3px;
  transition: opacity var(--t-fast) var(--ease-out);
}

.hero__hint-link:hover {
  opacity: 0.8;
}

@media (max-width: 1024px) {
  .hero {
    display: flex;
    flex-direction: column;
  }

  .hero__inner {
    order: 1;
    min-height: auto;
  }

  .hero__model {
    order: 2;
    position: relative;
    inset: auto;
    width: 100%;
    height: 360px;
    margin-top: var(--space-4);
  }
}

@media (max-width: 640px) {
  .section-head {
    flex-direction: column;
    align-items: stretch;
  }
}

/* ---- How it works section ---- */
.how-band {
  background: var(--bg-primary);
  border-top: 1px solid var(--border-light);
}

.how-intro {
  text-align: center;
  max-width: 560px;
  margin: 0 auto;
  display: grid;
  gap: var(--space-4);
  padding-bottom: var(--space-4);
}
.how-intro__title {
  margin: 0;
}

.how-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-6);
}

.how-step {
  display: grid;
  gap: var(--space-4);
  padding: var(--space-8) var(--space-6);
  border-radius: var(--radius-xl);
  background: var(--surface);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-sm);
  transition: transform var(--t-base) var(--ease-out), box-shadow var(--t-base) var(--ease-out), border-color var(--t-base) var(--ease-out);
}
.how-step:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-md);
  border-color: rgba(61, 169, 245, 0.3);
}

.how-step__num {
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--accent);
}

.how-step__icon {
  width: 52px;
  height: 52px;
  display: grid;
  place-items: center;
  border-radius: var(--radius-lg);
  background: var(--accent-light);
  color: var(--accent-dark);
  border: 1px solid rgba(61, 169, 245, 0.22);
}
.how-step__icon--green {
  background: var(--success-light);
  color: var(--success);
  border-color: rgba(46, 201, 138, 0.25);
}
.how-step__icon--warning {
  background: var(--warning-light);
  color: var(--warning);
  border-color: rgba(245, 166, 35, 0.25);
}
.how-step__icon svg {
  width: 26px;
  height: 26px;
}

.how-step__title {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 750;
  letter-spacing: -0.02em;
}

.how-step__text {
  margin: 0;
  font-size: 0.94rem;
  line-height: 1.65;
  color: var(--text-secondary);
}

@media (max-width: 860px) {
  .how-grid {
    grid-template-columns: 1fr;
    max-width: 520px;
    margin: 0 auto;
  }
}
</style>
