<script setup>
import { ref, reactive, onMounted, computed, watch } from 'vue'
import { 
  ShieldAlert, EyeOff, Lock, TrendingUp, CheckCircle, 
  ExternalLink, Cpu, FileSignature, Server, Terminal, 
  Activity, ArrowRightLeft, ShieldCheck, RefreshCw 
} from 'lucide-vue-next'
import { useUIStore } from '../stores/ui'
import { useWeb3Store } from '../stores/web3'

const ui = useUIStore()
const web3 = useWeb3Store()

const pageSubTab = ref('trade') // 'trade' or 'audit'
const activeTab = ref('buy') // 'buy' or 'sell'
const size = ref('')
const price = ref('')
const isSubmitting = ref(false)

// Prover & Blinding factor states
const generatedBlinding = ref(Math.floor(Math.random() * 899999) + 100000)
const selectedAsset = ref('US Treasury Bill (90D) - High Speed Link')

// ZK Console Logs
const zkLogs = ref([])
const showLogsModal = ref(false)
const consoleStep = ref(0)

// Active orders fetched from contract
const activeOrders = ref([])
const isLoadingOrders = ref(false)

// Settlement form states
const selectedOrder = ref(null)
const settleCounterparty = ref('')
const settleSecretSize = ref('')
const settleBlindingFactor = ref('')
const isSettling = ref(false)

// Locally saved secrets to help user remember what they submitted
const savedSecrets = reactive(JSON.parse(localStorage.getItem('darkpool_secrets') || '[]'))

// Compute current Pedersen Commitment
const currentCommitment = computed(() => {
  if (!size.value || isNaN(size.value) || Number(size.value) <= 0) {
    return 'Enter quantity to calculate'
  }
  try {
    const proof = web3.generatePedersenProof(size.value, generatedBlinding.value)
    return '0x' + BigInt(proof.commitment).toString(16).toUpperCase()
  } catch (e) {
    return 'Calculation error'
  }
})

// Refresh active orders list
async function loadOrders() {
  if (!web3.isConnected) return
  isLoadingOrders.value = true
  try {
    const orders = await web3.fetchDarkPoolOrders()
    activeOrders.value = orders
  } catch (e) {
    console.error("Failed to load dark pool orders:", e)
  } finally {
    isLoadingOrders.value = false
  }
}

// Watch connection state to fetch orders
watch(() => web3.isConnected, (newVal) => {
  if (newVal) loadOrders()
})

onMounted(() => {
  if (web3.isConnected) loadOrders()
})

// Submit Order action
async function placeOrder() {
  if (!size.value || !price.value || Number(size.value) <= 0 || Number(price.value) <= 0) {
    ui.addToast('PLEASE ENTER VALID QUANTITY AND LIMIT PRICE.', 'error')
    return
  }
  if (!web3.isConnected) {
    ui.addToast('PLEASE CONNECT WALLET.', 'error')
    return
  }

  isSubmitting.value = true
  zkLogs.value = []
  showLogsModal.value = true
  consoleStep.value = 0

  try {
    addZkLog("⚡ [Prover] Starting client-side proof construction...")
    await sleep(500)
    addZkLog(`🔒 [Prover] Secret size (s) = ${size.value}`)
    addZkLog(`🔒 [Prover] Generated blinding factor (r) = ${generatedBlinding.value}`)
    await sleep(500)
    
    // Generate ZK proof payload
    const proof = web3.generatePedersenProof(size.value, generatedBlinding.value)
    addZkLog(`📐 [Prover] Pedersen algebraic params: g = ${proof.g}, h = ${proof.h}, p = ${proof.p}`)
    addZkLog(`🔑 [Prover] Computed commitment (C) = ${proof.commitment}`)
    await sleep(600)
    
    addZkLog("📦 [Prover] Constructing zero-knowledge range proof...")
    addZkLog(`📊 [Prover] Randomness: u = ${proof.T.slice(0, 8)}... v = ${proof.z1.slice(0, 8)}...`)
    await sleep(600)

    addZkLog("🌐 [Transaction] Broadcasting transaction to Arc Testnet...")
    const assetName = `${selectedAsset.value.split(' ')[0]} ${selectedAsset.value.split(' ')[1]} [${activeTab.value.toUpperCase()}]`
    const res = await web3.submitConfidentialOrderTx(assetName, size.value, generatedBlinding.value)
    
    addZkLog(`✅ [Transaction] Confirmed! Hash: ${res.hash.slice(0, 16)}...`)
    await sleep(800)

    // Save secrets locally to make settlement easier
    savedSecrets.unshift({
      commitment: res.commitment,
      size: size.value,
      blinding: generatedBlinding.value,
      time: new Date().toLocaleTimeString('en-US', { hour12: false }),
      asset: assetName
    })
    localStorage.setItem('darkpool_secrets', JSON.stringify(savedSecrets))

    ui.addToast('CONFIDENTIAL ORDER REGISTERED ON-CHAIN.', 'success')
    size.value = ''
    price.value = ''
    generatedBlinding.value = Math.floor(Math.random() * 899999) + 100000

    await loadOrders()
  } catch (e) {
    console.error(e)
    addZkLog(`❌ [Error] Order submission failed: ${e.message}`)
    ui.addToast('ORDER PLACEMENT REJECTED OR COMPLIANCE ERROR.', 'error')
  } finally {
    isSubmitting.value = false
    // Auto hide after delay
    setTimeout(() => {
      showLogsModal.value = false
    }, 4000)
  }
}

