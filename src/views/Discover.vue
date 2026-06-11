<script setup>
import { ref, reactive, onMounted, nextTick, watch } from 'vue'
import { useBondStore } from '../stores/bond'
import { useWeb3Store } from '../stores/web3'
import { useUIStore } from '../stores/ui'
import { 
  Server, Activity, ShieldCheck, ChevronRight, X, Info, Shield, 
  HelpCircle, Cpu, TrendingUp, DollarSign, ListCollapse, ArrowDownWideNarrow, Play 
} from 'lucide-vue-next'
import { Chart, registerables } from 'chart.js'

Chart.register(...registerables)

const store = useBondStore()
const web3 = useWeb3Store()
const ui = useUIStore()

const selectedBond = ref(null)
const investAmount = ref('')
const selectedTranche = ref(0) // 0 = Senior, 1 = Junior
const txStatus = ref('') // '', 'pending', 'success', 'error'
const txHash = ref('')
const txErrorMsg = ref('')

// Simulator States
const simulatedYield = ref('1000')
const simulatorChartRef = ref(null)
let chartInstance = null

// On-chain tranche details
const trancheData = ref({
  senior: { totalDeposited: '0', targetAPY: 5.0, accruedYield: '0', userDeposited: '0' },
  junior: { totalDeposited: '0', targetAPY: 15.0, accruedYield: '0', userDeposited: '0' }
})
const isLoadingTranche = ref(false)

// Admin controls
const adminYieldAmount = ref('')
const isAdminProcessing = ref(false)

// Payout logs
const payoutLogs = ref([])

// Watch modal state to query on-chain variables
watch(selectedBond, async (newVal) => {
  if (newVal) {
    await loadTrancheInfo(newVal.id)
    nextTick(() => {
      runWaterfallSimulation()
    })
  } else {
    if (chartInstance) {
      chartInstance.destroy()
      chartInstance = null
    }
  }
})

// Query on-chain tranche stats and logs
async function loadTrancheInfo(bondId) {
  isLoadingTranche.value = true
  try {
    const data = await web3.fetchTrancheData(bondId)
    if (data) {
      trancheData.value = data
    }
    // Load historical on-chain payout logs
    await queryPayoutLogs(bondId)
  } catch (e) {
    console.error("Failed to load tranche info:", e)
  } finally {
    isLoadingTranche.value = false
  }
}

// Query past yield distributions
async function queryPayoutLogs(bondId) {
  try {
    if (!window.ethereum) return
    const provider = new web3.BrowserProvider(window.ethereum)
    const ABI = [
      "event WaterfallYieldDistributed(string bondId, uint256 seniorYield, uint256 juniorYield)"
    ]
    const contract = new web3.Contract(web3.contractAddress.BondRouter, ABI, provider)
    
    const blockNumber = await provider.getBlockNumber()
    const startBlock = Math.max(0, blockNumber - 10000)
    const filter = contract.filters.WaterfallYieldDistributed(bondId)
    const events = await contract.queryFilter(filter, startBlock, 'latest')
    
    payoutLogs.value = events.map(evt => ({
      txHash: evt.transactionHash,
      seniorPaid: web3.formatEther(evt.args[1]),
      juniorPaid: web3.formatEther(evt.args[2])
    }))
  } catch (e) {
    console.warn("Payout logs fetch failed:", e.message)
  }
}

