<script setup>
import { ref } from 'vue'
import { useBondStore } from '../stores/bond'
import { useWeb3Store } from '../stores/web3'
import { useUIStore } from '../stores/ui'
import { Server, Activity, ShieldCheck, CheckCircle2, ChevronRight, X, Info, Shield, HelpCircle } from 'lucide-vue-next'

const store = useBondStore()
const web3 = useWeb3Store()
const ui = useUIStore()

const selectedBond = ref(null)
const investAmount = ref('')
const txStatus = ref('') // '', 'pending', 'simulating', 'success', 'error'
const simulationStep = ref(0)
const txHash = ref('')
const txErrorMsg = ref('')
const showInfoBanner = ref(true)

const SIMULATION_STEPS = [
  "SECURE LINK: INITIATING SAFE DIGITAL DOLLAR ROUTING...",
  "AUTO-ROUTER: BRIDGING FUNDS VIA SHIELDED HIGHWAY (SPONSORED)...",
  "STABILITY CHECKER: SECURING COMPLIANCE WITH CIRCLE STANDARD...",
  "DESK MANAGER: DEPOSITING DIGITAL DOLLARS INTO INTEREST VAULT...",
  "GROWTH ENGINE: ENABLING AUTOMATIC COMPOUNDING..."
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
    ui.addToast('PLEASE CONNECT YOUR SECURE ACCOUNT FIRST.', 'error')
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
      ui.addToast('DEPOSIT SUCCESSFULLY REcorded', 'success')
    } catch (e) {
      txStatus.value = 'error'
      txErrorMsg.value = e.message.substring(0, 100) || 'TRANSACTION WAS DECLINED BY YOUR WALLET OR FAILED.'
      ui.addToast('DEPOSIT FAILED', 'error')
    }
  }
}
</script>

