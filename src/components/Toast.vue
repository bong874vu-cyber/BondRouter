<script setup>
import { useUIStore } from '../stores/ui'
const ui = useUIStore()
</script>

<template>
  <div class="toast-container">
    <div v-for="t in ui.toasts" :key="t.id" class="toast" :class="t.type">
      <div>{{ t.message }}</div>
    </div>
  </div>
</template>
