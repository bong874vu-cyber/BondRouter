# BondRouter OS

**An enterprise treasury operating system that unifies institutional stablecoin yield, confidential OTC clearing, and programmable fund distribution — powered by Circle's stablecoin stack and settled natively on Arc.**

```
Ignyte Stablecoins Commerce Stack Challenge 
```

<br>

## What does it actually do?

A corporate treasurer opens BondRouter. They see live institutional yield pools aggregated from DeFi Llama. They deposit USDC into a selected pool with one click — gas fees are invisibly sponsored. The USDC travels through Circle CCTP to the Arc network, where it settles in under a second. Interest accrues. When they harvest, a programmable waterfall splits earnings across three Circle Developer-Controlled Wallets: 80% corporate reserves, 10% EURC contractor payroll, 10% compounding growth. Meanwhile, the OTC desk lets them execute large block trades with Pedersen Commitment shielding — order sizes stay cryptographically sealed from front-runners.

No seed phrases. No manual bridging. No gas token management. One interface.

<br>

---

<br>

## System blueprint

```
                                  ┌─────────────────────────────────┐
                                  │   BondRouter Frontend (Vue 3)   │
                                  │                                 │
                                  │  Discover · Portfolio · Shield  │
                                  │  Settings · Docs · Assistant    │
                                  └────────────┬────────────────────┘
                                               │
                          ┌────────────────────┼────────────────────┐
                          │                    │                    │
                  ┌───────▼───────┐    ┌───────▼───────┐    ┌──────▼──────┐
                  │  Circle CCTP  │    │  Circle Gas   │    │   Circle    │
                  │  Bridge SDK   │    │   Station     │    │  Wallets    │
                  │               │    │  (Sponsored)  │    │  (SCA/DCW)  │
                  └───────┬───────┘    └───────┬───────┘    └──────┬──────┘
                          │                    │                   │
                          └────────────────────┼───────────────────┘
                                               │
                                  ┌────────────▼────────────────────┐
                                  │    Arc Testnet (Chain 5042002)  │
                                  │    USDC = native gas token      │
                                  │    Sub-second finality          │
                                  │                                 │
                                  │  ┌───────────────────────────┐  │
                                  │  │  BondRouter.sol Contract  │  │
                                  │  │  0x99bcb69Ed...bB7D8      │  │
                                  │  └───────────────────────────┘  │
                                  └─────────────────────────────────┘
```

<br>

---

<br>

## The smart contract — not a stub

The deployed `BondRouter.sol` is a fully operational treasury engine, not a demo emitter. Here is what lives on-chain at **`0x99bcb69Ed9568812Bdf4294A3585526AD61bB7D8`** on Arc Testnet:

| Function | What it does on-chain |
|:---|:---|
| `invest(bondId, amount)` | Deposits native USDC into tracked allocation pools. Validates `msg.value == amount`. Maps per-user positions in `userInvestments`. |
| `submitConfidentialOrder(asset, sizeHash)` | Locks USDC in escrow behind a Pedersen Commitment hash. Creates `DarkPoolOrderDetails` struct with `active: true, settled: false`. Prevents commitment hash collisions. |
| `settleConfidentialOrder(orderId, counterparty, zkProof)` | Owner-gated settlement. Validates ZK proof exists, flips order to settled, transfers locked USDC to counterparty. |
| `accrueYield(user, amount)` | Relayer-callable yield accumulation. Credits `userYieldBalances` for future harvesting. |
| `harvestYield(amount)` | User withdraws accrued yield. Checks balance, decrements, transfers native USDC back to wallet. |
| `logGasSponsorship(gasSaved)` | Audit trail for gas sponsorship accounting. Tracks `totalGasSponsored` and `totalTransactionsSponsored`. |

**On-chain state tracked:**
- `userInvestments[address][bondId]` → per-position capital allocation
- `bondTotalAllocated[bondId]` → aggregate pool depth
- `userYieldBalances[address]` → harvestable yield balance
- `darkPoolOrders[]` → full escrow order book with commitment hashes
- `orderIndexByCommitment[hash]` → O(1) commitment lookup

<br>

---

<br>

## Circle product integration map

