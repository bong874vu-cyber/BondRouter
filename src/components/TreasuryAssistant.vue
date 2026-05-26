<script setup>
import { computed, watch, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUIStore } from '../stores/ui'
import { useWeb3Store } from '../stores/web3'
import { 
  Sparkles, HelpCircle, Shield, X, ArrowRight, ArrowLeft, 
  Check, Play, Info, Eye, DollarSign, RefreshCw, ShieldAlert
} from 'lucide-vue-next'

const ui = useUIStore()
const web3 = useWeb3Store()
const router = useRouter()
const route = useRoute()

const assistantOpen = computed(() => ui.assistantOpen)
const activeStep = computed(() => ui.onboardingStep)

// Auto-navigate user to correct routes during guided walkthrough
watch(() => ui.onboardingStep, (newStep) => {
  if (!ui.onboardingActive) return
  if (newStep === 0) router.push('/')
  else if (newStep === 1 || newStep === 2) router.push('/discover')
  else if (newStep === 3 || newStep === 4) router.push('/portfolio')
  else if (newStep === 5) router.push('/darkpool')
})

const currentPath = computed(() => route.path)

// Explanations for the active screen (Analogy & Everyday Terms)
const contextHelp = computed(() => {
  if (currentPath.value === '/') {
    return {
      title: "Welcome to Your Global Treasury Portal",
      concept: "Think of this as a premium digital savings desk. We aggregate top-tier institutional interest pools worldwide and let you grow your capital securely.",
      analogy: "Instead of traditional banks taking weeks to wire money and giving you 0.1% interest, this system uses high-speed stable dollar technology (USDC) to fetch live interest options up to 10-15% annually, settled instantly.",
      trust: "Every dollar is held in USDC—a digital currency fully backed 1:1 by highly secure, liquid cash reserves.",
      action: "Click 'Enter the Desk' or 'Discover Yield' above to browse live interest pools."
    }
  } else if (currentPath.value === '/discover') {
    return {
      title: "How to Browse and Deposit",
      concept: "Here you see live interest rates offered by top institutional financial providers. You can sort by rates, security ratings, or provider.",
      analogy: "It's like comparing savings accounts on a premium site. The 'Stability Rating' (Low/Medium/High Risk) tells you how established and safe each pool is based on total deposits.",
      trust: "All transfers are carried out using Circle's CCTP network—an ultra-secure, government-compliant system that relocates digital dollars between blockchains with zero loss.",
      action: "Choose an option with high interest (APY), click 'Deposit', enter your amount, and authorize the link. Our system automatically covers all network processing fees for you."
    }
  } else if (currentPath.value === '/portfolio') {
    return {
      title: "Tracking Your Wealth & Distributions",
      concept: "This is your active savings balance sheet. You can see your total deposits, earnings collected so far, and a 12-month exponential growth forecast.",
      analogy: "The 'Waterfall Distributor' at the bottom acts as a smart digital accountant. When you collect interest, it automatically splits the earnings based on your customized splits.",
      trust: "Every transaction produces a verifiable receipt. You don't have to trust anyone—you can instantly audit the receipts with one click.",
      action: "Click 'Collect Earnings' when you have accumulated interest. It will instantly execute your smart distribution splits in the background."
    }
  } else if (currentPath.value === '/darkpool') {
    return {
      title: "Shielded Block Trading",
      concept: "A secure, private channel designed for large institutional transactions where you want to buy or sell interest assets without alerting the public market.",
      analogy: "In standard finance, when a large firm buys millions in treasury bonds, competitors copy them, driving the price up (slippage). Here, your trade size is sealed inside a cryptographic vault. Only you and the matching seller know the details.",
      trust: "Natively secured by Arc Opt-In Privacy. Your business secrets remain yours alone.",
      action: "Choose an asset, enter a shielded amount and limit price, and submit. The matching engine handles the rest privately."
    }
  }
  return null
})

