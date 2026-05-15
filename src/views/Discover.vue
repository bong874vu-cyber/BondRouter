<script setup>
import { ref } from 'vue'
import { useBondStore } from '../stores/bond'
import { useWeb3Store } from '../stores/web3'
import { useUIStore } from '../stores/ui'
import { Server, Activity, ShieldCheck, CheckCircle2, ChevronRight, X } from 'lucide-vue-next'

const store = useBondStore()
const web3 = useWeb3Store()
const ui = useUIStore()

const selectedBond = ref(null)
const investAmount = ref('')
const txStatus = ref('') // '', 'pending', 'simulating', 'success', 'error'
const simulationStep = ref(0)
const txHash = ref('')
const txErrorMsg = ref('')

const SIMULATION_STEPS = [
  "RELAYER: RECEIVING INTENT SIGNATURE...",
  "RELAYER: INITIATING CCTP BURN ON ORIGIN CHAIN (SPONSORED)...",
  "RELAYER: FETCHING ATTESTATION FROM CIRCLE API...",
  "RELAYER: MINTING USDC ON ARC TESTNET...",
  "CONTRACT: EXECUTING BOND ACQUISITION..."
]

function openInvestModal(bond) {
  selectedBond.value = bond
  investAmount.value = ''
  txStatus.value = ''
  txHash.value = ''
  txErrorMsg.value = ''
  simulationStep.value = 0
}

function closeModal() {
  if (txStatus.value !== 'pending' && txStatus.value !== 'simulating') {
    selectedBond.value = null
  }
}

async function runSimulation() {
  txStatus.value = 'simulating'
  for (let i = 0; i < SIMULATION_STEPS.length; i++) {
    simulationStep.value = i
    await new Promise(r => setTimeout(r, 900)) // faster simulation
  }
}

async function confirmInvest() {
  if (!web3.isConnected) {
    ui.addToast('PLEASE CONNECT WALLET FIRST.', 'error')
    return
  }
  
  const qty = parseInt(investAmount.value)
  if (qty > 0) {
    try {
      txStatus.value = 'pending'
      const hash = await web3.sendInvestmentTx('INVEST', selectedBond.value.id, qty)
      
      // After wallet confirms, simulate CCTP bridge delay visually
      await runSimulation()
      
      txHash.value = hash
      txStatus.value = 'success'
      store.recordInvestment(selectedBond.value.id, qty, hash)
      ui.addToast('INVESTMENT SUCCESSFUL', 'success')
    } catch (e) {
      txStatus.value = 'error'
      txErrorMsg.value = e.message.substring(0, 100) || 'TRANSACTION REJECTED OR FAILED.'
      ui.addToast('TRANSACTION FAILED', 'error')
    }
  }
}
</script>

