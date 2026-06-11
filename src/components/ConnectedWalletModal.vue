<script setup>
import { ref } from 'vue'
import { X, Copy, Check, ExternalLink, LogOut, Wallet } from 'lucide-vue-next'
import { useUIStore } from '../stores/ui'

const props = defineProps({
  isOpen: Boolean,
  email: String,
  address: String,
  balance: String,
  isCircleWallet: Boolean
})

const emit = defineEmits(['close', 'disconnect'])
const ui = useUIStore()

const copied = ref(false)

async function copyAddress() {
  if (!props.address) return
  try {
    await navigator.clipboard.writeText(props.address)
    copied.value = true
    ui.addToast("WALLET ADDRESS COPIED TO CLIPBOARD!", "success")
    setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch (err) {
    console.error('Failed to copy:', err)
  }
}

function getExplorerUrl() {
  return `https://testnet.arcscan.app/address/${props.address}`
}
</script>

<template>
  <div v-if="isOpen" class="modal-overlay" @click.self="emit('close')">
    <div class="modal-content fade-up" style="width: 440px; max-width: 95%;">
      <!-- Header -->
      <div class="flex justify-between items-center mb-6">
        <span class="micro-cap" style="color: var(--accent-gold); font-weight: 700; letter-spacing: 0.1em;">SECURE VAULT ACTIVE</span>
        <button class="modal-close-btn" style="width: 32px; height: 32px;" @click="emit('close')">
          <X :size="14" />
        </button>
      </div>

      <!-- Connection status & Wallet Type -->
      <div class="flex justify-between items-center mb-5" style="border-bottom: 1px solid rgba(255, 255, 255, 0.05); padding-bottom: 1rem;">
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: var(--accent-gold); box-shadow: 0 0 8px var(--accent-gold);"></span>
          <span class="micro-cap" style="color: var(--text-main); font-weight: 600;">ACTIVE CONNECTION</span>
        </div>
        <span class="micro-cap" style="color: var(--accent-gold); font-weight: 800; border: 1px solid rgba(212, 175, 55, 0.3); padding: 2px 6px; background: rgba(212, 175, 55, 0.05);">
          {{ isCircleWallet ? 'CIRCLE UCW' : 'EVM EXTERNAL' }}
        </span>
      </div>

      <!-- Email (if Circle) -->
      <div v-if="isCircleWallet && email" class="mb-5">
        <div class="micro-cap mb-1" style="color: var(--text-muted);">BUSINESS EMAIL</div>
        <div class="font-mono text-main" style="font-size: 0.95rem; font-weight: 700; color: var(--text-main);">
          {{ email }}
        </div>
      </div>

      <!-- Wallet Contract Address -->
      <div class="mb-5">
        <div class="micro-cap mb-1" style="color: var(--text-muted);">CONTRACT ADDRESS</div>
        <div class="flex items-center justify-between" style="background: rgba(255, 255, 255, 0.02); border: 1px solid var(--border-light); padding: 0.75rem 1rem;">
          <span class="font-mono" style="color: var(--text-muted); font-size: 0.78rem; word-break: break-all; margin-right: 0.5rem;">{{ address }}</span>
          <button class="btn-copy-icon" @click="copyAddress" title="Copy Address">
            <Check v-if="copied" :size="14" color="var(--accent-primary)" />
            <Copy v-else :size="14" color="var(--text-muted)" />
          </button>
        </div>
      </div>

      <!-- Balance -->
      <div class="mb-6">
        <div class="micro-cap mb-1" style="color: var(--text-muted);">VAULT LIQUIDITY</div>
        <div class="flex items-baseline gap-1.5">
          <span class="font-mono text-main" style="font-size: 1.75rem; font-weight: 700; letter-spacing: -0.02em;">{{ balance }}</span>
          <span class="micro-cap" style="color: var(--text-muted); font-weight: 700;">USDC</span>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex flex-col gap-3">
        <!-- View Explorer link -->
        <a :href="getExplorerUrl()" target="_blank" class="btn-glass flex justify-between items-center" style="padding: 0.75rem 1.25rem; font-size: 0.8rem; width: 100%; border-color: var(--border-light);">
          <span>VIEW ON ARCSCAN</span>
          <ExternalLink :size="14" />
        </a>

        <!-- Disconnect Secure Vault -->
        <button class="btn-disconnect" @click="emit('disconnect'); emit('close');">
          <LogOut :size="14" />
          <span>DISCONNECT SECURE VAULT</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.btn-copy-icon {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.2s;
}

.btn-copy-icon:hover {
  opacity: 0.8;
}

.btn-disconnect {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  padding: 0.75rem 1.75rem;
  border-radius: 0px;
  background: transparent;
  color: #ff4d4d;
  border: 1px solid rgba(255, 77, 77, 0.3);
  font-weight: 600;
  font-size: 0.8rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  width: 100%;
}

.btn-disconnect:hover {
  background: rgba(255, 77, 77, 0.08);
  border-color: #ff4d4d;
}
</style>
