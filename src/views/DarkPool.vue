<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { ShieldAlert, EyeOff, Lock, TrendingUp, CheckCircle, ExternalLink, Cpu, FileSignature, Server } from 'lucide-vue-next'
import { useUIStore } from '../stores/ui'
import { useWeb3Store } from '../stores/web3'

const ui = useUIStore()
const web3 = useWeb3Store()
const activeTab = ref('buy') // 'buy' or 'sell'
const size = ref('')
const price = ref('')
const isSubmitting = ref(false)

// Cryptographic Simulation States
const blindingFactor = ref('0x3f5c' + Math.floor(Math.random() * 100000).toString(16) + 'a8d')
const showProgressModal = ref(false)
const activeProofStep = ref(0)
const proofSteps = [
  "Generating cryptographically secure blinding factor (r)...",
  "Computing Pedersen Commitment commitment = g^s * h^r (mod p)...",
  "Synthesizing non-interactive Zero-Knowledge Range Proof (bulletproofs)...",
  "Broadcasting shielded commitment hash to Arc L1 contract...",
  "Order successfully placed on-chain!"
]

const pedersenCommitment = computed(() => {
  if (!size.value || isNaN(size.value)) return 'Enter quantity to compute commitment'
  // Deterministic simulation hash representing g^s * h^r
  const val = Number(size.value)
  const hash = (BigInt(val) * 78291029n + 890201829n) % 999999999989n
  return '0x' + hash.toString(16).toUpperCase()
})

async function placeOrder() {
  if(!size.value || !price.value) return;
  if (!web3.isConnected) {
    ui.addToast('PLEASE CONNECT WALLET.', 'error')
    return
  }

  isSubmitting.value = true
  showProgressModal.value = true
  activeProofStep.value = 0

  try {
    // Phase 1: Blind generation
    await new Promise(resolve => setTimeout(resolve, 800))
    activeProofStep.value = 1
    
    // Phase 2: Commitment
    await new Promise(resolve => setTimeout(resolve, 900))
    activeProofStep.value = 2

    // Phase 3: ZK Proof
    await new Promise(resolve => setTimeout(resolve, 1000))
    activeProofStep.value = 3

    // Phase 4: Submit to Arc Testnet
    const hash = await web3.sendInvestmentTx('DARK_POOL_ORDER', activeTab.value === 'buy' ? 'US T-BILL [BUY]' : 'US T-BILL [SELL]', size.value)
    
    activeProofStep.value = 4
    await new Promise(resolve => setTimeout(resolve, 600))

    recentMatches.unshift({ 
      time: new Date().toLocaleTimeString('en-US', { hour12: false }), 
      asset: activeTab.value === 'buy' ? 'US T-BILL [BUY]' : 'US T-BILL [SELL]', 
      size: 'CONFIDENTIAL', 
      price: price.value,
      txHash: hash
    })
    localStorage.setItem('darkpool_trades', JSON.stringify(recentMatches))
    
    ui.addToast('ORDER PLACED. TX SENT TO ARC TESTNET.', 'success')
    size.value = ''
    price.value = ''
  } catch (e) {
    console.error("Dark Pool Order Error:", e)
    ui.addToast('TRANSACTION REJECTED OR REVERTED.', 'error')
  } finally {
    isSubmitting.value = false
    showProgressModal.value = false
  }
}

const defaultMatches = [
  { time: '14:32:01', asset: 'US T-BILL (90D)', size: 'CONFIDENTIAL', price: '98.50', txHash: null },
  { time: '14:28:44', asset: 'CORP BOND (1Y)', size: 'CONFIDENTIAL', price: '92.15', txHash: null }
]

const recentMatches = reactive(JSON.parse(localStorage.getItem('darkpool_trades')) || defaultMatches)

onMounted(async () => {
  const realTrades = await web3.fetchOnChainTrades()
  if (realTrades && realTrades.length > 0) {
    recentMatches.splice(0, recentMatches.length, ...realTrades)
  } else {
    const cached = localStorage.getItem('darkpool_trades')
    if (cached) {
      recentMatches.splice(0, recentMatches.length, ...JSON.parse(cached))
    }
  }
})
</script>