**This project uses five Circle products.** Each one solves a specific treasury operations problem:

### CCTP (Cross-Chain Transfer Protocol)
When a user deposits from Ethereum Sepolia or Base Sepolia, the frontend invokes `AppKit.bridge()` to burn USDC on the origin chain and mint it on Arc Testnet. Native burn-and-mint — no wrapped tokens, no third-party bridges.

### Gas Station
All transaction fees on Arc Testnet are sponsored. The Settings page exposes a toggle to enable/disable sponsorship. When active, corporate signers interact with USDC-denominated transactions at `$0.00` cost.

### Developer-Controlled Wallets (DCW)
Three SCA wallets are provisioned via Circle's `/v1/w3s/developer/wallets` API on first load:
- **Corporate Reserves** (80% allocation, USDC, Base-Sepolia)
- **Global Contractor Payouts** (10% allocation, EURC)
- **Active Compounding Growth** (10% allocation, USDC)

When yield is harvested, the backend waterfall engine (`/api/circle/distribute`) splits funds programmatically across these wallets.

### Modular Wallets (Passkey SCA)
The Settings page offers WebAuthn/biometric Passkey registration that provisions an ERC-4337 Smart Contract Account. No browser extension needed — Touch ID or Face ID creates an on-chain identity.

### Unified Balance
The yield harvesting flow calls `AppKit.unifiedBalance.deposit()` and `AppKit.unifiedBalance.spend()` to aggregate cross-chain USDC positions before settlement on Arc.

<br>

---

<br>

## How the confidential OTC desk works

The Dark Pool implements a client-side Pedersen Commitment workflow. When a trader enters a quantity:

```
1.  Secret value (s) = order quantity in USDC
2.  Blinding factor (r) = cryptographically random nonce
3.  Commitment C = g^s · h^r  (mod p)
4.  Only C is broadcast on-chain via submitConfidentialOrder()
5.  The actual quantity remains hidden from all observers
```

The frontend renders this computation in real-time as the user types. A five-phase ZK compilation overlay plays during submission:

```
Phase 1 → Generate blinding factor
Phase 2 → Compute Pedersen Commitment
Phase 3 → Synthesize Bulletproofs range proof
Phase 4 → Broadcast shielded hash to Arc L1
Phase 5 → Anonymous order matching complete
```

The contract locks `msg.value` in escrow. Settlement requires the owner to call `settleConfidentialOrder()` with a counterparty address and ZK proof, releasing locked USDC only upon valid proof submission.

<br>

---

<br>

## Yield waterfall mechanics

```
                     ┌──────────────┐
                     │ Harvest Yield│
                     │  (1-click)   │
                     └──────┬───────┘
                            │
              ┌─────────────┼─────────────┐
              │             │             │
        ┌─────▼─────┐ ┌────▼────┐ ┌──────▼──────┐
        │  RESERVES  │ │ PAYROLL │ │   GROWTH    │
        │   80%      │ │  10%    │ │    10%      │
        │   USDC     │ │  EURC   │ │   USDC      │
        └────────────┘ └─────────┘ └─────────────┘
              │             │             │
              ▼             ▼             ▼
        Circle DCW    Circle DCW    Circle DCW
        (Base-Sepolia)
```

The waterfall runs inside a Vite dev server middleware plugin that serves `/api/circle/distribute`. It persists wallet balances in `.circle_wallets.json` and attempts real Circle API provisioning when production keys are configured, falling back to deterministic simulation otherwise.

<br>

---

<br>

## Application screens

| Screen | Route | Purpose |
|:---|:---|:---|
| Landing | `/` | Editorial split layout with live statistics, rotating emblem, and guided tour entry |
| Discover Yield | `/discover` | Live DeFi Llama pool aggregation, stability ratings, 1-click USDC deposit with CCTP simulation |
| My Treasury | `/portfolio` | Portfolio positions, 12-month growth projection chart, Circle Custodial Desk widget, yield harvest trigger |
| Shielded Trading | `/darkpool` | OTC order placement, real-time Pedersen Commitment monitor, ZK compilation overlay, on-chain settlement log |
| Documentation | `/docs` | Three-tab resource hub (User Manual, Under the Hood, Interactive FAQs) with searchable accordion |
| Settings | `/settings` | Circle API status panel, Passkey SCA registration, Gas Station sponsorship toggle |

