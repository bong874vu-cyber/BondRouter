<script setup>
import { onMounted, computed, ref } from 'vue'
import { RouterLink, RouterView } from 'vue-router'
import { useBondStore } from './stores/bond'
import { useWeb3Store } from './stores/web3'
import Toast from './components/Toast.vue'
import WalletModal from './components/WalletModal.vue'
import TreasuryAssistant from './components/TreasuryAssistant.vue'
import { useNumberCounter } from './composables/useCounter'
import { Wallet, Activity, ArrowRightLeft, Layers, ShieldCheck, BookOpen } from 'lucide-vue-next'

const store = useBondStore()
const web3 = useWeb3Store()
const isWalletModalOpen = ref(false)

const displayBalance = useNumberCounter(computed(() => parseFloat(web3.balance) || 0))

onMounted(() => {
  store.fetchBonds()
  if (window.ethereum) {
    window.ethereum.request({ method: 'eth_accounts' }).then(accounts => {
      if(accounts.length > 0) web3.connect()
    })
  }
})

const truncate = (addr) => addr ? `${addr.slice(0,6)}...${addr.slice(-4)}` : ''
</script>

<template>
  <div class="bg-blobs"></div>
  <header class="app-header">
    <div class="flex items-center" style="gap: 3rem;">
      <RouterLink to="/" class="logo">
        <Layers :size="24" color="var(--accent-primary)" />
        BOND ROUTER
      </RouterLink>
      <nav class="app-nav">
        <RouterLink to="/discover">
          <div class="flex items-center gap-2"><Activity :size="16" /> Discover Yield</div>
        </RouterLink>
        <RouterLink to="/portfolio">
          <div class="flex items-center gap-2"><ArrowRightLeft :size="16" /> My Treasury</div>
        </RouterLink>
        <RouterLink to="/darkpool">
          <div class="flex items-center gap-2"><ShieldCheck :size="16" /> Shielded Trading</div>
        </RouterLink>
        <RouterLink to="/docs">
          <div class="flex items-center gap-2"><BookOpen :size="16" /> Documentation</div>
        </RouterLink>
      </nav>
    </div>
    
    <div class="flex items-center" style="gap: 1.5rem;">
      <div v-if="web3.error" class="micro-cap" style="color: var(--accent-danger);">{{ web3.error }}</div>
      <div v-if="web3.isConnected" style="text-align: right;">
        <div class="micro-cap text-mute header-status-label" style="color: var(--accent-success); font-weight: 700;">SECURE HIGH-SPEED LINK ACTIVE</div>
        <div class="body-md" style="font-weight: 800;">{{ Number(displayBalance).toFixed(4) }} USDC</div>
      </div>
      
      <button v-if="!web3.isConnected" class="btn-primary" @click="isWalletModalOpen = true">
        <Wallet :size="18" /> Connect Account
      </button>
      <button v-else class="btn-glass" @click="web3.disconnect()">
        <Wallet :size="18" color="var(--accent-primary)" />
        {{ truncate(web3.address) }}
      </button>
    </div>
  </header>
  
  <main>
    <RouterView v-slot="{ Component }">
      <transition name="fade" mode="out-in">
        <component :is="Component" />
      </transition>
    </RouterView>
  </main>
  
  <div class="mobile-tab-bar">
    <RouterLink to="/discover">
      <Activity :size="20" />
      <span>Savings Desk</span>
    </RouterLink>
    <RouterLink to="/portfolio">
      <Wallet :size="20" />
      <span>My Treasury</span>
    </RouterLink>
    <RouterLink to="/darkpool">
      <ShieldCheck :size="20" />
      <span>Shielded Trading</span>
    </RouterLink>
    <RouterLink to="/docs">
      <BookOpen :size="20" />
      <span>Docs</span>
    </RouterLink>
  </div>

  <Toast />
  <WalletModal :isOpen="isWalletModalOpen" @close="isWalletModalOpen = false" />
  <TreasuryAssistant />
</template>