// Guided tour steps configuration
const tourSteps = [
  {
    title: "1. Welcome to the Global Treasury 🏛️",
    content: "Welcome to BondRouter OS. We've built a human-first interest portal. Here, you can put your digital stable dollars (USDC) to work, earning high yields from fully-backed real-world asset pools without any technical complexity.",
    tip: "You never need to learn blockchain jargon to use this desk."
  },
  {
    title: "2. The Interest Marketplace 📊",
    content: "We are now in the Marketplace. This aggregates live interest accounts from the safest institutional providers globally. You can compare annual returns (APY) and stability ratings side-by-side.",
    tip: "Every provider is strictly verified and vetted."
  },
  {
    title: "3. Simple 1-Click Deposits ⚡",
    content: "Depositing capital into these pools is simple. Clicking 'Deposit' opens a secure pane. Our Relayer network handles all behind-the-scenes movement, bridges, and pays all transaction processing fees on your behalf. Just sign and start earning.",
    tip: "We keep transactions free and automatic for you."
  },
  {
    title: "4. Your Active Treasury Desk 📁",
    content: "We've transitioned to your Portfolio. This dashboard displays your consolidated digital dollar balances, your cumulative earnings-to-date, and an automated 12-month future savings projection.",
    tip: "Toggle the chart to model different compounding frequencies."
  },
  {
    title: "5. Smart Interest Waterfall 💧",
    content: "At the bottom is your Smart Distribution Waterfall. When you collect earnings, this automatically routes your capital: 80% directly back into secure corporate reserves, 10% converted to digital Euros (EURC) for global payouts, and 10% re-invested to compound automatically.",
    tip: "No manual steps or wires required."
  },
  {
    title: "6. Shielded Block Trading (Dark Pool) 🛡️",
    content: "Finally, this is the Private Block Trading desk. For large-volume operations, public ledgers expose your intentions. We encrypt your order size entirely. Only the matching party executes with you, guaranteeing absolute privacy and zero slippage.",
    tip: "Zero-knowledge cryptography ensures absolute trade shielding."
  }
]

function handleStartTour() {
  ui.startOnboarding()
}

function handleCloseTour() {
  ui.endOnboarding()
}
</script>

<template>
  <!-- GUIDED WALKTHROUGH OVERLAY CARD -->
  <div v-if="ui.onboardingActive" class="tour-overlay-container">
    <div class="tour-card fade-up">
      <div class="tour-header">
        <div class="flex items-center gap-2">
          <Sparkles :size="16" color="var(--accent-gold)" class="pulse" />
          <span class="micro-cap" style="color: var(--accent-gold); font-weight: 700;">GUIDED TOUR • STEP {{ activeStep + 1 }}/{{ tourSteps.length }}</span>
        </div>
        <button class="tour-close-btn" @click="handleCloseTour">
          <X :size="14" />
        </button>
      </div>

      <div class="tour-body">
        <h3 class="tour-step-title">{{ tourSteps[activeStep].title }}</h3>
        <p class="tour-step-content">{{ tourSteps[activeStep].content }}</p>
        
        <div class="tour-tip-box">
          <Shield :size="14" color="var(--accent-success)" style="flex-shrink:0; margin-top:2px;" />
          <span class="tour-tip-text"><strong>Safety Tip:</strong> {{ tourSteps[activeStep].tip }}</span>
        </div>
      </div>

      <div class="tour-footer">
        <button 
          v-if="activeStep > 0" 
          class="btn-tour-nav btn-prev" 
          @click="ui.prevOnboarding"
        >
          <ArrowLeft :size="14" /> Back
        </button>
        <div v-else></div>

        <div class="tour-dots">
          <span 
            v-for="(step, idx) in tourSteps" 
            :key="idx" 
            class="tour-dot" 
            :class="{ 'active': idx === activeStep }"
          ></span>
        </div>

        <button 
          v-if="activeStep < tourSteps.length - 1" 
          class="btn-tour-nav btn-next" 
          @click="ui.nextOnboarding"
        >
          Next <ArrowRight :size="14" />
        </button>
        <button 
          v-else 
          class="btn-tour-primary" 
          @click="handleCloseTour"
        >
          Finish Tour <Check :size="14" />
        </button>
      </div>
    </div>
  </div>

  <!-- FLOATING CONTEXT ASSISTANT WIDGET -->
  <div class="assistant-wrapper">
    <!-- Floating Pulsing Bubble Trigger -->
    <button 
      class="floating-trigger" 
      :class="{ 'active': assistantOpen }" 
      @click="ui.toggleAssistant"
      aria-label="Toggle Treasury Assistant"
    >
      <HelpCircle v-if="!assistantOpen" :size="22" class="trigger-icon" />
      <X v-else :size="22" class="trigger-icon" />
      <span class="trigger-badge" v-if="!ui.hasSeenWelcome">Start Tour</span>
      <span class="trigger-pulse" v-if="!assistantOpen"></span>
    </button>

    <!-- Contextual Information Card -->
    <div v-if="assistantOpen" class="assistant-card fade-up">
      <div class="assistant-header">
        <div class="flex items-center gap-2">
          <LandmarkIcon class="assistant-logo-icon" />
          <div>
            <h4 class="assistant-title">Treasury Assistant</h4>
            <p class="assistant-subtitle">Human-First Finance Copilot</p>
          </div>
        </div>
        <button class="assistant-close-btn" @click="ui.toggleAssistant">
          <X :size="14" />
        </button>
      </div>

      <div class="assistant-body" v-if="contextHelp">
        <!-- Quick Context Summary -->
        <div class="context-section">
          <div class="flex items-center gap-2 mb-2">
            <Info :size="14" color="var(--accent-gold)" />
            <span class="section-label">Where you are</span>
          </div>
          <h5 class="context-heading">{{ contextHelp.title }}</h5>
          <p class="context-desc">{{ contextHelp.concept }}</p>
        </div>

        <!-- Non-Technical Analogy Layer -->
        <div class="context-section bg-bevel">
          <div class="flex items-center gap-2 mb-2">
            <Sparkles :size="14" color="var(--accent-success)" />
            <span class="section-label">How it works (Simplified)</span>
          </div>
          <p class="analogy-desc">{{ contextHelp.analogy }}</p>
        </div>

        <!-- Trust & Reassurance Indicators -->
        <div class="context-section border-subtle">
          <div class="flex items-center gap-2 mb-2">
            <Shield :size="14" color="var(--accent-secondary)" />
            <span class="section-label">Safety & Security Guarantee</span>
          </div>
          <p class="trust-desc">{{ contextHelp.trust }}</p>
          <div class="flex gap-2 mt-3 flex-wrap">
            <span class="badge-mini"><Shield :size="10" /> 100% Asset-Backed</span>
            <span class="badge-mini"><DollarSign :size="10" /> Verified USDC</span>
            <span class="badge-mini"><RefreshCw :size="10" /> Free Routing</span>
          </div>
        </div>

        <!-- Action Guide -->
        <div class="action-footer mt-4">
          <p class="action-instruction">👉 {{ contextHelp.action }}</p>
        </div>
      </div>

      <!-- Quick Tour Launcher -->
      <div class="assistant-footer">
        <button class="btn-tour-launch" @click="handleStartTour">
          <Play :size="12" /> Launch 1-Min Guided Walkthrough
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.assistant-wrapper {
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 1rem;
}

