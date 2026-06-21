<script setup lang="ts">
withDefaults(
  defineProps<{
    eyebrow?: string
    title: string
    copy?: string
    compact?: boolean
  }>(),
  {
    compact: false,
  },
)
</script>

<template>
  <header class="page-header" :class="{ 'page-header--compact': compact }">
    <div v-if="$slots.icon" class="page-header__icon" aria-hidden="true">
      <slot name="icon" />
    </div>
    <div class="page-header__body">
      <span v-if="eyebrow" class="eyebrow">{{ eyebrow }}</span>
      <h1 class="page-header__title">{{ title }}</h1>
      <p v-if="copy" class="section-copy">{{ copy }}</p>
      <slot name="below" />
    </div>
    <div v-if="$slots.actions" class="page-header__actions">
      <slot name="actions" />
    </div>
  </header>
</template>
