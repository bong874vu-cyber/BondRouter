<script setup>
import { computed } from 'vue'
import { useBondStore } from '../stores/bond'
import { useUIStore } from '../stores/ui'
import { useNumberCounter } from '../composables/useCounter'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler
} from 'chart.js'
import { Line } from 'vue-chartjs'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler
)

const store = useBondStore()
const ui = useUIStore()

const displayTotalValue = useNumberCounter(computed(() => store.portfolioValue))
const displayAccruedYield = useNumberCounter(computed(() => store.totalYield))

function handleHarvest() {
  if (store.totalYield > 0) {
    store.harvestYield()
    ui.addToast('YIELD HARVESTED ACROSS ALL NETWORKS VIA CCTP.', 'success')
  }
}

const truncate = (str) => str ? `${str.slice(0,10)}...${str.slice(-8)}` : 'N/A'

// Calculate projection data
const chartData = computed(() => {
  const months = ['M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9', 'M10', 'M11', 'M12']
  let principal = store.portfolioValue
  
  // Calculate average weighted APY
  let weightedApySum = 0
  store.portfolio.forEach(p => {
    const bond = store.getBond(p.bondId)
    const apy = bond ? parseFloat(bond.apy) : 0
    weightedApySum += p.currentValue * apy
  })
  const avgApy = principal > 0 ? (weightedApySum / principal) / 100 : 0
  
  const data = []
  let currentVal = principal
  for (let i = 0; i < 12; i++) {
    data.push(currentVal)
    currentVal += currentVal * (avgApy / 12)
  }

  return {
    labels: months,
    datasets: [
      {
        label: 'Projected Value (USD)',
        backgroundColor: 'rgba(195, 232, 141, 0.1)',
        borderColor: '#c3e88d',
        data: data,
        fill: true,
        tension: 0.4
      }
    ]
  }
})

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#0a0a0a',
      titleColor: '#fff',
      bodyColor: '#fff',
      borderColor: '#3a3a3f',
      borderWidth: 1
    }
  },
  scales: {
    x: { grid: { color: '#3a3a3f' }, ticks: { color: '#f0f0fa' } },
    y: { grid: { color: '#3a3a3f' }, ticks: { color: '#f0f0fa' } }
  }
}
</script>

<template>
  <div class="page-container fade-in">
    <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 64px;">
      <div>
        <div class="micro-cap text-mute mb-2">UNIFIED ACCOUNT</div>
        <h1 class="display-xl">PORTFOLIO</h1>
      </div>
      <button class="btn-ghost" @click="handleHarvest" :disabled="store.totalYield === 0">
        HARVEST YIELD ({{ store.fmt(store.totalYield) }})
      </button>
    </div>

    <div v-if="store.portfolio.length === 0" style="text-align: center; padding: 120px 0;">
      <div class="micro-cap text-mute mb-4">NO ACTIVE POSITIONS</div>
      <RouterLink to="/discover" class="btn-ghost">DISCOVER BONDS</RouterLink>
    </div>

    <div v-else>
      <div style="display: flex; gap: 64px; margin-bottom: 48px;">
        <div>
          <div class="micro-cap text-mute mb-2">TOTAL VALUE</div>
          <div class="display-lg">{{ store.fmt(displayTotalValue) }}</div>
        </div>
        <div>
          <div class="micro-cap text-mute mb-2">ACCRUED YIELD</div>
          <div class="display-lg" style="color: #c3e88d;">+{{ store.fmt(displayAccruedYield) }}</div>
        </div>
      </div>

      <!-- Yield Projection Chart -->
      <div style="margin-bottom: 48px; border: 1px solid var(--hairline-on-dark); background: var(--canvas-night-soft); padding: 24px;">
        <div class="micro-cap text-mute mb-4">12-MONTH YIELD PROJECTION</div>
        <div style="height: 300px;">
          <Line :data="chartData" :options="chartOptions" />
        </div>
      </div>

      <table class="data-table">
        <thead>
          <tr>
            <th>ASSET</th>
            <th>NETWORK</th>
            <th>QUANTITY</th>
            <th>CURRENT VALUE</th>
            <th>ACCRUED YIELD</th>
            <th>RECEIPT (TX HASH)</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in store.portfolio" :key="p.id">
            <td data-label="ASSET" style="font-weight: 700;">{{ store.getBond(p.bondId)?.token || p.bondId }}</td>
            <td data-label="NETWORK">{{ p.chain.toUpperCase() }}</td>
            <td data-label="QUANTITY">{{ p.quantity }}</td>
            <td data-label="CURRENT VALUE">{{ store.fmt(p.currentValue) }}</td>
            <td data-label="ACCRUED YIELD" style="color: #c3e88d;">+{{ store.fmt(p.accruedYield) }}</td>
            <td data-label="RECEIPT" class="micro-cap text-mute">
              <a v-if="p.lastTxHash" :href="'https://sepolia.etherscan.io/tx/' + p.lastTxHash" target="_blank" style="color: var(--on-primary); text-decoration: underline;">
                {{ truncate(p.lastTxHash) }}
              </a>
              <span v-else>N/A</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
