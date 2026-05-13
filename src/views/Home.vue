<script setup>
import { ref } from 'vue'

const stats = ref([
  { label: 'Total Value Locked', value: '$8.7M', change: '+24.1%', badge: 'badge-green' },
  { label: 'Active Bonds', value: '156', change: '+12 new', badge: 'badge-blue' },
  { label: 'Avg. Yield', value: '5.4%', change: 'APY', badge: 'badge-yellow' },
  { label: 'Compliance Score', value: '98%', change: 'Verite', badge: 'badge-green' },
])

const bonds = ref([
  { name: 'US T-Bond 2030', type: 'Government', yield: '4.25%', maturity: '2030-06-15', value: '$2.4M', rating: 'AAA' },
  { name: 'Corp Bond Alpha', type: 'Corporate', yield: '6.80%', maturity: '2027-03-01', value: '$890K', rating: 'AA' },
  { name: 'Green Bond ESG', type: 'ESG', yield: '5.10%', maturity: '2028-12-01', value: '$1.2M', rating: 'A+' },
  { name: 'EM Sovereign 2029', type: 'Emerging', yield: '8.50%', maturity: '2029-09-15', value: '$640K', rating: 'BBB' },
  { name: 'Infra Bond Series C', type: 'Infrastructure', yield: '5.75%', maturity: '2031-01-01', value: '$3.1M', rating: 'AA-' },
])

const ratingClass = (r) => r.startsWith('AAA') || r.startsWith('AA') ? 'badge-green' : r.startsWith('A') ? 'badge-blue' : 'badge-yellow'
</script>

<template>
  <div class="fade-in">
    <div class="hero" style="padding: 2rem 0 3rem;">
      <h1>Tokenized Bonds & <span>Compliant DeFi</span></h1>
      <p>Access institutional-grade fixed income on-chain. Compliant tokenized bonds with Verite credentials on Arc Testnet.</p>
      <div style="display: flex; gap: 1rem; justify-content: center;">
        <RouterLink to="/assets" class="btn btn-primary">Browse Assets</RouterLink>
        <RouterLink to="/vault" class="btn btn-ghost">Yield Vault</RouterLink>
      </div>
    </div>

    <div class="grid grid-4" style="margin-bottom: 2rem;">
      <div v-for="s in stats" :key="s.label" class="card">
        <div class="stat-value">{{ s.value }}</div>
        <div class="stat-label">{{ s.label }}</div>
        <div class="badge" :class="s.badge" style="margin-top: 0.5rem;">{{ s.change }}</div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <h2 class="card-title">Available Bonds</h2>
        <RouterLink to="/assets" class="btn btn-secondary" style="font-size: 0.8rem; padding: 0.4rem 0.8rem;">View All</RouterLink>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Bond Name</th><th>Type</th><th>Yield</th><th>Maturity</th><th>Value</th><th>Rating</th></tr></thead>
          <tbody>
            <tr v-for="bond in bonds" :key="bond.name">
              <td style="font-weight: 600; color: var(--pn-heading);">{{ bond.name }}</td>
              <td><span class="badge badge-blue">{{ bond.type }}</span></td>
              <td style="color: var(--pn-accent); font-weight: 600;">{{ bond.yield }}</td>
              <td>{{ bond.maturity }}</td>
              <td style="font-weight: 600; color: var(--pn-heading);">{{ bond.value }}</td>
              <td><span class="badge" :class="ratingClass(bond.rating)">{{ bond.rating }}</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
