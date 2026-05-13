<script setup>
import { ref } from 'vue'
const walletConnected = ref(false)
</script>

<template>
  <div class="fade-in">
    <h1 style="font-size: 1.75rem; font-weight: 700; color: var(--pn-heading); margin-bottom: 1.5rem;">Settings</h1>
    <div class="grid grid-2">
      <div class="card">
        <h3 class="card-title">Wallet</h3>
        <p style="margin: 1rem 0;">Connect to access tokenized assets and yield vaults.</p>
        <button class="btn btn-primary" @click="walletConnected = !walletConnected">{{ walletConnected ? 'Disconnect' : 'Connect Wallet' }}</button>
        <div v-if="walletConnected" style="margin-top: 1rem;"><span class="badge badge-green">Connected</span></div>
      </div>
      <div class="card">
        <h3 class="card-title">Compliance</h3>
        <p style="margin: 1rem 0;">Verite-powered KYC credentials for compliant DeFi access.</p>
        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
          <span class="badge badge-green">Arc Testnet</span>
          <span class="badge badge-blue">Verite KYC</span>
          <span class="badge badge-yellow">ERC-3643</span>
        </div>
      </div>
    </div>
  </div>
</template>
