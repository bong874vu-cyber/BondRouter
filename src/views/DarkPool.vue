<script setup>
import { ref, reactive } from 'vue'
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

const recentMatches = reactive([
  { time: '14:32:01', asset: 'US T-BILL (90D)', size: 'CONFIDENTIAL', price: '98.50', txHash: null },
  { time: '14:28:44', asset: 'CORP BOND (1Y)', size: 'CONFIDENTIAL', price: '92.15', txHash: null }
])
</script>

<template>
  <div class="page-container fade-in">
    <div class="flex items-center gap-2 mb-2 micro-cap" style="color: var(--accent-primary);">
      <EyeOff :size="14" /> ARC OPT-IN PRIVACY
    </div>
    <h1 class="display-xl text-gradient mb-2">OTC DARK POOL</h1>
    <p class="body-md text-mute mb-4" style="max-width: 600px;">
      Institutional-grade secondary market. Orders are hidden from public ledgers using Arc's Opt-in Privacy and Zero-Knowledge compliance passports. No front-running, zero slippage.
    </p>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-top: 3rem;">
      <!-- Order Entry -->
      <div class="glass-panel">
        <div class="flex justify-between items-center mb-4 border-b pb-4" style="border-color: rgba(255,255,255,0.05);">
          <div class="flex gap-4">
            <button class="micro-cap" :style="{ color: activeTab === 'buy' ? 'var(--accent-success)' : 'var(--text-muted)' }" @click="activeTab = 'buy'">BUY ORDER</button>
            <button class="micro-cap" :style="{ color: activeTab === 'sell' ? 'var(--accent-danger)' : 'var(--text-muted)' }" @click="activeTab = 'sell'">SELL ORDER</button>
          </div>
          <div class="badge" style="background: rgba(130, 170, 255, 0.1); color: var(--accent-secondary);"><Lock :size="12" style="margin-right:4px;" /> ZK VERIFIED</div>
        </div>

        <div class="mb-4">
          <label class="micro-cap block mb-2">ASSET</label>
          <select class="text-input" style="width: 100%;">
            <option>US Treasury Bill (90D) - Arc</option>
            <option>Corporate Bond Index (1Y) - Arc</option>
          </select>
        </div>
        
        <div class="flex gap-4 mb-4">
          <div style="flex: 1;">
            <label class="micro-cap block mb-2">CONFIDENTIAL SIZE (USDC)</label>
            <input type="number" class="text-input" v-model="size" placeholder="Enter amount..." style="width: 100%;" />
          </div>
          <div style="flex: 1;">
            <label class="micro-cap block mb-2">LIMIT PRICE</label>
            <input type="number" class="text-input" v-model="price" placeholder="0.00" style="width: 100%;" />
          </div>
        </div>

        <div style="background: rgba(0,0,0,0.2); padding: 1rem; border-radius: 0.5rem; margin-bottom: 1.5rem;" class="flex items-start gap-3">
          <ShieldAlert :size="18" color="var(--accent-secondary)" style="flex-shrink: 0;" />
          <p class="micro-cap text-mute" style="line-height: 1.5;">
            Order details will be cryptographically encrypted. Only matched counterparties will receive settlement data via CCTP.
          </p>
        </div>

        <button 
          class="btn-primary w-full" 
          :style="{ background: activeTab === 'buy' ? 'var(--accent-success)' : 'var(--accent-danger)' }"
          @click="placeOrder"
          :disabled="isSubmitting"
        >
          {{ isSubmitting ? 'SIGNING TRANSACTION...' : 'SUBMIT CONFIDENTIAL ORDER' }}
        </button>
      </div>

      <!-- Recent Activity -->
      <div class="glass-panel">
        <h3 class="micro-cap mb-4">RECENT MATCHED TRADES</h3>
        <table class="premium-table">
          <thead>
            <tr>
              <th>TIME</th>
              <th>ASSET</th>
              <th>SIZE</th>
              <th>EXEC PRICE</th>
              <th>RECEIPT</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(trade, i) in recentMatches" :key="i">
              <td class="text-mute">{{ trade.time }}</td>
              <td style="font-weight: 700;">{{ trade.asset }}</td>
              <td style="color: var(--accent-secondary);"><Lock :size="12" style="margin-right:4px;" />{{ trade.size }}</td>
              <td>{{ trade.price }}</td>
              <td>
                <a v-if="trade.txHash" :href="'https://testnet.arcscan.app/tx/' + trade.txHash" target="_blank" style="color: var(--text-main);">
                  <ExternalLink :size="14" />
                </a>
              </td>
            </tr>
          </tbody>
        </table>

        <div class="mt-4 flex items-center justify-center gap-2 p-4" style="background: rgba(195, 232, 141, 0.05); border-radius: 0.5rem; border: 1px dashed rgba(195, 232, 141, 0.2);">
          <CheckCircle :size="16" color="var(--accent-success)" />
          <span class="micro-cap text-mute">DARK POOL SETTLEMENT ENGINE ACTIVE</span>
        </div>
      </div>
    </div>
  </div>
</template>
