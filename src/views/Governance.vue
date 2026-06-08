<script setup>
import { ref, onMounted } from 'vue'
import { useWeb3Store } from '../stores/web3'
import { useUIStore } from '../stores/ui'
import { Landmark, Plus, ThumbsUp, ThumbsDown, CheckCircle, Clock } from 'lucide-vue-next'

const web3 = useWeb3Store()
const ui = useUIStore()

const proposals = ref([])
const newDescription = ref('')
const newActionId = ref('')
const submitting = ref(false)

onMounted(async () => {
  proposals.value = await web3.fetchGovernanceProposals()
})

async function handleCreateProposal() {
  if (!newDescription.value || !newActionId.value) {
    ui.addToast('PLEASE FILL IN ALL PROPOSAL FIELDS.', 'error')
    return
  }
  submitting.value = true
  try {
    await web3.submitProposalTx(newDescription.value, newActionId.value)
    proposals.value = await web3.fetchGovernanceProposals()
    newDescription.value = ''
    newActionId.value = ''
    ui.addToast('GOVERNANCE PROPOSAL DISPATCHED TO ARC.', 'success')
  } catch (e) {
    ui.addToast('PROPOSAL CREATION FAILED.', 'error')
  } finally {
    submitting.value = false
  }
}

async function castVote(proposalId, support) {
  try {
    ui.addToast('CASTING TOKEN-WEIGHTED VOTE...', 'info')
    // Token ID is simulated. In a live Ethers script, it queries active user balances.
    await web3.submitVoteTx(proposalId, support, 1)
    proposals.value = await web3.fetchGovernanceProposals()
    ui.addToast('VOTE COUNTED SUCCESSFULLY.', 'success')
  } catch (e) {
    ui.addToast('VOTING TRANSACTION REJECTED.', 'error')
  }
}
</script>

<template>
  <div class="page-container fade-in">
    <div class="flex-responsive-header" style="margin-bottom: 3rem;">
      <div>
        <div class="flex items-center gap-2 mb-2 micro-cap" style="color: var(--accent-secondary);">
          <Landmark :size="14" /> DECENTRALIZED GOVERNANCE
        </div>
        <h1 class="display-xl text-gradient">GOVERNANCE PORTAL</h1>
      </div>
    </div>

    <div class="grid-two-columns-responsive gap-6" style="align-items: start; margin-bottom: 3rem; text-align: left;">
      
      <!-- Proposal Creation Desk -->
      <div class="glass-panel" style="margin-bottom: 0;">
        <div class="micro-cap mb-4">SUBMIT PARAMETER UPGRADE</div>
        
        <div class="mb-4">
          <label class="input-label" style="display: block; margin-bottom: 0.5rem; font-weight: 700;">PROPOSAL DESCRIPTION</label>
          <input 
            type="text" 
            v-model="newDescription" 
            placeholder="e.g. Set senior tranche target APY to 6%" 
            class="input-premium" 
            style="width: 100%; border-radius: 0px;"
          />
        </div>

        <div class="mb-4">
          <label class="input-label" style="display: block; margin-bottom: 0.5rem; font-weight: 700;">TARGET ACTION / REFERENCE ID</label>
          <input 
            type="number" 
            v-model="newActionId" 
            placeholder="e.g. 105" 
            class="input-premium" 
            style="width: 100%; border-radius: 0px;"
          />
        </div>

        <button 
          class="btn-primary" 
          style="width: 100%; border-radius: 0px; background: var(--accent-secondary); border-color: var(--accent-secondary); color: #000; font-weight: 800;"
          @click="handleCreateProposal"
          :disabled="submitting"
        >
          <Plus :size="16" /> SUBMIT TO ON-CHAIN VOTING
        </button>
      </div>

      <!-- Live Governance Proposals -->
      <div>
        <div class="micro-cap mb-4">ACTIVE PARAMETER PROPOSALS</div>
        
        <div v-if="proposals.length === 0" class="glass-panel text-center py-6">
          <Landmark :size="32" class="text-mute mb-2" />
          <div class="text-mute">No proposals found.</div>
        </div>

        <div v-else class="flex flex-col gap-4">
          <div v-for="p in proposals" :key="p.id" class="glass-panel" style="margin-bottom: 0; text-align: left; border-color: rgba(255, 255, 255, 0.08);">
            <div class="flex items-center justify-between mb-3" style="display: flex; justify-content: space-between; align-items: center;">
              <span class="badge" style="background: rgba(130, 170, 255, 0.1); color: var(--accent-primary); border-radius: 0px;">
                PROPOSAL #{{ p.id }}
              </span>
              <div class="flex items-center gap-1 text-mute" style="font-size: 0.72rem;">
                <Clock :size="12" /> Target End: {{ p.endBlock }}
              </div>
            </div>

            <h3 style="margin: 0 0 1rem 0; font-size: 1.05rem; color: #fff; font-weight: 700;">
              {{ p.description }}
            </h3>

            <!-- Progress Voting Bars -->
            <div class="mb-4">
              <div class="flex justify-between text-mute mb-1" style="font-size: 0.75rem; display: flex; justify-content: space-between;">
                <span>Support: {{ p.votesFor }} VP</span>
                <span>Against: {{ p.votesAgainst }} VP</span>
              </div>
              <div style="background: rgba(255,255,255,0.05); height: 8px; width: 100%; border-radius: 4px; overflow: hidden; display: flex;">
                <div :style="{ width: `${(p.votesFor / (p.votesFor + p.votesAgainst || 1)) * 100}%` }" style="background: var(--accent-success); height: 100%;"></div>
                <div :style="{ width: `${(p.votesAgainst / (p.votesFor + p.votesAgainst || 1)) * 100}%` }" style="background: var(--accent-danger); height: 100%;"></div>
              </div>
            </div>

            <div class="flex gap-2" style="display: flex; gap: 0.5rem;">
              <button 
                class="btn-glass flex-grow" 
                style="flex: 1; border-color: var(--accent-success); color: var(--accent-success); padding: 0.5rem;"
                @click="castVote(p.id, true)"
              >
                <ThumbsUp :size="14" /> Support
              </button>
              <button 
                class="btn-glass flex-grow" 
                style="flex: 1; border-color: var(--accent-danger); color: var(--accent-danger); padding: 0.5rem;"
                @click="castVote(p.id, false)"
              >
                <ThumbsDown :size="14" /> Against
              </button>
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>
