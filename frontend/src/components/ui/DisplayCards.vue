<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'

export interface DisplayCardItem {
  title: string
  description: string
  date: string
  to?: string
  tone?: 'accent' | 'success' | 'warning' | 'neutral'
}

const props = defineProps<{
  cards: DisplayCardItem[]
}>()

const SHUFFLE_MS = 560

const activeIndex = ref(0)
const isAnimating = ref(false)
const shuffleDirection = ref<'next' | 'prev' | null>(null)

const visibleCards = computed(() => props.cards.slice(0, 3))
const canShuffle = computed(() => visibleCards.value.length > 1 && !isAnimating.value)

watch(
  () => props.cards,
  () => {
    activeIndex.value = 0
    isAnimating.value = false
    shuffleDirection.value = null
  },
)

function cardKey(card: DisplayCardItem, index: number) {
  return card.to ?? `${card.title}-${card.date}-${index}`
}

function layerForCard(index: number) {
  const total = visibleCards.value.length
  if (total <= 1) return 0
  return (index - activeIndex.value + total) % total
}

const toneClass = (tone: DisplayCardItem['tone'] = 'accent') => `display-card--${tone}`

const stackClass = (layer: number) => {
  if (layer === 0) return 'display-card--layer-0'
  if (layer === 1) return 'display-card--layer-1'
  return 'display-card--layer-2'
}

function runShuffle(direction: 'next' | 'prev') {
  const total = visibleCards.value.length
  if (total <= 1 || isAnimating.value) return

  shuffleDirection.value = direction
  isAnimating.value = true

  window.setTimeout(() => {
    if (direction === 'next') {
      activeIndex.value = (activeIndex.value + 1) % total
    } else {
      activeIndex.value = (activeIndex.value - 1 + total) % total
    }
    shuffleDirection.value = null
    isAnimating.value = false
  }, SHUFFLE_MS)
}

function shuffleNext() {
  runShuffle('next')
}

function shufflePrev() {
  runShuffle('prev')
}
</script>

<template>
  <div class="display-cards-carousel">
    <button
      type="button"
      class="display-cards-nav display-cards-nav--prev"
      aria-label="Previous request"
      :disabled="!canShuffle"
      @click="shufflePrev"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" d="M15 18l-6-6 6-6" />
      </svg>
    </button>

    <div
      class="display-cards"
      :class="[
        `display-cards--count-${visibleCards.length}`,
        shuffleDirection ? `display-cards--shuffle-${shuffleDirection}` : '',
        { 'display-cards--animating': isAnimating },
      ]"
    >
      <template v-for="(card, index) in visibleCards" :key="cardKey(card, index)">
        <RouterLink
          v-if="card.to"
          :to="card.to"
          class="display-card"
          :class="[stackClass(layerForCard(index)), toneClass(card.tone)]"
          :tabindex="layerForCard(index) === 0 && !isAnimating ? 0 : -1"
        >
          <div class="display-card__head">
            <span class="display-card__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .962 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.964 0z"
                />
              </svg>
            </span>
            <span class="display-card__date">{{ card.date }}</span>
          </div>
          <h3 class="display-card__title">{{ card.title }}</h3>
          <p class="display-card__description">{{ card.description }}</p>
        </RouterLink>

        <article
          v-else
          class="display-card"
          :class="[stackClass(layerForCard(index)), toneClass(card.tone)]"
        >
          <div class="display-card__head">
            <span class="display-card__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .962 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.964 0z"
                />
              </svg>
            </span>
            <span class="display-card__date">{{ card.date }}</span>
          </div>
          <h3 class="display-card__title">{{ card.title }}</h3>
          <p class="display-card__description">{{ card.description }}</p>
        </article>
      </template>
    </div>

    <button
      type="button"
      class="display-cards-nav display-cards-nav--next"
      aria-label="Next request"
      :disabled="!canShuffle"
      @click="shuffleNext"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" d="M9 18l6-6-6-6" />
      </svg>
    </button>
  </div>
</template>
