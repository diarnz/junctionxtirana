<script setup lang="ts">
import { onMounted, ref } from 'vue'

import AppNav from '@/components/layout/AppNav.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import ThreeDBookingLink from '@/components/ui/ThreeDBookingLink.vue'
import { venuesApi } from '@/api/client'
import type { Venue } from '@/types'

const venues = ref<Venue[]>([])
const loading = ref(true)

function accent(name: string) {
  const lower = name.toLowerCase()
  if (lower.includes('blue')) return '#3da9f5'
  if (lower.includes('orange')) return '#ff6400'
  if (lower.includes('green')) return '#2ec98a'
  if (lower.includes('yellow')) return '#f5a623'
  return '#3da9f5'
}

function formatStatus(status: string) {
  return status.replaceAll('_', ' ')
}

onMounted(async () => {
  try {
    venues.value = await venuesApi.list()
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="public-page page-gradient">
    <AppNav />

    <section class="public-band">
      <div class="page-shell page-stack">
        <PageHeader
          :eyebrow="venues.length ? `${venues.length} Pyramid spaces` : 'Pyramid spaces'"
          title="Venues"
          copy="Browse event spaces at the Pyramid — capacity, amenities, and pricing in one place."
        >
          <template #icon>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6" />
            </svg>
          </template>
        </PageHeader>

        <EmptyState v-if="loading" title="Loading venues…" loading />

        <EmptyState
          v-else-if="!venues.length"
          title="No venues available"
          message="Check back soon or contact the Pyramid team for space availability."
        >
          <ThreeDBookingLink class="button button-primary">Submit a request</ThreeDBookingLink>
        </EmptyState>

        <div v-else class="venues-grid">
          <article v-for="venue in venues" :key="venue.id" class="card card-interactive venue">
            <div class="venue__accent-bar" :style="{ background: accent(venue.name) }" />
            <div class="venue__body">
              <div class="venue__head">
                <div class="venue__head-dot" :style="{ background: accent(venue.name) }" aria-hidden="true" />
                <div class="venue__head-text">
                  <h2 class="venue__title">{{ venue.name }}</h2>
                  <p class="venue__meta">
                    Floor {{ venue.floor >= 0 ? venue.floor : `B${Math.abs(venue.floor)}` }} &nbsp;·&nbsp;
                    {{ venue.capacity_min }}–{{ venue.capacity_max }} guests
                    <template v-if="venue.area_sqm">&nbsp;·&nbsp; {{ venue.area_sqm }} m²</template>
                  </p>
                </div>
                <span class="badge badge-info text-capitalize venue__status">{{ formatStatus(venue.status) }}</span>
              </div>

              <p class="venue__desc">
                {{ venue.description || 'Flexible Pyramid venue with integrated operations support.' }}
              </p>

              <div class="venue__amenities">
                <p class="venue__amenities-label">Amenities</p>
                <div class="venue__chips">
                  <span v-for="item in venue.amenities" :key="item" class="badge badge-neutral">
                    {{ item }}
                  </span>
                </div>
              </div>

              <div class="venue__foot">
                <div class="venue__pricing">
                  <span class="venue__rate-label">Starting from</span>
                  <strong class="venue__price">€{{ venue.base_price_per_hour }}<span class="venue__per">/hr</span></strong>
                </div>
                <ThreeDBookingLink :venue-id="venue.id" class="button button-primary">
                  Book this space
                </ThreeDBookingLink>
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.venues-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-5);
}

.venue {
  overflow: hidden;
  display: grid;
  grid-template-columns: 5px 1fr;
}

.venue__accent-bar {
  width: 5px;
  border-radius: var(--radius-lg) 0 0 var(--radius-lg);
}

.venue__body {
  padding: var(--space-6);
  display: grid;
  gap: var(--space-4);
}

.venue__head {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
}

.venue__head-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 6px;
}

.venue__head-text {
  flex: 1;
  min-width: 0;
}

.venue__title {
  margin: 0 0 0.2rem;
  font-size: 1.22rem;
  font-weight: 760;
}

.venue__meta {
  margin: 0;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.venue__status {
  flex-shrink: 0;
}

.venue__desc {
  margin: 0;
  color: var(--text-secondary);
  line-height: 1.65;
  font-size: 0.95rem;
}

.venue__amenities {
  display: grid;
  gap: var(--space-2);
}

.venue__amenities-label {
  margin: 0;
  font-size: 0.72rem;
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 700;
}

.venue__chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.venue__foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-3);
  padding-top: var(--space-4);
  border-top: 1px solid var(--border-light);
}

.venue__pricing {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.venue__rate-label {
  font-size: 0.75rem;
  color: var(--text-tertiary);
  font-weight: 600;
}

.venue__price {
  font-size: 1.35rem;
  font-weight: 800;
  letter-spacing: -0.025em;
}

.venue__per {
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--text-secondary);
  margin-left: 1px;
}

@media (max-width: 960px) {
  .venues-grid {
    grid-template-columns: 1fr;
  }
}
</style>
