<script setup>
import { ref, computed, onMounted } from 'vue'
import { useBondStore } from '../stores/bond'
import { useUIStore } from '../stores/ui'
import { useWeb3Store } from '../stores/web3'
import { useNumberCounter } from '../composables/useCounter'
import { ArrowDownToLine, WalletCards, TrendingUp, ExternalLink, Activity, Shield, Coins, Copy, ArrowUpRight, Lock } from 'lucide-vue-next'
import { keccak256, toUtf8Bytes } from 'ethers'
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

const isFetchingHoldings = ref(false)
const isHarvesting = ref(false)

const displayTotalValue = useNumberCounter(computed(() => store.portfolioValue))
const displayAccruedYield = useNumberCounter(computed(() => store.totalYield))

async function handleHarvest() {
  if (store.totalYield > 0) {
    isHarvesting.value = true
    const amount = store.totalYield
    await new Promise(resolve => setTimeout(resolve, 1500)) // Safe visual execution delay
    
    // Clear frontend yields
    store.harvestYield()
    
    // 1. Trigger CCTP Yield Aggregation & smart contract call
    await web3.harvestYieldCrossChain(amount)
    
    // 2. Trigger programmatic distribution to Circle Custodial Wallets via API
    await web3.distributeYieldToCircleWallets(amount)
    
    isHarvesting.value = false
    ui.addToast('YIELD HARVESTED & WATERFALL DISTRIBUTED SECURELY.', 'success')
  }
}

const truncate = (str) => str ? `${str.slice(0,10)}...${str.slice(-8)}` : 'N/A'

const getTokenIdString = (bondId) => {
  if (!bondId) return ''
  try {
    const hash = keccak256(toUtf8Bytes(bondId))
    return hash.slice(0, 14) + '...' + hash.slice(-10)
  } catch (e) {
    return 'N/A'
  }
}


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

onMounted(async () => {
  isFetchingHoldings.value = true
  
  // Load Circle Developer Wallets and Status
  await web3.fetchCircleStatus()
  await web3.fetchCircleWallets()

  await new Promise(resolve => setTimeout(resolve, 800)) // Visual shimmers loading delay
  if (web3.isConnected && web3.address) {
    const onChainInvestments = await web3.fetchOnChainInvestments(web3.address)
    if (onChainInvestments && onChainInvestments.length > 0) {
      onChainInvestments.forEach(item => {
        store.recordInvestment(item.bondId, item.quantity, item.txHash)
      })
    }
  }
  isFetchingHoldings.value = false
})
</script>

