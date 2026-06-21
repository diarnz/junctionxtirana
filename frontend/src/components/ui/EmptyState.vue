<script setup lang="ts">
withDefaults(
  defineProps<{
    title: string
    message?: string
    loading?: boolean
  }>(),
  {
    loading: false,
  },
)
</script>

<template>
  <div class="empty-state" :class="{ 'empty-state--loading': loading }">
    <span v-if="loading" class="spinner" aria-hidden="true" />
    <h3 v-if="!loading" class="empty-state__title">{{ title }}</h3>
    <p v-if="loading" class="empty-state__title">{{ title }}</p>
    <p v-if="message" class="empty-state__message">{{ message }}</p>
    <div v-if="$slots.default" class="empty-state__actions">
      <slot />
    </div>
  </div>
</template>
