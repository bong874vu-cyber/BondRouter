<script setup>
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <header class="app-header">
    <RouterLink to="/" class="logo">
      <div class="logo-icon">🏛️</div>
      <span>BondRouter</span>
    </RouterLink>
    <nav class="app-nav">
      <RouterLink to="/">Dashboard</RouterLink>
      <RouterLink to="/assets">Assets</RouterLink>
      <RouterLink to="/vault">Vault</RouterLink>
      <RouterLink to="/settings">Settings</RouterLink>
    </nav>
    <button class="btn btn-primary btn-sm">Connect Wallet</button>
  </header>
  <main class="app-main">
    <RouterView />
  </main>
</template>
