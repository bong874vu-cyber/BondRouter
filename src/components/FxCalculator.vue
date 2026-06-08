<script setup>
import { ref, onUnmounted, computed } from 'vue'
import { useWeb3Store } from '../stores/web3'
import { ArrowRightLeft, RefreshCw, CheckCircle, AlertTriangle, HelpCircle } from 'lucide-vue-next'

const web3 = useWeb3Store()
const sellAmount = ref(100)
const quote = ref(null)
const isLoading = ref(false)
const error = ref('')
const successMessage = ref('')
const secondsLeft = ref(0)
let timerInterval = null

const formattedRate = computed(() => {
  if (!quote.value) return '0.0000'
  return parseFloat(quote.value.rate).toFixed(4)
})

const buyAmount = computed(() => {
  if (!quote.value) return '0.00'
  return parseFloat(quote.value.buyAmount).toFixed(2)
})

async function getQuote() {
  if (sellAmount.value <= 0) return
  isLoading.value = true
  error.value = ''
  successMessage.value = ''
  quote.value = null
  
  if (timerInterval) clearInterval(timerInterval)

  try {
    const res = await fetch('/api/circle/fx/quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sellAsset: 'USDC',
        buyAsset: 'EURC',
        sellAmount: sellAmount.value
      })
    })
    
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to fetch quote')
    
    quote.value = data
    
    // Setup expiry timer
    const expiry = new Date(data.expiresAt).getTime()
    timerInterval = setInterval(() => {
      const diff = Math.max(0, Math.floor((expiry - Date.now()) / 1000))
      secondsLeft.value = diff
      if (diff === 0) {
        clearInterval(timerInterval)
        error.value = 'Quote expired. Please request a new rate.'
      }
    }, 1000)
  } catch (err) {
    error.value = err.message
  } finally {
    isLoading.value = false
  }
}

async function executeSwap() {
  if (!quote.value || secondsLeft.value <= 0) return
  isLoading.value = true
  error.value = ''
  
  try {
    const res = await fetch('/api/circle/fx/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quoteId: quote.value.quoteId,
        sellAmount: sellAmount.value
      })
    })
    
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Execution failed')
    
    successMessage.value = `Successfully settled trade! Exchanged ${sellAmount.value} USDC for ${data.buyAmount} EURC.`
    quote.value = null
    if (timerInterval) clearInterval(timerInterval)
    
    // Refresh corporate wallets in store
    await web3.fetchCircleWallets()
  } catch (err) {
    error.value = err.message
  } finally {
    isLoading.value = false
  }
}

onUnmounted(() => {
  if (timerInterval) clearInterval(timerInterval)
})
</script>

