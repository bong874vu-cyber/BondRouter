<script setup>
import { ref, computed } from 'vue'
import { 
  BookOpen, HelpCircle, ShieldCheck, Terminal, Search, 
  ChevronDown, ArrowRight, Check, Copy, ExternalLink, Shield, Zap
} from 'lucide-vue-next'
import { useUIStore } from '../stores/ui'

const ui = useUIStore()
const activeTab = ref('manual') // 'manual', 'tech', 'faq'
const searchQuery = ref('')
const copiedText = ref(false)

const handleCopyCode = () => {
  const code = `// Secure Corporate Treasury Integration
const treasury = new BondRouterClient({
  accountKey: "YOUR_SECURE_KEY",
  sponsoredRouting: true
});

// Deposit 5,000 USDC and set auto-compounding
await treasury.depositAndCompound({
  amount: 5000,
  asset: "US_TREASURY_BILL_90D",
  routingSplit: {
    reserves: 0.8,
    payroll: 0.1,
    reinvest: 0.1
  }
});`
  navigator.clipboard.writeText(code)
  copiedText.value = true
  ui.addToast('CODE PRICIPLES COPIED!', 'success')
  setTimeout(() => {
    copiedText.value = false
  }, 2000)
}

const faqs = [
  {
    q: "Why are transaction processing fees completely sponsored and free?",
    a: "In traditional blockchain setups, users must buy and hold volatile native utility tokens just to pay for network processing (gas). Our architecture uses a secure Relayer network. When you authorize a deposit, our Relayers cover all network fees behind the scenes. You only interact with secure digital dollars (USDC) with zero transaction friction.",
    open: ref(false)
  },
  {
    q: "How does the Smart Distribution Waterfall guarantee funds are routed correctly?",
    a: "The smart distribution waterfall acts as an automated, cryptographically sealed digital accountant. Once you collect earned interest, it is programmatically split and moved via automated settlement rules (e.g. 80% to reserves, 10% to payouts, 10% to growth) directly inside the secure ledger. There are no manual wires or bank holds.",
    open: ref(false)
  },
  {
    q: "What is Circle CCTP and how does it secure cross-chain dollar movements?",
    a: "Circle's CCTP (Cross-Chain Transfer Protocol) is an institutional-grade security standard. Instead of using highly vulnerable third-party token bridges, CCTP natively locks stable dollars on the origin network, validates the transaction directly with Circle, and safely releases them on the target network. It is the gold standard for secure digital dollar routing.",
    open: ref(false)
  },
  {
    q: "Why is Shielded Block Trading necessary for larger volumes?",
    a: "Public blockchain ledgers expose all order sizes and prices immediately. If an institution attempts to acquire or sell $1,000,000 in interest assets, front-runners copy the trade, causing unfavorable price adjustments (slippage). Our private block desk seals your order details in a secure cryptographic vault. Only the matched buyer and seller confirm the trade parameters, guaranteeing absolute market privacy.",
    open: ref(false)
  },
  {
    q: "Are my funds locked, and is the digital dollar (USDC) safe?",
    a: "No funds are locked arbitrarily. You can withdraw your deposits and accumulated interest at any time with 1-click execution. USDC is a fully collateralized digital currency backed 1:1 by highly secure, liquid US dollar reserves, subject to rigorous regulatory audits.",
    open: ref(false)
  }
]

const filteredFaqs = computed(() => {
  if (!searchQuery.value) return faqs
  const query = searchQuery.value.toLowerCase()
  return faqs.filter(f => f.q.toLowerCase().includes(query) || f.a.toLowerCase().includes(query))
})

const toggleFaq = (faq) => {
  faq.open.value = !faq.open.value
}
</script>

