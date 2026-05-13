<script setup>
import { ref } from 'vue'
import { useBondStore } from '../stores/bond'

const store = useBondStore()
const filterChain = ref('')
const filterRisk = ref('')
const selectedBond = ref(null)
const investAmount = ref('')

function openInvestModal(bond) {
  selectedBond.value = bond
  investAmount.value = ''
}

function confirmInvest() {
  const qty = parseInt(investAmount.value)
  if (qty > 0) {
    store.invest(selectedBond.value.id, qty)
    selectedBond.value = null
  }
}
</script>

<template>
  <div class="fade-in">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
      <h1 style="font-size: 1.75rem; font-weight: 700; color: var(--pn-heading);">Discover Bonds</h1>
      <div style="display: flex; gap: 1rem;">
        <select v-model="filterChain" style="width: 150px; margin: 0; padding: 0.5rem;">
          <option value="">All Chains</option>
          <option v-for="c in store.chains" :key="c">{{ c }}</option>
        </select>
        <select v-model="filterRisk" style="width: 150px; margin: 0; padding: 0.5rem;">
          <option value="">All Risks</option>
          <option>Low</option><option>Medium</option><option>High</option>
        </select>
      </div>
    </div>

    <div class="grid grid-3">
      <div v-for="b in store.marketBonds.filter(b => (!filterChain || b.chain === filterChain) && (!filterRisk || b.risk === filterRisk))" :key="b.id" class="card">
        <div class="card-header">
          <span class="badge badge-blue">{{ b.chain }}</span>
          <span class="badge" :class="b.risk === 'Low' ? 'badge-green' : b.risk === 'Medium' ? 'badge-yellow' : 'badge-red'">{{ b.risk }} Risk</span>
        </div>
        <div style="margin: 0.5rem 0 1rem;">
          <h3 style="font-size: 1.25rem; font-weight: 800; color: var(--pn-heading);">{{ b.token }}</h3>
          <p style="font-size: 0.85rem; color: var(--pn-text);">{{ b.issuer }} — {{ b.type }}</p>
        </div>
        
        <div style="display: flex; justify-content: space-between; border-top: 1px solid var(--pn-surface-2); border-bottom: 1px solid var(--pn-surface-2); padding: 0.75rem 0; margin-bottom: 1rem;">
          <div>
            <div class="stat-label">Yield (APY)</div>
            <div style="font-size: 1.25rem; font-weight: 800; color: var(--pn-green);">{{ b.apy }}%</div>
          </div>
          <div style="text-align: right;">
            <div class="stat-label">Current Price</div>
            <div style="font-size: 1.25rem; font-weight: 800; color: var(--pn-accent);">{{ store.fmt(b.price) }}</div>
          </div>
        </div>
        
        <div style="display: flex; justify-content: space-between; font-size: 0.8rem; margin-bottom: 1.5rem;">
          <span>Face Value: {{ store.fmt(b.faceValue) }}</span>
          <span>Maturity: {{ new Date(b.maturity).toLocaleDateString() }}</span>
        </div>
        
        <button class="btn btn-primary" style="width: 100%; justify-content: center;" @click="openInvestModal(b)">Invest via Bridge</button>
      </div>
    </div>

    <!-- Invest Modal (Simple inline overlay for demo) -->
    <div v-if="selectedBond" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 100;">
      <div class="card fade-in" style="width: 400px; max-width: 90%;">
        <div class="card-header">
          <h2 class="card-title">Invest in {{ selectedBond.token }}</h2>
          <button style="background: none; border: none; color: var(--pn-text); cursor: pointer; font-size: 1.2rem;" @click="selectedBond = null">✕</button>
        </div>
        <p style="font-size: 0.85rem; margin-bottom: 1rem;">USDC will be automatically bridged from your Gateway balance to <strong>{{ selectedBond.chain }}</strong> to complete this purchase.</p>
        
        <div style="margin-bottom: 1rem;">
          <label>Quantity to buy</label>
          <input type="number" v-model="investAmount" placeholder="e.g. 10" min="1" />
        </div>
        
        <div style="background: var(--pn-surface-2); padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
            <span>Price per bond</span><span>{{ store.fmt(selectedBond.price) }}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem; color: var(--pn-yellow);">
            <span>Bridge Fee</span><span>$0.00 (Gas Station)</span>
          </div>
          <div style="display: flex; justify-content: space-between; border-top: 1px solid var(--pn-border); padding-top: 0.5rem; font-weight: 700; color: var(--pn-heading);">
            <span>Total Cost</span><span>{{ store.fmt(selectedBond.price * (parseInt(investAmount) || 0)) }}</span>
          </div>
        </div>
        
        <button class="btn btn-primary" style="width: 100%; justify-content: center;" @click="confirmInvest" :disabled="!investAmount || investAmount < 1">Confirm Investment</button>
      </div>
    </div>
  </div>
</template>