.floating-trigger {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--accent-gold);
  color: var(--text-dark);
  border: 1px solid var(--accent-gold);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.4);
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  outline: none;
}

.floating-trigger:hover {
  transform: scale(1.05) translateY(-2px);
  background: #d4bd9a;
  border-color: #d4bd9a;
}

.floating-trigger.active {
  background: #181818;
  color: var(--text-main);
  border-color: var(--border-light);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.6);
}

.trigger-badge {
  position: absolute;
  right: calc(100% + 12px);
  top: 50%;
  transform: translateY(-50%);
  background: var(--accent-gold);
  color: var(--text-dark);
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: 0.35rem 0.75rem;
  border-radius: 9999px;
  white-space: nowrap;
  pointer-events: none;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
  animation: floatBadge 3s ease-in-out infinite;
}

@keyframes floatBadge {
  0%, 100% { transform: translateY(-50%) translateX(0); }
  50% { transform: translateY(-50%) translateX(-4px); }
}

.trigger-pulse {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  border-radius: 50%;
  border: 2px solid var(--accent-gold);
  opacity: 0;
  animation: pulseTrigger 2s cubic-bezier(0.16, 1, 0.3, 1) infinite;
  pointer-events: none;
}

@keyframes pulseTrigger {
  0% { transform: scale(1); opacity: 0.5; }
  100% { transform: scale(1.4); opacity: 0; }
}

/* Assistant Panel Card */
.assistant-card {
  width: 380px;
  max-width: 90vw;
  background: rgba(20, 20, 20, 0.9);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--border-light);
  border-radius: 0px;
  box-shadow: 0 15px 40px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
}

.assistant-card::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0; height: 3px;
  background: var(--accent-gold);
}

.assistant-header {
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--border-light);
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(0, 0, 0, 0.15);
}

