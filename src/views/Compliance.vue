<script setup>
import { ref, onMounted } from 'vue'
import { useWeb3Store } from '../stores/web3'
import { ShieldCheck, Download, FileJson, CheckCircle, Clock } from 'lucide-vue-next'

const web3 = useWeb3Store()
const auditLogs = ref([])
const complianceHash = ref('')
const loading = ref(false)

onMounted(async () => {
  loading.value = true
  const res = await web3.fetchComplianceLogs()
  auditLogs.value = res.logs || []
  complianceHash.value = res.systemHash || 'N/A'
  loading.value = false
})

/**
 * Trigger CSV export file download
 */
function downloadCSV() {
  if (auditLogs.value.length === 0) return

  const headers = ['TX ID', 'Date', 'Type', 'Amount', 'Gas Fee Status', 'Compliance Verification Key']
  const rows = auditLogs.value.map(log => [
    log.id,
    log.date,
    log.type,
    log.amount,
    log.gasFee,
    log.complianceKey
  ])

  let csvContent = "data:text/csv;charset=utf-8," 
    + [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(","))].join("\n")

  const encodedUri = encodeURI(csvContent)
  const link = document.createElement("a")
  link.setAttribute("href", encodedUri)
  link.setAttribute("download", `BondRouter_Compliance_Report_${new Date().toISOString().split('T')[0]}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

/**
 * Trigger JSON export file download
 */
function downloadJSON() {
  if (auditLogs.value.length === 0) return

  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(auditLogs.value, null, 2))
  const link = document.createElement("a")
  link.setAttribute("href", dataStr)
  link.setAttribute("download", `BondRouter_Compliance_Report_${new Date().toISOString().split('T')[0]}.json`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
</script>

<template>
  <div class="page-container fade-in">
    <div class="flex-responsive-header" style="margin-bottom: 3rem;">
      <div>
        <div class="flex items-center gap-2 mb-2 micro-cap" style="color: var(--accent-success);">
          <ShieldCheck :size="14" /> AUDIT & REGULATORY CENTER
        </div>
        <h1 class="display-xl text-gradient">COMPLIANCE PORTAL</h1>
      </div>
      <div class="flex gap-2" style="display: flex; gap: 0.5rem;">
        <button 
          class="btn-glass" 
          style="border-color: var(--accent-success); color: var(--accent-success);"
          @click="downloadCSV"
          :disabled="auditLogs.length === 0"
        >
          <Download :size="16" /> Export CSV
        </button>
        <button 
          class="btn-glass" 
          style="border-color: var(--accent-primary); color: var(--accent-primary);"
          @click="downloadJSON"
          :disabled="auditLogs.length === 0"
        >
          <FileJson :size="16" /> Export JSON
        </button>
      </div>
    </div>

    <!-- Telemetry Cards -->
    <div class="stats-grid mb-6" style="margin-bottom: 2rem;">
      <div class="glass-panel" style="text-align: left;">
        <div class="micro-cap text-mute mb-2">SYSTEM AUDIT STATUS</div>
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <CheckCircle :size="18" color="var(--accent-success)" />
          <span style="font-weight: 800; font-size: 1.25rem;">SECURE & COMPLIANT</span>
        </div>
      </div>
      <div class="glass-panel" style="text-align: left;">
        <div class="micro-cap text-mute mb-2">COMPLIANCE ROOT HASH</div>
        <div class="font-mono text-gradient" style="font-size: 0.8rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 800;">
          {{ complianceHash }}
        </div>
      </div>
    </div>

    <!-- Audit Log Table -->
    <div class="glass-panel" style="padding: 0; border-radius: 0px; text-align: left;">
      <div style="padding: 1.5rem 2rem; border-bottom: 1px solid rgba(255,255,255,0.08);">
        <div class="micro-cap">SYSTEM TRANSACTION LEDGER</div>
      </div>
      <div style="overflow-x: auto; width: 100%;">
        <table class="premium-table">
          <thead>
            <tr>
              <th>TX REFERENCE ID</th>
              <th>DATE & TIME</th>
              <th>TRANSACTION TYPE</th>
              <th>PRINCIPAL VALUE</th>
              <th>SPONSORED GAS</th>
              <th>COMPLIANCE RESOLUTION KEY</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="6" class="text-center py-6">
                <div class="spinner-inline"></div>
                <div class="text-mute mt-2">Fetching ledger data...</div>
              </td>
            </tr>
            <tr v-else-if="auditLogs.length === 0">
              <td colspan="6" class="text-center py-6 text-mute">
                No compliant logs recorded.
              </td>
            </tr>
            <tr v-else v-for="log in auditLogs" :key="log.id">
              <td data-label="TX REFERENCE ID"><strong class="font-mono">{{ log.id }}</strong></td>
              <td data-label="DATE & TIME">{{ log.date }}</td>
              <td data-label="TRANSACTION TYPE"><span class="badge" style="background: rgba(130, 170, 255, 0.1); color: var(--accent-primary); border-radius: 0px;">{{ log.type }}</span></td>
              <td data-label="PRINCIPAL VALUE" style="font-weight: 700;">{{ log.amount }}</td>
              <td data-label="SPONSORED GAS" style="color: var(--accent-success); font-weight: 700;">{{ log.gasFee }}</td>
              <td data-label="COMPLIANCE RESOLUTION KEY"><code class="font-mono" style="font-size: 0.78rem; color: var(--accent-gold);">{{ log.complianceKey }}</code></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
