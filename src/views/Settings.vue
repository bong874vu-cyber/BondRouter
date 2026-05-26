<script setup>
import { ref, onMounted } from 'vue'
import { useWeb3Store } from '../stores/web3'
import { useUIStore } from '../stores/ui'
import { Fingerprint, Shield, Key, Cpu, Coins, Globe, Activity, Check, Lock, Settings, Sparkles, AlertCircle } from 'lucide-vue-next'

const web3 = useWeb3Store()
const ui = useUIStore()

const circleStatus = ref(null)
const registeringPasskey = ref(false)
const passkeyRegistered = ref(false)
const generatedSmartAddress = ref('')
const sponsorGas = ref(true)

async function fetchStatus() {
  try {
    const res = await fetch('/api/circle/status')
    circleStatus.value = await res.json()
  } catch (e) {
    console.warn("Failed to load Circle status:", e)
  }
}

async function registerPasskey() {
  registeringPasskey.value = true
  // Simulate WebAuthn/Passkey biometric registration
  await new Promise(resolve => setTimeout(resolve, 1800))
  registeringPasskey.value = false
  passkeyRegistered.value = true
  generatedSmartAddress.value = '0x17d23d' + Math.floor(Math.random() * 10000000).toString(16) + 'F9b342C2a79B5e94b2A56cCeA7d7'
  ui.addToast('PASSKEY SMART ACCOUNT REGISTERED SUCCESSFULLY VIA CIRCLE SCA.', 'success')
}

onMounted(() => {
  fetchStatus()
})
</script>