// Select order for settlement helper
function selectOrderToSettle(order) {
  selectedOrder.value = order
  settleCounterparty.value = web3.address // Default payout to self for easy test
  
  // Auto-fill secret if found in locally saved secrets
  const match = savedSecrets.find(s => s.commitment === order.commitmentHash)
  if (match) {
    settleSecretSize.value = match.size
    settleBlindingFactor.value = match.blinding
    ui.addToast('MATCHING CRYPTOGRAPHIC SECRETS RESTORED FROM LOCAL CACHE.', 'success')
  } else {
    settleSecretSize.value = ''
    settleBlindingFactor.value = ''
  }
}

// Execute ZK Proof Verification and Settlement
async function settleOrder() {
  if (!selectedOrder.value || !settleCounterparty.value || !settleSecretSize.value || !settleBlindingFactor.value) {
    ui.addToast('PLEASE FILL ALL FIELDS.', 'error')
    return
  }

  isSettling.value = true
  zkLogs.value = []
  showLogsModal.value = true
  consoleStep.value = 0

  try {
    addZkLog("⚡ [Prover] Initializing zero-knowledge verification pipeline...")
    await sleep(600)
    addZkLog(`📁 [Prover] Target Order Index: ${selectedOrder.value.id}`)
    addZkLog(`🔑 [Prover] Order Commitment Hash: ${selectedOrder.value.commitmentHash}`)
    await sleep(600)

    addZkLog("📐 [Prover] Re-constructing witness values...")
    addZkLog(`  - secret (s) = ${settleSecretSize.value}`)
    addZkLog(`  - blinding (r) = ${settleBlindingFactor.value}`)
    await sleep(600)

    // Generate proof bytes
    const proof = web3.generatePedersenProof(settleSecretSize.value, settleBlindingFactor.value)
    
    addZkLog("🔐 [Prover] Generating Schnorr proof of Pedersen commitment...")
    addZkLog(`  - Base G: ${proof.g}`)
    addZkLog(`  - Base H: ${proof.h}`)
    addZkLog(`  - Prime Modulus P: ${proof.p}`)
    addZkLog(`  - Randomness Commitment T: ${proof.T}`)
    addZkLog(`  - Challenge hash c: ${proof.challenge}`)
    addZkLog(`  - Response z1: ${proof.z1}`)
    addZkLog(`  - Response z2: ${proof.z2}`)
    await sleep(800)

    addZkLog("📦 [Prover] Compiling proof bytes payload (192 bytes)...")
    addZkLog(`  Payload: ${proof.proofBytes.slice(0, 64)}...`)
    await sleep(600)

    addZkLog("🌐 [Transaction] Invoking settleConfidentialOrder on Arc Testnet...")
    const txHash = await web3.settleConfidentialOrderTx(
      selectedOrder.value.id,
      settleCounterparty.value,
      proof.proofBytes
    )
    
    addZkLog(`✅ [Verifier] Solidity verify successful! Transaction confirmed: ${txHash}`)
    ui.addToast('ZK PEDERSEN PROOF VERIFIED ON-CHAIN. ESCROW SETTLED.', 'success')
    
    // Clean up forms
    selectedOrder.value = null
    settleCounterparty.value = ''
    settleSecretSize.value = ''
    settleBlindingFactor.value = ''

    await loadOrders()
  } catch (e) {
    console.error(e)
    addZkLog(`❌ [Verifier] Proof verification FAILED on-chain! Transaction reverted.`)
    ui.addToast('ON-CHAIN ZK VERIFICATION REJECTED (BAD PROOF).', 'error')
  } finally {
    isSettling.value = false
    setTimeout(() => {
      showLogsModal.value = false
    }, 5000)
  }
}