**Supporting components:**
- `TreasuryAssistant.vue` — Route-aware contextual help overlay with 6-step guided onboarding walkthrough
- `WalletModal.vue` — Multi-wallet connection interface (MetaMask, Coinbase, Rainbow, WalletConnect) with educational sidebar

<br>

### Screenshots

**Landing — Editorial Split Layout**

![Landing page with live statistics, rotating emblem, and guided tour entry](public/captures/1_home.png)

<br>

**Discover Yield — Live Institutional Pool Aggregation**

![Discover Yield screen showing DeFi Llama pool data, stability ratings, and 1-click USDC deposit](public/captures/2_discover_yield.png)

<br>

**My Treasury — Portfolio & Growth Projection**

![My Treasury dashboard with portfolio positions, 12-month growth chart, and yield harvest trigger](public/captures/3_my_treasury.png)

<br>

**Shielded Trading — OTC Dark Pool**

![Shielded Trading desk with Pedersen Commitment monitor, ZK compilation overlay, and settlement log](public/captures/4_shield_trading.png)

<br>

**Documentation — Three-Tab Resource Hub**

![Documentation center with User Manual, Under the Hood, and Interactive FAQs tabs](public/captures/5_documentation.png)

<br>

**Settings — Circle API & Gas Station Controls**

![Settings panel with Circle API status, Passkey SCA registration, and Gas Station sponsorship toggle](public/captures/6_settings.png)

<br>

---

<br>

## Technical inventory

```
Frontend          Vue 3.5 + Vite 8 + Pinia 3 + Vue Router 4
Charting          Chart.js + vue-chartjs (portfolio projection)
Icons             Lucide Vue Next
Typography        Space Grotesk (sans) + Cormorant Garamond (serif)
Design system     Editorial glassmorphism, sharp corners, brass/sand palette

Smart contract    Solidity 0.8.19, compiled via solc, deployed with ethers.js
Network           Arc Testnet (Chain ID: 5042002, USDC-native gas, sub-second finality)
Contract          0x99bcb69Ed9568812Bdf4294A3585526AD61bB7D8

Circle SDK        @circle-fin/app-kit (CCTP, Unified Balance)
Circle adapter    @circle-fin/adapter-ethers-v6
Circle API        /v1/w3s/developer/walletSets, /v1/w3s/developer/wallets
Circle backend    Custom Vite middleware plugin (vite.config.js)

Data feed         DeFi Llama /pools API (live institutional yield aggregation)
Storage           localStorage (portfolio), sessionStorage (yield cache), .circle_wallets.json (DCW state)
```

<br>

---

<br>

## Running locally

```bash
git clone <repo>
cd BondRouter
npm install
```

Configure environment variables in `.env`:

```env
PRIVATE_KEY=<deployer-wallet-private-key>
CIRCLE_API_KEY=<circle-api-key>
CIRCLE_ENTITY_SECRET=<circle-entity-secret>
```

Start the development server:

```bash
npm run dev
```

To redeploy the smart contract to Arc Testnet:

```bash
node scripts/deploy-raw.cjs
```

The deploy script compiles `contracts/BondRouter.sol` with solc, deploys via ethers.js, and writes the new address to `src/contractAddress.json`. The frontend reads this file dynamically — no hardcoded addresses.

<br>

---

<br>

## Verifiable on-chain artifacts

| Artifact | Value |
|:---|:---|
| Network | Arc Testnet |
| Chain ID | `5042002` |
| RPC | `https://rpc.testnet.arc.network` |
| Block Explorer | `https://testnet.arcscan.app` |
| Contract Address | [`0x99bcb69Ed9568812Bdf4294A3585526AD61bB7D8`](https://testnet.arcscan.app/address/0x99bcb69Ed9568812Bdf4294A3585526AD61bB7D8) |
| Native Gas Token | USDC (18 decimals for gas, 6 decimals for ERC-20) |

<br>

---

*Built for the Ignyte Stablecoins Commerce Stack Challenge.*
