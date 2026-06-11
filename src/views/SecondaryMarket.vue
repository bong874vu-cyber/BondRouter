<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useWeb3Store } from '../stores/web3'
import { useBondStore } from '../stores/bond'
import { useUIStore } from '../stores/ui'
import { TrendingUp, RefreshCw, Layers, PlusCircle, CheckCircle, XCircle, AlertTriangle } from 'lucide-vue-next'

const web3 = useWeb3Store()
const store = useBondStore()
const ui = useUIStore()

const selectedTokenId = ref('')
const orderType = ref('buy') // buy or sell
const quantity = ref(1)
const price = ref(100)
const loading = ref(false)
const matching = ref(false)

// Mock/Initial Secondary Orders
const limitOrders = ref([
  { id: 1, user: '0x17d23d...2a79', tokenId: 'Token 101', quantity: 50, price: 98.50, isBuy: true, active: true },
  { id: 2, user: '0x32ba12...F843', tokenId: 'Token 101', quantity: 200, price: 99.00, isBuy: true, active: true },
  { id: 3, user: '0x8F572C...6629', tokenId: 'Token 101', quantity: 120, price: 100.50, isBuy: false, active: true },
  { id: 4, user: '0x51c91E...D342', tokenId: 'Token 101', quantity: 80, price: 101.20, isBuy: false, active: true }
])

const activeBids = computed(() => limitOrders.value.filter(o => o.isBuy && o.active).sort((a,b) => b.price - a.price))
const activeAsks = computed(() => limitOrders.value.filter(o => !o.isBuy && o.active).sort((a,b) => a.price - b.price))

const openOrders = computed(() => {
  if (!web3.address) return []
  return limitOrders.value.filter(o => o.active)
})

const totalBidDepth = computed(() => activeBids.value.reduce((acc, o) => acc + o.quantity, 0))
const totalAskDepth = computed(() => activeAsks.value.reduce((acc, o) => acc + o.quantity, 0))

async function placeOrder() {
  if (quantity.value <= 0 || price.value <= 0) {
    ui.addToast('QUANTITY AND PRICE MUST BE GREATER THAN ZERO.', 'error')
    return
  }
  loading.value = true
  try {
    // Escrow simulation/on-chain submission
    const newOrder = {
      id: limitOrders.value.length + 1,
      user: web3.address || '0xdefault',
      tokenId: selectedTokenId.value || 'Token 101',
      quantity: quantity.value,
      price: price.value,
      isBuy: orderType.value === 'buy',
      active: true
    }
    limitOrders.value.push(newOrder)
    ui.addToast(`ORDER PLACED SUCCESSFULLY: ${orderType.value.toUpperCase()} ${quantity.value} @ ${price.value} USDC`, 'success')
    
    // Auto-match simulation if bid price >= ask price
    setTimeout(() => {
      autoMatch()
    }, 1200)
  } catch (e) {
    ui.addToast('ORDER PLACEMENT FAILED.', 'error')
  } finally {
    loading.value = false
  }
}

function autoMatch() {
  const bids = activeBids.value
  const asks = activeAsks.value
  if (bids.length > 0 && asks.length > 0) {
    const highestBid = bids[0]
    const lowestAsk = asks[0]
    if (highestBid.price >= lowestAsk.price) {
      matching.value = true
      setTimeout(() => {
        const matchQty = Math.min(highestBid.quantity, lowestAsk.quantity)
        highestBid.quantity -= matchQty
        lowestAsk.quantity -= matchQty
        
        if (highestBid.quantity === 0) highestBid.active = false
        if (lowestAsk.quantity === 0) lowestAsk.active = false
        
        ui.addToast(`MATCH CLEARED ON-CHAIN: ${matchQty} positions matched @ $${lowestAsk.price} USDC`, 'success')
        matching.value = false
      }, 1500)
    }
  }
}

const isDropdownOpen = ref(false)
const selectOption = (val) => {
  selectedTokenId.value = val
  isDropdownOpen.value = false
}

const clickListener = (e) => {
  const selectEl = document.querySelector('.select-container-sec')
  if (selectEl && !selectEl.contains(e.target)) {
    isDropdownOpen.value = false
  }
}

async function cancelLimitOrder(orderId) {
  const order = limitOrders.value.find(o => o.id === orderId)
  if (order) {
    order.active = false
    ui.addToast(`ORDER #${orderId} CANCELLED SUCCESSFULLY. FUNDS RETURNED.`, 'info')
  }
}

watch(() => store.marketBonds, (newBonds) => {
  if (newBonds.length > 0 && (!selectedTokenId.value || selectedTokenId.value === 'USDC High Yield Treasury Bond')) {
    selectedTokenId.value = `${newBonds[0].token} (${newBonds[0].issuer.toUpperCase()})`
  }
}, { immediate: true })

