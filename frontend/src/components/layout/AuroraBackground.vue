<script setup lang="ts">
withDefaults(
  defineProps<{
    fixed?: boolean
  }>(),
  {
    fixed: true,
  },
)
</script>

<template>
  <div class="aurora" :class="{ 'aurora--absolute': !fixed }" aria-hidden="true">
    <div class="aurora__blob aurora__blob--1" />
    <div class="aurora__blob aurora__blob--2" />
    <div class="aurora__blob aurora__blob--3" />
    <div class="aurora__blob aurora__blob--4" />
  </div>
</template>

<style scoped>
.aurora--absolute {
  position: absolute;
  inset: 0;
}
</style>
