<script setup>
import { ref, computed } from 'vue'
import { useWeb3Store } from '../stores/web3'
import { useUIStore } from '../stores/ui'
import { useRouter } from 'vue-router'
import { 
  Key, 
  ShieldCheck, 
  Coins, 
  Fingerprint, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight,
  Globe,
  Building,
  Sparkles,
  Lock,
  Compass
} from 'lucide-vue-next'

const props = defineProps({
  isOpen: {
    type: Boolean,
    required: true
  }
})

const emit = defineEmits(['close'])

const web3 = useWeb3Store()
const ui = useUIStore()
const router = useRouter()

const currentStep = ref(1) // 1: Passkey, 2: KYC/Whitelist, 3: Faucet
const email = ref('')
const entityName = ref('')
const region = ref('ADGM, UAE')
const isLoading = ref(false)
const localError = ref('')
const txHash = ref('')

const isCompleted = computed(() => {
  return web3.isConnected && web3.isKycVerified && Number(web3.balance) > 0
})

async function triggerPasskeySignup() {
  if (!email.value) {
    localError.value = 'Email address is required.'
    return
  }
  localError.value = ''
  isLoading.value = true
  try {
    ui.addToast("Contacting Circle Sandbox...", "info")
    await web3.loginWithCircleEmbeddedWallet(email.value)
    ui.addToast("Device Passkey Registered Successfully!", "success")
    currentStep.value = 2
  } catch (err) {
    localError.value = err.message || "Failed to register biometric credential."
    ui.addToast("WebAuthn Setup Paused: " + localError.value, "error")
  } finally {
    isLoading.value = false
  }
}

async function triggerComplianceWhitelist() {
  if (!entityName.value) {
    localError.value = 'Entity name is required.'
    return
  }
  localError.value = ''
  isLoading.value = true
  try {
    ui.addToast("Running automated compliance check...", "info")
    // Use server side whitelister on Arc Testnet
    const hash = await web3.whitelistUser(web3.address, true)
    txHash.value = hash
    ui.addToast("Entity whitelisted in ComplianceRegistry on-chain!", "success")
    currentStep.value = 3
  } catch (err) {
    localError.value = err.message || "Whitelist request failed."
    ui.addToast("KYC check failed: " + localError.value, "error")
  } finally {
    isLoading.value = false
  }
}

async function triggerFaucetGrant() {
  localError.value = ''
  isLoading.value = true
  try {
    ui.addToast("Requesting mock USDC grant from gas relayer...", "info")
    const hash = await web3.claimFaucetGrant()
    txHash.value = hash
    ui.addToast("Claimed 10.00 USDC sandbox balance!", "success")
    // Finish onboarding
    ui.addToast("Onboarding Wizard complete! Routing to Discover Yield.", "success")
    setTimeout(() => {
      emit('close')
      router.push('/discover')
    }, 1500)
  } catch (err) {
    localError.value = err.message || "Grant request failed."
    ui.addToast("Faucet request failed: " + localError.value, "error")
  } finally {
    isLoading.value = false
  }
}

function handleClose() {
  emit('close')
}
</script>

