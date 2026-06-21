<script setup lang="ts">
import { RouterLink } from 'vue-router'

defineProps<{
  to: string
  label?: string
}>()
</script>

<template>
  <RouterLink :to="to" class="back-link">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
      <path stroke-linecap="round" stroke-linejoin="round" d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
    {{ label ?? 'Back' }}
  </RouterLink>
</template>