<template>
  <div class="page-container fade-in" style="padding-top: 6.5rem;">
    <!-- HEADER -->
    <div class="flex flex-col md:flex-row md:items-end justify-between border-b pb-8 mb-8" style="border-color: var(--border-light);">
      <div>
        <div class="flex items-center gap-2 mb-2 micro-cap" style="color: var(--accent-gold);">
          <BookOpen :size="14" /> SECURE RESOURCE HUB
        </div>
        <h1 class="display-xl text-gradient">DOCUMENTATION CENTER</h1>
        <p class="body-md text-mute mt-2" style="max-width: 580px; font-size: 0.95rem; line-height: 1.5;">
          Understand the mechanics behind your unified treasury. Learn about our secure routing, automated splits, and absolute trade shielding in clean, non-technical terms.
        </p>
      </div>

      <!-- Live Search Box (FAQ tab) -->
      <div v-if="activeTab === 'faq'" class="search-container mt-4 md:mt-0">
        <Search :size="16" class="search-icon" />
        <input 
          type="text" 
          class="search-input" 
          placeholder="Search security or mechanics..." 
          v-model="searchQuery" 
        />
      </div>
    </div>

    <!-- DOCUMENTATION NAVIGATION TABS -->
    <div class="flex gap-4 border-b mb-8" style="border-color: var(--border-light); padding-bottom: 1px;">
      <button 
        class="doc-tab-btn" 
        :class="{ 'active': activeTab === 'manual' }" 
        @click="activeTab = 'manual'"
      >
        <BookOpen :size="14" /> User Manual
      </button>
      <button 
        class="doc-tab-btn" 
        :class="{ 'active': activeTab === 'tech' }" 
        @click="activeTab = 'tech'"
      >
        <Terminal :size="14" /> Under the Hood
      </button>
      <button 
        class="doc-tab-btn" 
        :class="{ 'active': activeTab === 'faq' }" 
        @click="activeTab = 'faq'"
      >
        <HelpCircle :size="14" /> Interactive FAQs
      </button>
    </div>

    <!-- TAB CONTENT: USER MANUAL -->
    <div v-if="activeTab === 'manual'" class="fade-in grid-doc-layout">
      <!-- Left Editorial Guide -->
      <div class="flex flex-col gap-6">
        <div class="glass-panel" style="padding: 2rem;">
          <h3 class="manual-heading">1. Connecting Your Account</h3>
          <p class="manual-desc">
            To start generating interest, click <strong>"Connect Account"</strong> at the top right of your workspace. 
            Choose MetaMask, Coinbase, or any secure gateway link. Unlike legacy banking portals that require vulnerable passwords, this interface uses certified secure authentication keys to log you in.
          </p>
        </div>

        <div class="glass-panel" style="padding: 2rem;">
          <h3 class="manual-heading">2. Selecting & Depositing Capital</h3>
          <p class="manual-desc">
            Navigate to the <strong>"Discover Yield"</strong> desk. You'll see real-time institutional-grade interest pools. 
            Review the Annual Interest (APY) and the Stability Rating (which assesses asset volume). Click <strong>"Deposit"</strong>, 
            enter your digital dollar (USDC) amount, and authorize the link. Your funds will route and immediately start compounding.
          </p>
        </div>

        <div class="glass-panel" style="padding: 2rem;">
          <h3 class="manual-heading">3. Configuring Automated Splits</h3>
          <p class="manual-desc">
            Visit <strong>"My Treasury"</strong> to see your active growth. When you select <strong>"Collect Earnings"</strong>, 
            our Smart Distribution Waterfall executes instantly in the background. It takes your interest, routes 80% to corporate reserves, 
            10% to global contractor payrolls (converted to digital Euros), and 10% back into active growth. Fully programmable, zero manual delays.
          </p>
        </div>
      </div>

      <!-- Right Feature Showcase -->
      <div class="flex flex-col gap-6">
        <div class="glass-panel border-gold" style="padding: 2.5rem; background: rgba(191,168,133,0.02);">
          <h4 style="font-family: var(--font-serif); font-size: 1.35rem; color: var(--accent-gold); margin-bottom: 1rem;">Platform Guarantees</h4>
          
          <ul class="flex flex-col gap-4">
            <li class="flex items-start gap-3">
              <ShieldCheck :size="18" color="var(--accent-success)" style="margin-top: 2px; flex-shrink: 0;" />
              <div>
                <span class="bullet-title">100% Backed Reserves</span>
                <p class="bullet-desc">Every dollar inside the platform is represented by Circle USDC, secured 1:1 by liquid Cash and US Treasuries.</p>
              </div>
            </li>
            <li class="flex items-start gap-3">
              <Zap :size="18" color="var(--accent-secondary)" style="margin-top: 2px; flex-shrink: 0;" />
              <div>
                <span class="bullet-title">Sponsored Free Transactions</span>
                <p class="bullet-desc">No network gas assets are ever required. All transfer costs are programmatically sponsored by our secure Relayers.</p>
              </div>
            </li>
            <li class="flex items-start gap-3">
              <Shield :size="18" color="var(--accent-primary)" style="margin-top: 2px; flex-shrink: 0;" />
              <div>
                <span class="bullet-title">Cryptographic Shielding</span>
                <p class="bullet-desc">Your corporate positions and trades remain entirely sealed from external public front-running.</p>
              </div>
            </li>
          </ul>
        </div>

        <button @click="ui.startOnboarding" class="btn-primary" style="width: 100%; padding: 1rem;">
          LAUNCH GUIDED APP WALKTHROUGH 🌟
        </button>
      </div>
    </div>

    <!-- TAB CONTENT: UNDER THE HOOD -->
    <div v-else-if="activeTab === 'tech'" class="fade-in grid-doc-layout">
      <!-- Explanatory Panel -->
      <div class="flex flex-col gap-6">
        <div class="glass-panel" style="padding: 2rem;">
          <h3 class="manual-heading">Simplified Architecture</h3>
          <p class="manual-desc mb-4">
            BondRouter OS coordinates institutional stablecoin commerce by linking the high-speed **Arc Network** (which natively uses USDC for sub-second, zero-cost processing) with standard stablecoin bridges.
          </p>

          <div style="background: rgba(0,0,0,0.3); border: 1px solid var(--border-light); padding: 1.25rem; font-family: monospace; font-size: 0.78rem; line-height: 1.6; color: var(--accent-gold);" class="mb-4">
            [Your Secured Wallet] <br>
            &nbsp;&nbsp;&nbsp;&nbsp;│  (Sign Secure Account Link)<br>
            &nbsp;&nbsp;&nbsp;&nbsp;▼<br>
            [Automated Relayer Network] ──► (Pays Network Fees)<br>
            &nbsp;&nbsp;&nbsp;&nbsp;│<br>
            &nbsp;&nbsp;&nbsp;&nbsp;├──► [Circle CCTP Link] ──► (Safe 1:1 Asset Relocation)<br>
            &nbsp;&nbsp;&nbsp;&nbsp;▼<br>
            [High-Speed Arc Treasury Vault] ──► (Generates APY Yield)<br>
            &nbsp;&nbsp;&nbsp;&nbsp;│<br>
            &nbsp;&nbsp;&nbsp;&nbsp;└─► [Smart Waterfall Router] ──► Auto Splits Interest
          </div>
          <p class="manual-desc">
            This visual pipeline guarantees that you never have to deal with manual wallets, network switches, gas assets, or transaction estimation reverts.
          </p>
        </div>
      </div>

      <!-- Code Snippets / Developer Desk -->
      <div class="flex flex-col gap-4">
        <div class="glass-panel" style="padding: 2rem;">
          <div class="flex justify-between items-center mb-4">
            <span class="micro-cap" style="color: var(--accent-secondary);">DEVELOPER INTEGRATION PRIMITIVE</span>
            <button class="btn-glass flex items-center gap-2" style="padding: 0.4rem 0.8rem; font-size: 0.65rem;" @click="handleCopyCode">
              <Copy v-if="!copiedText" :size="12" />
              <Check v-else :size="12" color="var(--accent-success)" />
              {{ copiedText ? 'COPIED!' : 'COPY PRINCIPLES' }}
            </button>
          </div>

          <pre style="background: #0d0d0d; padding: 1.25rem; border-radius: 0px; font-family: monospace; font-size: 0.75rem; color: #a9b2c3; line-height: 1.5; overflow-x: auto; border: 1px solid var(--border-light);">