<template>
  <div v-if="isOpen" class="modal-overlay">
    <div class="modal-content glass-panel onboarding-card fade-in">
      
      <!-- Stepper Progress -->
      <div class="stepper-header mb-6">
        <div class="flex justify-between items-center mb-2">
          <span class="micro-cap text-gradient" style="font-weight: bold; letter-spacing: 0.1em;">
            CORPORATE ONBOARDING WIZARD
          </span>
          <span class="text-xs text-mute font-mono">Step {{ currentStep }} of 3</span>
        </div>
        
        <div class="step-progress-bar">
          <div 
            class="progress-fill" 
            :style="{ width: ((currentStep - 1) * 50) + '%' }"
          ></div>
          <div class="step-nodes flex justify-between">
            <div class="step-node" :class="{ active: currentStep >= 1, done: currentStep > 1 }">
              <Key :size="12" />
            </div>
            <div class="step-node" :class="{ active: currentStep >= 2, done: currentStep > 2 }">
              <ShieldCheck :size="12" />
            </div>
            <div class="step-node" :class="{ active: currentStep >= 3, done: isCompleted }">
              <Coins :size="12" />
            </div>
          </div>
        </div>
      </div>

      <!-- MAIN CONTAINER -->
      <div class="onboarding-step-body min-h-[280px] flex flex-col justify-between">
        
        <!-- STEP 1: BIOMETRIC KEY CREATION -->
        <div v-if="currentStep === 1" class="space-y-4">
          <div class="text-center py-2">
            <div class="fingerprint-pulse mb-3">
              <Fingerprint :size="48" class="text-accent" />
            </div>
            <h3 class="heading-md text-gradient">Register Biometric Passkey</h3>
            <p class="body-sm text-mute mt-1">
              Create an institutional Smart Contract Account (SCA) using TouchID or FaceID. 
              No seed phrase storage or hardware key configurations are required.
            </p>
          </div>

          <div class="form-group">
            <label class="micro-cap block mb-2 text-mute">CORPORATE EMAIL ADDRESS</label>
            <input 
              type="email" 
              class="text-input font-mono" 
              v-model="email" 
              placeholder="treasurer@company.com" 
              :disabled="isLoading"
              @keyup.enter="triggerPasskeySignup"
            />
          </div>
        </div>

        <!-- STEP 2: REGULATORY WHITELIST -->
        <div v-else-if="currentStep === 2" class="space-y-4">
          <div class="text-center py-2">
            <div class="shield-pulse mb-3">
              <ShieldCheck :size="48" style="color: var(--accent-secondary);" />
            </div>
            <h3 class="heading-md text-gradient" style="--gradient-to: var(--accent-secondary);">Corporate KYC Compliance</h3>
            <p class="body-sm text-mute mt-1">
              Verify your entity credentials to whitelist your newly generated smart contract address in the compliance registry.
            </p>
          </div>

          <div class="space-y-3">
            <div class="form-group">
              <label class="micro-cap block mb-2 text-mute">LEGAL ENTITY NAME</label>
              <div class="input-with-icon">
                <Building :size="14" class="input-icon" />
                <input 
                  type="text" 
                  class="text-input" 
                  v-model="entityName" 
                  placeholder="ACME Capital Holdings Ltd" 
                  :disabled="isLoading"
                  style="padding-left: 2rem;"
                />
              </div>
            </div>
            
            <div class="form-group">
              <label class="micro-cap block mb-2 text-mute">JURISDICTION / REGION</label>
              <div class="input-with-icon">
                <Globe :size="14" class="input-icon" />
                <input 
                  type="text" 
                  class="text-input font-mono" 
                  v-model="region" 
                  placeholder="ADGM, UAE" 
                  :disabled="isLoading"
                  style="padding-left: 2rem;"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- STEP 3: MOCK BALANCE INFLOW -->
        <div v-else-if="currentStep === 3" class="space-y-4">
          <div class="text-center py-2">
            <div class="coins-pulse mb-3">
              <Coins :size="48" style="color: var(--accent-gold);" />
            </div>
            <h3 class="heading-md text-gradient" style="--gradient-to: var(--accent-gold);">Fund Corporate Treasury</h3>
            <p class="body-sm text-mute mt-1">
              Claim a sandbox grant of 10.00 USDC. On Arc Network, USDC is used natively for zero-fee, sub-second settlement.
            </p>
          </div>

          <div class="p-3 border border-border-light bg-black-20 space-y-2" style="border-radius: 0;">
            <div class="flex justify-between text-xs">
              <span class="text-mute">Smart Account:</span>
              <span class="font-mono text-gradient">{{ web3.address.slice(0, 10) }}...{{ web3.address.slice(-8) }}</span>
            </div>
            <div class="flex justify-between text-xs">
              <span class="text-mute">Whitelisted Status:</span>
              <span class="text-success font-bold flex items-center gap-1">
                <CheckCircle2 :size="12" /> ACTIVE
              </span>
            </div>
            <div class="flex justify-between text-xs">
              <span class="text-mute">Network Gas Sponsorship:</span>
              <span class="text-secondary font-bold flex items-center gap-1">
                <Sparkles :size="12" /> SPONSORED ($0 Gas)
              </span>
            </div>
          </div>
        </div>

        <!-- ERROR MESSAGE -->
        <div v-if="localError" class="p-3 bg-red-90 border border-red-500 text-red-200 text-xs flex gap-2 items-start mt-3">
          <AlertCircle :size="16" class="flex-shrink-0 mt-0.5" />
          <span>{{ localError }}</span>
        </div>

        <!-- CONTROLS -->
        <div class="flex gap-3 mt-6 border-t pt-4" style="border-color: rgba(255,255,255,0.05);">
          <button 
            v-if="currentStep > 1 && currentStep < 3" 
            class="btn-secondary" 
            @click="currentStep--" 
            :disabled="isLoading"
          >
            Back
          </button>
          
          <button 
            v-if="currentStep === 1"
            class="btn-primary w-full flex justify-center items-center gap-2"
            @click="triggerPasskeySignup"
            :disabled="isLoading"
            style="background: var(--accent-primary); border-color: var(--accent-primary); color: #131313;"
          >
            <span v-if="isLoading" class="spinner-inline mr-2"></span>
            {{ isLoading ? 'PROVISIONING DEVICE KEY...' : 'SECURE WITH PASSKEY / TOUCHID' }}
            <ArrowRight :size="14" v-if="!isLoading" />
          </button>

          <button 
            v-else-if="currentStep === 2"
            class="btn-primary w-full flex justify-center items-center gap-2"
            @click="triggerComplianceWhitelist"
            :disabled="isLoading"
            style="background: var(--accent-secondary); border-color: var(--accent-secondary); color: #131313;"
          >
            <span v-if="isLoading" class="spinner-inline mr-2"></span>
            {{ isLoading ? 'WHITELISTING ADDRESS...' : 'COMPLETE REGISTRATIONS' }}
            <ArrowRight :size="14" v-if="!isLoading" />
          </button>

          <button 
            v-else-if="currentStep === 3"
            class="btn-primary w-full flex justify-center items-center gap-2"
            @click="triggerFaucetGrant"
            :disabled="isLoading"
            style="background: var(--accent-gold); border-color: var(--accent-gold); color: #131313;"
          >
            <span v-if="isLoading" class="spinner-inline mr-2"></span>
            {{ isLoading ? 'DELIVERING USDC FUNDS...' : 'CLAIM FAUCET & START TRADING' }}
            <Sparkles :size="14" v-if="!isLoading" />
          </button>

          <button class="btn-secondary" @click="handleClose" :disabled="isLoading">
            Cancel
          </button>
        </div>
      </div>
      
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(10px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
}