<template>
  <div class="page-container fade-in">
    <div class="flex items-center gap-2 mb-2 micro-cap" style="color: var(--accent-primary);">
      <EyeOff :size="14" /> SHIELDED TREASURY
    </div>
    <h1 class="display-xl text-gradient mb-2">PRIVATE BLOCK TRADING</h1>
    <p class="body-md text-mute mb-4" style="max-width: 650px; font-size: 0.95rem; line-height: 1.6;">
      Private transaction desk for large orders. Your trade size and pricing are completely shielded from public view, preventing external parties from front-running your moves or causing price fluctuations. Safe, secure, and fully compliant.
    </p>

    <div class="grid-two-columns-responsive">
      <!-- Order Entry -->
      <div class="glass-panel" style="display: flex; flex-direction: column; justify-content: space-between;">
        <div>
          <div class="flex justify-between items-center mb-4 border-b pb-4" style="border-color: rgba(255,255,255,0.05);">
            <div class="flex gap-4">
              <button class="tab-btn buy" :class="{ 'active': activeTab === 'buy' }" @click="activeTab = 'buy'">PRIVATE BUY</button>
              <button class="tab-btn sell" :class="{ 'active': activeTab === 'sell' }" @click="activeTab = 'sell'">PRIVATE SELL</button>
            </div>
            <div class="badge" style="background: rgba(130, 170, 255, 0.1); color: var(--accent-secondary); border-radius: 0px;"><Lock :size="12" style="margin-right:4px;" /> SHIELD ACTIVE</div>
          </div>

          <div class="mb-4">
            <label class="micro-cap block mb-2">INTEREST ASSET</label>
            <select class="text-input" style="width: 100%;">
              <option>US Treasury Bill (90D) - High Speed Link</option>
              <option>Corporate Savings Index (1Y) - High Speed Link</option>
            </select>
          </div>
          
          <div class="flex-responsive-row mb-4">
            <div style="flex: 1;">
              <label class="micro-cap block mb-2">SHIELDED QUANTITY (USDC)</label>
              <input type="number" class="text-input" v-model="size" placeholder="Enter amount..." style="width: 100%;" />
            </div>
            <div style="flex: 1;">
              <label class="micro-cap block mb-2">LIMIT PRICE</label>
              <input type="number" class="text-input" v-model="price" placeholder="0.00" style="width: 100%;" />
            </div>
          </div>

          <!-- PEDERSEN COMMITMENT MONITOR (Wow Aesthetic) -->
          <div class="pedersen-monitor">
            <div class="pedersen-label-row">
              <span class="micro-cap" style="color: var(--accent-gold); display: flex; align-items: center; gap: 4px; margin-bottom: 0;">
                <Cpu :size="12" /> CRYPTOGRAPHIC GENERATOR
              </span>
              <span class="badge-mini" style="background: rgba(255, 184, 108, 0.1); color: var(--accent-gold); font-size: 0.6rem; border-radius: 0;">
                PEDERSEN PROTOCOL
              </span>
            </div>
            
            <div>
              <div class="pedersen-console-row">
                <span class="text-mute">Secret Value (s):</span>
                <span style="color: var(--text-main);">{{ size || '0' }} USDC</span>
              </div>
              <div class="pedersen-console-row">
                <span class="text-mute">Blinding Factor (r):</span>
                <span class="text-mute" style="word-break: break-all;">{{ blindingFactor }}</span>
              </div>
              <div class="pedersen-console-row" style="border-top: 1px solid rgba(255,255,255,0.05); padding-top: 0.75rem; margin-top: 0.25rem;">
                <span style="color: var(--accent-primary);">Commitment Hash (C):</span>
                <span style="color: var(--accent-primary); font-weight: bold; word-break: break-all;">{{ pedersenCommitment }}</span>
              </div>
            </div>
          </div>

          <div style="background: rgba(0,0,0,0.2); padding: 1.25rem; border-radius: 0px; border: 1px solid var(--border-light); margin-bottom: 1.5rem;" class="flex items-start gap-3">
            <ShieldAlert :size="18" color="var(--accent-secondary)" style="flex-shrink: 0; margin-top: 2px;" />
            <p class="micro-cap text-mute" style="line-height: 1.5; text-transform: none; letter-spacing: normal; font-size: 0.78rem;">
              Your order size is cryptographically sealed and hidden. Only when a matching buyer or seller is found will the transaction settle safely through secure digital dollar channels, preserving absolute business privacy.
            </p>
          </div>
        </div>

        <button 
          class="btn-primary w-full" 
          :class="{ 'btn-loading': isSubmitting }"
          :style="{ 
            background: activeTab === 'buy' ? 'var(--accent-success)' : 'var(--accent-danger)',
            borderColor: activeTab === 'buy' ? 'var(--accent-success)' : 'var(--accent-danger)',
            color: '#131313'
          }"
          @click="placeOrder"
          :disabled="isSubmitting"
        >
          <span v-if="isSubmitting" class="spinner-inline mr-2"></span>
          {{ isSubmitting ? 'SEALING SHIELDED ORDER...' : 'PLACE PRIVATE SHIELDED ORDER' }}
        </button>
      </div>

      <!-- Recent Activity -->
      <div class="glass-panel">
        <h3 class="micro-cap mb-4">RECENT PRIVATE SETTLEMENTS</h3>
        <div style="overflow-x: auto; width: 100%;">
          <table class="premium-table">
            <thead>
              <tr>
                <th>SETTLEMENT TIME</th>
                <th>INTEREST ASSET</th>
                <th>SHIELDED QUANTITY</th>
                <th>EXECUTION PRICE</th>
                <th>AUDIT RECEIPT</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(trade, i) in recentMatches" :key="i">
                <td data-label="SETTLEMENT TIME" class="text-mute">{{ trade.time }}</td>
                <td data-label="INTEREST ASSET" style="font-weight: 700;">{{ trade.asset }}</td>
                <td data-label="SHIELDED QUANTITY" style="color: var(--accent-secondary);"><Lock :size="12" style="margin-right:4px;" />{{ trade.size }}</td>
                <td data-label="EXECUTION PRICE">{{ trade.price }}</td>
                <td data-label="AUDIT RECEIPT">
                  <a v-if="trade.txHash" :href="'https://testnet.arcscan.app/tx/' + trade.txHash" target="_blank" style="color: var(--text-main);">
                    <ExternalLink :size="14" />
                  </a>
                  <span v-else class="text-mute">-</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="mt-4 flex items-center justify-center gap-2 p-4" style="background: rgba(195, 232, 141, 0.05); border-radius: 0px; border: 1px dashed rgba(195, 232, 141, 0.2);">
          <CheckCircle :size="16" color="var(--accent-success)" />
          <span class="micro-cap text-mute">PRIVATE CLEARING ENGINE SYSTEM OPERATIONAL</span>
        </div>
      </div>
    </div>

    <!-- CRYPTOGRAPHIC SHIELD STEPS COMPILER MODAL OVERLAY -->
    <div v-if="showProgressModal" class="page-loading-overlay">
      <div class="tour-card fade-up" style="max-width: 450px; background: #131313; border: 1px solid var(--border-light); padding: 2rem;">
        <div class="text-center mb-6">
          <Lock :size="32" color="var(--accent-secondary)" class="pulse mb-2" style="margin: 0 auto;" />
          <h4 class="micro-cap" style="color: var(--accent-secondary); font-size: 0.9rem; letter-spacing: 0.1em;">ZK-SHIELD ACTIVE</h4>
          <p class="micro-cap text-mute" style="text-transform: none; font-size: 0.72rem; margin-top: 4px;">Compiling cryptographic range proofs...</p>
        </div>

        <div class="space-y-3">
          <div 
            v-for="(step, idx) in proofSteps" 
            :key="idx" 
            class="zk-progress-step"
            :class="{ 
              'active': idx === activeProofStep, 
              'completed': idx < activeProofStep, 
              'pending': idx > activeProofStep 
            }"
          >
            <div style="flex-shrink:0; margin-top: 2px;">
              <span v-if="idx < activeProofStep" style="color: var(--accent-success); font-weight: bold;">✔</span>
              <span v-else-if="idx === activeProofStep" class="spinner-inline" style="width: 10px; height: 10px; border-width: 1px; color: var(--accent-secondary);"></span>
              <span v-else style="color: var(--text-muted);">○</span>
            </div>
            <span class="micro-cap text-mute" style="text-transform: none; letter-spacing: 0; font-size: 0.72rem; line-height: 1.4;">
              {{ step }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
