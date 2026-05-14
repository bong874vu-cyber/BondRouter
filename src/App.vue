<script setup>
import { onMounted } from 'vue'
import { RouterLink, RouterView } from 'vue-router'
import { useBondStore } from './stores/bond'
import { useWeb3Store } from './stores/web3'
import Toast from './components/Toast.vue'
import { useNumberCounter } from './composables/useCounter'
import { computed } from 'vue'

const store = useBondStore()
const web3 = useWeb3Store()

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
  <header class="app-header">
    <div style="display: flex; align-items: center; gap: 48px;">
      <RouterLink to="/" class="logo">BOND ROUTER</RouterLink>
      <nav class="app-nav">
        <RouterLink to="/discover">Discover</RouterLink>
        <RouterLink to="/portfolio">Portfolio</RouterLink>
      </nav>
    </div>
    <div style="display: flex; align-items: center; gap: 24px;">
      <div v-if="web3.error" class="micro-cap" style="color: #f07178;">{{ web3.error }}</div>
      <div v-if="web3.isConnected" style="text-align: right;">
        <div class="micro-cap text-mute">{{ web3.network.toUpperCase() }} NETWORK</div>
        <div class="body-md" style="font-weight: 700;">{{ Number(displayBalance).toFixed(4) }} USDC</div>
      </div>
      <button v-if="!web3.isConnected" class="btn-ghost" style="padding: 12px 24px; font-size: 10px;" @click="web3.connect()">CONNECT WALLET</button>
      <button v-else class="btn-ghost btn-ghost-dark" style="padding: 12px 24px; font-size: 10px; border-color: var(--on-primary); color: var(--on-primary); background: transparent;" @click="web3.disconnect()">{{ truncate(web3.address) }}</button>
    </div>
  </header>
  
  <main>
    <RouterView />
  </main>
  
  <Toast />
</template>