<span style="color: #c792ea;">import</span> { BondRouterClient } <span style="color: #c792ea;">from</span> <span style="color: #c3e88d;">'@bondrouter/sdk'</span>;

<span style="color: #89ddff;">// Secure Corporate Treasury Integration</span>
<span style="color: #c792ea;">const</span> treasury = <span style="color: #c792ea;">new</span> <span style="color: #ffcb6b;">BondRouterClient</span>({
  accountKey: <span style="color: #c3e88d;">"YOUR_SECURE_KEY"</span>,
  sponsoredRouting: <span style="color: #ff9cac;">true</span>
});

<span style="color: #89ddff;">// Deposit 5,000 USDC and set auto-compounding</span>
<span style="color: #c792ea;">await</span> treasury.depositAndCompound({
  amount: <span style="color: #f78c6c;">5000</span>,
  asset: <span style="color: #c3e88d;">"US_TREASURY_BILL_90D"</span>,
  routingSplit: {
    reserves: <span style="color: #f78c6c;">0.8</span>,
    payroll: <span style="color: #f78c6c;">0.1</span>,
    reinvest: <span style="color: #f78c6c;">0.1</span>
  }
});</pre>
        </div>
      </div>
    </div>

    <!-- TAB CONTENT: INTERACTIVE FAQs -->
    <div v-else class="fade-in flex flex-col gap-4" style="max-width: 800px; margin: 0 auto;">
      <div v-if="filteredFaqs.length === 0" class="flex flex-col items-center justify-center py-8 text-center">
        <HelpCircle :size="48" color="var(--text-muted)" style="opacity: 0.5; margin-bottom: 1rem;" />
        <span class="micro-cap text-mute">NO FAQ MATCHES FOUND FOR "{{ searchQuery }}"</span>
      </div>

      <div 
        v-else
        v-for="(faq, i) in filteredFaqs" 
        :key="i" 
        class="glass-panel cursor-pointer faq-item" 
        :class="{ 'active': faq.open.value }"
        @click="toggleFaq(faq)"
        style="padding: 1.5rem 2rem; border: 1px solid var(--border-light); transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);"
      >
        <div class="flex justify-between items-center">
          <h4 style="font-family: var(--font-serif); font-size: 1.15rem; color: var(--text-main); font-weight: 500;">
            {{ faq.q }}
          </h4>
          <ChevronDown 
            :size="18" 
            color="var(--accent-gold)" 
            style="transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);"
            :style="{ transform: faq.open.value ? 'rotate(180deg)' : 'rotate(0deg)' }"
          />
        </div>
        
        <!-- Smooth FAQ Content Reveal -->
        <div 
          class="faq-answer-container"
          :style="{ 
            maxHeight: faq.open.value ? '200px' : '0px',
            opacity: faq.open.value ? 1 : 0,
            marginTop: faq.open.value ? '1rem' : '0px'
          }"
        >
          <p class="body-md text-mute" style="font-size: 0.85rem; line-height: 1.6; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 1rem;">
            {{ faq.a }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.grid-doc-layout {
  display: grid;
  grid-template-columns: 1.3fr 0.7fr;
  gap: 2.5rem;
}

@media (max-width: 991px) {
  .grid-doc-layout {
    grid-template-columns: 1fr;
  }
}

.doc-tab-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem 1.5rem;
  background: transparent;
  border: none;
  color: var(--text-muted);
  font-family: var(--font-sans);
  font-size: 0.78rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.2s ease;
}

