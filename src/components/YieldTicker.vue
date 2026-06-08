<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useWeb3Store } from '../stores/web3'
import { Coins, Zap, HelpCircle, ArrowDown, Activity } from 'lucide-vue-next'

const web3 = useWeb3Store()
const ratePerSecond = ref(0.000231) // $0.000231 per second
const accruedStream = ref(0.0)
const totalVolumeStreamed = ref(0.0)
const isSettling = ref(false)
const successMessage = ref('')
let tickInterval = null

onMounted(async () => {
  // Sync starting metrics from backend
  try {
    const res = await fetch(`/api/yield/stream?address=${web3.address}`)
    const data = await res.json()
    if (data.success) {
      ratePerSecond.value = data.ratePerSecond
      accruedStream.value = data.accrued
    }
  } catch (e) {
    console.warn('[Yield Ticker] Initial stream sync failed, starting from 0:', e.message)
  }

  // Ticker interval at 100ms for sub-second visual fluidity
  tickInterval = setInterval(() => {
    if (web3.isConnected) {
      accruedStream.value += ratePerSecond.value / 10
    }
  }, 100)
})

onUnmounted(() => {
  if (tickInterval) clearInterval(tickInterval)
})

async function settleStream() {
  if (accruedStream.value <= 0 || isSettling.value) return
  isSettling.value = true
  successMessage.value = ''
  
  const claimAmount = accruedStream.value

  try {
    const res = await fetch('/api/yield/settle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        address: web3.address,
        amount: claimAmount
      })
    })

    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to settle stream')

    // Increment user balance directly in frontend state
    const currentBal = parseFloat(web3.balance) || 0
    web3.balance = (currentBal + claimAmount).toFixed(6)

    totalVolumeStreamed.value += claimAmount
    accruedStream.value = 0.0
    successMessage.value = `Successfully streamed +$${claimAmount.toFixed(6)} USDC directly into your wallet gaslessly!`
  } catch (err) {
    console.error('[Yield Ticker] Stream settlement failed:', err.message)
  } finally {
    isSettling.value = false
  }
}
</script>

<template>
  <div class="ticker-card">
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-2">
        <Activity :size="16" color="var(--accent-success)" />
        <span class="micro-cap font-bold" style="color: var(--accent-success); letter-spacing: 0.1em;">GATEWAY x402 YIELD STREAM</span>
      </div>
      <span class="badge" style="background: rgba(130, 255, 170, 0.05); color: var(--accent-success); font-size: 0.65rem; font-weight: 700;">
        LIVE INTERACTIVE CHANNEL
      </span>
    </div>

    <!-- Ticker Section -->
    <div style="background: rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.03); padding: 1.5rem; text-align: center; margin-bottom: 1rem; position: relative; overflow: hidden;">
      <div class="stream-pulses">
        <div class="pulse-ring"></div>
        <div class="pulse-ring second"></div>
      </div>

      <div class="micro-cap text-mute mb-2">ACCUMULATED MICRO-YIELD</div>
      <div class="ticker-digits">
        ${{ accruedStream.toFixed(6) }}
      </div>
      <div class="micro-cap mt-2" style="color: var(--accent-success); font-family: monospace;">
        +${{ (ratePerSecond * 3600).toFixed(4) }} USDC / Hour
      </div>
    </div>

    <!-- Metrics -->
    <div class="grid-two-columns mb-4 gap-4">
      <div class="metric-mini">
        <span class="micro-cap text-mute">TOTAL VOLUME STREAMED</span>
        <div class="body-md font-bold mt-1" style="color: var(--text-main); font-family: monospace;">
          ${{ totalVolumeStreamed.toFixed(6) }} USDC
        </div>
      </div>
      <div class="metric-mini">
        <span class="micro-cap text-mute">CHANNEL SETTLEMENTS</span>
        <div class="body-md font-bold mt-1" style="color: var(--accent-gold);">
          GAS-FREE (SPONSORED)
        </div>
      </div>
    </div>

    <div v-if="successMessage" class="success-box mb-4">
      <Zap :size="14" />
      <span>{{ successMessage }}</span>
    </div>

    <!-- Action -->
    <button 
      class="btn-primary w-full"
      style="background: linear-gradient(135deg, var(--accent-success) 0%, #2e8b57 100%); color: #000; border: none; font-weight: 800;"
      :disabled="accruedStream <= 0.000001 || isSettling"
      @click="settleStream"
    >
      <Zap v-if="isSettling" :size="14" class="spinner-inline" />
      STREAM ACCRUED YIELD INSTANTLY
    </button>
  </div>
</template>

<style scoped>
.ticker-card {
  background: rgba(255,255,255,0.02);
  border: 1px solid var(--border-light);
  padding: 1.5rem;
  text-align: left;
}

.ticker-digits {
  font-size: 2.25rem;
  font-weight: 900;
  color: var(--text-main);
  font-family: 'Outfit', monospace;
  letter-spacing: -0.02em;
  text-shadow: 0 0 15px rgba(130, 255, 170, 0.2);
}

.grid-two-columns {
  display: grid;
  grid-template-columns: 1fr 1fr;
}

.metric-mini {
  background: rgba(255,255,255,0.01);
  border: 1px solid rgba(255,255,255,0.03);
  padding: 0.75rem;
}

.success-box {
  background: rgba(130, 255, 170, 0.05);
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

/* Streaming pulse animations */
.stream-pulses {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.15;
}

.pulse-ring {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  border: 2px solid var(--accent-success);
  animation: ring-scale 2.5s infinite linear;
}

.pulse-ring.second {
  animation-delay: 1.25s;
}

@keyframes ring-scale {
  0% {
    transform: scale(0.2);
    opacity: 0.8;
  }
  100% {
    transform: scale(1.5);
    opacity: 0;
  }
}
</style>