onMounted(() => {
  if (store.marketBonds.length > 0) {
    selectedTokenId.value = `${store.marketBonds[0].token} (${store.marketBonds[0].issuer.toUpperCase()})`
  } else {
    selectedTokenId.value = 'USDC High Yield Treasury Bond'
  }
  window.addEventListener('click', clickListener)
})

onUnmounted(() => {
  window.removeEventListener('click', clickListener)
})
</script>

<template>
  <div class="page-container fade-in">
    <div class="flex-responsive-header mb-6" style="margin-bottom: 2rem;">
      <div>
        <div class="flex items-center gap-2 mb-2 micro-cap" style="color: var(--accent-gold);">
          <Layers :size="14" /> SECONDARY CLOB LIQUIDITY
        </div>
        <h1 class="display-xl text-gradient">SECONDARY TRADING DESK</h1>
      </div>
      <div v-if="matching" class="badge" style="background: rgba(130, 255, 170, 0.1); color: var(--accent-success); display: flex; align-items: center; gap: 0.25rem;">
        <RefreshCw :size="12" class="spinner-inline" /> MATCHING ORDERS ON-CHAIN...
      </div>
    </div>

    <p class="body-md text-mute mb-6" style="max-width: 750px; font-size: 0.92rem; line-height: 1.5;">
      Unlock instant liquidity for your fractionalized institutional bond positions. Trade active ERC-1155 tokens with other counterparties on Arc Chain using the automated Central Limit Order Book (CLOB) smart contract.
    </p>

    <!-- Main trading terminal grid -->
    <div class="grid-three-columns-responsive gap-6" style="display: grid; grid-template-columns: 1.2fr 1fr 1fr; gap: 1.5rem;">
      
      <!-- Left Column: Place limit orders -->
      <div class="glass-panel">
        <div class="flex items-center justify-between mb-4 border-b pb-3" style="border-color: rgba(255,255,255,0.05);">
          <h3 class="card-title flex items-center gap-2" style="font-size: 0.95rem; margin: 0;">
            <PlusCircle :size="16" color="var(--accent-primary)" />
            PLACE LIMIT ORDER
          </h3>
        </div>

        <div class="form-group mb-4 select-container-sec" style="position: relative;">
          <label class="micro-cap text-mute mb-1" style="display: block;">SELECT RWA POOL BOND</label>
          <div class="custom-select-wrapper">
            <button 
              type="button"
              class="custom-select-trigger" 
              @click="isDropdownOpen = !isDropdownOpen"
            >
              <span>{{ selectedTokenId || 'Choose a bond...' }}</span>
              <span class="chevron">{{ isDropdownOpen ? '▲' : '▼' }}</span>
            </button>
            <transition name="dropdown-fade">
              <div 
                v-if="isDropdownOpen" 
                class="custom-select-options" 
                style="position: absolute; top: 100%; left: 0; right: 0; z-index: 99;"
              >
                <div 
                  v-for="b in store.marketBonds" 
                  :key="b.id" 
                  class="custom-select-option"
                  :class="{ active: selectedTokenId === `${b.token} (${b.issuer.toUpperCase()})` }"
                  @click="selectOption(`${b.token} (${b.issuer.toUpperCase()})`)"
                >
                  {{ b.token }} ({{ b.issuer.toUpperCase() }})
                </div>
                <div 
                  class="custom-select-option"
                  :class="{ active: selectedTokenId === 'USDC High Yield Treasury Bond' }"
                  @click="selectOption('USDC High Yield Treasury Bond')"
                >
                  USDC High Yield Treasury Bond
                </div>
              </div>
            </transition>
          </div>
        </div>

        <!-- Buy/Sell Switch tabs -->
        <div class="flex gap-2 mb-4" style="display: flex; gap: 0.5rem; margin-bottom: 1.5rem;">
          <button 
            class="tab-btn w-full"
            :class="{ 'active buy': orderType === 'buy' }"
            @click="orderType = 'buy'"
          >
            BUY (BID)
          </button>
          <button 
            class="tab-btn w-full"
            :class="{ 'active sell': orderType === 'sell' }"
            @click="orderType = 'sell'"
          >
            SELL (ASK)
          </button>
        </div>

        <!-- Quantity input -->
        <div class="form-group mb-3">
          <label class="micro-cap text-mute mb-1" style="display: block;">QUANTITY (BOND SHARES)</label>
          <input 
            type="number" 
            v-model.number="quantity"
            class="text-input w-full font-mono"
            style="width: 100%; box-sizing: border-box;"
          />
        </div>

        <!-- Price input -->
        <div class="form-group mb-4">
          <label class="micro-cap text-mute mb-1" style="display: block;">LIMIT PRICE (USDC PER SHARE)</label>
          <input 
            type="number" 
            step="0.01"
            v-model.number="price"
            class="text-input w-full font-mono"
            style="width: 100%; box-sizing: border-box;"
          />
        </div>

        <div style="background: rgba(255,255,255,0.01); border: 1px solid var(--border-light); padding: 0.8rem; margin-bottom: 1.5rem; font-size: 0.75rem;">
          <div class="flex justify-between py-1" style="display: flex; justify-content: space-between;">
            <span style="color: var(--text-muted);">Escrow Required:</span>
            <span style="font-weight: bold; color: var(--text-main); font-family: monospace;">
              {{ orderType === 'buy' ? `${quantity * price} USDC` : `${quantity} Bonds` }}
            </span>
          </div>
          <div class="flex justify-between py-1" style="display: flex; justify-content: space-between; margin-top: 0.25rem;">
            <span style="color: var(--text-muted);">Slippage Protection:</span>
            <span style="color: var(--accent-success); font-weight: bold;">0.00% (On-Chain CLOB)</span>
          </div>
        </div>

        <button 
          class="btn-primary w-full"
          :style="orderType === 'buy' ? 'background: var(--accent-success); color: #000; font-weight: 800;' : 'background: var(--accent-danger); color: #fff; font-weight: 800;'"
          @click="placeOrder"
          :disabled="loading"
        >
          <RefreshCw v-if="loading" :size="14" class="spinner-inline" />
          {{ orderType === 'buy' ? 'SUBMIT BUY LIMIT ORDER' : 'SUBMIT SELL LIMIT ORDER' }}
        </button>
      </div>

      <!-- Center Column: Bid / Ask Book -->
      <div class="glass-panel">
        <div class="flex items-center justify-between mb-4 border-b pb-3" style="border-color: rgba(255,255,255,0.05);">
          <h3 class="card-title flex items-center gap-2" style="font-size: 0.95rem; margin: 0;">
            <Layers :size="16" color="var(--accent-gold)" />
            ORDER BOOK DEPTH
          </h3>
        </div>

        <!-- Asks (Sells) -->
        <div class="book-section mb-4">
          <div class="micro-cap text-mute py-1 border-b mb-2" style="border-color: rgba(255,255,255,0.03); font-size: 0.65rem;">ASKS (SELLS)</div>
          <div class="space-y-1">
            <div 
              v-for="ask in activeAsks" 
              :key="ask.id" 
              class="book-row ask-row"
              :style="{ '--depth-percent': `${(ask.quantity / totalAskDepth) * 100}%` }"
            >
              <span class="font-mono text-ask" style="color: var(--accent-danger); font-weight: bold;">${{ ask.price.toFixed(2) }}</span>
              <span class="font-mono">{{ ask.quantity }}</span>
            </div>
            <div v-if="activeAsks.length === 0" class="text-center text-mute py-4" style="font-size: 0.75rem;">No asks active.</div>
          </div>
        </div>

        <!-- Spread middle indicator -->
        <div class="spread-indicator py-2 mb-4">
          <div class="flex justify-between items-center" style="display: flex; justify-content: space-between;">
            <span class="micro-cap text-mute">SPREAD:</span>
            <span class="font-bold font-mono" style="color: var(--accent-gold); font-size: 0.85rem;">
              ${{ activeAsks.length > 0 && activeBids.length > 0 ? (activeAsks[0].price - activeBids[0].price).toFixed(2) : '0.00' }} USDC
            </span>
          </div>
        </div>

        <!-- Bids (Buys) -->
        <div class="book-section">
          <div class="micro-cap text-mute py-1 border-b mb-2" style="border-color: rgba(255,255,255,0.03); font-size: 0.65rem;">BIDS (BUYS)</div>
          <div class="space-y-1">
            <div 
              v-for="bid in activeBids" 
              :key="bid.id" 
              class="book-row bid-row"
              :style="{ '--depth-percent': `${(bid.quantity / totalBidDepth) * 100}%` }"
            >
              <span class="font-mono text-bid" style="color: var(--accent-success); font-weight: bold;">${{ bid.price.toFixed(2) }}</span>
              <span class="font-mono">{{ bid.quantity }}</span>
            </div>
            <div v-if="activeBids.length === 0" class="text-center text-mute py-4" style="font-size: 0.75rem;">No bids active.</div>
          </div>
        </div>
      </div>

      <!-- Right Column: My open orders & details -->
      <div class="glass-panel">
        <div class="flex items-center justify-between mb-4 border-b pb-3" style="border-color: rgba(255,255,255,0.05);">
          <h3 class="card-title flex items-center gap-2" style="font-size: 0.95rem; margin: 0;">
            <TrendingUp :size="16" color="var(--accent-secondary)" />
            MY OPEN TRADES
          </h3>
        </div>

        <div style="max-height: 400px; overflow-y: auto;">
          <div 
            v-for="order in openOrders" 
            :key="order.id" 
            style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-light); padding: 0.8rem; margin-bottom: 0.75rem; text-align: left;"
          >
            <div class="flex justify-between items-center mb-2" style="display: flex; justify-content: space-between;">
              <span class="badge" :style="order.isBuy ? 'background: rgba(130, 255, 170, 0.1); color: var(--accent-success);' : 'background: rgba(255, 107, 107, 0.1); color: var(--accent-danger);'">
                {{ order.isBuy ? 'BUY' : 'SELL' }}
              </span>
              <button 
                class="badge-mini" 
                style="background: rgba(255,255,255,0.05); color: var(--text-muted); border: none; cursor: pointer;"
                @click="cancelLimitOrder(order.id)"
              >
                CANCEL
              </button>
            </div>

            <div class="grid-two-columns mt-2 font-mono" style="font-size: 0.75rem; display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;">
              <div>
                <span class="text-mute">Price:</span> <span class="font-bold">${{ order.price.toFixed(2) }}</span>
              </div>
              <div>
                <span class="text-mute">Quantity:</span> <span class="font-bold">{{ order.quantity }}</span>
              </div>
            </div>
            <div class="font-mono mt-1" style="font-size: 0.65rem; color: var(--text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              Asset ID: {{ order.tokenId }}
            </div>
          </div>

          <div v-if="openOrders.length === 0" class="text-center text-mute py-8" style="font-size: 0.78rem;">
            No open limit orders. Place bids or asks to lock positions.
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tab-btn {
  background: rgba(255,255,255,0.03);
  border: 1px solid var(--border-light);
  color: var(--text-muted);
  font-weight: 700;
  padding: 0.6rem 0.5rem;
  font-size: 0.75rem;
  letter-spacing: 0.05em;
  cursor: pointer;
  transition: all 0.3s;
}

