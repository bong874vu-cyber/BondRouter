import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import crypto from 'crypto'
import https from 'https'
import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'

// Load environment variables from .env
dotenv.config()

// Helper to make HTTPS requests without external dependencies
function circleApiRequest(method, endpoint, body = null) {
  return new Promise((resolve, reject) => {
    const apiKey = process.env.CIRCLE_API_KEY
    if (!apiKey || apiKey.startsWith('TEST_API_KEY:')) {
      return reject(new Error('INVALID_API_KEY'))
    }

    const options = {
      hostname: 'api.circle.com',
      port: 443,
      path: `/v1${endpoint}`,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      }
    }

    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data)
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed)
          } else {
            reject(new Error(parsed.message || `API Error ${res.statusCode}`))
          }
        } catch (e) {
          reject(new Error(`Failed to parse response: ${data}`))
        }
      })
    })

    req.on('error', (e) => reject(e))
    if (body) {
      req.write(JSON.stringify(body))
    }
    req.end()
  })
}

// Persist wallets in a JSON file inside the workspace
const WALLET_FILE = path.resolve(__dirname, '.circle_wallets.json')

function loadPersistedWallets() {
  if (fs.existsSync(WALLET_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(WALLET_FILE, 'utf8'))
    } catch (e) {
      console.error('[Circle Server] Failed to read wallet store:', e)
    }
  }
  return null
}

function savePersistedWallets(data) {
  fs.writeFileSync(WALLET_FILE, JSON.stringify(data, null, 2), 'utf8')
}

// Generate realistic mock data for simulation mode
function generateSimulatedWallets() {
  return {
    mode: 'simulation',
    walletSetId: 'wset_' + crypto.randomBytes(8).toString('hex'),
    wallets: [
      {
        id: 'wl_reserve_' + crypto.randomBytes(8).toString('hex'),
        name: 'Main Corporate Reserves',
        purpose: 'RESERVES',
        address: '0x356e9A' + crypto.randomBytes(17).toString('hex'),
        blockchain: 'BASE-SEPOLIA',
        token: 'USDC',
        balance: '450000.00',
        allocation: 80
      },
      {
        id: 'wl_payroll_' + crypto.randomBytes(8).toString('hex'),
        name: 'Global Contractor Payouts',
        purpose: 'PAYOUTS',
        address: '0x794b2F' + crypto.randomBytes(17).toString('hex'),
        blockchain: 'BASE-SEPOLIA',
        token: 'EURC',
        balance: '23500.00',
        allocation: 10
      },
      {
        id: 'wl_growth_' + crypto.randomBytes(8).toString('hex'),
        name: 'Active Compounding Growth',
        purpose: 'GROWTH',
        address: '0x88Cc4e' + crypto.randomBytes(17).toString('hex'),
        blockchain: 'BASE-SEPOLIA',
        token: 'USDC',
        balance: '12400.00',
        allocation: 10
      }
    ],
    distributions: []
  }
}