.assistant-logo-icon {
  width: 18px;
  height: 18px;
  color: var(--accent-gold);
}

.assistant-title {
  font-size: 0.88rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: var(--text-main);
}

.assistant-subtitle {
  font-size: 0.65rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-top: 0.05rem;
}

.assistant-close-btn {
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  transition: all 0.2s ease;
}

.assistant-close-btn:hover {
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-main);
}

.assistant-body {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  max-height: 480px;
  overflow-y: auto;
}

.context-section {
  display: flex;
  flex-direction: column;
}

.section-label {
  font-size: 0.62rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text-muted);
}

.context-heading {
  font-family: var(--font-serif);
  font-size: 1.15rem;
  font-weight: 500;
  color: var(--accent-gold);
  margin-bottom: 0.4rem;
}

.context-desc, .analogy-desc, .trust-desc {
  font-size: 0.78rem;
  line-height: 1.5;
  color: #c9c5bc;
}

.analogy-desc {
  font-style: italic;
}

.bg-bevel {
  background: rgba(255, 255, 255, 0.02);
  border-left: 2px solid var(--accent-success);
  padding: 0.75rem 1rem;
  margin-top: 0.25rem;
}

.border-subtle {
  border-top: 1px solid var(--border-light);
  padding-top: 1rem;
}

.badge-mini {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.2rem 0.5rem;
  font-size: 0.6rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--text-muted);
  border: 1px solid var(--border-light);
}

.action-instruction {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--accent-gold);
  background: rgba(191, 168, 133, 0.05);
  border: 1px dashed rgba(191, 168, 133, 0.2);
  padding: 0.6rem 0.8rem;
  text-align: center;
}

.assistant-footer {
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--border-light);
  background: rgba(0, 0, 0, 0.1);
  display: flex;
}

.btn-tour-launch {
  width: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.65rem 1rem;
  background: var(--accent-gold);
  color: var(--text-dark);
  border: none;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-tour-launch:hover {
  background: #d4bd9a;
}

/* Tour Walkthrough Modal Styles */
.tour-overlay-container {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  z-index: 2000;
  background: rgba(10, 10, 10, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
}

.tour-card {
  width: 480px;
  max-width: 90vw;
  background: #181818;
  border: 1px solid var(--accent-gold);
  border-radius: 0px;
  box-shadow: 0 25px 60px rgba(0,0,0,0.8);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
  padding: 2rem;
}

.tour-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.tour-close-btn {
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 1px solid var(--border-light);
  transition: all 0.2s ease;
}

.tour-close-btn:hover {
  border-color: var(--accent-gold);
  color: var(--text-main);
}

.tour-body {
  margin-bottom: 2rem;
}

.tour-step-title {
  font-family: var(--font-serif);
  font-size: 1.5rem;
  font-weight: 500;
  color: var(--text-main);
  margin-bottom: 0.75rem;
}

.tour-step-content {
  font-size: 0.88rem;
  line-height: 1.6;
  color: #c9c5bc;
  margin-bottom: 1.25rem;
}

.tour-tip-box {
  background: rgba(195, 232, 141, 0.05);
  border: 1px solid rgba(195, 232, 141, 0.2);
  padding: 0.8rem 1rem;
  display: flex;
  gap: 0.75rem;
}

.tour-tip-text {
  font-size: 0.75rem;
  color: #c3e88d;
  line-height: 1.4;
}

.tour-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid var(--border-light);
  padding-top: 1.25rem;
}

.btn-tour-nav {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 1rem;
  background: transparent;
  border: 1px solid var(--border-light);
  color: var(--text-main);
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-tour-nav:hover {
  border-color: var(--accent-gold);
  color: var(--accent-gold);
}

.btn-tour-primary {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.55rem 1.25rem;
  background: var(--accent-gold);
  color: var(--text-dark);
  border: 1px solid var(--accent-gold);
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-tour-primary:hover {
  background: #d4bd9a;
}

.tour-dots {
  display: flex;
  gap: 0.4rem;
}

.tour-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.15);
  transition: all 0.3s ease;
}

.tour-dot.active {
  background: var(--accent-gold);
  transform: scale(1.2);
}

.pulse {
  animation: pulseGold 2s infinite;
}

@keyframes pulseGold {
  0% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.15); opacity: 0.8; }
  100% { transform: scale(1); opacity: 1; }
}
</style>
