<script setup>
import { ref, computed } from 'vue'
import { useBondStore } from '../stores/bond'
import { useUIStore } from '../stores/ui'
import { useNumberCounter } from '../composables/useCounter'
import { ArrowRight, Globe, Layers, Zap } from 'lucide-vue-next'
import OnboardingWizard from '../components/OnboardingWizard.vue'
import { blogPosts } from '../data/blogPosts'

const store = useBondStore()
const ui = useUIStore()
const showWizard = ref(false)

const displayBonds = useNumberCounter(computed(() => store.marketBonds.length))
const displayChains = useNumberCounter(computed(() => store.chains.length))
const displayPositions = useNumberCounter(computed(() => store.portfolio.length))

const featuredPosts = computed(() => blogPosts.slice(0, 3))
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
              <button @click="showWizard = true" class="btn-editorial-dark" style="background: var(--accent-primary); border-color: var(--accent-primary); color: #131313;">
                OPEN CORPORATE TREASURY 🌟
              </button>
              <RouterLink to="/discover" class="btn-glass" style="border-radius: 9999px; padding: 0.8rem 1.8rem;">
                ENTER THE DESK
              </RouterLink>
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

    <!-- FEATURED INSIGHTS SECTION -->
    <div class="fade-up delay-3" style="margin: 6rem 0 4rem;">
      <div class="flex justify-between items-end border-b pb-4 mb-8" style="border-color: var(--border-light);">
        <div>
          <span class="micro-cap" style="color: var(--accent-gold);">Treasury Intelligence</span>
          <h2 class="display-lg" style="font-size: 2.25rem; margin-top: 0.25rem;">Featured Insights & Analysis</h2>
        </div>
        <RouterLink to="/blog" class="btn-link" style="font-size: 0.85rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--accent-gold); text-decoration: none; display: flex; align-items: center; gap: 0.5rem;">
          View All Insights <ArrowRight :size="16" />
        </RouterLink>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 2rem;">
        <RouterLink 
          v-for="post in featuredPosts" 
          :key="post.slug"
          :to="'/blog/' + post.slug"
          class="home-blog-card glass-panel"
        >
          <div class="home-blog-tag">{{ post.category }}</div>
          <h3 class="home-blog-title">{{ post.title }}</h3>
          <p class="home-blog-desc text-mute">{{ post.summary }}</p>
          <span class="home-blog-link">
            Read Article <ArrowRight :size="12" />
          </span>
        </RouterLink>
      </div>
    </div>

    <!-- Onboarding Setup Wizard Overlay -->
    <OnboardingWizard :isOpen="showWizard" @close="showWizard = false" />
  </div>
</template>

<style scoped>
.home-blog-card {
  display: flex;
  flex-direction: column;
  text-decoration: none;
  color: inherit;
  border: 1px solid var(--border-light);
  padding: 2.25rem;
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  height: 100%;
}

.home-blog-card:hover {
  border-color: var(--accent-gold);
  transform: translateY(-4px);
}

.home-blog-tag {
  align-self: flex-start;
  background: rgba(191, 168, 133, 0.05);
  border: 1px solid rgba(191, 168, 133, 0.15);
  color: var(--accent-gold);
  font-size: 0.6rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  padding: 0.25rem 0.5rem;
  margin-bottom: 1.25rem;
}

.home-blog-title {
  font-family: var(--font-serif);
  font-size: 1.35rem;
  line-height: 1.3;
  margin-bottom: 0.75rem;
  font-weight: 500;
  color: var(--text-main);
  transition: color 0.3s ease;
}

.home-blog-card:hover .home-blog-title {
  color: var(--accent-gold);
}

.home-blog-desc {
  font-size: 0.85rem;
  line-height: 1.5;
  margin-bottom: 1.5rem;
  flex-grow: 1;
}

.home-blog-link {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-muted);
  transition: all 0.3s ease;
}

.home-blog-card:hover .home-blog-link {
  color: var(--accent-gold);
  gap: 0.5rem;
}

.btn-link:hover {
  color: var(--text-main) !important;
}
</style>

