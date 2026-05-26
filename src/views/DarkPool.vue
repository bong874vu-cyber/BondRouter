<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ShieldAlert, EyeOff, Lock, TrendingUp, CheckCircle, ExternalLink } from 'lucide-vue-next'
import { useUIStore } from '../stores/ui'
import { useWeb3Store } from '../stores/web3'

const ui = useUIStore()
const web3 = useWeb3Store()
const activeTab = ref('buy') // 'buy' or 'sell'
const size = ref('')
const price = ref('')
const isSubmitting = ref(false)

async function placeOrder() {
  if(!size.value || !price.value) return;
  if (!web3.isConnected) {
    ui.addToast('PLEASE CONNECT WALLET.', 'error')
    return
  }

  isSubmitting.value = true
  try {
    const hash = await web3.sendInvestmentTx('DARK_POOL_ORDER', activeTab.value === 'buy' ? 'US T-BILL [BUY]' : 'US T-BILL [SELL]', size.value)
    
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
    ui.addToast('TRANSACTION REJECTED.', 'error')
  } finally {
    isSubmitting.value = false
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
      <div class="glass-panel">
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

        <div style="background: rgba(0,0,0,0.2); padding: 1.25rem; border-radius: 0px; border: 1px solid var(--border-light); margin-bottom: 1.5rem;" class="flex items-start gap-3">
          <ShieldAlert :size="18" color="var(--accent-secondary)" style="flex-shrink: 0; margin-top: 2px;" />
          <p class="micro-cap text-mute" style="line-height: 1.5; text-transform: none; letter-spacing: normal; font-size: 0.78rem;">
            Your order size is cryptographically sealed and hidden. Only when a matching buyer or seller is found will the transaction settle safely through secure digital dollar channels, preserving absolute business privacy.
          </p>
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
  </div>
</template>
