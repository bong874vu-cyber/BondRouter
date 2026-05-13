<script setup>
import { ref } from 'vue'
const depositAmount = ref('')
const vaults = [
  { name: 'Stable Yield Vault', apy: '4.8%', tvl: '$3.2M', strategy: 'US Government Bonds', risk: 'Low' },
  { name: 'Growth Vault', apy: '7.2%', tvl: '$1.8M', strategy: 'Corporate + ESG Mix', risk: 'Medium' },
  { name: 'Alpha Vault', apy: '11.5%', tvl: '$640K', strategy: 'Emerging Market Bonds', risk: 'High' },
]
const riskClass = (r) => r === 'Low' ? 'badge-green' : r === 'Medium' ? 'badge-yellow' : 'badge-red'
</script>

<template>
  <div class="fade-in">
    <h1 style="font-size: 1.75rem; font-weight: 700; color: var(--pn-heading); margin-bottom: 1.5rem;">Yield Vaults</h1>
    <div class="grid grid-3">
      <div v-for="v in vaults" :key="v.name" class="card">
        <div class="card-header">
          <h3 class="card-title">{{ v.name }}</h3>
          <span class="badge" :class="riskClass(v.risk)">{{ v.risk }}</span>
        </div>
        <div style="text-align: center; margin: 1.5rem 0;">
          <div class="stat-value" style="color: var(--pn-accent);">{{ v.apy }}</div>
          <div class="stat-label">Annual Percentage Yield</div>
        </div>
        <div style="display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 1rem;">
          <div style="display: flex; justify-content: space-between;"><span>TVL</span><span style="font-weight: 600; color: var(--pn-heading);">{{ v.tvl }}</span></div>
          <div style="display: flex; justify-content: space-between;"><span>Strategy</span><span style="color: var(--pn-blue);">{{ v.strategy }}</span></div>
        </div>
        <input v-model="depositAmount" placeholder="USDC amount" style="width: 100%; padding: 0.625rem; background: var(--pn-bg); color: var(--pn-text-bright); border: 1px solid var(--pn-border); border-radius: var(--pn-radius-sm); margin-bottom: 0.75rem; font-family: 'Manrope', sans-serif;" />
        <button class="btn btn-primary" style="width: 100%; justify-content: center;">Deposit USDC</button>
      </div>
    </div>
  </div>
</template>