.doc-tab-btn:hover {
  color: var(--text-main);
}

.doc-tab-btn.active {
  color: var(--accent-gold);
  border-bottom-color: var(--accent-gold);
}

.manual-heading {
  font-family: var(--font-serif);
  font-size: 1.35rem;
  font-weight: 500;
  color: var(--accent-gold);
  margin-bottom: 0.75rem;
}

.manual-desc {
  font-size: 0.85rem;
  line-height: 1.6;
  color: #c9c5bc;
}

.bullet-title {
  display: block;
  font-weight: 700;
  font-size: 0.8rem;
  color: var(--text-main);
  text-transform: uppercase;
  letter-spacing: 0.02em;
  margin-bottom: 0.15rem;
}

.bullet-desc {
  font-size: 0.75rem;
  line-height: 1.4;
  color: var(--text-muted);
}

/* FAQ Accordion Animations */
.faq-answer-container {
  overflow: hidden;
  transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}

.faq-item.active {
  border-color: var(--accent-gold) !important;
  background: rgba(191, 168, 133, 0.01);
}

.search-container {
  position: relative;
  width: 320px;
  max-width: 100%;
}

.search-input {
  width: 100%;
  padding: 0.75rem 1rem 0.75rem 2.5rem;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--border-light);
  color: var(--text-main);
  font-size: 0.8rem;
  outline: none;
  transition: border-color 0.2s ease;
}

.search-input:focus {
  border-color: var(--accent-gold);
}

.search-icon {
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted);
  pointer-events: none;
}
</style>
