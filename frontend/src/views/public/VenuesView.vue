<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'

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

        <div v-else class="split-grid two-col">
          <article v-for="venue in venues" :key="venue.id" class="card card-interactive venue">
            <div class="venue__bar" :style="{ background: accent(venue.name) }" />
            <div class="venue__body">
              <div class="venue__head">
                <div>
                  <h2 class="venue__title">{{ venue.name }}</h2>
                  <p class="muted venue__meta">
                    Floor {{ venue.floor }} · {{ venue.capacity_min }}–{{ venue.capacity_max }} guests
                  </p>
                </div>
                <span class="badge badge-info text-capitalize">{{ formatStatus(venue.status) }}</span>
              </div>

              <p class="venue__desc">
                {{ venue.description || 'Flexible Pyramid venue with integrated operations support.' }}
              </p>

              <div class="venue__amenities">
                <div class="venue__amenities-label">Amenities</div>
                <div class="venue__chips">
                  <span v-for="item in venue.amenities" :key="item" class="badge badge-neutral venue__chip">
                    {{ item }}
                  </span>
                </div>
              </div>

              <div class="venue__foot">
                <div>
                  <div class="muted venue__rate-label">Base hourly rate</div>
                  <strong class="venue__price">€{{ venue.base_price_per_hour }}</strong>
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
.venue {
  overflow: hidden;
}

.venue__bar {
  height: 6px;
}

.venue__body {
  padding: var(--space-6);
  display: grid;
  gap: var(--space-4);
}

.venue__head {
  display: flex;
  justify-content: space-between;
  gap: var(--space-3);
}

.venue__title {
  margin: 0 0 0.25rem;
  font-size: 1.28rem;
}

.venue__meta {
  margin: 0;
  font-size: 0.9rem;
}

.venue__desc {
  margin: 0;
  color: var(--text-secondary);
  line-height: 1.6;
}

.venue__amenities {
  display: grid;
  gap: var(--space-2);
}

.venue__amenities-label {
  font-size: 0.78rem;
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-weight: 650;
}

.venue__chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.venue__chip {
  text-transform: none;
}

.venue__foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-3);
  padding-top: var(--space-3);
  border-top: 1px solid var(--border-light);
}

.venue__rate-label {
  font-size: 0.78rem;
  margin-bottom: 0.15rem;
}

.venue__price {
  font-size: 1.12rem;
}
</style>
