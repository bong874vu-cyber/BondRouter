import { defineStore } from 'pinia'
import { ref } from 'vue'
import { BrowserProvider, formatEther, parseEther, Contract } from 'ethers'
import { AppKit } from '@circle-fin/app-kit'
import { createAdapterFromProvider } from '@circle-fin/adapter-ethers-v6'
import contractAddress from '../contractAddress.json'

export const useWeb3Store = defineStore('web3', () => {
  const isConnected = ref(false)
  const address = ref('')
  const balance = ref('0')
  const network = ref('')
  const error = ref('')
  const isKycVerified = ref(false)

  async function checkKycStatus(userAddr) {
    if (!userAddr) return false
    try {
      if (!window.ethereum) return false
      const provider = new BrowserProvider(window.ethereum)
      const registryAddr = contractAddress.ComplianceRegistry
      if (!registryAddr) {
        console.warn("ComplianceRegistry address not set in contractAddress.json")
        return false
      }
      
      const ABI = ["function isWhitelisted(address investor) external view returns (bool)"]
      const contract = new Contract(registryAddr, ABI, provider)
      const status = await contract.isWhitelisted(userAddr)
      isKycVerified.value = status
      return status
    } catch (e) {
      console.warn("KYC status check failed:", e.message)
      return false
    }
  }

  async function triggerMockKyc() {
    if (!address.value) return
    try {
      error.value = ''
      console.log(`[Frontend] Triggering mock KYC for ${address.value}...`)
      const res = await fetch('/api/circle/verify-kyc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: address.value })
      })
      const data = await res.json()
      if (data.success) {
        console.log("[Frontend] KYC verification response:", data)
        // Check KYC status on-chain
        await checkKycStatus(address.value)
      } else {
        throw new Error(data.error || "Unknown server error")
      }
    } catch (e) {
      console.error("Mock KYC verification failed:", e)
      error.value = "MOCK KYC REQUEST FAILED."
    }
  }

  async function whitelistUser(investorAddr, status) {
    if (!isConnected.value || !window.ethereum) throw new Error("WALLET NOT CONNECTED.")
    const provider = new BrowserProvider(window.ethereum)
    const signer = await provider.getSigner()
    const registryAddr = contractAddress.ComplianceRegistry
    if (!registryAddr) throw new Error("COMPLIANCE REGISTRY ADDRESS NOT DEPLOYED.")
    
    const ABI = ["function whitelistInvestor(address investor, bool status) external"]
    const contract = new Contract(registryAddr, ABI, signer)
    
    const tx = await contract.whitelistInvestor(investorAddr, status, { gasLimit: 200000n })
    await tx.wait()
    
    if (investorAddr.toLowerCase() === address.value.toLowerCase()) {
      isKycVerified.value = status
    }
    return tx.hash
  }

  async function connect() {
    if (!window.ethereum) {
      error.value = "PLEASE INSTALL A WEB3 WALLET (E.G. METAMASK)."
      return
    }
    try {
      error.value = ''
      const provider = new BrowserProvider(window.ethereum)
      const accounts = await provider.send("eth_requestAccounts", [])
      if (accounts.length > 0) {
        address.value = accounts[0]
        
        // Switch to Arc Testnet
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x4CEF52' }], // 5042002
          });
        } catch (switchError) {
          if (switchError.code === 4902 || switchError.code === -32603) {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [
                {
                  chainId: '0x4CEF52',
                  chainName: 'Arc Testnet',
                  rpcUrls: ['https://rpc.testnet.arc.network'],
                  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
                  blockExplorerUrls: ['https://testnet.arcscan.app/']
                }
              ]
            });
          } else {
            console.warn("Network switch failed:", switchError)
            throw new Error("FAILED TO SWITCH TO ARC TESTNET.")
          }
        }

        isConnected.value = true
        await fetchBalance(provider, accounts[0])
        await checkKycStatus(accounts[0])
        const net = await provider.getNetwork()
        network.value = Number(net.chainId) === 5042002 ? 'Arc' : (net.name === 'unknown' ? `Chain ${net.chainId}` : net.name)
        
        // Listeners
        window.ethereum.on('accountsChanged', async (newAccounts) => {
          if(newAccounts.length > 0) {
            address.value = newAccounts[0]
            await fetchBalance(new BrowserProvider(window.ethereum), newAccounts[0])
            await checkKycStatus(newAccounts[0])
          } else {
            disconnect()
          }
        })
        window.ethereum.on('chainChanged', () => {
          window.location.reload()
        })
      }
    } catch (e) {
      console.error("Web3 Connect Error:", e)
      error.value = parseError(e)
    }
  }

  function parseError(e) {
    const msg = e.message?.toLowerCase() || ''
    if (msg.includes('user rejected') || msg.includes('user denied')) return "USER REJECTED THE REQUEST."
    if (msg.includes('insufficient funds')) return "NOT ENOUGH ETH FOR GAS."
    if (msg.includes('nonce')) return "NETWORK SYNC ERROR. PLEASE RESET WALLET."
    if (msg.includes('switch') || msg.includes('chain') || msg.includes('network')) return "FAILED TO CONNECT TO ARC TESTNET. PLEASE ADD IT MANUALLY."
    return "NETWORK CONNECTION FAILED."
  }

  async function fetchBalance(provider, acc) {
    const bal = await provider.getBalance(acc)
    balance.value = formatEther(bal)
  }

  function disconnect() {
    isConnected.value = false
    address.value = ''
    balance.value = '0'
    network.value = ''
    isKycVerified.value = false
  }
  
  // Real transaction sender integrating with Arc Testnet
  async function sendInvestmentTx(action, bondIdOrAsset, amountStr, destChain = 'Arc_Testnet') {
    if (!isConnected.value || !window.ethereum) throw new Error("WALLET NOT CONNECTED.")
    const provider = new BrowserProvider(window.ethereum)
    const signer = await provider.getSigner()
    
    // Demonstrate usage of Circle App Kit for cross-chain bridging operations
    ;(async () => {
      try {
        if (!window.ethereum) return;
        const adapter = await createAdapterFromProvider({ provider: window.ethereum });
        const kit = new AppKit();
        console.debug(`[Circle App Kit] Initiating CCTP Bridge to ${destChain}...`);
        await kit.bridge({
          from: { adapter, chain: "Ethereum_Sepolia" },
          to:   { adapter, chain: destChain },
          amount: amountStr.toString(),
        });
      } catch (e) {
        console.debug("[AppKit] Bridge demo:", e.message)
      }
    })();

    // Real Smart Contract interaction on Arc Testnet
    const actualAddress = contractAddress.BondRouter;

    const ABI = [
      "function invest(string bondId, uint256 amount) external payable",
      "function submitConfidentialOrder(string asset, uint256 sizeHash) external payable",
      "function harvestYield(uint256 amount) external"
    ];
    
    const contract = new Contract(actualAddress, ABI, signer);

    let tx;
    // Send a small fixed native USDC amount to satisfy require(msg.value > 0)
    const valueToSend = parseEther("0.0001");
    // Fixed gasLimit skips the slow estimateGas RPC call on Arc Testnet
    const txOverrides = { value: valueToSend, gasLimit: 200000n };

    if (action === 'INVEST') {
       tx = await contract.invest(bondIdOrAsset, BigInt(amountStr), txOverrides);
    } else if (action === 'DARK_POOL_ORDER') {
       const sizeHash = BigInt("0x" + Array.from({length: 40}, () => Math.floor(Math.random()*16).toString(16)).join(''));
       tx = await contract.submitConfidentialOrder(bondIdOrAsset, sizeHash, txOverrides);
    }
    
    // Arc has sub-second finality — return hash immediately, no need to wait for receipt
    return tx.hash
  }

  // Demonstrate Circle Unified Balance product and Harvest Yield
  async function harvestYieldCrossChain(amountStr) {
    if (!isConnected.value || !window.ethereum) return;
    
    const provider = new BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();

    ;(async () => {
      try {
        if (!window.ethereum) return;
        const adapter = await createAdapterFromProvider({ provider: window.ethereum });
        const kit = new AppKit();
        
        console.debug(`[Circle Unified Balance] Aggregating yield from external chains...`);
        await kit.unifiedBalance.deposit({
          from: { adapter, chain: "Base_Sepolia" },
          amount: "1.00",
          token: "USDC",
        }).catch(() => {});
        
        console.debug(`[Circle Unified Balance] Spending yield on Arc Testnet...`);
        await kit.unifiedBalance.spend({
          from: { adapter },
          amountIn: amountStr.toString(),
          to: {
            adapter,
            chain: "Arc_Testnet",
            recipientAddress: address.value,
          },
        }).catch(() => {});
      } catch (e) {
        console.debug("[AppKit] Unified Balance demo:", e.message)
      }
    })();

    // Real Smart Contract interaction
    try {
      const actualAddress = contractAddress.BondRouter;
  
      const ABI = ["function harvestYield(uint256 amount) external"];
      const contract = new Contract(actualAddress, ABI, signer);
      
      const tx = await contract.harvestYield(BigInt(Math.floor(amountStr)));
      await tx.wait();
    } catch(err) {
      console.error("Harvest tx failed:", err);
    }
  }

  async function fetchOnChainTrades() {
    try {
      if (!window.ethereum) return null;
      const provider = new BrowserProvider(window.ethereum)
      const actualAddress = contractAddress.BondRouter;
      const ABI = [
        "event DarkPoolOrder(address indexed user, string asset, uint256 confidentialSizeHash)"
      ];
      
      const contract = new Contract(actualAddress, ABI, provider);
      
      const blockNumber = await provider.getBlockNumber();
      const startBlock = Math.max(0, blockNumber - 10000); 
      
      const filter = contract.filters.DarkPoolOrder();
      const events = await contract.queryFilter(filter, startBlock, 'latest');
      
      return events.map(evt => {
        const hashSeed = Number(evt.args[2] % 100n);
        const priceVal = (90 + (hashSeed / 10)).toFixed(2);
        return {
          time: new Date().toLocaleTimeString('en-US', { hour12: false }),
          asset: evt.args[1],
          size: 'CONFIDENTIAL',
          price: priceVal,
          txHash: evt.transactionHash
        };
      });
    } catch (e) {
      console.warn("On-chain trades fetch fail:", e.message);
      return null;
    }
  }

  async function fetchOnChainInvestments(userAddr) {
    if (!userAddr) return [];
    try {
      if (!window.ethereum) return [];
      const provider = new BrowserProvider(window.ethereum)
      const actualAddress = contractAddress.BondRouter;
      const ABI = [
        "event Investment(address indexed user, string bondId, uint256 amount)"
      ];
      
      const contract = new Contract(actualAddress, ABI, provider);
      
      const blockNumber = await provider.getBlockNumber();
      const startBlock = Math.max(0, blockNumber - 10000); 
      
      const filter = contract.filters.Investment(userAddr);
      const events = await contract.queryFilter(filter, startBlock, 'latest');
      
      return events.map(evt => ({
        bondId: evt.args[1],
        quantity: Number(evt.args[2]),
        txHash: evt.transactionHash
      }));
    } catch (e) {
      console.warn("On-chain investments fetch fail:", e.message);
      return [];
    }
  }

  // --- CIRCLE DEVELOPER-CONTROLLED WALLETS INTEGRATION ---
  const circleStatus = ref(null)
  const circleWallets = ref([])
  const circleDistributions = ref([])
  const circleLoading = ref(false)

  async function fetchCircleStatus() {
    try {
      const res = await fetch('/api/circle/status')
      circleStatus.value = await res.json()
    } catch (e) {
      console.warn("Circle status check failed:", e.message)
    }
  }

  async function fetchCircleWallets() {
    circleLoading.value = true
    try {
      const res = await fetch('/api/circle/wallets')
      const data = await res.json()
      circleWallets.value = data.wallets || []
      circleDistributions.value = data.distributions || []
    } catch (e) {
      console.warn("Circle wallets load failed:", e.message)
    } finally {
      circleLoading.value = false
    }
  }

  async function distributeYieldToCircleWallets(amountStr) {
    try {
      const res = await fetch('/api/circle/distribute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amountStr })
      })
      const data = await res.json()
      if (data.success) {
        circleWallets.value = data.wallets || []
        if (data.distribution) {
          circleDistributions.value.unshift(data.distribution)
        }
        return data.distribution
      }
    } catch (e) {
      console.warn("Programmatic Circle distribution failed:", e.message)
    }
    return null
  }

  return { 
    isConnected, address, balance, network, error, connect, disconnect, 
    sendInvestmentTx, harvestYieldCrossChain, fetchOnChainTrades, fetchOnChainInvestments,
    circleStatus, circleWallets, circleDistributions, circleLoading,
    fetchCircleStatus, fetchCircleWallets, distributeYieldToCircleWallets,
    isKycVerified, checkKycStatus, triggerMockKyc, whitelistUser
  }
})
