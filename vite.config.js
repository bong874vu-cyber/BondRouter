import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import crypto from 'crypto'
import https from 'https'
import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

// Load environment variables from .env
dotenv.config()

// Helper to make user-controlled wallet requests to Circle Sandbox
function circleUserApiRequest(method, endpoint, body = null, userToken = null) {
  return new Promise((resolve, reject) => {
    const apiKey = process.env.CIRCLE_API_KEY
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    }
    if (userToken) {
      headers['X-User-Token'] = userToken
    }

    const options = {
      hostname: 'api.circle.com',
      port: 443,
      path: `/v1${endpoint}`,
      method: method,
      headers: headers
    }

    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data)
          resolve(parsed)
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

import { initiateDeveloperControlledWalletsClient } from '@circle-fin/developer-controlled-wallets'

// Initialize Circle SDK client if credentials exist in .env
let circleClient = null
const apiKey = process.env.CIRCLE_API_KEY
const entitySecret = process.env.CIRCLE_ENTITY_SECRET

if (apiKey && !apiKey.startsWith('MOCK_')) {
  try {
    circleClient = initiateDeveloperControlledWalletsClient({
      apiKey: apiKey,
      entitySecret: entitySecret
    })
    console.log('[Circle Server] SDK Client successfully initialized for Sandbox production.')
  } catch (e) {
    console.error('[Circle Server] Failed to initialize Circle SDK Client:', e.message)
  }
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
    walletSetId: 'wset_mock_' + crypto.randomBytes(8).toString('hex'),
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
  server: {
    port: 3000
  },
  define: {
    'process.env': {},
    'process.version': JSON.stringify('v18.0.0'),
    'process.platform': JSON.stringify('browser'),
    'global': 'globalThis'
  },
  plugins: [
    vue(),
    nodePolyfills({
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
      protocolImports: true,
    }),
    {
      name: 'circle-programmable-wallets-api',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (req.url.startsWith('/api/circle/')) {
            res.setHeader('Content-Type', 'application/json')

            const safeError = (err) => {
              console.error("[Circle Server Middleware Error]:", err);
              let msg = err.message || 'Internal Server Error';
              const keys = [
                process.env.CIRCLE_API_KEY,
                process.env.PRIVATE_KEY,
                process.env.CIRCLE_ENTITY_SECRET
              ];
              for (const key of keys) {
                if (key && key.length > 5) {
                  msg = msg.split(key).join('***REDACTED_SECRET***');
                }
              }
              return msg;
            };

            const endpoint = req.url.replace('/api/circle', '').split('?')[0]

            // 1. STATUS ENDPOINT
            if (endpoint === '/status') {
              res.end(JSON.stringify({
                configured: !!circleClient,
                apiMode: circleClient ? 'production' : 'simulation',
                message: circleClient ? 'Connected to Circle Sandbox API' : 'Simulation Mode Active'
              }))
              return
            }

            // 2. WALLETS LISTING & PROVISIONING
            if (endpoint === '/wallets') {
              let store = loadPersistedWallets()

              if (circleClient) {
                // Production Mode: check or provision wallets on Circle infrastructure
                if (!store || store.mode !== 'production') {
                  try {
                    console.log('[Circle Server] Provisioning new Wallet Set via Circle SDK...')
                    const walletSetRes = await circleClient.createWalletSet({
                      name: 'BondRouter Corporate Treasury Set'
                    })
                    const walletSetId = walletSetRes.data.walletSet.id
                    console.log(`[Circle Server] Created Wallet Set ID: ${walletSetId}`)

                    console.log('[Circle Server] Generating Developer-Controlled SCA wallets...')
                    const walletRes = await circleClient.createWallets({
                      accountType: 'SCA',
                      blockchains: ['BASE-SEPOLIA'],
                      walletSetId: walletSetId,
                      count: 3
                    })

                    const created = walletRes.data.wallets
                    const purposes = ['RESERVES', 'PAYOUTS', 'GROWTH']
                    const names = ['Main Corporate Reserves', 'Global Contractor Payouts', 'Active Compounding Growth']
                    const tokens = ['USDC', 'EURC', 'USDC']
                    const allocations = [80, 10, 10]
                    const wallets = []

                    for (let i = 0; i < created.length; i++) {
                      wallets.push({
                        id: created[i].id,
                        name: names[i] || `Wallet ${i}`,
                        purpose: purposes[i] || 'GROWTH',
                        address: created[i].address,
                        blockchain: created[i].blockchain,
                        token: tokens[i] || 'USDC',
                        balance: '0.00',
                        allocation: allocations[i] || 10
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
                    console.error('[Circle Server] Wallet provisioning failed:', e.message)
                    // Fallback to simulation if initialization rejects on network error
                    store = generateSimulatedWallets()
                    savePersistedWallets(store)
                  }
                } else {
                  // Wallets already provisioned, query live balances from Circle Sandbox
                  console.log('[Circle Server] Fetching live balances from Circle Sandbox...')
                  for (let w of store.wallets) {
                    try {
                      const balRes = await circleClient.getWalletTokenBalance({
                        id: w.id
                      })
                      if (balRes.data && balRes.data.tokenBalances) {
                        const tokenBal = balRes.data.tokenBalances.find(tb => tb.token.symbol === w.token)
                        w.balance = tokenBal ? tokenBal.amount : '0.00'
                      }
                    } catch (balErr) {
                      console.warn(`[Circle Server] Failed to query balance for ${w.id}:`, balErr.message)
                    }
                  }
                  savePersistedWallets(store)
                }
              } else {
                // Simulation Mode
                if (!store || store.mode !== 'simulation') {
                  store = generateSimulatedWallets()
                  savePersistedWallets(store)
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
                    store = circleClient ? { mode: 'production', wallets: [], distributions: [] } : generateSimulatedWallets()
                  }

                  const rVal = parsedAmount * 0.8
                  const pVal = parsedAmount * 0.1
                  const gVal = parsedAmount * 0.1

                  let circleTxHash = '0x' + crypto.randomBytes(32).toString('hex')
                  let executionStatus = 'SIMULATED'

                  if (circleClient && store.mode === 'production') {
                    // Production Transfer execution attempt
                    console.log('[Circle Server] Dispatched transfer transaction to Circle rails...')
                    const reservesWallet = store.wallets.find(w => w.purpose === 'RESERVES')
                    const growthWallet = store.wallets.find(w => w.purpose === 'GROWTH')

                    if (reservesWallet && growthWallet && parsedAmount > 0) {
                      try {
                        // Attempt transfer to Growth wallet using Developer-Controlled credentials
                        const transferRes = await circleClient.createDeveloperTransfer({
                          walletId: reservesWallet.id,
                          destinationAddress: growthWallet.address,
                          blockchain: 'BASE-SEPOLIA',
                          amounts: [gVal.toFixed(2)],
                          feeLevel: 'LOW',
                          tokenId: 'USD-SEPOLIA' // USDC token reference on Sandbox Base Sepolia
                        })

                        if (transferRes.data && transferRes.data.txHash) {
                          circleTxHash = transferRes.data.txHash
                          executionStatus = 'SETTLED'
                          console.log('[Circle Server] Transfer successful. TxHash:', circleTxHash)
                        }
                      } catch (txErr) {
                        console.warn('[Circle Server] Real transfer could not settle (likely insufficient gas/funds on sandbox address). Logging error:', txErr.message)
                      }
                    }
                  }

                  // Update client balances
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
                    circleTxHash,
                    status: executionStatus
                  }

                  store.distributions.unshift(newDistribution)
                  savePersistedWallets(store)

                  res.end(JSON.stringify({ success: true, distribution: newDistribution, wallets: store.wallets }))
                } catch (err) {
                  res.statusCode = 400
                  res.end(JSON.stringify({ error: safeError(err) }))
                }
              })
              return
            }

            // 4. KYC MOCK VERIFICATION & ON-CHAIN WHITELISTING
            if (endpoint === '/verify-kyc' && req.method === 'POST') {
              let body = ''
              req.on('data', chunk => body += chunk)
              req.on('end', async () => {
                try {
                  const { address, status } = JSON.parse(body)
                  if (!address) {
                    throw new Error("Address is required")
                  }
                  const whitelistStatus = status !== undefined ? !!status : true
                  console.log(`[Circle Server] Requesting KYC whitelist for: ${address} (Status: ${whitelistStatus})`)

                  const privateKey = process.env.PRIVATE_KEY
                  const hasKey = !!privateKey
                  let txHash = ''
                  let onChainStatus = false

                  if (hasKey) {
                    try {
                      const { JsonRpcProvider, Wallet, Contract } = await import('ethers')
                      const provider = new JsonRpcProvider('https://rpc.testnet.arc.network')
                      const wallet = new Wallet(privateKey, provider)

                      const contractAddrJson = JSON.parse(fs.readFileSync('./src/contractAddress.json', 'utf8'))
                      const registryAddress = contractAddrJson.ComplianceRegistry

                      if (registryAddress) {
                        const ABI = ["function whitelistInvestor(address investor, bool status) external"]
                        const contract = new Contract(registryAddress, ABI, wallet)

                        console.log(`[Circle Server] Sending whitelist txn for ${address} to registry ${registryAddress} (Status: ${whitelistStatus})...`)
                        const tx = await contract.whitelistInvestor(address, whitelistStatus, { gasLimit: 200000n })
                        txHash = tx.hash
                        await tx.wait()
                        onChainStatus = true
                        console.log(`[Circle Server] Whitelist txn confirmed: ${txHash}`)
                      }
                    } catch (ethersErr) {
                      console.warn("[Circle Server] Real on-chain whitelisting transaction failed, falling back to simulation:", ethersErr.message)
                    }
                  }

                  res.end(JSON.stringify({
                    success: true,
                    address: address,
                    whitelisted: whitelistStatus,
                    onChain: onChainStatus,
                    txHash: txHash
                  }))
                } catch (err) {
                  res.statusCode = 400
                  res.end(JSON.stringify({ error: safeError(err) }))
                }
              })
              return
            }

            // 5. USER-CONTROLLED WALLET SESSION MANAGEMENT (REAL FLOW)
            if (endpoint === '/user/session' && req.method === 'POST') {
              let body = ''
              req.on('data', chunk => body += chunk)
              req.on('end', async () => {
                try {
                  const { email, queryOnly } = JSON.parse(body)
                  if (!email) {
                    throw new Error("Email is required")
                  }

                  // Generate deterministic UUID from email to keep the user ID stable
                  const userId = crypto.createHash('sha256')
                    .update(email.toLowerCase())
                    .digest('hex')
                    .substring(0, 32)
                    .replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5')

                  console.log(`[Circle Server] UCW Session for user: ${userId} (${email})`)

                  let userToken = ''
                  let encryptionKey = ''
                  let wallets = []

                  if (apiKey && !apiKey.startsWith('MOCK_')) {
                    // Try to generate session token directly first to reduce rate limit footprint
                    let tokenData;
                    try {
                      tokenData = await circleUserApiRequest('POST', '/w3s/users/token', { userId })
                    } catch (e) {
                      // If it fails, register the user first, then generate session token
                      console.log(`[Circle Server] User registration required for ID: ${userId}`)
                      try {
                        await circleUserApiRequest('POST', '/w3s/users', { userId })
                        console.log(`[Circle Server] Registered new UCW user: ${userId}`)
                      } catch (regErr) {
                        // Silently ignore if already registered
                      }
                      tokenData = await circleUserApiRequest('POST', '/w3s/users/token', { userId })
                    }

                    if (!tokenData.data || !tokenData.data.userToken) {
                      throw new Error(tokenData.message || "Failed to generate session token")
                    }
                    userToken = tokenData.data.userToken
                    encryptionKey = tokenData.data.encryptionKey

                    // 3. Fetch existing wallets (Use GET /w3s/wallets with X-User-Token)
                    const walletsData = await circleUserApiRequest('GET', '/w3s/wallets', null, userToken)
                    wallets = walletsData?.data?.wallets || []

                    if (wallets.length > 0) {
                      res.end(JSON.stringify({ status: 'ACTIVE', wallets, userToken, encryptionKey, appId: process.env.CIRCLE_APP_ID }))
                      return
                    }

                    if (queryOnly) {
                      res.end(JSON.stringify({ status: 'INITIALIZING', wallets: [], userToken, encryptionKey, appId: process.env.CIRCLE_APP_ID }))
                      return
                    }

                    // 4. Request initialization (Create PIN & first wallet)
                    console.log(`[Circle Server] No wallets found. Initializing user: ${userId}`)
                    const initData = await circleUserApiRequest('POST', '/w3s/user/initialize', {
                      idempotencyKey: crypto.randomUUID(),
                      blockchains: ['ARC-TESTNET', 'ETH-SEPOLIA'],
                      accountType: 'SCA'
                    }, userToken)

                    if (initData.data && initData.data.challengeId) {
                      res.end(JSON.stringify({ status: 'INITIALIZING', challengeId: initData.data.challengeId, userToken, encryptionKey, appId: process.env.CIRCLE_APP_ID }))
                      return
                    }

                    // Handle "User Already Initialized" error (Code 155106)
                    const isAlreadyInitialized = initData?.code === 155106 ||
                      (initData?.message && initData.message.toLowerCase().includes('already initialized'))

                    if (isAlreadyInitialized) {
                      console.log(`[Circle Server] User already initialized but has no wallets. Requesting wallet challenge...`)
                      const walletData = await circleUserApiRequest('POST', '/w3s/user/wallets', {
                        idempotencyKey: crypto.randomUUID(),
                        blockchains: ['ARC-TESTNET', 'ETH-SEPOLIA'],
                        accountType: 'SCA'
                      }, userToken)

                      if (walletData.data && walletData.data.challengeId) {
                        res.end(JSON.stringify({ status: 'INITIALIZING', challengeId: walletData.data.challengeId, userToken, encryptionKey, appId: process.env.CIRCLE_APP_ID }))
                        return
                      }
                    }

                    throw new Error(initData?.message || "Failed to initialize session")
                  } else {
                    throw new Error("CIRCLE_API_KEY is missing or invalid")
                  }
                } catch (err) {
                  res.statusCode = 400
                  res.end(JSON.stringify({ error: safeError(err) }))
                }
              })
              return
            }

            // 5b. TRANSACTION RELAYER FOR EMAIL-LOGIN USERS (CIRCLE UCW)
            if (endpoint === '/user/execute' && req.method === 'POST') {
              let body = ''
              req.on('data', chunk => body += chunk)
              req.on('end', async () => {
                try {
                  const { userAddress, action, bondId, trancheIndex, amount, asset, sizeHash } = JSON.parse(body)
                  if (!userAddress) {
                    throw new Error("User address is required")
                  }
                  console.log(`[Circle Server Relayer] Action: ${action} for User: ${userAddress}`)

                  const privateKey = process.env.PRIVATE_KEY
                  if (!privateKey) {
                    throw new Error("Server private key not configured")
                  }

                  const { JsonRpcProvider, Wallet, Contract, parseEther } = await import('ethers')
                  const provider = new JsonRpcProvider('https://rpc.testnet.arc.network')
                  const devWallet = new Wallet(privateKey, provider)

                  const contractAddrJson = JSON.parse(fs.readFileSync('./src/contractAddress.json', 'utf8'))
                  const routerAddress = contractAddrJson.BondRouter

                  if (!routerAddress) {
                    throw new Error("BondRouter address not configured")
                  }

                  // Auto-whitelist devWallet on ComplianceRegistry if needed
                  const registryAddress = contractAddrJson.ComplianceRegistry
                  if (registryAddress) {
                    try {
                      const registryABI = [
                        "function isWhitelisted(address investor) external view returns (bool)",
                        "function whitelistInvestor(address investor, bool status) external"
                      ]
                      const registryContract = new Contract(registryAddress, registryABI, devWallet)
                      const isDevWhitelisted = await registryContract.isWhitelisted(devWallet.address)
                      if (!isDevWhitelisted) {
                        console.log(`[Circle Server Relayer] Dev wallet ${devWallet.address} is not whitelisted. Auto-whitelisting...`)
                        const wlTx = await registryContract.whitelistInvestor(devWallet.address, true, { gasLimit: 200000n })
                        await wlTx.wait()
                        console.log(`[Circle Server Relayer] Dev wallet whitelisted successfully.`)
                      }
                    } catch (wlErr) {
                      console.warn("[Circle Server Relayer] Failed to auto-whitelist dev wallet:", wlErr.message)
                    }
                  }

                  const ABI = [
                    "function investInTranche(string memory bondId, uint8 trancheIndex) external payable",
                    "function getTrancheTokenId(string memory bondId, uint8 trancheIndex) public pure returns (uint256)",
                    "function safeTransferFrom(address from, address to, uint256 id, uint256 value, bytes calldata data) external",
                    "function harvestYield(uint256 amount) external",
                    "function submitConfidentialOrder(string memory asset, uint256 sizeHash) external payable"
                  ]

                  const contract = new Contract(routerAddress, ABI, devWallet)
                  let txHash = ''

                  if (action === 'invest') {
                    const parsedAmount = parseEther(amount.toString())
                    console.log(`[Circle Server Relayer] Investing ${amount} USDC in ${bondId} Tranche ${trancheIndex}...`)

                    // 1. Invest using developer wallet
                    const tx = await contract.investInTranche(bondId, Number(trancheIndex), {
                      value: parsedAmount,
                      gasLimit: 300000n
                    })
                    await tx.wait()
                    txHash = tx.hash
                    console.log(`[Circle Server Relayer] Investment transaction confirmed: ${txHash}`)

                    // 2. Transfer the minted token to the user
                    const tokenId = await contract.getTrancheTokenId(bondId, Number(trancheIndex))
                    console.log(`[Circle Server Relayer] Transferring tokenId ${tokenId} to user ${userAddress}...`)
                    const transferTx = await contract.safeTransferFrom(devWallet.address, userAddress, tokenId, parsedAmount, "0x", {
                      gasLimit: 200000n
                    })
                    await transferTx.wait()
                    console.log(`[Circle Server Relayer] Transfer confirmed: ${transferTx.hash}`)
                  }
                  else if (action === 'harvest') {
                    const parsedAmount = parseEther(amount.toString())
                    console.log(`[Circle Server Relayer] Harvesting ${amount} USDC for user ${userAddress}...`)
                    console.log(`[Circle Server Relayer] Relayer sending direct yield payment of ${amount} USDC to user...`)
                    const tx = await devWallet.sendTransaction({
                      to: userAddress,
                      value: parsedAmount,
                      gasLimit: 100000n
                    })
                    await tx.wait()
                    txHash = tx.hash
                    console.log(`[Circle Server Relayer] Yield payment confirmed: ${txHash}`)
                  }
                  else if (action === 'submitConfidentialOrder') {
                    const parsedAmount = parseEther("0.0001") // standard valueToSend
                    console.log(`[Circle Server Relayer] Submitting confidential order for ${asset} with sizeHash ${sizeHash}...`)
                    const tx = await contract.submitConfidentialOrder(asset, BigInt(sizeHash), {
                      value: parsedAmount,
                      gasLimit: 300000n
                    })
                    await tx.wait()
                    txHash = tx.hash
                    console.log(`[Circle Server Relayer] Confidential order confirmed: ${txHash}`)
                  }

                  res.end(JSON.stringify({
                    success: true,
                    txHash: txHash
                  }))
                } catch (err) {
                  res.statusCode = 400
                  res.end(JSON.stringify({ error: err.message || "Unknown error" }))
                }
              })
              return
            }

            // 6. STABLEFX MULTI-CURRENCY PAYOUT ENGINE
            if (endpoint === '/fx/quote' && req.method === 'POST') {
              let body = ''
              req.on('data', chunk => body += chunk)
              req.on('end', async () => {
                try {
                  const { sellAsset, buyAsset, sellAmount } = JSON.parse(body)
                  console.log(`[Circle Server] Requesting FX Quote: ${sellAsset} -> ${buyAsset} (Amount: ${sellAmount})`)

                  let quoteId = 'q_' + crypto.randomBytes(12).toString('hex')
                  const rate = 0.9234
                  const buyAmount = (parseFloat(sellAmount) * rate).toFixed(2)
                  const expiresAt = new Date(Date.now() + 30000).toISOString() // 30 seconds expiry

                  let response = { success: true, quoteId, rate, buyAmount, expiresAt }

                  if (apiKey && !apiKey.startsWith('MOCK_')) {
                    try {
                      const apiRes = await circleUserApiRequest('POST', '/stablefx/quotes', {
                        sellAsset: sellAsset || 'USDC',
                        buyAsset: buyAsset || 'EURC',
                        sellAmount: sellAmount ? sellAmount.toString() : '10.00'
                      })
                      if (apiRes.data) {
                        response.quoteId = apiRes.data.id
                        response.rate = parseFloat(apiRes.data.rate)
                        response.buyAmount = apiRes.data.buyAmount
                        response.expiresAt = apiRes.data.expiresAt
                      }
                    } catch (e) {
                      console.warn('[Circle Server] Circle StableFX Quote API failed, using fallback:', e.message)
                    }
                  }

                  res.end(JSON.stringify(response))
                } catch (err) {
                  res.statusCode = 400
                  res.end(JSON.stringify({ error: safeError(err) }))
                }
              })
              return
            }

            if (endpoint === '/fx/execute' && req.method === 'POST') {
              let body = ''
              req.on('data', chunk => body += chunk)
              req.on('end', async () => {
                try {
                  const { quoteId, sellAmount } = JSON.parse(body)
                  console.log(`[Circle Server] Executing FX Trade for Quote: ${quoteId}`)

                  let tradeId = 't_' + crypto.randomBytes(12).toString('hex')
                  const rate = 0.9234
                  const sellVal = parseFloat(sellAmount) || 10.00
                  const buyVal = parseFloat((sellVal * rate).toFixed(2))

                  let response = { success: true, tradeId, status: 'completed', rate, buyAmount: buyVal }

                  if (apiKey && !apiKey.startsWith('MOCK_')) {
                    try {
                      const apiRes = await circleUserApiRequest('POST', '/stablefx/trades', { quoteId })
                      if (apiRes.data) {
                        response.tradeId = apiRes.data.id
                        response.status = apiRes.data.status
                        response.rate = parseFloat(apiRes.data.rate)
                        response.buyAmount = apiRes.data.buyAmount
                      }
                    } catch (e) {
                      console.warn('[Circle Server] Circle StableFX Trade API failed, using fallback:', e.message)
                    }
                  }

                  // Update corporate wallets
                  if (store && store.wallets) {
                    const reservesWallet = store.wallets.find(w => w.purpose === 'RESERVES')
                    const payoutsWallet = store.wallets.find(w => w.purpose === 'PAYOUTS')

                    if (reservesWallet && payoutsWallet) {
                      const curReserves = parseFloat(reservesWallet.balance)
                      const curPayouts = parseFloat(payoutsWallet.balance)

                      if (curReserves >= sellVal) {
                        reservesWallet.balance = (curReserves - sellVal).toFixed(2)
                        payoutsWallet.balance = (curPayouts + buyVal).toFixed(2)
                        savePersistedWallets(store)
                        console.log(`[Circle Server] Transferred EURC payout: -${sellVal} USDC from Reserves, +${buyVal} EURC to Contractor Payouts.`)
                      }
                    }
                  }

                  res.end(JSON.stringify(response))
                } catch (err) {
                  res.statusCode = 400
                  res.end(JSON.stringify({ error: safeError(err) }))
                }
              })
              return
            }

            // 7. GATEWAY NANOPAYMENTS (x402) FOR YIELD STREAMING
            if (endpoint === '/yield/stream' && req.method === 'GET') {
              try {
                const urlObj = new URL(req.url, `http://${req.headers.host}`)
                const address = urlObj.searchParams.get('address') || '0xdefault'

                const ratePerSecond = 0.000231
                const now = Date.now()
                const elapsedSeconds = 10
                const accrued = ratePerSecond * elapsedSeconds

                // Set x402 protocol headers
                res.setHeader('X-402-Payment-Required', 'true')
                res.setHeader('X-402-Gateway-Channel', `channel_usr_${address.slice(2, 10)}`)
                res.setHeader('X-402-Rate-Limit', '1000')

                res.end(JSON.stringify({
                  success: true,
                  ratePerSecond,
                  accrued,
                  channelId: `channel_usr_${address.slice(2, 10)}`,
                  lastSyncTime: now
                }))
              } catch (err) {
                res.statusCode = 400
                res.end(JSON.stringify({ error: safeError(err) }))
              }
              return
            }

            if (endpoint === '/yield/settle' && req.method === 'POST') {
              let body = ''
              req.on('data', chunk => body += chunk)
              req.on('end', async () => {
                try {
                  const { address, amount } = JSON.parse(body)
                  console.log(`[Circle Server] Settling Gateway Nanopayment for ${address}: ${amount} USDC`)

                  res.setHeader('X-402-Settlement-Status', 'SETTLED')
                  res.setHeader('X-402-Transaction-Id', `nano_${crypto.randomBytes(8).toString('hex')}`)

                  res.end(JSON.stringify({
                    success: true,
                    settledAmount: amount,
                    txId: `nano_${crypto.randomBytes(8).toString('hex')}`,
                    timestamp: new Date().toISOString()
                  }))
                } catch (err) {
                  res.statusCode = 400
                  res.end(JSON.stringify({ error: safeError(err) }))
                }
              })
              return
            }

            // 8. AI TREASURY AGENT MONITOR
            if (endpoint === '/agent/status' && req.method === 'GET') {
              try {
                res.end(JSON.stringify({
                  success: true,
                  running: true,
                  agentAddress: '0x51c91Ece1a28D5F66d2139268f76dfD326a0D342',
                  registryAddress: '0x8F572C4119B6d0800e84b80b7A98b9f12dC1E866',
                  lastScanTime: new Date().toISOString()
                }))
              } catch (err) {
                res.statusCode = 500
                res.end(JSON.stringify({ error: safeError(err) }))
              }
              return
            }

            // 8b. ARC FAUCET FOR MOCK GRANTS
            if (endpoint === '/faucet' && req.method === 'POST') {
              let body = ''
              req.on('data', chunk => body += chunk)
              req.on('end', async () => {
                try {
                  const { address } = JSON.parse(body)
                  if (!address) {
                    throw new Error("Address is required")
                  }
                  console.log(`[Circle Server Faucet] Supplying mock grant for address: ${address}`)
                  
                  const privateKey = process.env.PRIVATE_KEY
                  let txHash = '0x_mocked_faucet_tx_hash'
                  let success = false
                  
                  if (privateKey) {
                    try {
                      const { JsonRpcProvider, Wallet, parseEther } = await import('ethers')
                      const provider = new JsonRpcProvider('https://rpc.testnet.arc.network')
                      const wallet = new Wallet(privateKey, provider)
                      
                      console.log(`[Circle Server Faucet] Sending 10 USDC (gas native) to ${address}...`)
                      const tx = await wallet.sendTransaction({
                        to: address,
                        value: parseEther("10.0"),
                        gasLimit: 100000n
                      })
                      txHash = tx.hash
                      await tx.wait()
                      success = true
                      console.log(`[Circle Server Faucet] Faucet transaction confirmed: ${txHash}`)
                    } catch (txErr) {
                      console.warn("[Circle Server Faucet] Real transfer failed, falling back to mock:", txErr.message)
                    }
                  }
                  
                  res.end(JSON.stringify({
                    success: true,
                    txHash: txHash,
                    funded: success
                  }))
                } catch (err) {
                  res.statusCode = 400
                  res.end(JSON.stringify({ error: safeError(err) }))
                }
              })
              return
            }

            // 8c. ENCRYPTED KEY-VAULT BACKUP
            if (endpoint === '/vault/backup' && req.method === 'POST') {
              let body = ''
              req.on('data', chunk => body += chunk)
              req.on('end', async () => {
                try {
                  const { address, encryptedSecrets } = JSON.parse(body)
                  if (!address || !encryptedSecrets) {
                    throw new Error("Address and encrypted secrets are required")
                  }
                  console.log(`[Circle Server Vault] Saving backup for investor: ${address}`)
                  
                  const VAULT_FILE = path.resolve(__dirname, '.circle_secrets_vault.json')
                  let vault = {}
                  if (fs.existsSync(VAULT_FILE)) {
                    try {
                      vault = JSON.parse(fs.readFileSync(VAULT_FILE, 'utf8'))
                    } catch (e) {
                      console.error('[Circle Server Vault] Failed to parse vault file:', e)
                    }
                  }
                  vault[address.toLowerCase()] = encryptedSecrets
                  fs.writeFileSync(VAULT_FILE, JSON.stringify(vault, null, 2), 'utf8')
                  
                  res.end(JSON.stringify({ success: true }))
                } catch (err) {
                  res.statusCode = 400
                  res.end(JSON.stringify({ error: safeError(err) }))
                }
              })
              return
            }

            if (endpoint === '/vault/retrieve' && req.method === 'GET') {
              try {
                const urlObj = new URL(req.url, `http://${req.headers.host}`)
                const address = urlObj.searchParams.get('address')
                if (!address) {
                  throw new Error("Address parameter is required")
                }
                console.log(`[Circle Server Vault] Retrieving backup for investor: ${address}`)
                
                const VAULT_FILE = path.resolve(__dirname, '.circle_secrets_vault.json')
                let encryptedSecrets = ''
                if (fs.existsSync(VAULT_FILE)) {
                  try {
                    const vault = JSON.parse(fs.readFileSync(VAULT_FILE, 'utf8'))
                    encryptedSecrets = vault[address.toLowerCase()] || ''
                  } catch (e) {
                    console.error('[Circle Server Vault] Failed to read vault file:', e)
                  }
                }
                res.end(JSON.stringify({ success: true, encryptedSecrets }))
              } catch (err) {
                res.statusCode = 400
                res.end(JSON.stringify({ error: safeError(err) }))
              }
              return
            }



            // 9. COMPLIANCE & TELEMETRY AUDIT REPORT EXPORTER
            if (endpoint === '/compliance/report' && req.method === 'GET') {
              try {
                const logs = [
                  { id: "TX_10821", date: "2026-06-08 10:15:30", type: "Deposit (Senior)", amount: "50000.00 USDC", gasFee: "$0.00 (Sponsored)", status: "COMPLIANT", complianceKey: "KYC_VERIFIED_ARC" },
                  { id: "TX_10822", date: "2026-06-08 11:30:00", type: "OTC Dark Pool Lock", amount: "100000.00 USDC", gasFee: "$0.00 (Sponsored)", status: "COMPLIANT", complianceKey: "PEDERSEN_ZK_ESCROW" },
                  { id: "TX_10823", date: "2026-06-08 12:45:12", type: "Sweep Yield Allocation", amount: "420.50 EURC", gasFee: "$0.00 (Sponsored)", status: "COMPLIANT", complianceKey: "STABLEFX_USDC_EURC" },
                  { id: "TX_10824", date: "2026-06-08 14:10:05", type: "Secondary Bid CLOB", amount: "15000.00 USDC", gasFee: "$0.00 (Sponsored)", status: "COMPLIANT", complianceKey: "LIMIT_ORDER_ESCROW" }
                ];
                res.end(JSON.stringify({
                  success: true,
                  generatedAt: new Date().toISOString(),
                  systemHash: crypto.createHash('sha256').update(JSON.stringify(logs)).digest('hex'),
                  logs
                }))
              } catch (err) {
                res.statusCode = 500
                res.end(JSON.stringify({ error: safeError(err) }))
              }
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
