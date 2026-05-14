<script setup>
import { computed } from 'vue'
import { useBondStore } from '../stores/bond'
import { useNumberCounter } from '../composables/useCounter'

const store = useBondStore()

const displayBonds = useNumberCounter(computed(() => store.marketBonds.length))
const displayChains = useNumberCounter(computed(() => store.chains.length))
const displayPositions = useNumberCounter(computed(() => store.portfolio.length))
</script>

<template>
  <div>
    <!-- HERO BAND -->
    <div class="hero-band">
      <img src="https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&q=80" alt="Space horizon" class="hero-bg" />
      <div class="hero-content fade-in">
        <h1 class="display-xxl">BOND ROUTER</h1>
        <p class="body-md text-mute" style="max-width: 600px;">
          INSTITUTIONAL YIELD. CROSS-CHAIN LIQUIDITY. <br/>POWERED BY ARC TESTNET AND CIRCLE CCTP.
        </p>
        <RouterLink to="/discover" class="btn-ghost mt-4">DISCOVER BONDS</RouterLink>
      </div>
    </div>

    <!-- SECOND BAND -->
    <div class="hero-band" style="background: var(--canvas-night);">
      <img src="https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80" alt="Global Network" class="hero-bg" style="filter: brightness(0.3);" />
      <div class="hero-content fade-in" style="width: 100%; max-width: 1200px; padding: 0 32px;">
        <div class="micro-cap mb-2" style="color: var(--on-primary-mute);">PLATFORM STATISTICS</div>
        <h2 class="display-xl" style="margin-bottom: 48px;">GLOBAL YIELD NETWORK</h2>
        
        <div style="display: flex; gap: 120px; text-align: center; justify-content: center; width: 100%;">
          <div>
            <div class="display-lg">{{ Math.floor(displayBonds) || '...' }}</div>
            <div class="micro-cap text-mute mt-4">ACTIVE MARKETS</div>
          </div>
          <div>
            <div class="display-lg">{{ Math.floor(displayChains) || '...' }}</div>
            <div class="micro-cap text-mute mt-4">SUPPORTED CHAINS</div>
          </div>
          <div>
            <div class="display-lg">{{ Math.floor(displayPositions) }}</div>
            <div class="micro-cap text-mute mt-4">YOUR POSITIONS</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
