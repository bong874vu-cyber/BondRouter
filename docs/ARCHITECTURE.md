# BondRouter Architecture 🏗️

This document outlines the technical architecture and data flow of the BondRouter platform.

## System Diagram (Mermaid)

```mermaid
graph TD
    %% Entities
    User((User / Investor))
    MetaMask[Web3 Wallet]
    
    %% Frontend Core
    subgraph Frontend [BondRouter Vue.js SPA]
        UI[Vue Components]
        StoreB[Pinia Bond Store]
        StoreW[Pinia Web3 Store]
    end
    
    %% External Data
    DefiLlama[(DefiLlama API)]
    
    %% Blockchain Layer
    subgraph Arc Network
        RPC[Arc Testnet RPC]
        Ledger[(On-Chain Ledger)]
    end
    
    %% CCTP / Circle
    subgraph Circle Infrastructure
        CCTP[CCTP Protocol Simulation]
        USDC[Native USDC Token]
    end

    %% Flows
    User -->|Views Yields| UI
    UI -->|Dispatches Fetch| StoreB
    StoreB -->|HTTP GET| DefiLlama
    
    User -->|Connects Wallet| MetaMask
    MetaMask <-->|EIP-1193| StoreW
    StoreW -->|wallet_addEthereumChain| RPC
    
    User -->|Invests via USDC| UI
    UI -->|Triggers Bridge| CCTP
    CCTP -.->|Simulated Mint/Burn| USDC
    
    UI -->|Signs Tx| StoreW
    StoreW -->|sendTransaction| RPC
    RPC -->|Commits| Ledger
    Ledger -->|Returns TxHash| StoreW
    
    StoreW -->|Records Investment| StoreB
    StoreB -->|Updates UI| UI
```

## Core Modules

### 1. Market Discovery (`stores/bond.js`)
* **Role:** Acts as the data aggregator.
* **Mechanism:** Fetches real-world stablecoin pool data from DefiLlama. 
* **Optimization:** Filters for USDC/DAI pools > $5M TVL. Slices data to 30 records to prevent DOM bloat and caches the parsed payload in `sessionStorage` with a 1-hour TTL.

### 2. Web3 Provider (`stores/web3.js`)
* **Role:** Manages blockchain interactions.
* **Mechanism:** 
  1. Initializes `BrowserProvider` via `ethers.js`.
  2. Forces network switch to Arc Testnet (`0x4CEF52`).
  3. Translates generic RPC errors into human-readable UI toasts.
  4. Generates an on-chain "Ping" transaction to the EVM Burn Address to generate a real `TxHash` on Arc Testnet, completely bypassing "External to Internal" EOA security restrictions.

### 3. CCTP Terminal Simulation (`Discover.vue`)
* **Role:** Demonstrates Track 3 requirements for Cross-chain functionality.
* **Mechanism:** A multi-step UI terminal that simulates the 3 phases of Circle CCTP (Burning USDC on Source Chain -> Attesting via Circle -> Minting USDC on Arc).

### 4. Yield Projection (`Portfolio.vue`)
* **Role:** User dashboard and analytics.
* **Mechanism:** Uses `Chart.js` to project a 12-month exponential yield curve based on the combined APY of the user's acquired bonds, reading local state persisted via Pinia.
