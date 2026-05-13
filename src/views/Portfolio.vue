<script setup>
import { useBondStore } from '../stores/bond'
const store = useBondStore()

function handleHarvest() {
  if (store.totalYield > 0) {
    store.harvestYield()
    alert('Yield harvested successfully across all chains via CCTP!')
  }
}
</script>

<template>
  <div class="fade-in">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
      <h1 style="font-size: 1.75rem; font-weight: 700; color: var(--pn-heading);">Unified Portfolio</h1>
      <button class="btn btn-primary" @click="handleHarvest" :disabled="store.totalYield === 0">
        Harvest All Yields ({{ store.fmt(store.totalYield) }})
      </button>
    </div>

    <div v-if="store.portfolio.length === 0" class="card" style="text-align: center; padding: 3rem;">
      <div style="font-size: 2rem; margin-bottom: 0.5rem;">💼</div>
      <h3 style="color: var(--pn-heading);">Portfolio Empty</h3>
      <p>You haven't invested in any bonds yet.</p>
      <RouterLink to="/discover" class="btn btn-primary" style="margin-top: 1rem;">Discover Bonds</RouterLink>
    </div>

    <div v-else class="grid grid-1">
      <div v-for="p in store.portfolio" :key="p.id" class="card">
        <div class="card-header" style="margin-bottom: 0;">
          <div style="display: flex; align-items: center; gap: 1rem;">
            <div style="width: 48px; height: 48px; border-radius: 8px; background: var(--pn-surface-2); display: flex; align-items: center; justify-content: center; font-weight: 800; color: var(--pn-accent);">
              {{ store.getBond(p.bondId)?.token || 'BND' }}
            </div>
            <div>
              <h3 class="card-title">{{ store.getBond(p.bondId)?.issuer }}</h3>
              <div style="display: flex; gap: 0.5rem; margin-top: 0.25rem;">
                <span class="badge badge-blue">{{ p.chain }}</span>
                <span class="badge badge-green">{{ store.getBond(p.bondId)?.apy }}% APY</span>
              </div>
            </div>
          </div>
          <div style="text-align: right;">
            <div class="stat-value" style="color: var(--pn-heading);">{{ store.fmt(p.currentValue) }}</div>
            <div class="stat-label">Current Value</div>
          </div>
        </div>

        <div class="grid grid-4" style="margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid var(--pn-surface-2);">
          <div>
            <div class="stat-label">Quantity</div>
            <div style="font-weight: 700; color: var(--pn-heading);">{{ p.quantity }}</div>
          </div>
          <div>
            <div class="stat-label">Avg Purchase Price</div>
            <div style="font-weight: 700; color: var(--pn-heading);">{{ store.fmt(p.averagePrice) }}</div>
          </div>
          <div>
            <div class="stat-label">Accrued Yield</div>
            <div style="font-weight: 700; color: var(--pn-green);">+{{ store.fmt(p.accruedYield) }}</div>
          </div>
          <div>
            <div class="stat-label">Maturity Date</div>
            <div style="font-weight: 700; color: var(--pn-cyan);">{{ store.getBond(p.bondId) ? new Date(store.getBond(p.bondId).maturity).toLocaleDateString() : 'N/A' }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
