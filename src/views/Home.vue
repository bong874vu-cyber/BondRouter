<script setup>
import { computed } from 'vue'
import { useBondStore } from '../stores/bond'
import { useNumberCounter } from '../composables/useCounter'
import { ArrowRight, Globe, Layers, Zap } from 'lucide-vue-next'

const store = useBondStore()

const displayBonds = useNumberCounter(computed(() => store.marketBonds.length))
const displayChains = useNumberCounter(computed(() => store.chains.length))
const displayPositions = useNumberCounter(computed(() => store.portfolio.length))
</script>

<template>
  <div class="page-container" style="padding-top: 10rem;">
    <!-- HERO SECTION -->
    <div class="flex flex-col items-center text-center fade-in" style="gap: 1.5rem; max-width: 900px; margin: 0 auto; margin-bottom: 6rem;">
      <div class="badge medium mb-2">Powered by Arc Testnet & Circle CCTP</div>
      <h1 class="display-xxl text-gradient">
        CROSS-CHAIN<br>YIELD PIPELINE
      </h1>
      <p class="body-md text-mute" style="max-width: 600px; font-size: 1.25rem;">
        Institutional yield natively settled in USDC. Discover, aggregate, and compound tokenized assets across all EVM networks from a single unified gateway.
      </p>
      <div class="flex items-center justify-center gap-4 mt-4">
        <RouterLink to="/discover" class="btn-primary" style="padding: 1rem 2rem; font-size: 1rem;">
          Discover Bonds <ArrowRight :size="18" />
        </RouterLink>
        <a href="https://github.com/circlefin" target="_blank" class="btn-glass" style="padding: 1rem 2rem; font-size: 1rem;">
          Read Documentation
        </a>
      </div>
    </div>

    <!-- STATS BAND -->
    <div class="glass-panel fade-up delay-1" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 2rem; text-align: center; margin-bottom: 6rem;">
      <div>
        <div class="flex items-center justify-center mb-2" style="color: var(--accent-secondary);"><Layers :size="32" /></div>
        <div class="display-lg">{{ Math.floor(displayBonds) || '...' }}</div>
        <div class="micro-cap text-mute mt-4">ACTIVE MARKETS</div>
      </div>
      <div style="border-left: 1px solid var(--border-light); border-right: 1px solid var(--border-light);">
        <div class="flex items-center justify-center mb-2" style="color: var(--accent-primary);"><Globe :size="32" /></div>
        <div class="display-lg">{{ Math.floor(displayChains) || '...' }}</div>
        <div class="micro-cap text-mute mt-4">SUPPORTED CHAINS</div>
      </div>
      <div>
        <div class="flex items-center justify-center mb-2" style="color: var(--accent-success);"><Zap :size="32" /></div>
        <div class="display-lg">{{ Math.floor(displayPositions) }}</div>
        <div class="micro-cap text-mute mt-4">YOUR POSITIONS</div>
      </div>
    </div>

    <!-- FEATURES -->
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem;" class="fade-up delay-2">
      <div class="glass-panel">
        <h3 class="body-md text-gradient mb-2" style="font-size: 1.5rem; font-weight: 800;">Sub-second Finality</h3>
        <p class="text-mute">
          Built natively on the Arc Network. Experience near-instant transaction finality and military-grade security. Forget bridging delays.
        </p>
      </div>
      <div class="glass-panel">
        <h3 class="body-md mb-2" style="font-size: 1.5rem; font-weight: 800; color: var(--accent-secondary);">Universal Settlement</h3>
        <p class="text-mute">
          Every transaction, yield projection, and bond asset is denominated and settled in pure USDC. Zero ETH gas token required.
        </p>
      </div>
    </div>
  </div>
</template>