<template>
  <div class="page-container fade-in">
    <div class="flex-responsive-header" style="margin-bottom: 3rem;">
      <div>
        <div class="flex items-center gap-2 mb-2 micro-cap" style="color: var(--accent-primary);">
          <WalletCards :size="14" /> TREASURY SUMMARY
        </div>
        <h1 class="display-xl text-gradient">YOUR INTEREST DESK</h1>
      </div>
      <button 
        class="btn-primary" 
        :class="{ 'btn-loading': isHarvesting }" 
        @click="handleHarvest" 
        :disabled="store.totalYield === 0 || isHarvesting"
      >
        <span v-if="isHarvesting" class="spinner-inline mr-2"></span>
        <ArrowDownToLine v-else :size="18" /> 
        {{ isHarvesting ? 'ROUTING WATERFALL...' : `COLLECT EARNINGS (${store.fmt(store.totalYield)})` }}
      </button>
    </div>

    <!-- Skeleton Dashboard Loader -->
    <div v-if="isFetchingHoldings" class="fade-in">
      <div class="stats-grid">
        <div class="shimmer-card skeleton" style="border-radius: 0px;">
          <div class="skeleton-text short" style="height: 12px; margin-bottom: 12px;"></div>
          <div class="skeleton-title" style="height: 32px; width: 60%; margin: 0;"></div>
        </div>
        <div class="shimmer-card skeleton" style="border-radius: 0px;">
          <div class="skeleton-text short" style="height: 12px; margin-bottom: 12px;"></div>
          <div class="skeleton-title" style="height: 32px; width: 50%; margin: 0;"></div>
        </div>
      </div>

      <div class="glass-panel" style="margin-bottom: 3rem; padding: 2rem;">
        <div class="skeleton-text short" style="height: 12px; margin-bottom: 24px;"></div>
        <div class="skeleton skeleton-rect" style="height: 300px; width: 100%;"></div>
      </div>

      <div class="skeleton-text short" style="height: 12px; margin-bottom: 16px;"></div>
      <div style="overflow-x: auto; width: 100%;">
        <table class="premium-table">
          <thead>
            <tr>
              <th>SAVINGS INSTRUMENT</th>
              <th>SECURITY LAYER</th>
              <th>DEPOSITED</th>
              <th>CURRENT VALUE</th>
              <th>EARNED INTEREST</th>
              <th>RECEIPT / AUDIT</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="i in 3" :key="i">
              <td data-label="SAVINGS INSTRUMENT">
                <div class="flex items-center gap-2">
                  <div class="skeleton" style="width: 16px; height: 16px; border-radius: 50%; flex-shrink: 0;"></div>
                  <div class="skeleton skeleton-text" style="width: 110px; height: 14px; margin: 0;"></div>
                </div>
              </td>
              <td data-label="SECURITY LAYER"><div class="skeleton" style="width: 80px; height: 20px;"></div></td>
              <td data-label="DEPOSITED"><div class="skeleton skeleton-text short" style="height: 14px; margin: 0;"></div></td>
              <td data-label="CURRENT VALUE"><div class="skeleton skeleton-text short" style="height: 14px; margin: 0;"></div></td>
              <td data-label="EARNED INTEREST"><div class="skeleton skeleton-text short" style="height: 14px; margin: 0;"></div></td>
              <td data-label="RECEIPT / AUDIT" style="text-align: right;"><div class="skeleton" style="width: 80px; height: 24px; display: inline-block;"></div></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Active Content Block (Holdings Loaded) -->
    <div v-else class="fade-in">
      <!-- Empty State Education -->
      <div v-if="store.portfolio.length === 0" class="flex flex-col items-center justify-center fade-up text-center" style="padding: 8rem 0; max-width: 480px; margin: 0 auto;">
        <WalletCards :size="64" color="var(--accent-gold)" style="margin-bottom: 1.5rem; opacity: 0.8;" class="pulse" />
        <div class="micro-cap text-mute mb-2" style="font-weight: 700;">YOUR INTEREST DESK IS EMPTY</div>
        <p class="text-mute mb-6" style="font-size: 0.88rem; line-height: 1.5;">
          You don't have any active savings accounts yet. Explore our verified marketplace to deposit digital dollars and begin earning institutional interest.
        </p>
        <RouterLink to="/discover" class="btn-primary">EXPLORE SAVINGS POOLS</RouterLink>
      </div>

      <div v-else>
        <div class="stats-grid fade-up delay-1">
          <div class="glass-panel">
            <div class="flex items-center gap-2 micro-cap mb-2"><WalletCards :size="14" /> TOTAL BALANCE</div>
            <div class="display-lg">{{ store.fmt(displayTotalValue) }}</div>
          </div>
          <div class="glass-panel">
            <div class="flex items-center gap-2 micro-cap mb-2" style="color: var(--accent-success);"><TrendingUp :size="14" /> EARNED INTEREST TO DATE</div>
            <div class="display-lg" style="color: var(--accent-success);">+{{ store.fmt(displayAccruedYield) }}</div>
          </div>
        </div>

        <!-- Yield Projection Chart -->
        <div class="glass-panel fade-up delay-2" style="margin-bottom: 3rem;">
          <div class="micro-cap mb-4">12-MONTH SAVINGS FORECAST</div>
          <div style="height: 350px;">
            <Line :data="chartData" :options="chartOptions" />
          </div>
        </div>

        <div class="micro-cap mb-4 fade-up delay-3">ACTIVE INTEREST ACCOUNTS</div>
        <div style="overflow-x: auto; width: 100%;">
          <table class="premium-table fade-up delay-3">
            <thead>
              <tr>
                <th>SAVINGS INSTRUMENT</th>
                <th>SECURITY LAYER</th>
                <th>DEPOSITED</th>
                <th>CURRENT VALUE</th>
                <th>EARNED INTEREST</th>
                <th>RECEIPT / AUDIT</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="p in store.portfolio" :key="p.id">
                <td data-label="SAVINGS INSTRUMENT">
                  <div class="flex items-center gap-2" style="font-weight: 700;">
                    <Activity :size="16" color="var(--accent-secondary)" />
                    {{ store.getBond(p.bondId)?.token || p.bondId }}
                  </div>
                </td>
                <td data-label="SECURITY LAYER">
                  <span class="badge" style="background: rgba(255,255,255,0.05); color: var(--text-main);">
                    {{ p.chain.toUpperCase() }} LINK
                  </span>
                </td>
                <td data-label="DEPOSITED" style="font-weight: 700;">
                  <div>{{ p.quantity }} USDC</div>
                  <div class="micro-cap text-mute" style="font-size: 0.65rem; text-transform: none; font-weight: normal; margin-top: 2px;">
                    ERC-1155 ID: <span class="font-mono text-gradient" style="font-weight: bold;">{{ getTokenIdString(p.bondId) }}</span>
                  </div>
                </td>
                <td data-label="CURRENT VALUE" style="font-weight: 700;">{{ store.fmt(p.currentValue) }}</td>
                <td data-label="EARNED INTEREST" style="color: var(--accent-success); font-weight: 700;">+{{ store.fmt(p.accruedYield) }}</td>
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
        
        <!-- Smart Waterfall Section -->
        <div class="glass-panel fade-up delay-4" style="margin-top: 3rem;">
          <div class="flex items-center justify-between mb-4">
            <div class="micro-cap" style="color: var(--accent-primary);">AUTOMATED INTEREST DISTRIBUTION</div>
            <div v-if="web3.circleStatus" class="flex items-center gap-2">
              <span class="badge" style="background: rgba(195, 232, 141, 0.1); color: var(--accent-success); font-weight: 700; letter-spacing: 0.05em; font-size: 0.65rem; display: flex; align-items: center; gap: 0.25rem;">
                <span class="pulse-dot"></span> CIRCLE API: {{ web3.circleStatus.apiMode.toUpperCase() }}
              </span>
            </div>
            <div v-else class="badge" style="background: rgba(255, 255, 255, 0.05); color: var(--text-muted);">ACTIVE</div>
          </div>
          <h3 class="display-lg mb-2" style="font-size: 1.5rem;">SMART DISTRIBUTION WATERFALL</h3>
          <p class="body-md text-mute mb-4" style="font-size: 0.88rem; line-height: 1.5;">
            Select how your earned interest is automatically split and routed once collected. All transfers are securely processed in stable digital dollars (USDC/EURC) via Circle's Developer-Controlled Programmable Wallets.
          </p>

          <!-- Grid of developer wallets -->
          <div class="grid-three-columns-responsive mb-6">
            <div 
              v-for="wallet in web3.circleWallets" 
              :key="wallet.id" 
              style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-light); padding: 1.5rem; border-radius: 0px; display: flex; flex-direction: column; justify-content: space-between; position: relative;"
            >
              <div style="position: absolute; top: 1.5rem; right: 1.5rem;">
                <Lock :size="14" color="var(--accent-gold)" style="opacity: 0.6;" />
              </div>
              
              <div>
                <div class="micro-cap text-mute mb-2" style="font-size: 0.65rem; display: flex; align-items: center; gap: 0.25rem;">
                  <Shield :size="10" color="var(--accent-primary)" /> {{ wallet.purpose }} ({{ wallet.allocation }}%)
                </div>
                <div class="body-md" style="font-weight: 700; color: var(--text-main); margin-bottom: 0.25rem;">{{ wallet.name }}</div>
                <div class="micro-cap text-mute font-mono" style="font-size: 0.65rem; word-break: break-all; margin-bottom: 1rem;">
                  {{ wallet.address }}
                </div>
              </div>
              
              <div style="border-top: 1px solid var(--border-light); padding-top: 0.75rem; margin-top: 0.5rem; display: flex; justify-content: space-between; align-items: center;">
                <div class="micro-cap" style="font-size: 0.65rem; color: var(--text-muted);">CUSTODIAL BALANCE</div>
                <div class="body-md" style="font-weight: 700; color: var(--accent-success);">{{ wallet.balance }} {{ wallet.token }}</div>
              </div>
            </div>
            
            <!-- Fallback if loading or empty -->
            <div v-if="web3.circleWallets.length === 0" v-for="i in 3" :key="'skeleton-' + i" style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-light); padding: 1.5rem; border-radius: 0px;" class="skeleton">
              <div class="skeleton-text short" style="height: 12px; margin-bottom: 12px;"></div>
              <div class="skeleton-title" style="height: 24px; margin-bottom: 12px;"></div>
              <div class="skeleton-text" style="height: 12px; width: 80%;"></div>
            </div>
          </div>

          <!-- Distribution logs / transaction history -->
          <div v-if="web3.circleDistributions.length > 0" class="fade-in mt-6" style="border-top: 1px solid var(--border-light); padding-top: 2rem;">
            <div class="micro-cap mb-3" style="color: var(--text-muted); font-size: 0.7rem; letter-spacing: 0.1em;">CIRCLE CUSTODIAL TRANSACTION LEDGER</div>
            <div style="overflow-x: auto; width: 100%;">
              <table class="premium-table" style="font-size: 0.8rem; margin: 0; min-width: 600px;">
                <thead>
                  <tr>
                    <th>TIMESTAMP</th>
                    <th>TOTAL COLLECTED</th>
                    <th>SPLIT DETAILS</th>
                    <th>SECURE ROUTING STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="dist in web3.circleDistributions" :key="dist.id">
                    <td style="font-family: monospace;">{{ new Date(dist.timestamp).toLocaleString() }}</td>
                    <td style="font-weight: bold; color: var(--text-main);">+${{ dist.amount }} USDC</td>
                    <td class="text-mute">
                      <span style="color: var(--accent-success); font-weight: 600;">Reserves:</span> ${{ dist.splits.reserves }} | 
                      <span style="color: var(--accent-secondary); font-weight: 600;">Payroll:</span> ${{ dist.splits.payroll }} EURC | 
                      <span style="color: var(--accent-primary); font-weight: 600;">Growth:</span> ${{ dist.splits.growth }}
                    </td>
                    <td>
                      <span class="badge" style="background: rgba(195, 232, 141, 0.05); color: var(--accent-success); font-size: 0.65rem; font-weight: 700; display: inline-flex; align-items: center; gap: 0.25rem;">
                        <Shield :size="10" /> SETTLED ON-CHAIN
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