// Calculate simulation priority divisions and update Chart.js
function runWaterfallSimulation() {
  if (!selectedBond.value) return
  
  const totalSimYield = Number(simulatedYield.value) || 0
  const seniorDeposited = Number(trancheData.value.senior.totalDeposited) || 10000 // default dummy if pool empty
  const seniorAPY = trancheData.value.senior.targetAPY / 100 // e.g. 0.05
  
  // Senior Priority Return target
  const seniorPriority = seniorDeposited * seniorAPY
  
  let seniorShare = 0
  let juniorShare = 0
  
  if (totalSimYield <= seniorPriority) {
    seniorShare = totalSimYield
    juniorShare = 0
  } else {
    seniorShare = seniorPriority
    juniorShare = totalSimYield - seniorPriority
  }

  // Render/Update Chart
  if (simulatorChartRef.value) {
    const ctx = simulatorChartRef.value.getContext('2d')
    if (chartInstance) {
      chartInstance.destroy()
    }
    chartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Total Pool Yield', 'Senior Share (Priority)', 'Junior Share (Residual)'],
        datasets: [{
          data: [totalSimYield, seniorShare, juniorShare],
          backgroundColor: [
            'rgba(255, 184, 108, 0.25)', // Gold
            'rgba(130, 255, 170, 0.25)', // Green
            'rgba(130, 170, 255, 0.25)'  // Blue
          ],
          borderColor: [
            'var(--accent-gold)',
            'var(--accent-success)',
            'var(--accent-secondary)'
          ],
          borderWidth: 1.5,
          borderRadius: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: {
            grid: { color: 'rgba(255,255,255,0.05)' },
            ticks: { color: '#a0a0a0', font: { family: 'monospace' } }
          },
          x: {
            grid: { display: false },
            ticks: { color: '#a0a0a0', font: { family: 'monospace' } }
          }
        }
      }
    })
  }
}

function openInvestModal(bond) {
  selectedBond.value = bond
  investAmount.value = ''
  txStatus.value = ''
  txHash.value = ''
  txErrorMsg.value = ''
  selectedTranche.value = 0
}

function closeModal() {
  if (txStatus.value !== 'pending') {
    selectedBond.value = null
  }
}

// Deposit USDC into selected tranche
async function confirmInvest() {
  if (!web3.isConnected) {
    ui.addToast('PLEASE CONNECT YOUR SECURE ACCOUNT FIRST.', 'error')
    return
  }
  if (!web3.isKycVerified) {
    ui.addToast('KYC COMPLIANCE VERIFICATION REQUIRED. VISIT SETTINGS.', 'error')
    return
  }
  
  const amt = Number(investAmount.value)
  if (amt <= 0) return

  try {
    txStatus.value = 'pending'
    const hash = await web3.investInTrancheTx(selectedBond.value.id, selectedTranche.value, amt)
    txHash.value = hash
    txStatus.value = 'success'
    
    // Save standard position locally
    store.recordInvestment(selectedBond.value.id, amt, hash)
    ui.addToast('DEPOSIT REGISTERED IN TRANCHE.', 'success')
    
    await loadTrancheInfo(selectedBond.value.id)
  } catch (e) {
    txStatus.value = 'error'
    txErrorMsg.value = e.message || 'TRANSACTION FAILED.'
    ui.addToast('DEPOSIT FAILED', 'error')
  }
}

// Admin: triggers on-chain yield distribution
async function adminDistributeYield() {
  if (!adminYieldAmount.value || Number(adminYieldAmount.value) <= 0) return
  isAdminProcessing.value = true
  try {
    const hash = await web3.distributePoolYieldTx(selectedBond.value.id, adminYieldAmount.value)
    ui.addToast(`YIELD DISTRIBUTED ON-CHAIN: ${adminYieldAmount.value} USDC`, 'success')
    adminYieldAmount.value = ''
    await loadTrancheInfo(selectedBond.value.id)
  } catch (e) {
    console.error("Distribution failed:", e)
    ui.addToast("YIELD DISTRIBUTION REJECTED (OWNER ONLY).", "error")
  } finally {
    isAdminProcessing.value = false
  }
}

onMounted(async () => {
  await store.fetchBonds()
})
</script>

