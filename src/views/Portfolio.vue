<script setup>
import { ref, computed, onMounted } from 'vue'
import { useBondStore } from '../stores/bond'
import { useUIStore } from '../stores/ui'
import { useWeb3Store } from '../stores/web3'
import { useNumberCounter } from '../composables/useCounter'
import { ArrowDownToLine, WalletCards, TrendingUp, ExternalLink, Activity, Shield, Coins, Copy, ArrowUpRight, Lock, Clock, RefreshCw } from 'lucide-vue-next'
import FxCalculator from '../components/FxCalculator.vue'
import YieldTicker from '../components/YieldTicker.vue'
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

const upgrading = ref(false)

async function triggerScaUpgrade() {
  if (!web3.address) {
    ui.addToast('CONNECT YOUR WALLET FIRST.', 'error')
    return
  }
  upgrading.value = true
  try {
    ui.addToast('DEPLOYING SMART CONTRACT ACCOUNT...', 'info')
    await web3.smartAccount.upgradeToSmartAccount(web3.address)
    ui.addToast('SMART ACCOUNT ACTIVE. GAS SPONSORSHIP ENABLED.', 'success')
  } catch (err) {
    ui.addToast('UPGRADE FAILED.', 'error')
  } finally {
    upgrading.value = false
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

const tranchePositions = ref([])
const unclaimedWaterfallYield = ref("0.00")
const isClaimingWaterfall = ref(false)

async function claimWaterfallEarnings() {
  if (Number(unclaimedWaterfallYield.value) <= 0) return
  isClaimingWaterfall.value = true
  try {
    const bondIds = [...new Set(tranchePositions.value.map(p => p.bondId))]
    if (bondIds.length === 0) return
    
    await web3.claimAllWaterfallYieldTx(bondIds)
    ui.addToast("WATERFALL YIELD CLAIMED SUCCESSFULLY!", "success")
    
    unclaimedWaterfallYield.value = "0.00"
    await loadTranchePortfolio()
  } catch (e) {
    console.error("Claiming waterfall failed:", e)
    ui.addToast("FAILED TO CLAIM WATERFALL YIELD.", "error")
  } finally {
    isClaimingWaterfall.value = false
  }
}

async function loadTranchePortfolio() {
  if (!web3.isConnected || !web3.address) return
  
  const totalWaterfallYield = await web3.fetchUnclaimedWaterfallYield()
  unclaimedWaterfallYield.value = Number(totalWaterfallYield).toFixed(4)
  
  const userTrancheList = []
  
  if (store.marketBonds.length === 0) {
    await store.fetchBonds()
  }
  
  for (const bond of store.marketBonds) {
    const data = await web3.fetchTrancheData(bond.id)
    if (data) {
      if (Number(data.senior.userDeposited) > 0) {
        userTrancheList.push({
          bondId: bond.id,
          token: bond.token,
          trancheIndex: 0,
          trancheName: 'Senior',
          deposited: data.senior.userDeposited,
          targetAPY: data.senior.targetAPY,
          accruedYield: data.senior.accruedYield
        })
      }
      if (Number(data.junior.userDeposited) > 0) {
        userTrancheList.push({
          bondId: bond.id,
          token: bond.token,
          trancheIndex: 1,
          trancheName: 'Junior',
          deposited: data.junior.userDeposited,
          targetAPY: data.junior.targetAPY,
          accruedYield: data.junior.accruedYield
        })
      }
    }
  }
  tranchePositions.value = userTrancheList
}

onMounted(async () => {
  isFetchingHoldings.value = true
  try {
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
      // Load tranche positions
      await loadTranchePortfolio()
    }
  } catch (err) {
    console.error("Error loading portfolio holdings:", err)
  } finally {
    isFetchingHoldings.value = false
  }
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

      <!-- Account Abstraction Upgrade Wizard / Sponsored Gas Status -->
      <div class="glass-panel mb-6 fade-up" style="margin-bottom: 2rem; border-color: rgba(130, 170, 255, 0.15);">
        <div class="flex items-center justify-between flex-wrap gap-4" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap;">
          <div style="display: flex; align-items: center; gap: 1rem; text-align: left;">
            <div style="background: rgba(130, 170, 255, 0.1); border: 1px solid var(--accent-secondary); padding: 0.75rem; display: flex; align-items: center; justify-content: center;">
              <Shield :size="24" color="var(--accent-secondary)" />
            </div>
            <div>
              <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                <h4 style="margin: 0; font-size: 1.1rem; color: #fff; font-weight: 800;">
                  {{ web3.smartAccount.isScaDeployed ? 'GASLESS SMART CONTRACT ACCOUNT ACTIVE' : 'UPGRADE TO GASLESS SMART ACCOUNT' }}
                </h4>
                <span v-if="web3.smartAccount.isScaDeployed" class="badge" style="background: rgba(130, 255, 170, 0.15); color: var(--accent-success); font-size: 0.65rem; border-radius: 0px;">
                  SPONSORED BY PAYMASTER
                </span>
                <span v-else class="badge" style="background: rgba(255,255,255,0.05); color: var(--text-muted); font-size: 0.65rem; border-radius: 0px;">
                  ERC-4337 UPGRADE AVAILABLE
                </span>
              </div>
              <p class="text-mute mb-0 mt-1" style="font-size: 0.82rem; margin: 0; line-height: 1.4;">
                {{ web3.smartAccount.isScaDeployed 
                  ? `Deterministic SCA address active: ${web3.smartAccount.scaAddress}. All trades, sweeps, and allocations are 100% gas-sponsored.` 
                  : 'Upgrade your standard account to a modular Smart Account to execute gasless transfers, deposits, and sweeps.' }}
              </p>
            </div>
          </div>
          <div>
            <button 
              v-if="!web3.smartAccount.isScaDeployed"
              class="btn-primary" 
              style="padding: 0.6rem 1.2rem; font-size: 0.8rem; background: var(--accent-secondary); border-color: var(--accent-secondary); color: #000; font-weight: 800; border-radius: 0px; border: none; cursor: pointer;"
              @click="triggerScaUpgrade"
              :disabled="upgrading"
            >
              <RefreshCw v-if="upgrading" :size="12" class="spinner-inline" />
              {{ upgrading ? 'UPGRADING ACCOUNT...' : 'UPGRADE TO SMART WALLET' }}
            </button>
            <div v-else style="display: flex; gap: 1.5rem; align-items: center;">
              <div style="text-align: right;">
                <div class="micro-cap text-mute" style="font-size: 0.62rem;">SPONSORED TXS</div>
                <div class="font-mono font-bold" style="color: var(--accent-secondary); font-size: 1rem;">{{ web3.smartAccount.sponsorCount }}</div>
              </div>
              <div style="text-align: right;">
                <div class="micro-cap text-mute" style="font-size: 0.62rem;">TOTAL GAS SAVED</div>
                <div class="font-mono font-bold" style="color: var(--accent-success); font-size: 1rem;">+${{ web3.smartAccount.totalGasSaved.toFixed(2) }} USDC</div>
              </div>
            </div>
          </div>
        </div>
      </div>

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

        <!-- Yield Projection Chart & Live Yield Stream -->
        <div class="grid-two-columns-responsive mb-6 gap-6 fade-up delay-2" style="margin-bottom: 3rem; text-align: left;">
          <div class="glass-panel" style="margin-bottom: 0;">
            <div class="micro-cap mb-4">12-MONTH SAVINGS FORECAST</div>
            <div style="height: 350px;">
              <Line :data="chartData" :options="chartOptions" />
            </div>
          </div>
          <YieldTicker />
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
        
        <!-- On-Chain Structured Tranches -->
        <div class="glass-panel fade-up delay-4" style="margin-top: 3rem; padding: 2rem;">
          <div class="flex-responsive-header mb-4">
            <div>
              <div class="micro-cap" style="color: var(--accent-gold);">ON-CHAIN RISK TRANCHES</div>
              <h3 class="display-lg" style="font-size: 1.5rem; margin-top: 0.25rem;">STRUCTURED TRANCHE HOLDINGS</h3>
            </div>
            <!-- Claim button -->
            <div class="flex items-center gap-4">
              <div class="text-right">
                <span class="micro-cap block text-mute">UNCLAIMED WATERFALL REWARDS</span>
                <span class="body-md font-bold" style="color: var(--accent-success);">+{{ unclaimedWaterfallYield }} USDC</span>
              </div>
              <button 
                class="btn-primary" 
                :class="{ 'btn-loading': isClaimingWaterfall }"
                @click="claimWaterfallEarnings"
                :disabled="Number(unclaimedWaterfallYield) <= 0 || isClaimingWaterfall"
                style="background: var(--accent-success); border-color: var(--accent-success); color: #131313; border-radius: 0px;"
              >
                <span v-if="isClaimingWaterfall" class="spinner-inline mr-2"></span>
                CLAIM YIELD
              </button>
            </div>
          </div>

          <p class="body-md text-mute mb-4" style="font-size: 0.88rem; line-height: 1.5;">
            Tranche-based deposits route capital to either Senior (priority payout, junior-cushioned protection) or Junior (surplus-capturing leveraged yield) vaults on-chain.
          </p>

          <div style="overflow-x: auto; width: 100%;">
            <table class="premium-table">
              <thead>
                <tr>
                  <th>SAVINGS INSTRUMENT</th>
                  <th>RISK CATEGORY</th>
                  <th>DEPOSITED SIZE</th>
                  <th>TARGET APY</th>
                  <th>ACCUMULATED POOL YIELD</th>
                  <th>ON-CHAIN SECURITY</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="tranchePositions.length === 0">
                  <td colspan="6" class="text-center text-mute py-4">
                    No active structured tranche deposits. Visit the <router-link to="/discover" style="color: var(--accent-primary);">Savings Desk</router-link> to invest in risk tranches.
                  </td>
                </tr>
                <tr v-for="t in tranchePositions" :key="t.bondId + '-' + t.trancheIndex">
                  <td data-label="SAVINGS INSTRUMENT">
                    <div class="flex items-center gap-2" style="font-weight: 700;">
                      <Activity :size="16" color="var(--accent-secondary)" />
                      {{ t.token }}
                    </div>
                  </td>
                  <td data-label="RISK CATEGORY">
                    <span 
                      class="badge" 
                      :style="{ 
                        background: t.trancheIndex === 0 ? 'rgba(130, 255, 170, 0.1)' : 'rgba(130, 170, 255, 0.1)',
                        color: t.trancheIndex === 0 ? 'var(--accent-success)' : 'var(--accent-secondary)'
                      }"
                    >
                      {{ t.trancheName.toUpperCase() }}
                    </span>
                  </td>
                  <td data-label="DEPOSITED SIZE" style="font-weight: 700;">
                    {{ t.deposited }} USDC
                  </td>
                  <td data-label="TARGET APY" style="font-weight: 700;" :style="{ color: t.trancheIndex === 0 ? 'var(--accent-success)' : 'var(--accent-secondary)' }">
                    {{ t.targetAPY.toFixed(2) }}% APY
                  </td>
                  <td data-label="ACCUMULATED POOL YIELD" style="color: var(--accent-success); font-weight: 700;">
                    +{{ Number(t.accruedYield).toFixed(4) }} USDC
                  </td>
                  <td data-label="ON-CHAIN SECURITY">
                    <span class="badge" style="background: rgba(255,255,255,0.03); color: var(--accent-gold);">
                      Verified ZK Bond
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
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
                  <a 
                    :href="'https://sepolia.basescan.org/address/' + wallet.address" 
                    target="_blank" 
                    style="color: var(--accent-secondary); text-decoration: none; display: inline-flex; align-items: center; gap: 0.25rem;"
                  >
                    {{ wallet.address }} <ExternalLink :size="10" />
                  </a>
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

          <!-- StableFX Converter section -->
          <div class="grid-two-columns-responsive mb-6 gap-6" style="margin-top: 2rem; border-top: 1px dashed rgba(255,255,255,0.1); padding-top: 2rem;">
            <div style="text-align: left; display: flex; flex-direction: column; justify-content: center;">
              <span class="micro-cap font-bold" style="color: var(--accent-gold); letter-spacing: 0.1em;">CIRCLE STABLEFX LIQUIDITY SWAPS</span>
              <h4 class="display-md mb-2" style="font-size: 1.35rem; margin-top: 0.5rem; color: var(--text-main); font-weight: 800;">CROSS-BORDER PAYROLL SETTLEMENT</h4>
              <p class="body-md text-mute" style="font-size: 0.85rem; line-height: 1.6; color: var(--text-muted);">
                BondRouter integrates with Circle's live StableFX liquidity engine to allow institutional treasuries to execute real-time, low-slippage conversions between USDC and EURC.
              </p>
              <p class="body-md text-mute mt-3" style="font-size: 0.85rem; line-height: 1.6; color: var(--text-muted);">
                European contractors can be paid directly in EURC, minimizing foreign exchange exposure and settling transfers in seconds over stable blockchain rails.
              </p>
            </div>
            <div>
              <FxCalculator />
            </div>
          </div>

          <!-- Live CCTP Cross-Chain Attestation Tracking & Recovery -->
          <div v-if="web3.cctp.pendingBridges.length > 0" class="fade-in mt-6 mb-6" style="background: rgba(212, 175, 55, 0.02); border: 1px solid var(--border-light); padding: 1.5rem; border-radius: 0px; text-align: left;">
            <div class="flex items-center justify-between mb-4">
              <div class="flex items-center gap-2">
                <RefreshCw :size="16" color="var(--accent-gold)" class="spinner-inline" />
                <span class="micro-cap font-bold" style="letter-spacing: 0.1em; color: var(--accent-gold);">LIVE CCTP ATTESTATION TRACKER</span>
              </div>
              <button class="btn-glass" style="font-size: 0.65rem; padding: 0.25rem 0.5rem;" @click="web3.cctp.clearCompleted()">
                CLEAR SETTLED TRANSFERS
              </button>
            </div>

            <div class="flex flex-col gap-4">
              <div v-for="bridge in web3.cctp.pendingBridges" :key="bridge.txHash" style="background: rgba(255,255,255,0.01); border: 1px solid rgba(255,255,255,0.05); padding: 1rem; border-radius: 0px;">
                <div class="flex justify-between items-center mb-3">
                  <div>
                    <div class="body-md font-bold" style="color: var(--text-main);">
                      Bridge {{ bridge.amount }} USDC
                    </div>
                    <div class="micro-cap text-mute" style="font-size: 0.65rem; font-family: monospace;">
                      Source TX: <a :href="'https://sepolia.etherscan.io/tx/' + bridge.txHash" target="_blank" style="color: var(--accent-secondary); text-decoration: none;">{{ bridge.txHash.slice(0, 10) }}...{{ bridge.txHash.slice(-8) }}</a>
                    </div>
                  </div>
                  <div>
                    <span v-if="bridge.status === 'burning'" class="badge" style="background: rgba(255,165,0,0.1); color: orange;">CONFIRMING BURN</span>
                    <span v-else-if="bridge.status === 'attestation_polling'" class="badge" style="background: rgba(0,191,255,0.1); color: deepskyblue;">POLLING SIGNATURE</span>
                    <span v-else-if="bridge.status === 'attestation_ready'" class="badge" style="background: rgba(212,175,55,0.1); color: var(--accent-gold);">SIGNATURE ACQUIRED</span>
                    <span v-else-if="bridge.status === 'minting'" class="badge" style="background: rgba(138,43,226,0.1); color: blueviolet;">MINTING ON ARC</span>
                    <span v-else-if="bridge.status === 'completed'" class="badge" style="background: rgba(50,205,50,0.1); color: var(--accent-success);">COMPLETED</span>
                  </div>
                </div>

                <!-- Custom Progress Bar -->
                <div style="background: rgba(255,255,255,0.05); height: 6px; width: 100%; border-radius: 3px; overflow: hidden; margin-bottom: 0.75rem; position: relative;">
                  <div 
                    style="height: 100%; background: linear-gradient(90deg, var(--accent-gold), var(--accent-success)); transition: width 0.5s ease;"
                    :style="{ width: bridge.progress + '%' }"
                  ></div>
                </div>

                <div class="flex justify-between items-center">
                  <div class="flex items-center gap-1.5 micro-cap text-mute" style="font-size: 0.65rem;">
                    <Clock :size="10" />
                    <span v-if="bridge.status === 'burning'">Awaiting source ledger finality...</span>
                    <span v-else-if="bridge.status === 'attestation_polling'">Circle consensus pending (ETA: {{ bridge.eta }}s)</span>
                    <span v-else-if="bridge.status === 'attestation_ready'">Proof ready to submit.</span>
                    <span v-else-if="bridge.status === 'minting'">Submitting mint instruction...</span>
                    <span v-else-if="bridge.status === 'completed'">Deposit credited successfully on Arc chain.</span>
                  </div>

                  <button 
                    v-if="bridge.status === 'attestation_ready'" 
                    class="btn-primary" 
                    style="font-size: 0.7rem; padding: 0.35rem 0.75rem;"
                    @click="web3.cctp.claimBridge(bridge)"
                  >
                    CLAIM FUNDS ON ARC
                  </button>
                  <span v-else-if="bridge.status === 'minting'" class="micro-cap" style="color: var(--accent-secondary); font-weight: bold;">
                    COMMITTING...
                  </span>
                </div>
              </div>
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
