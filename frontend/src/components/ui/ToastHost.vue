<script setup lang="ts">
import { useNotificationsStore } from '@/stores/notifications'

const notifications = useNotificationsStore()
</script>

<template>
  <Teleport to="body">
    <div class="toast-stack">
      <div
        v-for="item in notifications.items"
        :key="item.id"
        class="toast-item"
        :class="`toast-${item.variant}`"
      >
        <span class="toast-item__text">{{ item.title }}</span>
        <button
          type="button"
          class="toast-item__close"
          aria-label="Dismiss"
          @click="notifications.dismiss(item.id)"
        >
          ×
        </button>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.toast-item__text {
  font-weight: 500;
}
.toast-item__close {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  color: inherit;
  font-size: 1.1rem;
  line-height: 1;
  cursor: pointer;
  flex-shrink: 0;
  transition: background var(--t-fast) var(--ease-out);
}
.toast-item__close:hover {
  background: rgba(255, 255, 255, 0.35);
}
</style>