<template>
  <div class="page-container fade-in">
    <!-- KYC Warning -->
    <div v-if="web3.isConnected && !web3.isKycVerified" class="glass-panel mb-4" style="padding: 1rem 1.5rem; border: 1px solid var(--accent-danger); background: rgba(255, 107, 107, 0.05); margin-bottom: 2rem; display: flex; align-items: center; gap: 0.75rem;">
      <Info :size="18" color="var(--accent-danger)" style="flex-shrink:0;" />
      <div style="flex-grow: 1;">
        <span class="micro-cap" style="color: var(--accent-danger); font-weight: bold; display: block; margin-bottom: 0.2rem;">KYC VERIFICATION MANDATORY</span>
        <p class="micro-cap text-mute" style="text-transform: none; letter-spacing: 0; font-size: 0.78rem; line-height: 1.4; margin: 0;">
          Your address is currently not registered on the on-chain Compliance Registry. Please navigate to <router-link to="/settings" style="color: var(--accent-primary); text-decoration: underline;">Settings</router-link> to complete KYC.
        </p>
      </div>
    </div>

    <div class="flex items-center gap-2 mb-2 micro-cap" style="color: var(--accent-primary);">
      <Server :size="14" /> SECURE SAVINGS DESK
    </div>
    <h1 class="display-xl text-gradient mb-4" style="margin-bottom: 2rem;">DISCOVER TRANCHE PRODUCTS</h1>

    <!-- Table of pools -->
    <div v-if="store.isLoading" style="overflow-x: auto; width: 100%;">
      <table class="premium-table">
        <thead>
          <tr>
            <th>SAVINGS INSTRUMENT</th>
            <th>PROVIDER</th>
            <th>SECURITY LAYER</th>
            <th>ANNUAL INTEREST</th>
            <th>STABILITY RATING</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="i in 5" :key="i">
            <td data-label="SAVINGS INSTRUMENT">
              <div class="flex items-center gap-2">
                <div class="skeleton" style="width: 16px; height: 16px; border-radius: 50%; flex-shrink: 0;"></div>
                <div class="skeleton skeleton-text" style="width: 120px; height: 14px; margin: 0;"></div>
              </div>
            </td>
            <td data-label="PROVIDER"><div class="skeleton skeleton-text short" style="height: 12px; margin: 0;"></div></td>
            <td data-label="SECURITY LAYER"><div class="skeleton" style="width: 80px; height: 20px;"></div></td>
            <td data-label="ANNUAL INTEREST"><div class="skeleton skeleton-text" style="width: 50px; height: 14px; margin: 0;"></div></td>
            <td data-label="STABILITY RATING"><div class="skeleton" style="width: 90px; height: 20px;"></div></td>
            <td data-label="ACTION" style="text-align: right;"><div class="skeleton" style="width: 80px; height: 32px; display: inline-block;"></div></td>
          </tr>
        </tbody>
      </table>
    </div>
    
    <div v-else style="overflow-x: auto; width: 100%;">
      <table class="premium-table fade-up">
        <thead>
          <tr>
            <th>SAVINGS INSTRUMENT</th>
            <th>PROVIDER</th>
            <th>SECURITY LAYER</th>
            <th>ANNUAL INTEREST</th>
            <th>STABILITY RATING</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(b, idx) in store.marketBonds" :key="b.id" :class="'delay-' + (idx % 3 + 1)">
            <td data-label="SAVINGS INSTRUMENT">
              <div class="flex items-center gap-2">
                <Activity :size="16" color="var(--accent-secondary)" />
                {{ b.token }}
              </div>
            </td>
            <td data-label="PROVIDER" class="text-mute">{{ b.issuer }}</td>
            <td data-label="SECURITY LAYER">
              <span class="badge" style="background: rgba(255,255,255,0.05); color: var(--text-main);">
                {{ b.chain.toUpperCase() }} LINK
              </span>
            </td>
            <td data-label="ANNUAL INTEREST" style="color: var(--accent-success); font-weight: 700;">{{ b.apy }}% APY</td>
            <td data-label="STABILITY RATING">
              <span class="badge" :class="{ 'low': b.risk === 'Low', 'medium': b.risk === 'Medium', 'high': b.risk === 'High' }">
                <ShieldCheck v-if="b.risk === 'Low'" :size="12" style="margin-right: 4px;" />
                {{ b.risk === 'Low' ? 'EXCELLENT' : b.risk === 'Medium' ? 'HIGH' : 'STANDARD' }}
              </span>
            </td>
            <td data-label="ACTION" style="text-align: right;">
              <button class="btn-glass" style="padding: 0.5rem 1rem; font-size: 0.75rem;" @click="openInvestModal(b)">
                VIEW TRANCHES <ChevronRight :size="14" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- TRANCHE VAULT MODAL -->
    <div v-if="selectedBond" class="modal-overlay" @click.self="closeModal">
      <div class="modal-content fade-up" style="max-width: 900px; width: 95%; margin: 16px; max-height: 85vh; display: flex; flex-direction: column; gap: 1rem; overflow: hidden;">
        
        <!-- Modal Header -->
        <div class="flex justify-between items-start border-b pb-4" style="border-color: rgba(255,255,255,0.05); flex-shrink: 0;">
          <div>
            <div class="micro-cap mb-1" style="color: var(--accent-primary);">STRUCTURED YIELD DEPOSIT</div>
            <h2 class="display-lg" style="font-size: 1.8rem; margin-bottom: 0.2rem;">{{ selectedBond.token }} — TRANCHE PORTFOLIO</h2>
            <div class="text-xs text-mute font-mono">Pool: {{ selectedBond.id }}</div>
          </div>
          <button v-if="txStatus !== 'pending'" class="modal-close-btn" @click="closeModal">
            <X :size="18" />
          </button>
        </div>

        <!-- Success view -->
        <div v-if="txStatus === 'success'" style="flex-grow: 1; overflow-y: auto; display: flex; flex-direction: column; align-items: center; justify-content: center;" class="py-8 text-center">
          <ShieldCheck :size="64" color="var(--accent-success)" class="mb-4 pulse" />
          <h3 class="display-md text-gradient" style="color: var(--accent-success);">TRANCHE DEPOSIT COMPLETE</h3>
          <p class="body-md text-mute max-w-md mx-auto mt-2">
            Your USDC is now locked into the structured vault on Arc Testnet. Yield waterfall splits are managed autonomously on-chain.
          </p>
          <div class="mt-4 p-3 bg-black-20 border border-border-light font-mono text-xs max-w-lg w-full text-center">
            Tx: <a :href="'https://testnet.arcscan.app/tx/' + txHash" target="_blank" style="color: var(--accent-secondary);">{{ txHash }}</a>
          </div>
          <button class="btn-primary mt-6" @click="closeModal">RETURN TO DISCOVER</button>
        </div>

        <!-- Pending view -->
        <div v-else-if="txStatus === 'pending'" style="flex-grow: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;" class="text-center">
          <div class="spinner mb-4"></div>
          <h3 class="micro-cap">BROADCASTING TO ARC TESTNET</h3>
          <p class="body-sm text-mute mt-2">Signing tranche investment contract allocation. Please approve the prompt in your wallet.</p>
        </div>

        <!-- Main Structured view -->
        <div v-else class="modal-body-grid">
          
          <!-- Column 1: Tranche Selector & Deposit -->
          <div class="space-y-4">
            <h4 class="micro-cap border-b pb-2" style="border-color: rgba(255,255,255,0.05); color: var(--accent-secondary);">TRANCHE VAULT SELECTOR</h4>
            
            <div class="tranche-cards-grid">
              <!-- Senior Tranche Card -->
              <div 
                class="glass-panel cursor-pointer flex flex-col justify-between p-4" 
                :class="{ 'active-tranche': selectedTranche === 0 }"
                style="border-color: selectedTranche === 0 ? 'var(--accent-success)' : 'rgba(255,255,255,0.05)';"
                @click="selectedTranche = 0"
              >
                <div>
                  <div class="flex justify-between items-center mb-2">
                    <span class="badge" style="background: rgba(130, 255, 170, 0.1); color: var(--accent-success); border-radius: 0;">SENIOR</span>
                    <ShieldCheck :size="14" color="var(--accent-success)" />
                  </div>
                  <div style="font-weight: 800; font-size: 1.4rem; color: var(--accent-success);">{{ trancheData.senior.targetAPY.toFixed(2) }}%</div>
                  <span class="micro-cap text-mute" style="font-size: 0.62rem;">TARGET FIXED APY</span>
                </div>
                <div class="mt-4 pt-2 border-t border-border-light text-xs text-mute" style="border-color: rgba(255,255,255,0.03);">
                  <div>TVL: {{ trancheData.senior.totalDeposited }} USDC</div>
                  <div style="color: var(--accent-success); font-weight: bold; font-size: 0.65rem;" class="mt-1">🔒 PRIORITY RETURN PAYOUT</div>
                </div>
              </div>

              <!-- Junior Tranche Card -->
              <div 
                class="glass-panel cursor-pointer flex flex-col justify-between p-4" 
                :class="{ 'active-tranche': selectedTranche === 1 }"
                style="border-color: selectedTranche === 1 ? 'var(--accent-secondary)' : 'rgba(255,255,255,0.05)';"
                @click="selectedTranche = 1"
              >
                <div>
                  <div class="flex justify-between items-center mb-2">
                    <span class="badge" style="background: rgba(130, 170, 255, 0.1); color: var(--accent-secondary); border-radius: 0;">JUNIOR</span>
                    <TrendingUp :size="14" color="var(--accent-secondary)" />
                  </div>
                  <div style="font-weight: 800; font-size: 1.4rem; color: var(--accent-secondary);">{{ trancheData.junior.targetAPY.toFixed(2) }}%</div>
                  <span class="micro-cap text-mute" style="font-size: 0.62rem;">TARGET FLOATING APY</span>
                </div>
                <div class="mt-4 pt-2 border-t border-border-light text-xs text-mute" style="border-color: rgba(255,255,255,0.03);">
                  <div>TVL: {{ trancheData.junior.totalDeposited }} USDC</div>
                  <div style="color: var(--accent-secondary); font-weight: bold; font-size: 0.65rem;" class="mt-1">🚀 CASCADE UPSIDE PAYOUT</div>
                </div>
              </div>
            </div>

            <!-- Investment inputs -->
            <div class="glass-panel p-4">
              <label class="micro-cap block mb-2">DEPOSIT AMOUNT IN {{ selectedTranche === 0 ? 'SENIOR' : 'JUNIOR' }} (USDC)</label>
              <div class="flex gap-2">
                <input type="number" class="text-input" v-model="investAmount" placeholder="Amount..." style="flex-grow:1;" />
                <button 
                  class="btn-primary" 
                  style="border-radius:0px;"
                  :style="{ 
                    background: selectedTranche === 0 ? 'var(--accent-success)' : 'var(--accent-secondary)',
                    borderColor: selectedTranche === 0 ? 'var(--accent-success)' : 'var(--accent-secondary)',
                    color: '#131313'
                  }"
                  @click="confirmInvest"
                  :disabled="!investAmount || Number(investAmount) <= 0"
                >
                  DEPOSIT
                </button>
              </div>
              <div class="text-xs text-mute mt-2">
                My on-chain balance in this tranche: 
                <span class="text-white font-mono">{{ selectedTranche === 0 ? trancheData.senior.userDeposited : trancheData.junior.userDeposited }} USDC</span>
              </div>
            </div>

            <!-- On-chain Payout logs -->
            <div class="glass-panel p-4" style="max-height: 220px; overflow-y: auto;">
              <span class="micro-cap block mb-2" style="color: var(--accent-gold);">ON-CHAIN WATERFALL LOGS</span>
              <table class="premium-table" style="font-size: 0.72rem;">
                <thead>
                  <tr>
                    <th>TX</th>
                    <th>SENIOR PAID</th>
                    <th>JUNIOR PAID</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="payoutLogs.length === 0">
                    <td colspan="3" class="text-center text-mute py-2">No historical waterfall payouts found.</td>
                  </tr>
                  <tr v-for="(log, idx) in payoutLogs" :key="idx">
                    <td>
                      <a :href="'https://testnet.arcscan.app/tx/' + log.txHash" target="_blank" style="color: var(--accent-secondary);">
                        {{ log.txHash.slice(0, 8) }}...
                      </a>
                    </td>
                    <td style="color: var(--accent-success);">+{{ log.seniorPaid }} USDC</td>
                    <td style="color: var(--accent-secondary);">+{{ log.juniorPaid }} USDC</td>
                  </tr>
                </tbody>
              </table>
            </div>

          </div>

          <!-- Column 2: Simulator & Chart.js diagram -->
          <div class="space-y-4 flex flex-col justify-between">
            <div>
              <h4 class="micro-cap border-b pb-2" style="border-color: rgba(255,255,255,0.05); color: var(--accent-gold);">INTERACTIVE WATERFALL APY SIMULATOR</h4>
              <p class="body-sm text-mute" style="font-size: 0.8rem;">
                Simulate structured waterfall distribution. Senior receives up to its priority APY targets first, and Junior captures all residual yield surplus.
              </p>

              <!-- Simulator controls -->
              <div class="flex items-center gap-4 mt-4 bg-black-20 p-3 border border-border-light">
                <div style="flex-grow:1;">
                  <label class="micro-cap block mb-1">SIMULATED PORTFOLIO YIELD INFLOW (USDC)</label>
                  <input type="range" min="100" max="10000" step="100" class="w-full cursor-pointer" v-model="simulatedYield" @input="runWaterfallSimulation" />
                </div>
                <div class="font-mono text-white text-md font-bold" style="min-width: 90px; text-align: right;">
                  ${{ simulatedYield }} USDC
                </div>
              </div>
            </div>

            <!-- Chart Container -->
            <div style="height: 180px; position: relative;" class="my-2">
              <canvas ref="simulatorChartRef"></canvas>
            </div>

            <!-- Admin Contract Control Panel -->
            <div style="background: rgba(255, 184, 108, 0.05); border: 1px dashed var(--accent-gold); padding: 1rem;">
              <span class="micro-cap block text-gradient" style="color: var(--accent-gold); margin-bottom: 0.25rem;">ADMIN WATERFALL CONTROLLER</span>
              <p class="text-mute mb-2" style="font-size: 0.72rem; text-transform: none;">
                Distribute yield pool returns on-chain to trigger the actual waterfall division. Senior and Junior shares accrue immediately in the smart contract.
              </p>
              <div class="flex gap-2">
                <input type="number" class="text-input" style="font-size: 0.75rem; flex-grow:1;" v-model="adminYieldAmount" placeholder="Yield to distribute (USDC)..." />
                <button 
                  class="btn-primary flex items-center gap-1" 
                  style="font-size: 0.7rem; padding: 4px 8px; border-radius:0; background: var(--accent-gold); border-color: var(--accent-gold); color: #131313;"
                  @click="adminDistributeYield"
                  :disabled="isAdminProcessing || !adminYieldAmount"
                >
                  <Play :size="10" /> DISTRIBUTE
                </button>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<style scoped>
.active-tranche {
  border-width: 2px !important;
  background: rgba(255, 255, 255, 0.01);
  box-shadow: 0 0 15px rgba(255, 184, 108, 0.05);
}

.bg-black-20 {
  background: rgba(0, 0, 0, 0.2);
}

.modal-body-grid {
  display: grid;
  grid-template-columns: 1.1fr 0.9fr;
  gap: 1.5rem;
  padding: 1rem 0;
  max-height: calc(85vh - 100px);
  overflow-y: auto;
  min-height: 0;
  -ms-overflow-style: none;  /* IE and Edge */
  scrollbar-width: none;  /* Firefox */
}

.modal-body-grid::-webkit-scrollbar {
  display: none; /* Chrome, Safari, Opera */
}

.tranche-cards-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

@media (max-width: 768px) {
  .modal-body-grid {
    grid-template-columns: 1fr;
    max-height: none;
  }
}
</style>
