<script setup>
import { ref } from 'vue'
const filter = ref('all')
const assets = [
  { name: 'US T-Bond 2030', type: 'Government', yield: '4.25%', price: '$98.50', available: '24,000 units', compliant: true },
  { name: 'Corp Bond Alpha', type: 'Corporate', yield: '6.80%', price: '$95.20', available: '8,900 units', compliant: true },
  { name: 'Green Bond ESG', type: 'ESG', yield: '5.10%', price: '$101.30', available: '12,000 units', compliant: true },
  { name: 'EM Sovereign 2029', type: 'Emerging', yield: '8.50%', price: '$87.40', available: '6,400 units', compliant: false },
  { name: 'Infra Bond Series C', type: 'Infrastructure', yield: '5.75%', price: '$99.80', available: '31,000 units', compliant: true },
  { name: 'Municipal Bond TX', type: 'Municipal', yield: '3.90%', price: '$100.10', available: '18,500 units', compliant: true },
]
const filteredAssets = () => filter.value === 'all' ? assets : assets.filter(a => a.type.toLowerCase() === filter.value)
</script>

<template>
  <div class="fade-in">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
      <h1 style="font-size: 1.75rem; font-weight: 700; color: var(--pn-heading);">Tokenized Assets</h1>
      <div style="display: flex; gap: 0.5rem;">
        <button v-for="t in ['all','Government','Corporate','ESG']" :key="t" class="btn btn-ghost" :style="filter === t.toLowerCase() ? 'border-color: var(--pn-accent); color: var(--pn-accent);' : ''" @click="filter = t.toLowerCase()" style="padding: 0.4rem 0.8rem; font-size: 0.8rem;">{{ t === 'all' ? 'All' : t }}</button>
      </div>
    </div>
    <div class="grid grid-3">
      <div v-for="a in filteredAssets()" :key="a.name" class="card">
        <div class="card-header">
          <h3 class="card-title">{{ a.name }}</h3>
          <span v-if="a.compliant" class="badge badge-green">Compliant</span>
          <span v-else class="badge badge-yellow">Pending</span>
        </div>
        <div style="display: flex; flex-direction: column; gap: 0.75rem; margin: 1rem 0;">
          <div style="display: flex; justify-content: space-between;"><span>Yield</span><span style="color: var(--pn-accent); font-weight: 700;">{{ a.yield }}</span></div>
          <div style="display: flex; justify-content: space-between;"><span>Price</span><span style="color: var(--pn-heading); font-weight: 600;">{{ a.price }}</span></div>
          <div style="display: flex; justify-content: space-between;"><span>Available</span><span>{{ a.available }}</span></div>
        </div>
        <button class="btn btn-primary" style="width: 100%; justify-content: center;">Invest with USDC</button>
      </div>
    </div>
  </div>
</template>
