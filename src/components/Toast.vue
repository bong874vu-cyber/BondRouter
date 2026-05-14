<script setup>
import { useUIStore } from '../stores/ui'
import { CheckCircle, AlertTriangle } from 'lucide-vue-next'
const ui = useUIStore()
</script>

<template>
  <div class="toast-container">
    <div v-for="t in ui.toasts" :key="t.id" class="toast" :class="t.type">
      <CheckCircle v-if="t.type === 'success'" :size="18" color="var(--accent-success)" />
      <AlertTriangle v-else-if="t.type === 'error'" :size="18" color="var(--accent-danger)" />
      <div>{{ t.message }}</div>
    </div>
  </div>
</template>