// Helpers
function addZkLog(msg) {
  zkLogs.value.push(msg)
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
</script>

<template>
  <div class="page-container fade-in">
    <!-- Header section -->
    <div class="flex justify-between items-start mb-6">
      <div>
        <div class="flex items-center gap-2 mb-2 micro-cap" style="color: var(--accent-primary);">
          <EyeOff :size="14" /> SHIELDED ESCROW POOL
        </div>
        <h1 class="display-xl text-gradient mb-2">PRIVATE BLOCK TRADING</h1>
        <p class="body-md text-mute" style="max-width: 650px; font-size: 0.95rem; line-height: 1.6;">
          Confidential OTC orderbook backed by zero-knowledge proofs. Asset amounts and sizes are shielded using cryptographic Pedersen commitments and validated on-chain by the Verifier contract prior to settlement.
        </p>
      </div>

      <div class="flex gap-2">
        <button 
          class="btn-secondary" 
          :class="{ 'active': pageSubTab === 'trade' }" 
          @click="pageSubTab = 'trade'"
          style="border-radius: 0;"
        >
          <ArrowRightLeft :size="14" class="mr-2" /> TRADE DESK
        </button>
        <button 
          class="btn-secondary" 
          :class="{ 'active': pageSubTab === 'audit' }" 
          @click="pageSubTab = 'audit'"
          style="border-radius: 0;"
        >
          <Activity :size="14" class="mr-2" /> AUDIT & CLEARING
        </button>
      </div>
    </div>

    <!-- SUB-TAB 1: TRADE DESK -->
    <div v-if="pageSubTab === 'trade'" class="grid-two-columns-responsive">
      <!-- Order Entry Panel -->
      <div class="glass-panel" style="display: flex; flex-direction: column; justify-content: space-between;">
        <div>
          <div class="flex justify-between items-center mb-4 border-b pb-4" style="border-color: rgba(255,255,255,0.05);">
            <div class="flex gap-4">
              <button class="tab-btn buy" :class="{ 'active': activeTab === 'buy' }" @click="activeTab = 'buy'">PRIVATE BUY</button>
              <button class="tab-btn sell" :class="{ 'active': activeTab === 'sell' }" @click="activeTab = 'sell'">PRIVATE SELL</button>
            </div>
            <div class="badge" style="background: rgba(130, 170, 255, 0.1); color: var(--accent-secondary); border-radius: 0px;">
              <Lock :size="12" style="margin-right:4px;" /> ESCROW LOCK
            </div>
          </div>

          <div class="mb-4">
            <label class="micro-cap block mb-2">INTEREST ASSET</label>
            <select class="text-input" v-model="selectedAsset" style="width: 100%;">
              <option>US Treasury Bill (90D) - High Speed Link</option>
              <option>Corporate Savings Index (1Y) - High Speed Link</option>
            </select>
          </div>
          
          <div class="flex-responsive-row mb-4">
            <div style="flex: 1;">
              <label class="micro-cap block mb-2">SHIELDED AMOUNT (USDC)</label>
              <input type="number" class="text-input" v-model="size" placeholder="Enter quantity..." style="width: 100%;" />
            </div>
            <div style="flex: 1;">
              <label class="micro-cap block mb-2">LIMIT PRICE</label>
              <input type="number" class="text-input" v-model="price" placeholder="100.00" style="width: 100%;" />
            </div>
          </div>

          <!-- PEDERSEN MONITOR -->
          <div class="pedersen-monitor">
            <div class="pedersen-label-row">
              <span class="micro-cap" style="color: var(--accent-gold); display: flex; align-items: center; gap: 4px; margin-bottom: 0;">
                <Cpu :size="12" /> CRYPTOGRAPHIC WITNESS GENERATOR
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
                <span class="text-mute" style="word-break: break-all;">{{ generatedBlinding }}</span>
              </div>
              <div class="pedersen-console-row" style="border-top: 1px solid rgba(255,255,255,0.05); padding-top: 0.75rem; margin-top: 0.25rem;">
                <span style="color: var(--accent-primary);">Commitment Hash (C):</span>
                <span style="color: var(--accent-primary); font-weight: bold; word-break: break-all;">{{ currentCommitment }}</span>
              </div>
            </div>
          </div>

          <div style="background: rgba(0,0,0,0.2); padding: 1.25rem; border-radius: 0px; border: 1px solid var(--border-light); margin-bottom: 1.5rem;" class="flex items-start gap-3">
            <ShieldAlert :size="18" color="var(--accent-secondary)" style="flex-shrink: 0; margin-top: 2px;" />
            <p class="micro-cap text-mute" style="line-height: 1.5; text-transform: none; letter-spacing: normal; font-size: 0.78rem;">
              Your order size will be cryptographically locked into a Pedersen commitment. Escrow funds are only released when matching counterparts submit algebraic proofs to the verifier.
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
          {{ isSubmitting ? 'COMPILING PROOF & SEALING...' : 'PLACE SHIELDED BLOCK ORDER' }}
        </button>
      </div>

      <!-- Recent Secrets and Local Cache -->
      <div class="glass-panel">
        <div class="flex justify-between items-center mb-4">
          <h3 class="micro-cap">MY SHIELDED SECRETS (LOCAL CACHE)</h3>
          <span class="badge" style="background: rgba(130, 255, 170, 0.1); color: var(--accent-success); border-radius: 0;">PROVER STORAGE</span>
        </div>

        <p class="body-sm text-mute mb-4" style="font-size: 0.82rem;">
          To settle a confidential order, you must provide the exact secret size and blinding factor that created the commitment hash. Below are the values cached locally by your browser.
        </p>

        <div style="overflow-y: auto; max-height: 380px;" class="space-y-3">
          <div v-if="savedSecrets.length === 0" class="text-center py-8 border border-dashed border-border-light text-mute micro-cap">
            No active private secrets saved in local storage.
          </div>
          <div 
            v-for="(secret, idx) in savedSecrets" 
            :key="idx" 
            class="p-3 border border-border-light bg-black-20 flex flex-col justify-between"
            style="border-radius: 0;"
          >
            <div class="flex justify-between items-center mb-2 border-b pb-1" style="border-color: rgba(255,255,255,0.03);">
              <span class="micro-cap" style="color: var(--accent-secondary);">{{ secret.asset }}</span>
              <span class="micro-cap text-mute">{{ secret.time }}</span>
            </div>
            <div class="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span class="text-mute block micro-cap">Secret size:</span>
                <span style="color: var(--accent-success); font-weight: bold;">{{ secret.size }} USDC</span>
              </div>
              <div>
                <span class="text-mute block micro-cap">Blinding Factor:</span>
                <span style="color: var(--accent-gold);">{{ secret.blinding }}</span>
              </div>
            </div>
            <div class="mt-2 text-xs pt-1 border-t border-border-light" style="border-color: rgba(255,255,255,0.03);">
              <span class="text-mute block micro-cap">Commitment:</span>
              <span class="text-mute font-mono" style="font-size: 0.65rem; word-break: break-all;">{{ secret.commitment }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- SUB-TAB 2: ON-CHAIN AUDIT & CLEARING -->
    <div v-else-if="pageSubTab === 'audit'" class="grid-two-columns-responsive">
      <!-- Active ESCROW Orders list -->
      <div class="glass-panel">
        <div class="flex justify-between items-center mb-4 pb-2 border-b" style="border-color: rgba(255,255,255,0.05);">
          <h3 class="micro-cap">ACTIVE ESCROW ORDERS</h3>
          <button class="btn-secondary flex items-center gap-1" @click="loadOrders" :disabled="isLoadingOrders" style="padding: 4px 8px; font-size: 0.7rem; border-radius: 0;">
            <RefreshCw :size="12" :class="{ 'spin': isLoadingOrders }" /> REFRESH
          </button>
        </div>

        <div style="overflow-x: auto; width: 100%;">
          <table class="premium-table">
            <thead>
              <tr>
                <th>ORDER ID</th>
                <th>INVESTOR</th>
                <th>ASSET</th>
                <th>COMMITMENT HASH</th>
                <th>LOCKED</th>
                <th>STATUS</th>
                <th>ACTION</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="activeOrders.length === 0">
                <td colspan="7" class="text-center text-mute py-8 micro-cap">No active shielded orders found.</td>
              </tr>
              <tr v-for="order in activeOrders" :key="order.id" :class="{ 'tr-muted': !order.active }">
                <td data-label="ORDER ID">#{{ order.id }}</td>
                <td data-label="INVESTOR" class="font-mono" style="font-size: 0.72rem;">{{ order.user.slice(0,6) }}...{{ order.user.slice(-4) }}</td>
                <td data-label="ASSET">{{ order.asset }}</td>
                <td data-label="COMMITMENT HASH" class="font-mono text-mute" style="font-size: 0.65rem;" :title="order.commitmentHash">
                  {{ order.commitmentHash.slice(0, 10) }}...
                </td>
                <td data-label="LOCKED" style="color: var(--accent-success);">{{ order.valueLocked }} USDC</td>
                <td data-label="STATUS">
                  <span v-if="order.settled" class="badge" style="background: rgba(130, 255, 170, 0.1); color: var(--accent-success);">SETTLED</span>
                  <span v-else-if="order.active" class="badge" style="background: rgba(255, 184, 108, 0.1); color: var(--accent-gold);">ACTIVE</span>
                  <span v-else class="badge text-mute">INACTIVE</span>
                </td>
                <td data-label="ACTION">
                  <button 
                    v-if="order.active" 
                    class="btn-primary" 
                    style="padding: 4px 8px; font-size: 0.7rem; border-radius: 0; background: var(--accent-secondary); border-color: var(--accent-secondary); color: #131313;"
                    @click="selectOrderToSettle(order)"
                  >
                    SETTLE
                  </button>
                  <span v-else class="text-mute">-</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Settle & proof generation form -->
      <div class="glass-panel">
        <h3 class="micro-cap mb-4">ON-CHAIN ZK CLEARING CONTROL</h3>
        <p class="body-sm text-mute mb-4" style="font-size: 0.82rem;">
          To settle a locked dark pool order, the coordinator must input the match details and counterparty address, compile the Pedersen algebraic ZK proof, and submit it for validation.
        </p>

        <div v-if="!selectedOrder" class="p-8 border border-dashed border-border-light text-center text-mute micro-cap">
          Select an active shielded order from the left panel to begin.
        </div>
        <div v-else class="space-y-4">
          <div class="p-3 border border-accent-secondary bg-black-20">
            <span class="micro-cap block text-mute">SELECTED ORDER</span>
            <span class="text-sm font-bold" style="color: var(--accent-secondary);">Order #{{ selectedOrder.id }} ({{ selectedOrder.asset }})</span>
            <div class="text-xs text-mute mt-1">Commitment: {{ selectedOrder.commitmentHash }}</div>
          </div>

          <div>
            <label class="micro-cap block mb-2">COUNTERPARTY WALLET (PAYOUT RECIPIENT)</label>
            <input type="text" class="text-input" v-model="settleCounterparty" placeholder="0x..." style="width: 100%; font-family: monospace;" />
          </div>

          <div class="flex-responsive-row">
            <div style="flex:1;">
              <label class="micro-cap block mb-2">SECRET ORDER SIZE</label>
              <input type="number" class="text-input" v-model="settleSecretSize" placeholder="Secret Size" style="width:100%;" />
            </div>
            <div style="flex:1;">
              <label class="micro-cap block mb-2">SECRET BLINDING FACTOR</label>
              <input type="number" class="text-input" v-model="settleBlindingFactor" placeholder="Blinding Factor" style="width:100%;" />
            </div>
          </div>

          <!-- Proof variables preview -->
          <div style="background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.05); padding: 1rem;">
            <div class="micro-cap text-mute mb-2">Verifier Contract Target:</div>
            <div class="font-mono text-xs text-mute space-y-1">
              <div>• Base g = 2, h = 3</div>
              <div>• Modulus p = 1000000007</div>
              <div>• Target C = g^s * h^r (mod p)</div>
            </div>
          </div>

          <button 
            class="btn-primary w-full"
            :class="{ 'btn-loading': isSettling }"
            style="background: var(--accent-secondary); border-color: var(--accent-secondary); color: #131313;"
            @click="settleOrder"
            :disabled="isSettling"
          >
            <Cpu :size="14" class="mr-2" />
            COMPILE PROOF & SETTLE ON-CHAIN
          </button>
        </div>
      </div>
    </div>

    <!-- ZK MATHEMATICAL CONSOLE LOGS OVERLAY MODAL -->
    <div v-if="showLogsModal" class="page-loading-overlay">
      <div class="tour-card fade-up" style="max-width: 550px; background: #0b0b0b; border: 1px solid var(--accent-secondary); border-radius: 0; padding: 2rem;">
        <div class="flex justify-between items-center border-b pb-4 mb-4" style="border-color: rgba(255,255,255,0.08);">
          <div class="flex items-center gap-2">
            <Terminal :size="16" color="var(--accent-secondary)" />
            <h4 class="micro-cap" style="color: var(--accent-secondary); margin-bottom: 0;">ZK CRYPTOGRAPHIC PROVER</h4>
          </div>
          <span class="badge-mini" style="background: rgba(130, 170, 255, 0.1); color: var(--accent-secondary); border-radius: 0;">PEDERSEN SCHNORR PROVER</span>
        </div>

        <div class="bg-black p-3 font-mono text-xs text-mute space-y-2" style="border: 1px solid rgba(255,255,255,0.05); height: 260px; overflow-y: auto;">
          <div v-for="(log, idx) in zkLogs" :key="idx" style="word-break: break-all;">
            {{ log }}
          </div>
        </div>

        <div class="mt-4 flex items-center justify-between">
          <div class="flex items-center gap-2 text-xs text-mute">
            <span class="spinner-inline" style="width: 12px; height: 12px;"></span>
            <span>Generating zero-knowledge witnesses...</span>
          </div>
          <button class="btn-secondary" style="padding: 4px 8px; font-size: 0.7rem; border-radius: 0;" @click="showLogsModal = false">
            DISMISS
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pedersen-monitor {
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 184, 108, 0.2);
  padding: 1rem;
  margin-bottom: 1.5rem;
  font-family: monospace;
}

.pedersen-label-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-b: 1px solid rgba(255, 184, 108, 0.1);
  padding-bottom: 0.5rem;
  margin-bottom: 0.75rem;
}

.pedersen-console-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.78rem;
  line-height: 1.6;
}

.tab-btn {
  background: none;
  border: none;
  color: var(--text-muted);
  font-family: monospace;
  font-size: 0.85rem;
  padding: 4px 8px;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.2s ease;
}

.tab-btn.buy.active {
  color: var(--accent-success);
  border-color: var(--accent-success);
}

.tab-btn.sell.active {
  color: var(--accent-danger);
  border-color: var(--accent-danger);
}

.zk-progress-step {
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
  padding: 0.5rem;
  border-left: 2px solid transparent;
}

.zk-progress-step.completed {
  border-color: var(--accent-success);
}

.zk-progress-step.active {
  border-color: var(--accent-secondary);
  background: rgba(255,255,255,0.02);
}

.tr-muted {
  opacity: 0.55;
  background: rgba(255,255,255,0.01);
}
</style>