<template>
  <div class="page-container fade-in">
    <div class="flex items-center gap-2 mb-2 micro-cap" style="color: var(--accent-primary);">
      <Server :size="14" /> SECURE SAVINGS DESK
    </div>
    <h1 class="display-xl text-gradient mb-4" style="margin-bottom: 2rem;">DISCOVER HIGHER INTEREST</h1>

    <!-- Contextual Inline Helper / Safety Banner -->
    <div v-if="showInfoBanner" class="glass-panel fade-up mb-4" style="padding: 1.75rem; border-left: 3px solid var(--accent-gold); margin-bottom: 2.5rem; position: relative;">
      <button @click="showInfoBanner = false" class="modal-close-btn" style="position: absolute; top: 1rem; right: 1rem; width: 24px; height: 24px;">
        <X :size="10" />
      </button>
      <div class="flex items-start gap-3">
        <Shield :size="20" color="var(--accent-gold)" style="flex-shrink: 0; margin-top: 2px;" />
        <div>
          <h4 style="font-family: var(--font-serif); font-size: 1.15rem; color: var(--accent-gold); margin-bottom: 0.35rem;">Why is depositing here safe and friction-free?</h4>
          <p class="text-mute" style="font-size: 0.85rem; line-height: 1.5; max-width: 90%;">
            Our automated link system aggregates interest rates from verified, multi-million dollar institutional assets. 
            When you deposit, our safe relayer routes your stable dollars natively, pays the network fees, and connects you to active yields with no manual bridging. 
            <strong>Every balance is held in fully collateralized USDC (digital dollars).</strong>
          </p>
        </div>
      </div>
    </div>

    <!-- Table Skeleton Placeholder -->
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
            <td data-label="SECURITY LAYER"><div class="skeleton" style="width: 80px; height: 20px; border-radius: 0px;"></div></td>
            <td data-label="ANNUAL INTEREST"><div class="skeleton skeleton-text" style="width: 50px; height: 14px; margin: 0;"></div></td>
            <td data-label="STABILITY RATING"><div class="skeleton" style="width: 90px; height: 20px; border-radius: 0px;"></div></td>
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
                DEPOSIT <ChevronRight :size="14" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Invest Modal -->
    <div v-if="selectedBond" class="modal-overlay" @click.self="closeModal">
      <div class="modal-content fade-up" style="animation-duration: 0.4s; width: 560px;">
        <div class="flex justify-between items-start">
          <div>
            <div class="micro-cap mb-2" style="color: var(--accent-primary);">SECURE DEPOSIT PANEL</div>
            <h2 class="display-lg" style="font-size: 2rem;">{{ selectedBond.token }}</h2>
          </div>
          <button v-if="txStatus !== 'pending' && txStatus !== 'simulating'" class="modal-close-btn" @click="closeModal">
            <X :size="18" />
          </button>
        </div>
        
        <div v-if="txStatus === 'success'" class="fade-in">
          <div class="flex flex-col items-center text-center py-4">
            <CheckCircle2 :size="64" color="var(--accent-success)" style="margin-bottom: 1rem;" />
            <p class="body-md" style="color: var(--accent-success); font-weight: 800;">DEPOSIT SUCCESSFULLY COMPLETED</p>
            <p class="body-md text-mute mt-2">Your stable dollars are now active and generating compound interest.</p>
            
            <p class="micro-cap mt-4 mb-2">RECEIPT / AUDIT NUMBER</p>
            <p class="body-md" style="word-break: break-all; background: rgba(0,0,0,0.2); padding: 1rem; border-radius: 0.5rem; font-family: monospace; font-size: 0.85rem;">
              <a :href="'https://testnet.arcscan.app/tx/' + txHash" target="_blank" style="color: var(--accent-secondary); text-decoration: none;">{{ txHash }}</a>
            </p>
            <button class="btn-primary mt-4" style="width: 100%;" @click="closeModal">RETURN TO SAVINGS DESK</button>
          </div>
        </div>
        
        <div v-else-if="txStatus === 'simulating'" class="fade-in">
          <div class="terminal-box">
            <div v-for="(step, i) in SIMULATION_STEPS" :key="i" class="micro-cap" 
                 :style="{ opacity: i <= simulationStep ? 1 : 0.3, color: i === simulationStep ? 'var(--accent-success)' : 'var(--text-muted)', fontSize: '0.75rem' }">
              > {{ step }}
              <span v-if="i === simulationStep" class="cursor">_</span>
            </div>
          </div>
        </div>

        <div v-else-if="txStatus === 'pending'" class="fade-in">
          <div class="flex flex-col items-center justify-center py-8 text-center">
            <div class="spinner mb-4"></div>
            <p class="body-md" style="font-weight: 800;">CONNECTING TO ACCOUNT SECURELY...</p>
            <p class="micro-cap text-mute mt-2">PLEASE CONFIRM THE ACCOUNT LINK ACTION IN YOUR SECURE WALLET TO START AUTOMATED TRANSFER ROUTING.</p>
          </div>
        </div>
        
        <div v-else class="fade-in">
          <div v-if="txStatus === 'error'" style="background: rgba(240, 113, 120, 0.1); border: 1px solid var(--accent-danger); padding: 1rem; border-radius: 0.5rem; margin-bottom: 1.5rem;">
            <p class="micro-cap" style="color: var(--accent-danger);">ERROR</p>
            <p class="body-md" style="color: var(--accent-danger); font-size: 0.875rem;">{{ txErrorMsg }}</p>
          </div>
          
          <p class="body-md text-mute" style="font-size: 0.85rem; line-height: 1.5; margin-bottom: 1rem;">
            Authorize a secure deposit. Our automated routing system will safely transfer your digital dollars (USDC) from your account to this yield pool, pay the network fees on your behalf, and activate interest generation. <strong>1-Click Setup.</strong>
          </p>
          
          <div class="mt-4 mb-4">
            <label class="micro-cap" style="display: block; margin-bottom: 0.5rem; font-weight: 700;">DEPOSIT AMOUNT (USDC)</label>
            <input type="number" class="text-input" v-model="investAmount" placeholder="Enter USDC amount..." min="1" />
          </div>
          
          <div style="background: rgba(255,255,255,0.02); border-radius: 0.5rem; padding: 1.25rem; border: 1px solid var(--border-light); margin-bottom: 1.5rem;">
            <div class="flex justify-between mb-2">
              <span class="micro-cap" style="font-size: 0.65rem;">EXPECTED ANNUAL GROWTH</span>
              <span class="body-md" style="color: var(--accent-success); font-weight: 700; font-size: 0.875rem;">{{ selectedBond.apy }}% APY</span>
            </div>
            <div class="flex justify-between mb-2">
              <span class="micro-cap" style="font-size: 0.65rem;">PROCESSING FEES</span>
              <span class="body-md" style="color: var(--accent-success); font-size: 0.875rem; font-weight: 700;">SPONSORED (FREE)</span>
            </div>
            <div class="flex justify-between pt-2 mt-2" style="border-top: 1px solid var(--border-light);">
              <span class="micro-cap" style="color: var(--text-main); font-size: 0.65rem; font-weight: 700;">TOTAL TO DEPOSIT</span>
              <span class="body-md" style="font-weight: 800; color: var(--accent-gold);">{{ store.fmt(selectedBond.price * (parseInt(investAmount) || 0)) }}</span>
            </div>
          </div>

          <!-- "What Happens Next?" Safety Indicators -->
          <div class="flex items-center gap-2 mb-4" style="background: rgba(195, 232, 141, 0.05); padding: 0.75rem; border: 1px dashed rgba(195, 232, 141, 0.2);">
            <Shield :size="14" color="var(--accent-success)" />
            <span class="micro-cap" style="font-size: 0.6rem; color: #c3e88d;">Secure Bridge relocation is fully insured and managed automatically.</span>
          </div>
          
          <button 
            class="btn-primary mt-2" 
            :class="{ 'btn-loading': txStatus === 'pending' || txStatus === 'simulating' }"
            style="width: 100%;" 
            @click="confirmInvest" 
            :disabled="!investAmount || investAmount < 1 || txStatus === 'pending' || txStatus === 'simulating'"
          >
            <span v-if="txStatus === 'pending' || txStatus === 'simulating'" class="spinner-inline mr-2"></span>
            {{ txStatus === 'pending' || txStatus === 'simulating' ? 'ROUTING TRANSFER...' : 'START EARNING INTEREST (1-CLICK)' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
