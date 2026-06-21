<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'

import { buildThreeDBookingUrl } from '@/composables/useThreeDBookingUrl'
import { useAuthStore } from '@/stores/auth'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    venueId?: string | null
    loginRedirect?: string
  }>(),
  {
    venueId: null,
    loginRedirect: '/',
  },
)

const auth = useAuthStore()

const bookingUrl = computed(() => buildThreeDBookingUrl({ venueId: props.venueId }))
const loginTo = computed(() => `/login?redirect=${encodeURIComponent(props.loginRedirect)}`)
</script>

<template>
  <a
    v-if="auth.isAuthenticated"
    v-bind="$attrs"
    :href="bookingUrl"
    target="_blank"
    rel="noopener noreferrer"
  >
    <slot />
  </a>
  <RouterLink v-else v-bind="$attrs" :to="loginTo">
    <slot />
  </RouterLink>
</template>
