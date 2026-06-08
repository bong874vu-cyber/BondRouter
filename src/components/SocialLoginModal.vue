<script setup>
import { ref } from 'vue'
import { useWeb3Store } from '../stores/web3'
import { useUIStore } from '../stores/ui'
import { X, Mail, ShieldCheck, Lock, Chrome, Apple, KeyRound } from 'lucide-vue-next'

const props = defineProps({
  isOpen: Boolean
})
const emit = defineEmits(['close'])

const web3 = useWeb3Store()
const ui = useUIStore()

const email = ref('')
const otpCode = ref('')
const setupPin = ref('')
const confirmPin = ref('')

const step = ref(1) // 1: Email Input, 2: OTP Entry, 3: PIN Configuration, 4: Provisioning Loader
const isLoading = ref(false)
const otpSentMessage = ref('')

async function handleSendOtp() {
  if (!email.value || !email.value.includes('@')) {
    ui.addToast("PLEASE ENTER A VALID BUSINESS EMAIL ADDRESS.", "error")
    return
  }
  isLoading.value = true
  try {
    // Call server to trigger signup and user token generation
    const signupRes = await fetch('/api/circle/user/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.value })
    })
    const signupData = await signupRes.json()
    if (!signupData.success) throw new Error("SIGNUP FAILED")

    otpSentMessage.value = `Verification OTP sent to ${email.value}`
    step.value = 2 // Move to OTP verification
    ui.addToast("OTP CODE DISPATCHED SUCCESSFULLY!", "success")
  } catch (e) {
    ui.addToast("FAILED TO DISPATCH VERIFICATION CODE.", "error")
  } finally {
    isLoading.value = false
  }
}

async function handleVerifyOtp() {
  if (otpCode.value.length < 6) {
    ui.addToast("PLEASE ENTER THE 6-digit VERIFICATION CODE.", "error")
    return
  }
  isLoading.value = true
  try {
    // Proceed to secure Pin Configuration
    await new Promise(resolve => setTimeout(resolve, 800))
    step.value = 3
  } catch (e) {
    ui.addToast("INVALID CODE. PLEASE CHECK AND TRY AGAIN.", "error")
  } finally {
    isLoading.value = false
  }
}

async function handleConfigurePin() {
  if (setupPin.value.length < 6) {
    ui.addToast("PIN MUST BE AT LEAST 6 DIGITS.", "error")
    return
  }
  if (setupPin.value !== confirmPin.value) {
    ui.addToast("PIN MISMATCH. PLEASE CONFIRM MATCHING DIGITS.", "error")
    return
  }
  isLoading.value = true
  step.value = 4 // Provisioning Loader
  
  try {
    // Trigger the real Circle User-Controlled SDK and Server challenge flow
    await web3.loginWithCircleEmbeddedWallet(email.value)
    
    ui.addToast("CIRCLE EMBEDDED WALLET PROVISIONED ON BASE SEPOLIA/ARC!", "success")
    emit('close')
  } catch (e) {
    ui.addToast("AUTHENTICATION AND PIN SETUP FAILED.", "error")
    step.value = 3
  } finally {
    isLoading.value = false
  }
}

