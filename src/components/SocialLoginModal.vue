<script setup>
import { ref, onMounted, watch } from 'vue'
import { useWeb3Store } from '../stores/web3'
import { useUIStore } from '../stores/ui'
import { X, Mail, ShieldCheck, Lock, KeyRound } from 'lucide-vue-next'

const props = defineProps({
  isOpen: Boolean
})
const emit = defineEmits(['close'])

const web3 = useWeb3Store()
const ui = useUIStore()

const email = ref('')

const step = ref(1) // 1: Email Input, 2: Provisioning Loader
const isLoading = ref(false)

onMounted(() => {
  console.log('[SocialLoginModal] Component mounted, isOpen state:', props.isOpen)
})

watch(() => props.isOpen, (newVal) => {
  console.log('[SocialLoginModal] isOpen property updated to:', newVal)
})

async function handleEmailLogin() {
  if (!email.value || !email.value.includes('@')) {
    ui.addToast("PLEASE ENTER A VALID BUSINESS EMAIL ADDRESS.", "error")
    return
  }
  isLoading.value = true
  step.value = 2 // Provisioning Loader
  
  try {
    // Trigger the real Circle User-Controlled SDK and Server challenge flow
    await web3.loginWithCircleEmbeddedWallet(email.value)
    
    ui.addToast("CIRCLE EMBEDDED WALLET PROVISIONED ON BASE SEPOLIA/ARC!", "success")
    emit('close')
  } catch (e) {
    ui.addToast(e.message || "AUTHENTICATION AND PIN SETUP FAILED.", "error")
    step.value = 1
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div v-if="isOpen" class="modal-overlay" @click.self="emit('close')">
    <div class="glass-panel modal-card fade-up">
      <!-- Close Header -->
      <div class="flex items-center justify-between mb-6" style="border-bottom: 1px solid var(--border-light); padding-bottom: 1rem;">
        <div class="flex items-center gap-2">
          <KeyRound :size="18" color="var(--accent-gold)" />
          <span class="micro-cap font-bold" style="letter-spacing: 0.1em; color: var(--accent-gold);">CIRCLE SECURE EMBEDDED PORTAL</span>
        </div>
        <button class="btn-icon" @click="emit('close')" style="padding: 0.25rem;">
          <X :size="16" />
        </button>
      </div>

      <!-- Step 1: Input Email -->
      <div v-if="step === 1">
        <h3 class="display-lg" style="font-size: 1.5rem; margin-bottom: 0.75rem;">Access Corporate Treasury</h3>
        <p class="body-md text-mute" style="font-size: 0.88rem; line-height: 1.4; margin-bottom: 1.5rem;">
          Connect your interest account instantly. Log in securely with your corporate email.
        </p>

        <!-- Email input -->
        <div class="input-group" style="margin-bottom: 1.5rem;">
          <label class="micro-cap" style="margin-bottom: 0.5rem; display: block;">BUSINESS EMAIL</label>
          <div style="position: relative; width: 100%;">
            <Mail :size="14" style="position: absolute; left: 1rem; top: 50%; transform: translateY(-50%); opacity: 0.5; z-index: 10;" />
            <input 
              type="email" 
              placeholder="name@company.com" 
              v-model="email"
              class="text-input"
              style="padding-left: 2.75rem;"
            />
          </div>
        </div>

        <button 
          class="btn-primary w-full" 
          @click="handleEmailLogin" 
          :disabled="isLoading"
        >
          <span v-if="isLoading" class="spinner-inline mr-2"></span>
          CONNECT WALLET
        </button>
      </div>

      <!-- Step 2: Loading & Provisioning -->
      <div v-else-if="step === 2" style="padding: 3rem 0; text-align: center;">
        <div class="pulse-icon mb-6">
          <ShieldCheck :size="48" color="var(--accent-primary)" />
        </div>
        <h3 class="display-lg mb-2" style="font-size: 1.35rem;">Authenticating Secure Wallet</h3>
        <p class="body-md text-mute" style="font-size: 0.88rem; max-width: 360px; margin: 0 auto; line-height: 1.5;">
          Establishing session credentials with Circle Sandbox API. If you are a new user, a secure PIN challenge pop-up will launch shortly...
        </p>
        <div class="spinner" style="margin: 2rem auto 0 auto; width: 36px; height: 36px; border: 3px solid rgba(255,255,255,0.05); border-top-color: var(--accent-primary); border-radius: 50%; animation: spin 1s linear infinite;"></div>
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
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1.5rem;
}

.modal-card {
  max-width: 440px;
  width: 100%;
  background: rgba(18, 18, 18, 0.75);
  border: 1px solid var(--border-light);
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.8);
  padding: 2.25rem;
  border-radius: 0px;
  text-align: center;
}

.social-btn {
  width: 100%;
  padding: 0.88rem 1.25rem;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--border-light);
  color: var(--text-main);
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 500;
  font-size: 0.88rem;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  border-radius: 0px;
}

.social-btn:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: var(--accent-gold);
}

.divider {
  display: flex;
  align-items: center;
  text-align: center;
  font-size: 0.65rem;
  font-family: 'Space Grotesk', sans-serif;
  letter-spacing: 0.15em;
  color: var(--text-muted);
  font-weight: bold;
}

.divider::before,
.divider::after {
  content: '';
  flex: 1;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.divider:not(:empty)::before {
  margin-right: .75em;
}

.divider:not(:empty)::after {
  margin-left: .75em;
}

.pulse-icon {
  animation: pulse-glow 2s infinite ease-in-out;
  display: inline-flex;
}

@keyframes pulse-glow {
  0% { transform: scale(0.95); filter: drop-shadow(0 0 0 rgba(130, 255, 170, 0)); }
  50% { transform: scale(1.05); filter: drop-shadow(0 0 15px rgba(130, 255, 170, 0.4)); }
  100% { transform: scale(0.95); filter: drop-shadow(0 0 0 rgba(130, 255, 170, 0)); }
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.input-group {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  width: 100%;
}

.input-group label {
  text-align: left;
  display: block;
}
</style>
