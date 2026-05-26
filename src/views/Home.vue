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
  <div class="page-container" style="padding-top: 6.5rem;">
    <!-- EDITORIAL SPLIT CONTAINER -->
    <div class="editorial-split fade-in">
      
      <!-- LEFT COLUMN: Dark Waves Background & Title -->
      <div class="split-left" style="background-image: url('/dark_waves.png');">
        <div class="split-left-content">
          <!-- METADATA HEADER -->
          <div class="hero-metadata">
            <div class="meta-item">
              <span class="meta-label">GATEWAY</span>
              <span class="meta-val">SECURE LINK</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">BALANCES</span>
              <span class="meta-val">DIGITAL DOLLARS</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">VERSION</span>
              <span class="meta-val">2026 DESK</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">DESK STATUS</span>
              <span class="meta-val" style="color: var(--accent-gold);">OPERATIONAL</span>
            </div>
          </div>

          <!-- HEADLINE & BUTTON -->
          <div class="flex flex-col gap-4">
            <h1 class="display-xxl">
              Globally Unified<br>Interest Accounts.
            </h1>
            <p class="body-md text-mute" style="max-width: 520px; font-size: 1.15rem; font-weight: 300;">
              Earn high-yield institutional returns settled directly in secure digital dollars (USDC). Browse, compare, and automatically compound your capital from a single, beautiful dashboard.
            </p>
            <div class="flex items-center gap-4 mt-4">
              <RouterLink to="/discover" class="btn-editorial-dark">
                ENTER THE DESK
              </RouterLink>
              <button @click="ui.startOnboarding" class="btn-glass" style="border-radius: 9999px; padding: 0.8rem 1.8rem;">
                TAKE A TOUR 🌟
              </button>
            </div>
          </div>

          <!-- MINI FOOTER -->
          <div class="flex justify-between items-center" style="border-top: 1px solid rgba(245,242,235,0.08); padding-top: 1.5rem;">
            <div class="micro-cap" style="font-size: 0.65rem;">curated collections / active deposits</div>
            <div class="flex gap-4">
              <span class="micro-cap" style="font-size: 0.65rem; color: var(--accent-gold);">FULLY VERIFIED CHANNELS</span>
            </div>
          </div>
        </div>
      </div>

      <!-- ROTATING BADGE STAMP ANCHOR -->
      <div class="stamp-badge" @click="ui.startOnboarding">
        <svg class="rotating-text" viewBox="0 0 100 100">
          <path id="circlePath" d="M 50, 50 m -37, 0 a 37,37 0 1,1 74,0 a 37,37 0 1,1 -74,0" fill="none" />
          <text font-size="6" font-family="Space Grotesk" letter-spacing="2.6" fill="var(--accent-gold)">
            <textPath href="#circlePath">
              • STABLE YIELD • SECURE DOLLARS • ABSOLUTE PRIVACY 
            </textPath>
          </text>
        </svg>
        <div class="stamp-center">
          <!-- 4 pointed premium star in SVG -->
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 0L14.8 9.2L24 12L14.8 14.8L12 24L9.2 14.8L0 12L9.2 9.2L12 0Z" fill="var(--accent-gold)"/>
          </svg>
        </div>
      </div>

      <!-- RIGHT COLUMN: Warm Off-White / Fine Art -->
      <div class="split-right">
        <div>
          <span class="micro-cap" style="color: var(--text-dark); font-weight: 600;">"THE HARMONY OF STABLE INTEREST"</span>
          <div class="artwork-container">
            <img src="/abstract_artwork.png" class="artwork-image" alt="Abstract modern art rendering" />
          </div>
        </div>

        <div class="flex flex-col gap-2" style="border-top: 1px solid rgba(19, 19, 19, 0.1); padding-top: 1.5rem;">
          <div class="flex justify-between items-center">
            <span style="font-family: var(--font-serif); font-size: 1.5rem; font-style: italic; font-weight: 500;">Corporate Treasury Desk</span>
            <span class="micro-cap" style="color: var(--text-dark); font-weight: 600; font-size: 0.65rem;">v1.0.0</span>
          </div>
          <p style="font-size: 0.85rem; color: #5c564c; line-height: 1.4;">
            Delivering instant routing, secure transfers between accounts, zero currency volatility, and verified institutional yields.
          </p>
        </div>
      </div>

    </div>

    <!-- STATS BAND -->
    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; background: var(--border-light); margin: 4rem 0 6rem; border: 1px solid var(--border-light);" class="fade-up delay-1">
      <div style="padding: 3rem 2rem; background: #131313; text-align: center;">
        <div class="flex items-center justify-center mb-4" style="color: var(--accent-gold);"><Layers :size="24" /></div>
        <div class="display-lg" style="font-weight: 300;">{{ Math.floor(displayBonds) || '...' }}</div>
        <div class="micro-cap mt-4" style="font-size: 0.65rem;">ACTIVE INTEREST POOLS</div>
      </div>
      <div style="padding: 3rem 2rem; background: #131313; text-align: center;">
        <div class="flex items-center justify-center mb-4" style="color: var(--text-main);"><Globe :size="24" /></div>
        <div class="display-lg" style="font-weight: 300;">{{ Math.floor(displayChains) || '...' }}</div>
        <div class="micro-cap mt-4" style="font-size: 0.65rem;">SECURED CHANNELS</div>
      </div>
      <div style="padding: 3rem 2rem; background: #131313; text-align: center;">
        <div class="flex items-center justify-center mb-4" style="color: var(--accent-gold);"><Zap :size="24" /></div>
        <div class="display-lg" style="font-weight: 300;">{{ Math.floor(displayPositions) }}</div>
        <div class="micro-cap mt-4" style="font-size: 0.65rem;">ACTIVE SAVINGS ACCOUNTS</div>
      </div>
    </div>

    <!-- EXTRA VALUE PROPOSITIONS -->
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-bottom: 4rem;" class="fade-up delay-2">
      <div class="glass-panel" style="border: 1px solid var(--border-light); padding: 3rem;">
        <h3 style="font-family: var(--font-serif); font-size: 1.8rem; font-weight: 400; color: var(--accent-gold); margin-bottom: 1rem;">Instant Settlements</h3>
        <p class="text-mute" style="font-size: 0.95rem; line-height: 1.6;">
          Natively powered by high-speed dollar routing. Experience sub-second transaction times, institutional security, and automatic interest distributions. No wire delays, no manual conversions.
        </p>
      </div>
      <div class="glass-panel" style="border: 1px solid var(--border-light); padding: 3rem;">
        <h3 style="font-family: var(--font-serif); font-size: 1.8rem; font-weight: 400; color: var(--text-main); margin-bottom: 1rem;">Predictable Dollar Stability</h3>
        <p class="text-mute" style="font-size: 0.95rem; line-height: 1.6;">
          Every single savings pool and automatic payout is denominated in standard digital dollars (USDC). Eliminate currency fluctuations and enjoy completely free, predictable transactions.
        </p>
      </div>
    </div>
  </div>
</template>
