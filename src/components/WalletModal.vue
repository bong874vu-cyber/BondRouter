<script setup>
import { ref } from 'vue'
import { useWeb3Store } from '../stores/web3'
import { X, Wallet, Shield, HelpCircle, ArrowRight } from 'lucide-vue-next'

const props = defineProps({
  isOpen: Boolean
})

const emit = defineEmits(['close', 'open-social-login'])

const web3 = useWeb3Store()
const activeOption = ref('metamask') // 'metamask', 'coinbase', 'rainbow', 'walletconnect'
const isConnecting = ref(false)

function triggerSocialLogin() {
  console.log('[WalletModal] triggerSocialLogin called, emitting open-social-login and close')
  emit('open-social-login')
  emit('close')
}

async function connectWallet(walletName) {
  activeOption.value = walletName
  isConnecting.value = true
  try {
    // Integrate MetaMask/window.ethereum real connection flow
    await web3.connect()
    emit('close')
  } catch (e) {
    console.error("Connect failed:", e)
  } finally {
    isConnecting.value = false
  }
}
</script>

<template>
  <div v-if="isOpen" class="modal-overlay" @click.self="emit('close')">
    <div class="modal-content fade-up" style="width: 720px; max-width: 95%; padding: 0; display: flex; flex-direction: row; border: 1px solid var(--border-light); overflow: hidden; animation-duration: 0.35s;">
      
      <!-- LEFT SIDE: WALLET OPTIONS -->
      <div style="flex: 1.1; padding: 2.5rem; display: flex; flex-direction: column; justify-content: space-between; border-right: 1px solid var(--border-light); background: #151515;">
        <div>
          <div class="flex justify-between items-center mb-6">
            <span class="micro-cap" style="color: var(--accent-gold);">CONNECT YOUR SECURE ACCOUNT</span>
            <button class="modal-close-btn" style="width: 32px; height: 32px;" @click="emit('close')">
              <X :size="14" />
            </button>
          </div>

          <div class="flex flex-col gap-3">
            <!-- Circle Embedded Wallet -->
            <div 
              class="wallet-option"
              style="border: 1px solid var(--accent-gold); background: rgba(212, 175, 55, 0.05);"
              @click.stop="triggerSocialLogin"
            >
              <div class="flex items-center gap-3">
                <div class="wallet-icon-frame" style="background: rgba(212, 175, 55, 0.2); display: flex; align-items: center; justify-content: center;">
                  <Wallet :size="12" color="var(--accent-gold)" />
                </div>
                <span class="wallet-name" style="color: var(--accent-gold); font-weight: 700;">Email / Social Login</span>
              </div>
              <span class="micro-cap" style="color: var(--accent-gold); font-size: 0.65rem; font-weight: 800;">FAST ONBOARDING</span>
            </div>
            <!-- MetaMask -->
            <div 
              class="wallet-option"
              :class="{ 'active': activeOption === 'metamask' }"
              @click="connectWallet('metamask')"
            >
              <div class="flex items-center gap-3">
                <div class="wallet-icon-frame">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22 11.5L20.8 4.8L12.5 12L22 11.5Z" fill="#E2761B"/>
                    <path d="M2 11.5L3.2 4.8L11.5 12L2 11.5Z" fill="#E2761B"/>
                    <path d="M19 18.5L16.2 13.8L12 16.5L19 18.5Z" fill="#E2761B"/>
                    <path d="M5 18.5L7.8 13.8L12 16.5L5 18.5Z" fill="#E2761B"/>
                    <path d="M12 2L3.2 4.8L11.5 12L12 2Z" fill="#E2761B"/>
                    <path d="M12 2L20.8 4.8L12.5 12L12 2Z" fill="#E2761B"/>
                  </svg>
                </div>
                <span class="wallet-name">MetaMask</span>
              </div>
              <span v-if="activeOption === 'metamask' && isConnecting" class="micro-cap" style="color: var(--accent-gold); font-size: 0.6rem;">LINKING...</span>
              <span v-else class="micro-cap" style="color: var(--text-muted); font-size: 0.6rem;">INSTALLED</span>
            </div>

            <!-- Coinbase -->
            <div 
              class="wallet-option"
              :class="{ 'active': activeOption === 'coinbase' }"
              @click="connectWallet('coinbase')"
            >
              <div class="flex items-center gap-3">
                <div class="wallet-icon-frame">
                  <div style="width: 20px; height: 20px; border-radius: 50%; background: #0052FF; border: 1.5px solid #fff;"></div>
                </div>
                <span class="wallet-name">Coinbase Wallet</span>
              </div>
              <span class="micro-cap" style="color: var(--text-muted); font-size: 0.6rem;">POPULAR</span>
            </div>

            <!-- Rainbow -->
            <div 
              class="wallet-option"
              :class="{ 'active': activeOption === 'rainbow' }"
              @click="connectWallet('rainbow')"
            >
              <div class="flex items-center gap-3">
                <div class="wallet-icon-frame" style="background: linear-gradient(180deg, #FF007A 0%, #7B00FF 100%);"></div>
                <span class="wallet-name">Rainbow</span>
              </div>
              <span class="micro-cap" style="color: var(--text-muted); font-size: 0.6rem;">MOBILE</span>
            </div>

            <!-- WalletConnect -->
            <div 
              class="wallet-option"
              :class="{ 'active': activeOption === 'walletconnect' }"
              @click="connectWallet('walletconnect')"
            >
              <div class="flex items-center gap-3">
                <div class="wallet-icon-frame" style="background: #3B99FC; display: flex; align-items: center; justify-content: center;">
                  <Wallet :size="12" color="#fff" />
                </div>
                <span class="wallet-name">Secure Gateway Link</span>
              </div>
              <span class="micro-cap" style="color: var(--text-muted); font-size: 0.6rem;">QR CODE</span>
            </div>
          </div>
        </div>

        <div class="flex gap-2 items-center text-mute" style="font-size: 0.72rem; margin-top: 2rem;">
          <Shield :size="12" />
          <span>Secured via institutional-grade safety protocols</span>
        </div>
      </div>

      <!-- RIGHT SIDE: INFORMATION/GUIDE -->
      <div style="flex: 0.9; padding: 2.5rem; background: #121212; display: flex; flex-direction: column; justify-content: space-between;">
        <div class="flex flex-col gap-6">
          <span class="micro-cap" style="color: var(--text-muted);">WHAT IS A SECURE ACCOUNT?</span>
          
          <div class="flex flex-col gap-4">
            <div>
              <h4 style="font-size: 0.85rem; font-weight: 600; color: var(--text-main); margin-bottom: 0.25rem;" class="flex items-center gap-2">
                <Wallet :size="14" color="var(--accent-gold)" /> Home for Your Digital Dollars
              </h4>
              <p style="font-size: 0.75rem; color: var(--text-muted); line-height: 1.4;">
                Secure accounts are digital storage vaults that hold your digital dollars (USDC), savings certificates, and private trade receipts securely.
              </p>
            </div>

            <div>
              <h4 style="font-size: 0.85rem; font-weight: 600; color: var(--text-main); margin-bottom: 0.25rem;" class="flex items-center gap-2">
                <Shield :size="14" color="var(--accent-gold)" /> Password-Free Authorization
              </h4>
              <p style="font-size: 0.75rem; color: var(--text-muted); line-height: 1.4;">
                Instead of traditional, weak passwords, your secure account uses certified cryptographic keys to login and authorize high-speed interest transfers instantly.
              </p>
            </div>
          </div>
        </div>

        <div class="flex flex-col gap-3">
          <a href="https://rainbow.me" target="_blank" class="btn-glass flex justify-between items-center" style="padding: 0.6rem 1rem; font-size: 0.7rem; width: 100%;">
            CREATE SECURE ACCOUNT <ArrowRight :size="12" />
          </a>
          <a href="https://rainbow.me" target="_blank" class="flex items-center gap-1 text-mute hover-gold" style="font-size: 0.7rem; text-decoration: none; justify-content: center; transition: color 0.3s;">
            <HelpCircle :size="12" /> Learn how account networks operate
          </a>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
.wallet-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--border-light);
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.wallet-option:hover, .wallet-option.active {
  border-color: var(--accent-gold);
  background: rgba(255, 255, 255, 0.05);
}

.wallet-icon-frame {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  background: rgba(255,255,255,0.05);
  flex-shrink: 0;
}

.wallet-name {
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--text-main);
}

.hover-gold:hover {
  color: var(--accent-gold) !important;
}
</style>
