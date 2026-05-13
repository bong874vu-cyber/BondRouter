<script setup>
import { RouterLink, RouterView } from 'vue-router'
import { useBondStore } from './stores/bond'

const store = useBondStore()
</script>

<template>
  <header class="app-header">
    <div style="display: flex; align-items: center; gap: 2rem;">
      <RouterLink to="/" class="logo">
        <div style="width: 24px; height: 24px; background: var(--pn-accent); border-radius: 12px;"></div>
        <span>BondRouter</span>
      </RouterLink>
      <nav class="app-nav">
        <RouterLink to="/">Dashboard</RouterLink>
        <RouterLink to="/discover">Discover Bonds</RouterLink>
        <RouterLink to="/portfolio">My Portfolio</RouterLink>
      </nav>
    </div>
    <div style="display: flex; align-items: center; gap: 1rem;">
      <div style="text-align: right; margin-right: 0.5rem;">
        <div style="font-size: 0.75rem; color: var(--pn-text);">Gateway Unified Balance</div>
        <div style="font-weight: 700; color: var(--pn-heading);">{{ store.fmt(store.walletBalance) }} USDC</div>
      </div>
      <button class="btn btn-secondary">Connect Wallet</button>
    </div>
  </header>
  <main class="app-main">
    <RouterView />
  </main>
</template>
