<script setup>
import { computed } from 'vue'
import { useBondStore } from '../stores/bond'
import { useUIStore } from '../stores/ui'
import { useWeb3Store } from '../stores/web3'
import { useNumberCounter } from '../composables/useCounter'
import { ArrowDownToLine, WalletCards, TrendingUp, ExternalLink, Activity } from 'lucide-vue-next'
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
const web3 = useWeb3Store()

const displayTotalValue = useNumberCounter(computed(() => store.portfolioValue))
const displayAccruedYield = useNumberCounter(computed(() => store.totalYield))

function handleHarvest() {
  if (store.totalYield > 0) {
    const amount = store.totalYield
    store.harvestYield()
    web3.harvestYieldCrossChain(amount)
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
        label: 'Projected Value (USDC)',
        backgroundColor: 'rgba(195, 232, 141, 0.1)',
        borderColor: '#c3e88d',
        data: data,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#c3e88d',
        pointBorderColor: '#292d3e',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6
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
      backgroundColor: 'rgba(41, 45, 62, 0.9)',
      titleColor: '#a6accd',
      bodyColor: '#ffffff',
      titleFont: { family: 'Manrope', size: 12 },
      bodyFont: { family: 'Manrope', size: 14, weight: 'bold' },
      borderColor: 'rgba(255, 255, 255, 0.1)',
      borderWidth: 1,
      padding: 12,
      displayColors: false,
      callbacks: {
        label: function(context) {
          return '$' + context.parsed.y.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }
      }
    }
  },
  scales: {
    x: { grid: { color: 'rgba(255, 255, 255, 0.05)', drawBorder: false }, ticks: { color: '#a6accd', font: { family: 'Manrope' } } },
    y: { grid: { color: 'rgba(255, 255, 255, 0.05)', drawBorder: false }, ticks: { color: '#a6accd', font: { family: 'Manrope' } } }
  },
  interaction: {
    intersect: false,
    mode: 'index',
  },
}
</script>

<template>
  <div class="page-container fade-in">
    <div class="flex justify-between items-end" style="margin-bottom: 4rem;">
      <div>
        <div class="flex items-center gap-2 mb-2 micro-cap" style="color: var(--accent-primary);">
          <WalletCards :size="14" /> UNIFIED ACCOUNT
        </div>
        <h1 class="display-xl text-gradient">PORTFOLIO</h1>
      </div>
      <button class="btn-primary" @click="handleHarvest" :disabled="store.totalYield === 0">
        <ArrowDownToLine :size="18" /> HARVEST YIELD ({{ store.fmt(store.totalYield) }})
      </button>
    </div>

    <div v-if="store.portfolio.length === 0" class="flex flex-col items-center justify-center fade-up" style="padding: 8rem 0;">
      <WalletCards :size="64" color="var(--text-muted)" style="margin-bottom: 1.5rem; opacity: 0.5;" />
      <div class="micro-cap text-mute mb-4">NO ACTIVE POSITIONS</div>
      <RouterLink to="/discover" class="btn-primary">DISCOVER BONDS</RouterLink>
    </div>

    <div v-else>
      <div class="fade-up delay-1" style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-bottom: 3rem;">
        <div class="glass-panel">
          <div class="flex items-center gap-2 micro-cap mb-2"><WalletCards :size="14" /> TOTAL VALUE</div>
          <div class="display-lg">{{ store.fmt(displayTotalValue) }}</div>
        </div>
        <div class="glass-panel">
          <div class="flex items-center gap-2 micro-cap mb-2" style="color: var(--accent-success);"><TrendingUp :size="14" /> ACCRUED YIELD</div>
          <div class="display-lg" style="color: var(--accent-success);">+{{ store.fmt(displayAccruedYield) }}</div>
        </div>
      </div>

      <!-- Yield Projection Chart -->
      <div class="glass-panel fade-up delay-2" style="margin-bottom: 3rem;">
        <div class="micro-cap mb-4">12-MONTH YIELD PROJECTION</div>
        <div style="height: 350px;">
          <Line :data="chartData" :options="chartOptions" />
        </div>
      </div>

      <div class="micro-cap mb-4 fade-up delay-3">ACTIVE HOLDINGS</div>
      <table class="premium-table fade-up delay-3">
        <thead>
          <tr>
            <th>ASSET</th>
            <th>NETWORK</th>
            <th>QUANTITY</th>
            <th>CURRENT VALUE</th>
            <th>ACCRUED YIELD</th>
            <th>RECEIPT (TX)</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in store.portfolio" :key="p.id">
            <td data-label="ASSET">
              <div class="flex items-center gap-2" style="font-weight: 700;">
                <Activity :size="16" color="var(--accent-secondary)" />
                {{ store.getBond(p.bondId)?.token || p.bondId }}
              </div>
            </td>
            <td data-label="NETWORK">
              <span class="badge" style="background: rgba(255,255,255,0.05); color: var(--text-main);">
                {{ p.chain.toUpperCase() }}
              </span>
            </td>
            <td data-label="QUANTITY" style="font-weight: 700;">{{ p.quantity }}</td>
            <td data-label="CURRENT VALUE" style="font-weight: 700;">{{ store.fmt(p.currentValue) }}</td>
            <td data-label="ACCRUED YIELD" style="color: var(--accent-success); font-weight: 700;">+{{ store.fmt(p.accruedYield) }}</td>
            <td data-label="RECEIPT" class="micro-cap text-mute" style="text-align: right;">
              <a v-if="p.lastTxHash" :href="'https://testnet.arcscan.app/tx/' + p.lastTxHash" target="_blank" class="flex items-center justify-end gap-1" style="color: var(--text-main); text-decoration: none;">
                {{ truncate(p.lastTxHash) }} <ExternalLink :size="12" />
              </a>
              <span v-else>N/A</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
