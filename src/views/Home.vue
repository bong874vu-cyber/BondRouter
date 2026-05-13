<script setup>
import { useBondStore } from '../stores/bond'
const store = useBondStore()
</script>

<template>
  <div class="fade-in">
    <div style="padding: 1rem 0 2rem;">
      <h1 style="font-size: 2rem; font-weight: 800; color: var(--pn-heading); margin-bottom: 0.5rem;">Cross-Chain <span style="color: var(--pn-accent);">Bond Aggregator</span></h1>
      <p style="max-width: 600px;">Discover, compare, and invest in tokenized bonds across all EVM chains. USDC bridging and swaps handled automatically.</p>
    </div>

    <!-- Overview Stats -->
    <div class="grid grid-4" style="margin-bottom: 1.5rem;">
      <div class="card">
        <div class="stat-value" style="color: var(--pn-accent);">{{ store.fmt(store.portfolioValue) }}</div>
        <div class="stat-label">Total Portfolio</div>
      </div>
      <div class="card">
        <div class="stat-value" style="color: var(--pn-green);">{{ store.fmt(store.totalYield) }}</div>
        <div class="stat-label">Unclaimed Yield</div>
      </div>
      <div class="card">
        <div class="stat-value" style="color: var(--pn-blue);">{{ store.marketBonds.length }}</div>
        <div class="stat-label">Available Bonds</div>
      </div>
      <div class="card">
        <div class="stat-value" style="color: var(--pn-yellow);">{{ store.chains.length }}</div>
        <div class="stat-label">Supported Chains</div>
      </div>
    </div>

    <div class="grid grid-2">
      <!-- Top Yields -->
      <div class="card">
        <div class="card-header">
          <h2 class="card-title">Top Yielding Bonds</h2>
          <RouterLink to="/discover" class="btn btn-secondary" style="font-size: 0.75rem; padding: 0.35rem 0.75rem;">View All</RouterLink>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Asset</th><th>Chain</th><th>APY</th></tr></thead>
            <tbody>
              <tr v-for="b in [...store.marketBonds].sort((a,b) => b.apy - a.apy).slice(0, 4)" :key="b.id">
                <td>
                  <div style="font-weight: 600; color: var(--pn-heading);">{{ b.token }}</div>
                  <div style="font-size: 0.75rem; color: var(--pn-text);">{{ b.issuer }}</div>
                </td>
                <td><span class="badge badge-blue">{{ b.chain }}</span></td>
                <td style="color: var(--pn-green); font-weight: 700;">{{ b.apy }}%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Infrastructure -->
      <div class="card">
        <h2 class="card-title" style="margin-bottom: 1rem;">Circle Infrastructure</h2>
        <div style="display: flex; flex-direction: column; gap: 1rem;">
          <div style="display: flex; align-items: flex-start; gap: 1rem;">
            <div style="width: 40px; height: 40px; border-radius: 8px; background: rgba(130, 170, 255, 0.1); display: flex; align-items: center; justify-content: center; color: var(--pn-blue);">🌉</div>
            <div>
              <div style="font-weight: 700; color: var(--pn-heading);">App Kit Bridge</div>
              <div style="font-size: 0.85rem;">Automatically bridges USDC to target chain before purchase.</div>
            </div>
          </div>
          <div style="display: flex; align-items: flex-start; gap: 1rem;">
            <div style="width: 40px; height: 40px; border-radius: 8px; background: rgba(199, 146, 234, 0.1); display: flex; align-items: center; justify-content: center; color: var(--pn-accent);">🔄</div>
            <div>
              <div style="font-weight: 700; color: var(--pn-heading);">Gateway Unified Balance</div>
              <div style="font-size: 0.85rem;">Spend from a single aggregated USDC balance across all networks.</div>
            </div>
          </div>
          <div style="display: flex; align-items: flex-start; gap: 1rem;">
            <div style="width: 40px; height: 40px; border-radius: 8px; background: rgba(195, 232, 141, 0.1); display: flex; align-items: center; justify-content: center; color: var(--pn-green);">⚡</div>
            <div>
              <div style="font-weight: 700; color: var(--pn-heading);">CCTP Settlement</div>
              <div style="font-size: 0.85rem;">Yield harvesting and principal repayment settled natively via CCTP.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