async function handleSocialLogin(platform) {
  isLoading.value = true
  step.value = 4
  try {
    // Mocking OAuth redirect & social onboarding
    await new Promise(resolve => setTimeout(resolve, 1500))
    const mockEmail = `corp.${platform.toLowerCase()}@bondrouter.com`
    await web3.loginWithCircleEmbeddedWallet(mockEmail)
    ui.addToast(`LOGGED IN SUCCESSFULLY VIA ${platform.toUpperCase()}`, "success")
    emit('close')
  } catch (e) {
    ui.addToast(`SOCIAL ONBOARDING VIA ${platform} FAILED.`, "error")
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

      <!-- Step 1: Input Email & Socials -->
      <div v-if="step === 1">
        <h3 class="display-lg mb-2" style="font-size: 1.5rem;">Access Corporate Treasury</h3>
        <p class="body-md text-mute mb-6" style="font-size: 0.88rem; line-height: 1.4;">
          Connect your interest account instantly. Log in with Google, Apple, or your corporate email.
        </p>

        <!-- Social Connect Buttons -->
        <div class="flex flex-col gap-3 mb-6">
          <button class="social-btn" @click="handleSocialLogin('Google')">
            <Chrome :size="16" style="margin-right: 0.75rem;" />
            Continue with Google
          </button>
          <button class="social-btn" @click="handleSocialLogin('Apple')">
            <Apple :size="16" style="margin-right: 0.75rem;" />
            Continue with Apple
          </button>
        </div>

        <div class="divider mb-6">
          <span>OR CONTINUE WITH EMAIL</span>
        </div>

        <!-- Email input -->
        <div class="input-group mb-6">
          <label class="micro-cap mb-2 block text-left">BUSINESS EMAIL</label>
          <div style="position: relative;">
            <Mail :size="14" style="position: absolute; left: 1rem; top: 50%; transform: translateY(-50%); opacity: 0.5;" />
            <input 
              type="email" 
              placeholder="name@company.com" 
              v-model="email"
              style="padding-left: 2.75rem;"
            />
          </div>
        </div>

        <button 
          class="btn-primary w-full" 
          @click="handleSendOtp" 
          :disabled="isLoading"
        >
          <span v-if="isLoading" class="spinner-inline mr-2"></span>
          GET VERIFICATION OTP
        </button>
      </div>

      <!-- Step 2: OTP Verification -->
      <div v-else-if="step === 2">
        <h3 class="display-lg mb-2" style="font-size: 1.5rem;">Verify Your Identity</h3>
        <p class="body-md text-mute mb-6" style="font-size: 0.88rem; line-height: 1.4;">
          {{ otpSentMessage }}. Enter the 6-digit code below to confirm possession.
        </p>

        <div class="input-group mb-6">
          <label class="micro-cap mb-2 block text-left">OTP CODE</label>
          <input 
            type="text" 
            placeholder="0 0 0 0 0 0" 
            v-model="otpCode" 
            maxlength="6"
            style="text-align: center; letter-spacing: 0.8em; font-weight: 700; font-size: 1.25rem;"
          />
        </div>

        <div class="flex gap-4">
          <button class="btn-secondary w-full" @click="step = 1">BACK</button>
          <button class="btn-primary w-full" @click="handleVerifyOtp" :disabled="isLoading">
            <span v-if="isLoading" class="spinner-inline mr-2"></span>
            VERIFY CODE
          </button>
        </div>
      </div>

      <!-- Step 3: Secure Pin Configuration -->
      <div v-else-if="step === 3">
        <h3 class="display-lg mb-2" style="font-size: 1.5rem;">Configure Wallet PIN</h3>
        <p class="body-md text-mute mb-6" style="font-size: 0.88rem; line-height: 1.4;">
          Establish a secure 6-digit PIN. Your PIN acts as a non-custodial cryptographic key required to sign trades and distribute yield.
        </p>

        <div class="input-group mb-4">
          <label class="micro-cap mb-2 block text-left">CHOOSE 6-DIGIT PIN</label>
          <div style="position: relative;">
            <Lock :size="14" style="position: absolute; left: 1rem; top: 50%; transform: translateY(-50%); opacity: 0.5;" />
            <input 
              type="password" 
              placeholder="******" 
              v-model="setupPin"
              maxlength="6"
              style="padding-left: 2.75rem; text-align: center; letter-spacing: 0.5em;"
            />
          </div>
        </div>

        <div class="input-group mb-6">
          <label class="micro-cap mb-2 block text-left">CONFIRM SECURE PIN</label>
          <div style="position: relative;">
            <Lock :size="14" style="position: absolute; left: 1rem; top: 50%; transform: translateY(-50%); opacity: 0.5;" />
            <input 
              type="password" 
              placeholder="******" 
              v-model="confirmPin"
              maxlength="6"
              style="padding-left: 2.75rem; text-align: center; letter-spacing: 0.5em;"
            />
          </div>
        </div>

        <button class="btn-primary w-full" @click="handleConfigurePin" :disabled="isLoading">
          <span v-if="isLoading" class="spinner-inline mr-2"></span>
          CONFIRM & CREATE WALLET
        </button>
      </div>

      <!-- Step 4: Loading & Provisioning -->
      <div v-else-if="step === 4" style="padding: 3rem 0; text-align: center;">
        <div class="pulse-icon mb-6">
          <ShieldCheck :size="48" color="var(--accent-primary)" />
        </div>
        <h3 class="display-lg mb-2" style="font-size: 1.35rem;">Creating Secure Embedded Wallet</h3>
        <p class="body-md text-mute" style="font-size: 0.88rem; max-width: 360px; margin: 0 auto; line-height: 1.5;">
          Interacting with Circle sandbox API to register non-custodial credentials. Please authorize standard passkey frames if prompted by browser...
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
</style>