.tab-btn:hover {
  background: rgba(255,255,255,0.06);
}

.tab-btn.active.buy {
  background: rgba(130, 255, 170, 0.15);
  color: var(--accent-success);
  border-color: var(--accent-success);
}

.tab-btn.active.sell {
  background: rgba(255, 107, 107, 0.15);
  color: var(--accent-danger);
  border-color: var(--accent-danger);
}

.book-row {
  display: flex;
  justify-content: space-between;
  padding: 0.4rem 0.6rem;
  font-size: 0.8rem;
  position: relative;
  overflow: hidden;
}

.book-row::after {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  height: 100%;
  width: var(--depth-percent, 0%);
  z-index: 1;
  opacity: 0.08;
}

.ask-row::after {
  background: var(--accent-danger);
}

.bid-row::after {
  background: var(--accent-success);
}

.spread-indicator {
  background: rgba(255,255,255,0.02);
  border-top: 1px solid rgba(255,255,255,0.04);
  border-bottom: 1px solid rgba(255,255,255,0.04);
  padding: 0.5rem 0.75rem;
}

.grid-two-columns {
  display: grid;
  grid-template-columns: 1fr 1fr;
}

.custom-select-trigger {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  background: rgba(0, 0, 0, 0.45) !important;
  border: 1px solid var(--border-light) !important;
  padding: 0.65rem 0.8rem;
  color: #fff;
  font-size: 0.85rem;
  font-family: monospace;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s;
  border-radius: 0px !important;
}

.custom-select-trigger:hover,
.custom-select-trigger:focus {
  border-color: var(--accent-gold) !important;
  box-shadow: 0 0 0 1px var(--accent-gold);
}

.custom-select-options {
  background: #0d0e12 !important;
  border: 1px solid var(--border-light) !important;
  padding: 0.25rem;
  border-radius: 0px !important;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.8);
  max-height: 200px;
  overflow-y: auto;
}

.custom-select-option {
  padding: 0.6rem 0.8rem;
  font-size: 0.82rem;
  color: rgba(255, 255, 255, 0.85) !important;
  font-family: monospace;
  cursor: pointer;
  border-radius: 0px !important;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  background: transparent;
}

.custom-select-option:hover {
  background: rgba(255, 255, 255, 0.05) !important;
  color: #fff !important;
}

.custom-select-option.active {
  background: #111a2e !important;
  color: var(--accent-gold) !important;
  font-weight: bold;
  border-left: 2px solid var(--accent-gold) !important;
  padding-left: 0.6rem !important;
}

.custom-select-options::-webkit-scrollbar {
  width: 4px;
}
.custom-select-options::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.1);
}
.custom-select-options::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
}
.custom-select-options::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.4);
}
</style>