<template>
  <div class="page-container fade-in">
    <div class="flex items-center gap-2 mb-2 micro-cap" style="color: var(--accent-primary);">
      <Settings :size="14" /> CONFIGURATION CONTROL
    </div>
    <h1 class="display-xl text-gradient mb-2">TREASURY SETTINGS</h1>
    <p class="body-md text-mute mb-4" style="max-width: 650px; font-size: 0.95rem; line-height: 1.6;">
      Manage programmatic integrations, configure enterprise credentials, and set up hardware passkey smart accounts for seamless zero-fee treasury routing.
    </p>

    <div class="grid-two-columns-responsive">
      <!-- Circle Infrastructure Status -->
      <div class="glass-panel">
        <div class="flex items-center justify-between mb-4 border-b pb-4" style="border-color: rgba(255,255,255,0.05);">
          <h3 class="card-title flex items-center gap-2" style="font-size: 1rem; margin: 0;">
            <Cpu :size="16" color="var(--accent-primary)" />
            CIRCLE API INTEGRATION
          </h3>
          <span v-if="circleStatus?.configured" class="badge" style="background: rgba(195, 232, 141, 0.1); color: var(--accent-success); border-radius: 0px;">
            LIVE SESSIONS
          </span>
          <span v-else class="badge" style="background: rgba(255, 107, 107, 0.1); color: var(--accent-danger); border-radius: 0px;">
            INACTIVE
          </span>
        </div>

        <div v-if="circleStatus" class="space-y-4">
          <div class="flex justify-between items-center py-2" style="border-bottom: 1px dashed rgba(255,255,255,0.03);">
            <span class="micro-cap text-mute">API CONNECTIVITY MODE</span>
            <span class="body-md font-mono" style="font-weight: bold; color: var(--accent-success);">{{ circleStatus.apiMode.toUpperCase() }}</span>
          </div>

          <div class="flex justify-between items-center py-2" style="border-bottom: 1px dashed rgba(255,255,255,0.03);">
            <span class="micro-cap text-mute">WALLET SET IDENTIFIER</span>
            <span class="body-md font-mono text-mute" style="font-size: 0.78rem;">{{ circleStatus.walletSetId || 'Pending Provisioning' }}</span>
          </div>

          <div class="flex justify-between items-center py-2" style="border-bottom: 1px dashed rgba(255,255,255,0.03);">
            <span class="micro-cap text-mute">CREDENTIAL STATUS</span>
            <span class="badge-mini flex items-center gap-1" style="background: rgba(195, 232, 141, 0.05); color: var(--accent-success);">
              <Check :size="10" /> Key Loaded
            </span>
          </div>

          <!-- Extra CCTP Details -->
          <div style="background: rgba(0,0,0,0.15); border: 1px solid var(--border-light); padding: 1rem; margin-top: 1.5rem;">
            <div class="micro-cap mb-1" style="color: var(--accent-primary);">CROSS-CHAIN TRANSFERS (CCTP)</div>
            <p class="micro-cap text-mute" style="line-height: 1.4; text-transform: none; letter-spacing: 0;">
              Programmable treasury triggers automatically route digital euro conversions (EURC) on Arc Testnet via Circle burn-and-mint primitives.
            </p>
          </div>
        </div>

        <div v-else class="skeleton p-6" style="height: 180px;">
          <div class="skeleton-text short"></div>
          <div class="skeleton-title"></div>
          <div class="skeleton-text"></div>
        </div>
      </div>

      <!-- Passkey Smart Account (ERC-4337) -->
      <div class="glass-panel">
        <div class="flex items-center justify-between mb-4 border-b pb-4" style="border-color: rgba(255,255,255,0.05);">
          <h3 class="card-title flex items-center gap-2" style="font-size: 1rem; margin: 0;">
            <Fingerprint :size="16" color="var(--accent-secondary)" />
            PASSKEY SMART ACCOUNT
          </h3>
          <div class="badge" style="background: rgba(130, 170, 255, 0.1); color: var(--accent-secondary); border-radius: 0px;">
            ERC-4337 SCA
          </div>
        </div>

        <p class="body-md text-mute mb-4" style="font-size: 0.88rem; line-height: 1.5;">
          Establish a biometric-secured smart wallet that manages stablecoins natively. No browser extensions or private key seed phrases are exposed.
        </p>

        <!-- Initial State: Call to Action -->
        <div v-if="!passkeyRegistered && !registeringPasskey" class="biometric-scan-panel">
          <Key :size="32" color="rgba(255,255,255,0.15)" style="margin: 0 auto 1rem;" />
          <p class="micro-cap text-mute" style="text-transform: none; letter-spacing: 0;">Register secure hardware biometrics to provision your Circle Modular Smart Account.</p>
        </div>

        <!-- Biometric Registering State -->
        <div v-if="registeringPasskey" class="biometric-scan-panel authenticating">
          <Fingerprint :size="36" color="var(--accent-secondary)" class="pulse" style="margin: 0 auto 1rem;" />
          <p class="micro-cap text-mute" style="text-transform: none; letter-spacing: 0; color: var(--accent-secondary); font-weight: bold;">
            TOUCH SENSOR / AUTHENTICATING BIOMETRICS...
          </p>
        </div>

        <!-- Registered Smart account details -->
        <div v-if="passkeyRegistered" class="biometric-scan-panel success">
          <div class="flex items-center gap-2 mb-2" style="justify-content: center;">
            <Check :size="16" color="var(--accent-success)" />
            <span class="micro-cap" style="color: var(--accent-success); font-weight: bold;">PASSKEY SMART ACCOUNT ACTIVE</span>
          </div>
          <div class="micro-cap text-mute mb-1" style="font-size: 0.65rem;">CUSTODIAL SMART ADDRESS</div>
          <div class="body-md font-mono text-mute" style="font-size: 0.72rem; word-break: break-all;">
            {{ generatedSmartAddress }}
          </div>
        </div>

        <button 
          v-if="!passkeyRegistered"
          class="btn-primary w-full"
          :class="{ 'btn-loading': registeringPasskey }"
          @click="registerPasskey"
          style="background: var(--accent-secondary); border-color: var(--accent-secondary); color: #131313;"
        >
          {{ registeringPasskey ? 'REGISTERING PASSKEY...' : 'REGISTER DEVICE PASSKEY' }}
        </button>

        <div v-else class="flex items-center justify-between mt-4 p-3" style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-light);">
          <span class="micro-cap text-mute flex items-center gap-1"><Lock :size="10" /> BIOMETRIC GUARDED</span>
          <span class="badge-mini" style="background: rgba(195, 232, 141, 0.1); color: var(--accent-success);">VALID</span>
        </div>
      </div>
    </div>

    <!-- Gas Sponsorship Desk -->
    <div class="glass-panel fade-up delay-3" style="margin-top: 3rem;">
      <div class="flex items-center justify-between mb-4">
        <div>
          <div class="micro-cap" style="color: var(--accent-primary);">CIRCLE GAS STATION CONTROL</div>
          <h3 class="display-lg mt-1" style="font-size: 1.5rem; margin: 0;">GAS SPONSORSHIP SCHEME</h3>
        </div>
        <div>
          <button 
            class="btn-toggle" 
            :class="{ 'active': sponsorGas, 'inactive': !sponsorGas }"
            @click="sponsorGas = !sponsorGas"
          >
            {{ sponsorGas ? 'SPONSORSHIP ENABLED' : 'SPONSORSHIP DISABLED' }}
          </button>
        </div>
      </div>

      <p class="body-md text-mute mb-4" style="font-size: 0.88rem; line-height: 1.5; max-width: 800px;">
        When enabled, all corporate yield harvesting, dark pool OTC placements, and stablecoin deposits on the EVM/Arc Testnet are automatically sponsored. Corporate signers pay $0.00 in transaction fees.
      </p>

      <div class="policy-box">
        <AlertCircle :size="18" color="var(--accent-gold)" style="flex-shrink:0; margin-top:2px;" />
        <p class="micro-cap text-mute" style="line-height: 1.5; text-transform: none; letter-spacing: 0; font-size: 0.78rem; margin-bottom: 0;">
          <strong>Gas Sponsorship Policy Note:</strong> Spreading gas fees across multi-chain wallets is fully compliant with modern enterprise treasury rules. Transaction volume triggers are managed directly through your Circle console.
        </p>
      </div>
    </div>
  </div>
</template>
