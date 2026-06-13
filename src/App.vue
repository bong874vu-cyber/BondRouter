<script setup>
import { onMounted, computed, ref } from 'vue'
import { RouterLink, RouterView, useRoute } from 'vue-router'
import { useBondStore } from './stores/bond'
import { useWeb3Store } from './stores/web3'
import Toast from './components/Toast.vue'
import WalletModal from './components/WalletModal.vue'
import OnboardingWizard from './components/OnboardingWizard.vue'
import ConnectedWalletModal from './components/ConnectedWalletModal.vue'
import TreasuryAssistant from './components/TreasuryAssistant.vue'
import { useNumberCounter } from './composables/useCounter'
import { Wallet, Activity, ArrowRightLeft, Layers, ShieldCheck, BookOpen, Settings, Landmark } from 'lucide-vue-next'

const store = useBondStore()
const web3 = useWeb3Store()
const route = useRoute()
const isWalletModalOpen = ref(false)
const isSocialLoginModalOpen = ref(false)
const isConnectedWalletModalOpen = ref(false)
const activeDropdown = ref(null)

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

function openSocialLogin() {
  console.log('[App] openSocialLogin event received, setting isSocialLoginModalOpen = true')
  isSocialLoginModalOpen.value = true
}
</script>

<template>
  <div class="bg-blobs"></div>
  <header class="app-header">
    <div class="flex items-center header-left">
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

        <!-- Dropdown Trading -->
        <div class="nav-dropdown" @mouseenter="activeDropdown = 'trading'" @mouseleave="activeDropdown = null">
          <button class="nav-dropdown-trigger" :class="{ active: ['/darkpool', '/secondary'].includes(route.path) }">
            <ShieldCheck :size="16" /> Trading <span class="chevron">▼</span>
          </button>
          <transition name="dropdown-fade">
            <div v-if="activeDropdown === 'trading'" class="dropdown-menu">
              <RouterLink to="/darkpool" class="dropdown-item">
                <ShieldCheck :size="14" /> Shielded Trading
              </RouterLink>
              <RouterLink to="/secondary" class="dropdown-item">
                <ArrowRightLeft :size="14" /> Secondary Trade
              </RouterLink>
            </div>
          </transition>
        </div>

        <!-- Dropdown Management -->
        <div class="nav-dropdown" @mouseenter="activeDropdown = 'mgmt'" @mouseleave="activeDropdown = null">
          <button class="nav-dropdown-trigger" :class="{ active: ['/governance', '/compliance', '/settings', '/docs'].includes(route.path) }">
            <Settings :size="16" /> Management <span class="chevron">▼</span>
          </button>
          <transition name="dropdown-fade">
            <div v-if="activeDropdown === 'mgmt'" class="dropdown-menu">
              <RouterLink to="/governance" class="dropdown-item">
                <Landmark :size="14" /> Governance
              </RouterLink>
              <RouterLink to="/compliance" class="dropdown-item">
                <ShieldCheck :size="14" /> Compliance
              </RouterLink>
              <RouterLink to="/docs" class="dropdown-item">
                <BookOpen :size="14" /> Documentation
              </RouterLink>
              <RouterLink to="/settings" class="dropdown-item">
                <Settings :size="14" /> Settings
              </RouterLink>
            </div>
          </transition>
        </div>
      </nav>
    </div>
    
    <div class="flex items-center header-right">
      <div v-if="web3.error" class="micro-cap" style="color: var(--accent-danger);">{{ web3.error }}</div>
      <div v-if="web3.isConnected" class="header-status-container">
        <div class="micro-cap text-mute header-status-label" style="color: var(--accent-success); font-weight: 700;">SECURE HIGH-SPEED LINK ACTIVE</div>
        <div class="body-md" style="font-weight: 800;">{{ Number(displayBalance).toFixed(4) }} USDC</div>
      </div>
      
      <button v-if="!web3.isConnected" class="btn-primary" @click="isWalletModalOpen = true">
        <Wallet :size="18" /> Connect Account
      </button>
      <button v-else-if="web3.isCircleWallet" class="btn-glass" @click="isConnectedWalletModalOpen = true" style="border-color: var(--accent-gold); color: var(--accent-gold); display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem;">
        <ShieldCheck :size="16" color="var(--accent-gold)" />
        <span style="font-weight: 700;">{{ web3.circleUserEmail }}</span>
        <span style="opacity: 0.6; font-size: 0.75rem;">({{ truncate(web3.address) }})</span>
      </button>
      <button v-else class="btn-glass" @click="isConnectedWalletModalOpen = true">
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
      <span>Savings</span>
    </RouterLink>
    <RouterLink to="/portfolio">
      <Wallet :size="20" />
      <span>Treasury</span>
    </RouterLink>
    <RouterLink to="/darkpool">
      <ShieldCheck :size="20" />
      <span>Shield</span>
    </RouterLink>
    <RouterLink to="/settings">
      <Settings :size="20" />
      <span>Settings</span>
    </RouterLink>
  </div>

  <Toast />
  <WalletModal :isOpen="isWalletModalOpen" @close="isWalletModalOpen = false" @open-social-login="openSocialLogin" />
  <OnboardingWizard :isOpen="isSocialLoginModalOpen" @close="isSocialLoginModalOpen = false" />
  <ConnectedWalletModal 
    :isOpen="isConnectedWalletModalOpen" 
    :email="web3.circleUserEmail"
    :address="web3.address"
    :balance="web3.balance"
    :isCircleWallet="web3.isCircleWallet"
    @close="isConnectedWalletModalOpen = false"
    @disconnect="web3.disconnect"
  />
  <TreasuryAssistant />
</template>