<template>
  <div class="fx-card">
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-2">
        <ArrowRightLeft :size="16" color="var(--accent-gold)" />
        <span class="micro-cap font-bold" style="color: var(--accent-gold); letter-spacing: 0.08em;">STABLEFX LIQUIDITY swaps</span>
      </div>
      <span class="micro-cap text-mute flex items-center gap-1">
        SLIPPAGE: 0.1% <HelpCircle :size="10" />
      </span>
    </div>

    <!-- Inputs -->
    <div class="flex flex-col gap-3">
      <div class="input-group">
        <label class="micro-cap text-mute" style="font-size: 0.65rem;">SELL ASSET</label>
        <div class="flex items-center justify-between mt-1">
          <input 
            type="number" 
            v-model.number="sellAmount" 
            placeholder="Amount" 
            class="calculator-input"
            @input="quote = null"
          />
          <span class="currency-tag">USDC</span>
        </div>
      </div>

      <div class="flex justify-center" style="margin: -0.25rem 0;">
        <div class="arrow-divider">
          <ArrowRightLeft :size="12" style="transform: rotate(90deg);" />
        </div>
      </div>

      <div class="input-group">
        <label class="micro-cap text-mute" style="font-size: 0.65rem;">BUY ASSET (ESTIMATED PAYOUT)</label>
        <div class="flex items-center justify-between mt-1">
          <div class="calculator-display">
            {{ quote ? buyAmount : '---' }}
          </div>
          <span class="currency-tag eurc">EURC</span>
        </div>
      </div>
    </div>

    <!-- Statuses / Alerts -->
    <div v-if="error" class="error-box mt-3">
      <AlertTriangle :size="14" />
      <span>{{ error }}</span>
    </div>

    <div v-if="successMessage" class="success-box mt-3">
      <CheckCircle :size="14" />
      <span>{{ successMessage }}</span>
    </div>

    <!-- Quote details if active -->
    <div v-if="quote && secondsLeft > 0" class="fx-quote-details mt-4">
      <div class="flex justify-between items-center mb-2">
        <span class="micro-cap text-mute">Live Conversion Rate:</span>
        <span class="font-bold" style="color: var(--text-main); font-family: monospace;">1 USDC = {{ formattedRate }} EURC</span>
      </div>
      <div class="flex justify-between items-center mb-2">
        <span class="micro-cap text-mute">StableFX Spread:</span>
        <span style="color: var(--accent-success); font-weight: bold; font-size: 0.72rem;">0.02% (Tight)</span>
      </div>
      <div class="flex justify-between items-center">
        <span class="micro-cap text-mute">Quote Expiration:</span>
        <span class="countdown" :class="{ 'warning': secondsLeft < 10 }">
          {{ secondsLeft }}s remaining
        </span>
      </div>
    </div>

    <!-- Actions -->
    <div class="mt-4">
      <button 
        v-if="!quote || secondsLeft <= 0" 
        class="btn-primary w-full" 
        :disabled="isLoading || sellAmount <= 0"
        @click="getQuote"
      >
        <RefreshCw v-if="isLoading" :size="14" class="spinner-inline" />
        GET LIVE STABLEFX QUOTE
      </button>
      <button 
        v-else 
        class="btn-gold w-full" 
        :disabled="isLoading"
        @click="executeSwap"
      >
        <RefreshCw v-if="isLoading" :size="14" class="spinner-inline" />
        SETTLE EURC TRADE ON ARC
      </button>
    </div>
  </div>
</template>

<style scoped>
.fx-card {
  background: rgba(255,255,255,0.02);
  border: 1px solid var(--border-light);
  padding: 1.5rem;
  text-align: left;
}

.input-group {
  background: rgba(0,0,0,0.2);
  border: 1px solid rgba(255,255,255,0.05);
  padding: 0.75rem 1rem;
}

.calculator-input {
  background: transparent;
  border: none;
  color: var(--text-main);
  font-size: 1.25rem;
  font-weight: 700;
  width: 70%;
  outline: none;
}

.calculator-input::-webkit-outer-spin-button,
.calculator-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.calculator-display {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-main);
}

.currency-tag {
  font-size: 0.75rem;
  font-weight: 800;
  background: rgba(255,255,255,0.05);
  padding: 0.25rem 0.5rem;
  color: var(--accent-primary);
}

.currency-tag.eurc {
  color: var(--accent-secondary);
}

.arrow-divider {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 1px solid var(--border-light);
  display: flex;
  align-items: center;
  justify-content: center;
  background: #111;
  color: var(--text-muted);
}

.fx-quote-details {
  border-top: 1px dashed rgba(255,255,255,0.1);
  padding-top: 1rem;
}

.countdown {
  font-weight: 800;
  color: var(--accent-success);
  font-family: monospace;
}

.countdown.warning {
  color: var(--accent-danger);
  animation: pulse 1s infinite alternate;
}

.error-box {
  background: rgba(239, 83, 80, 0.05);
  border: 1px solid var(--accent-danger);
  color: var(--accent-danger);
  padding: 0.75rem;
  font-size: 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.success-box {
  background: rgba(139, 195, 74, 0.05);
  border: 1px solid var(--accent-success);
  color: var(--accent-success);
  padding: 0.75rem;
  font-size: 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.w-full {
  width: 100%;
}

.btn-gold {
  background: linear-gradient(135deg, var(--accent-gold) 0%, #b8860b 100%);
  color: #000;
  border: none;
  font-weight: 800;
  cursor: pointer;
  padding: 0.75rem 1rem;
  font-size: 0.8rem;
  letter-spacing: 0.05em;
  transition: opacity 0.3s;
}

.btn-gold:hover {
  opacity: 0.9;
}

@keyframes pulse {
  0% { opacity: 0.7; }
  100% { opacity: 1; }
}
</style>