<template>
  <div class="page-container fade-in">
    <div class="flex items-center gap-2 mb-2 micro-cap" style="color: var(--accent-primary);">
      <Server :size="14" /> BOND MARKETPLACE
    </div>
    <h1 class="display-xl text-gradient mb-4" style="margin-bottom: 3rem;">DISCOVER BONDS</h1>

    <div v-if="store.isLoading" class="flex items-center justify-center" style="height: 40vh;">
      <div class="flex flex-col items-center gap-4">
        <div class="spinner"></div>
        <div class="micro-cap text-mute">ACQUIRING TELEMETRY...</div>
      </div>
    </div>
    
    <table v-else class="premium-table fade-up">
      <thead>
        <tr>
          <th>ASSET</th>
          <th>ISSUER</th>
          <th>NETWORK</th>
          <th>YIELD (APY)</th>
          <th>RISK</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(b, idx) in store.marketBonds" :key="b.id" :class="'delay-' + (idx % 3 + 1)">
          <td data-label="ASSET">
            <div class="flex items-center gap-2">
              <Activity :size="16" color="var(--accent-secondary)" />
              {{ b.token }}
            </div>
          </td>
          <td data-label="ISSUER" class="text-mute">{{ b.issuer }}</td>
          <td data-label="NETWORK">
            <span class="badge" style="background: rgba(255,255,255,0.05); color: var(--text-main);">
              {{ b.chain.toUpperCase() }}
            </span>
          </td>
          <td data-label="YIELD" style="color: var(--accent-success); font-weight: 700;">{{ b.apy }}%</td>
          <td data-label="RISK">
            <span class="badge" :class="{ 'low': b.risk === 'Low', 'medium': b.risk === 'Medium', 'high': b.risk === 'High' }">
              <ShieldCheck v-if="b.risk === 'Low'" :size="12" style="margin-right: 4px;" />
              {{ b.risk.toUpperCase() }}
            </span>
          </td>
          <td data-label="ACTION" style="text-align: right;">
            <button class="btn-glass" style="padding: 0.5rem 1rem; font-size: 0.75rem;" @click="openInvestModal(b)">
              INVEST <ChevronRight :size="14" />
            </button>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- Invest Modal -->
    <div v-if="selectedBond" class="modal-overlay" @click.self="closeModal">
      <div class="modal-content fade-up" style="animation-duration: 0.4s;">
        <div class="flex justify-between items-start">
          <div>
            <div class="micro-cap mb-2" style="color: var(--accent-primary);">ACQUISITION TERMINAL</div>
            <h2 class="display-lg" style="font-size: 2rem;">{{ selectedBond.token }}</h2>
          </div>
          <button v-if="txStatus !== 'pending' && txStatus !== 'simulating'" class="btn-glass" style="padding: 0.5rem; border-radius: 50%;" @click="closeModal">
            <X :size="18" />
          </button>
        </div>
        
        <div v-if="txStatus === 'success'" class="fade-in">
          <div class="flex flex-col items-center text-center py-4">
            <CheckCircle2 :size="64" color="var(--accent-success)" style="margin-bottom: 1rem;" />
            <p class="body-md" style="color: var(--accent-success); font-weight: 800;">TRANSACTION CONFIRMED</p>
            <p class="micro-cap mt-4 mb-2">TX HASH</p>
            <p class="body-md" style="word-break: break-all; background: rgba(0,0,0,0.2); padding: 1rem; border-radius: 0.5rem;">
              <a :href="'https://testnet.arcscan.app/tx/' + txHash" target="_blank" style="color: var(--accent-secondary); text-decoration: none;">{{ txHash }}</a>
            </p>
            <button class="btn-primary mt-4" style="width: 100%;" @click="closeModal">CLOSE TERMINAL</button>
          </div>
        </div>
        
        <div v-else-if="txStatus === 'simulating'" class="fade-in">
          <div class="terminal-box">
            <div v-for="(step, i) in SIMULATION_STEPS" :key="i" class="micro-cap" 
                 :style="{ opacity: i <= simulationStep ? 1 : 0.3, color: i === simulationStep ? 'var(--accent-success)' : 'var(--text-muted)' }">
              > {{ step }}
              <span v-if="i === simulationStep" class="cursor">_</span>
            </div>
          </div>
        </div>

        <div v-else-if="txStatus === 'pending'" class="fade-in">
          <div class="flex flex-col items-center justify-center py-8">
            <div class="spinner mb-4"></div>
            <p class="body-md" style="font-weight: 800;">AWAITING SIGNATURE...</p>
            <p class="micro-cap text-mute mt-2 text-center">PLEASE CONFIRM THE TRANSACTION IN YOUR WEB3 WALLET TO INITIATE CCTP BRIDGE.</p>
          </div>
        </div>
        
        <div v-else class="fade-in">
          <div v-if="txStatus === 'error'" style="background: rgba(240, 113, 120, 0.1); border: 1px solid var(--accent-danger); padding: 1rem; border-radius: 0.5rem; margin-bottom: 1.5rem;">
            <p class="micro-cap" style="color: var(--accent-danger);">ERROR</p>
            <p class="body-md" style="color: var(--accent-danger); font-size: 0.875rem;">{{ txErrorMsg }}</p>
          </div>
          
          <p class="body-md text-mute" style="font-size: 0.875rem;">
            Sign an <strong>Intent</strong> to acquire this bond. Our Relayer will automatically bridge your USDC from Gateway to <strong>{{ selectedBond.chain.toUpperCase() }}</strong> via Circle CCTP, pay the gas fees, and deposit it into the Smart Contract. 1-Click Execution.
          </p>
          
          <div class="mt-4 mb-4">
            <label class="micro-cap" style="display: block; margin-bottom: 0.5rem;">QUANTITY TO ACQUIRE (USDC)</label>
            <input type="number" class="text-input" v-model="investAmount" placeholder="0.00" min="1" />
          </div>
          
          <div style="background: rgba(255,255,255,0.02); border-radius: 0.5rem; padding: 1rem; border: 1px solid var(--border-light);">
            <div class="flex justify-between mb-2">
              <span class="micro-cap">YIELD ESTIMATE</span>
              <span class="body-md" style="color: var(--accent-success); font-weight: 700; font-size: 0.875rem;">{{ selectedBond.apy }}% APY</span>
            </div>
            <div class="flex justify-between mb-2">
              <span class="micro-cap">NETWORK FEE</span>
              <span class="body-md" style="color: var(--text-muted); font-size: 0.875rem;">SPONSORED (0.00)</span>
            </div>
            <div class="flex justify-between pt-2 mt-2" style="border-top: 1px solid var(--border-light);">
              <span class="micro-cap" style="color: var(--text-main);">TOTAL COST</span>
              <span class="body-md" style="font-weight: 800;">{{ store.fmt(selectedBond.price * (parseInt(investAmount) || 0)) }}</span>
            </div>
          </div>
          
          <button class="btn-primary mt-4" style="width: 100%;" @click="confirmInvest" :disabled="!investAmount || investAmount < 1">
            SIGN CCTP INTENT (1-CLICK)
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