.onboarding-card {
  width: 100%;
  max-width: 500px;
  background: rgba(20, 20, 20, 0.7) !important;
  border: 1px solid rgba(255, 255, 255, 0.08) !important;
  padding: 2.25rem !important;
}

.step-progress-bar {
  position: relative;
  height: 2px;
  background: rgba(255, 255, 255, 0.08);
  margin: 1.5rem 0;
}

.progress-fill {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  background: linear-gradient(90deg, var(--accent-primary), var(--accent-secondary));
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.step-nodes {
  position: absolute;
  top: -7px;
  left: 0;
  right: 0;
}

.step-node {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #181818;
  border: 2px solid rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #555;
  transition: all 0.3s ease;
  z-index: 2;
}

.step-node.active {
  border-color: var(--accent-secondary);
  color: var(--accent-secondary);
  box-shadow: 0 0 10px rgba(130, 170, 255, 0.3);
}

.step-node.done {
  background: var(--accent-primary);
  border-color: var(--accent-primary);
  color: #131313;
}

.fingerprint-pulse, .shield-pulse, .coins-pulse {
  display: inline-flex;
  padding: 1.25rem;
  background: rgba(130, 255, 170, 0.03);
  border-radius: 50%;
  border: 1px solid rgba(130, 255, 170, 0.1);
  animation: pulse-glow 2s infinite ease-in-out;
}

.shield-pulse {
  background: rgba(130, 170, 255, 0.03);
  border-color: rgba(130, 170, 255, 0.1);
}

.coins-pulse {
  background: rgba(255, 184, 108, 0.03);
  border-color: rgba(255, 184, 108, 0.1);
}

@keyframes pulse-glow {
  0% {
    box-shadow: 0 0 0 0px rgba(255, 255, 255, 0.02);
  }
  70% {
    box-shadow: 0 0 0 15px rgba(255, 255, 255, 0.0);
  }
  100% {
    box-shadow: 0 0 0 0px rgba(255, 255, 255, 0.0);
  }
}

.input-with-icon {
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  left: 10px;
  color: var(--text-mute);
  pointer-events: none;
}
</style>
