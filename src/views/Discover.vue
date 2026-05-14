<script setup>
import { ref } from 'vue'
import { useBondStore } from '../stores/bond'
import { useWeb3Store } from '../stores/web3'
import { useUIStore } from '../stores/ui'

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
  "BURNING USDC ON ORIGIN CHAIN...",
  "WAITING FOR CIRCLE ATTESTATION...",
  "MINTING USDC ON DESTINATION CHAIN...",
  "EXECUTING SMART CONTRACT..."
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
    await new Promise(r => setTimeout(r, 1200)) // 1.2s per step
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
      const hash = await web3.sendInvestmentTx(selectedBond.value.id, qty)
      
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
    <div class="micro-cap text-mute mb-2" v-once>MARKETPLACE</div>
    <h1 class="display-xl mb-4" style="margin-bottom: 48px;" v-once>DISCOVER BONDS</h1>

    <div v-if="store.isLoading" class="body-md">ACQUIRING TELEMETRY...</div>
    
    <table v-else class="data-table">
      <thead v-once>
        <tr>
          <th>ASSET</th>
          <th>ISSUER</th>
          <th>NETWORK</th>
          <th>YIELD (APY)</th>
          <th>RISK</th>
          <th>ACTION</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="b in store.marketBonds" :key="b.id">
          <td data-label="ASSET" style="font-weight: 700;">{{ b.token }}</td>
          <td data-label="ISSUER" class="text-mute">{{ b.issuer }}</td>
          <td data-label="NETWORK">{{ b.chain.toUpperCase() }}</td>
          <td data-label="YIELD">{{ b.apy }}%</td>
          <td data-label="RISK" :style="{ color: b.risk === 'Low' ? '#ffffff' : b.risk === 'Medium' ? 'var(--on-primary-mute)' : '#5a5a5f' }">{{ b.risk.toUpperCase() }}</td>
          <td data-label="ACTION">
            <button class="btn-ghost" style="padding: 8px 16px; font-size: 10px;" @click="openInvestModal(b)">INVEST</button>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- Invest Modal -->
    <div v-if="selectedBond" class="modal-overlay" @click.self="closeModal">
      <div class="modal-content fade-in">
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div>
            <div class="micro-cap text-mute">ACQUISITION TERMINAL</div>
            <h2 class="display-lg">{{ selectedBond.token }}</h2>
          </div>
          <button v-if="txStatus !== 'pending' && txStatus !== 'simulating'" style="background: none; border: none; color: var(--on-primary); cursor: pointer; font-size: 24px;" @click="closeModal">✕</button>
        </div>
        
        <div v-if="txStatus === 'success'">
          <div style="color: #c3e88d; font-size: 48px; margin-bottom: 16px;">✓</div>
          <p class="body-md" style="color: #c3e88d; font-weight: 700;">TRANSACTION CONFIRMED</p>
          <p class="micro-cap text-mute mt-4">TX HASH</p>
          <p class="body-md" style="word-break: break-all;">
            <a :href="'https://sepolia.etherscan.io/tx/' + txHash" target="_blank" style="color: var(--on-primary);">{{ txHash }}</a>
          </p>
          <button class="btn-ghost mt-4" style="width: 100%;" @click="closeModal">CLOSE TERMINAL</button>
        </div>
        
        <div v-else-if="txStatus === 'simulating'">
          <div class="terminal-box">
            <div v-for="(step, i) in SIMULATION_STEPS" :key="i" class="micro-cap" :style="{ opacity: i <= simulationStep ? 1 : 0.3, color: i === simulationStep ? '#c3e88d' : 'var(--on-primary)' }">
              > {{ step }}
              <span v-if="i === simulationStep" class="cursor">_</span>
            </div>
          </div>
        </div>

        <div v-else-if="txStatus === 'pending'">
          <div class="spinner" style="margin: 24px 0;"></div>
          <p class="body-md" style="font-weight: 700;">AWAITING NETWORK CONFIRMATION...</p>
          <p class="micro-cap text-mute mt-4">PLEASE SIGN THE TRANSACTION IN YOUR WALLET</p>
        </div>
        
        <div v-else>
          <div v-if="txStatus === 'error'" style="background: rgba(240, 113, 120, 0.1); border: 1px solid #f07178; padding: 16px; margin-bottom: 24px;">
            <p class="micro-cap" style="color: #f07178;">ERROR</p>
            <p class="body-md" style="color: #f07178;">{{ txErrorMsg }}</p>
          </div>
          
          <p class="body-md text-mute">USDC will be automatically bridged from your Gateway balance to {{ selectedBond.chain.toUpperCase() }} via Circle CCTP.</p>
          
          <div class="mt-4">
            <label class="micro-cap text-mute" style="display: block; margin-bottom: 8px;">QUANTITY TO ACQUIRE (USDC)</label>
            <input type="number" class="text-input" v-model="investAmount" placeholder="0.00" min="1" />
          </div>
          
          <div style="border-top: 1px solid var(--hairline-on-dark); padding-top: 24px; margin-top: 24px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;" class="body-md text-mute">
              <span>YIELD ESTIMATE</span><span>{{ selectedBond.apy }}% APY</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 24px;" class="body-md text-mute">
              <span>NETWORK FEE</span><span>SPONSORED (0.00)</span>
            </div>
            <div style="display: flex; justify-content: space-between;" class="body-md">
              <span style="font-weight: 700;">TOTAL COST</span>
              <span style="font-weight: 700;">{{ store.fmt(selectedBond.price * (parseInt(investAmount) || 0)) }}</span>
            </div>
          </div>
          
          <button class="btn-ghost" style="width: 100%; margin-top: 16px;" @click="confirmInvest" :disabled="!investAmount || investAmount < 1">AUTHORIZE TRANSACTION</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  border-top-color: var(--on-primary);
  animation: spin 1s ease-in-out infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}

.terminal-box {
  background: #000;
  border: 1px solid var(--hairline-on-dark);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 24px 0;
}
.cursor {
  animation: blink 1s step-end infinite;
}
@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}
</style>