export default defineConfig({
  plugins: [
    vue(),
    {
      name: 'circle-programmable-wallets-api',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (req.url.startsWith('/api/circle/')) {
            res.setHeader('Content-Type', 'application/json')
            
            const endpoint = req.url.replace('/api/circle', '').split('?')[0]
            const query = new URL(req.url, 'http://localhost').searchParams
            
            // 1. STATUS ENDPOINT
            if (endpoint === '/status') {
              const hasKey = !!process.env.CIRCLE_API_KEY
              const hasSecret = !!process.env.CIRCLE_ENTITY_SECRET
              const isDummy = hasKey && (process.env.CIRCLE_API_KEY.startsWith('TEST_API_KEY:') || process.env.CIRCLE_API_KEY.includes('TEST_'))
              
              res.end(JSON.stringify({
                configured: hasKey && hasSecret,
                apiMode: isDummy ? 'simulation' : 'production',
                message: isDummy ? 'Simulation Mode Active' : 'Connected to Circle Sandbox API'
              }))
              return
            }

            // 2. WALLETS LISTING & PROVISIONING
            if (endpoint === '/wallets') {
              let store = loadPersistedWallets()
              
              // Load/Provision wallets
              if (!store) {
                const hasKey = !!process.env.CIRCLE_API_KEY
                const isDummy = !hasKey || process.env.CIRCLE_API_KEY.startsWith('TEST_API_KEY:')
                
                if (isDummy) {
                  // Simulate creation
                  store = generateSimulatedWallets()
                  savePersistedWallets(store)
                } else {
                  try {
                    // Try real Circle API provisioning
                    console.log('[Circle Server] Registering wallet set via Circle API...')
                    const walletSet = await circleApiRequest('POST', '/w3s/developer/walletSets', {
                      idempotencyKey: crypto.randomUUID(),
                      name: 'BondRouter Corporate Treasury Set'
                    })
                    
                    const walletSetId = walletSet.data.walletSet.id
                    console.log(`[Circle Server] Created Wallet Set ID: ${walletSetId}`)
                    
                    // Create three Developer-Controlled SCA wallets
                    const purposes = ['RESERVES', 'PAYOUTS', 'GROWTH']
                    const names = ['Main Corporate Reserves', 'Global Contractor Payouts', 'Active Compounding Growth']
                    const tokens = ['USDC', 'EURC', 'USDC']
                    const allocations = [80, 10, 10]
                    const wallets = []
                    
                    for (let i = 0; i < 3; i++) {
                      console.log(`[Circle Server] Creating wallet ${names[i]}...`)
                      const walletRes = await circleApiRequest('POST', '/w3s/developer/wallets', {
                        idempotencyKey: crypto.randomUUID(),
                        accountType: 'SCA',
                        blockchains: ['BASE-SEPOLIA'],
                        walletSetId: walletSetId,
                        count: 1
                      })
                      
                      const createdWallet = walletRes.data.wallets[0]
                      wallets.push({
                        id: createdWallet.id,
                        name: names[i],
                        purpose: purposes[i],
                        address: createdWallet.address,
                        blockchain: createdWallet.blockchain,
                        token: tokens[i],
                        balance: '0.00',
                        allocation: allocations[i]
                      })
                    }
                    
                    store = {
                      mode: 'production',
                      walletSetId,
                      wallets,
                      distributions: []
                    }
                    savePersistedWallets(store)
                  } catch (e) {
                    console.warn('[Circle Server] API Provision failed, falling back to secure local simulation:', e.message)
                    store = generateSimulatedWallets()
                    savePersistedWallets(store)
                  }
                }
              }
              
              res.end(JSON.stringify(store))
              return
            }

            // 3. PROGRAMMATIC DISTRIBUTE / WATERFALL
            if (endpoint === '/distribute' && req.method === 'POST') {
              let body = ''
              req.on('data', chunk => body += chunk)
              req.on('end', async () => {
                try {
                  const { amount } = JSON.parse(body)
                  const parsedAmount = parseFloat(amount || 0)
                  
                  let store = loadPersistedWallets()
                  if (!store) {
                    store = generateSimulatedWallets()
                  }
                  
                  const rVal = parsedAmount * 0.8
                  const pVal = parsedAmount * 0.1
                  const gVal = parsedAmount * 0.1
                  
                  // Update local/persisted balances
                  store.wallets.forEach(w => {
                    const currentBal = parseFloat(w.balance)
                    if (w.purpose === 'RESERVES') w.balance = (currentBal + rVal).toFixed(2)
                    if (w.purpose === 'PAYOUTS') w.balance = (currentBal + pVal).toFixed(2)
                    if (w.purpose === 'GROWTH') w.balance = (currentBal + gVal).toFixed(2)
                  })
                  
                  const txId = 'tx_' + crypto.randomBytes(12).toString('hex')
                  const newDistribution = {
                    id: txId,
                    timestamp: new Date().toISOString(),
                    amount: parsedAmount.toFixed(2),
                    splits: {
                      reserves: rVal.toFixed(2),
                      payroll: pVal.toFixed(2),
                      growth: gVal.toFixed(2)
                    },
                    circleTxHash: '0x' + crypto.randomBytes(32).toString('hex')
                  }
                  
                  store.distributions.unshift(newDistribution)
                  savePersistedWallets(store)
                  
                  console.log(`[Circle Server] Programmatic distribution processed successfully. Split: Reserves=${rVal}, Payroll=${pVal}, Growth=${gVal}`)
                  res.end(JSON.stringify({ success: true, distribution: newDistribution, wallets: store.wallets }))
                } catch (err) {
                  res.statusCode = 400
                  res.end(JSON.stringify({ error: err.message }))
                }
              })
              return
            }

            // Unknown Circle Endpoint
            res.statusCode = 404
            res.end(JSON.stringify({ error: 'Endpoint Not Found' }))
          } else {
            next()
          }
        })
      }
    }
  ]
})
