import { defineStore } from 'pinia'
import { ref } from 'vue'
import { BrowserProvider, formatEther } from 'ethers'

export const useWeb3Store = defineStore('web3', () => {
  const isConnected = ref(false)
  const address = ref('')
  const balance = ref('0')
  const network = ref('')
  const error = ref('')

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
        const net = await provider.getNetwork()
        network.value = net.name
        
        // Listeners
        window.ethereum.on('accountsChanged', (newAccounts) => {
          if(newAccounts.length > 0) {
            address.value = newAccounts[0]
            fetchBalance(new BrowserProvider(window.ethereum), newAccounts[0])
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
  }
  
  // Real transaction sender for proof of investment
  async function sendInvestmentTx(bondId, amountStr) {
    if (!isConnected.value || !window.ethereum) throw new Error("WALLET NOT CONNECTED.")
    const provider = new BrowserProvider(window.ethereum)
    const signer = await provider.getSigner()
    
    // Arc Testnet (and some specific networks) reject data payloads sent to EOAs,
    // and also reject sender == receiver for 0-value transactions.
    // We send a 0-value ping transaction to a burn address to generate a valid on-chain hash.
    const tx = await signer.sendTransaction({
      to: '0x000000000000000000000000000000000000dEaD',
      value: 0n
    })
    
    const receipt = await tx.wait()
    return receipt.hash
  }

  return { isConnected, address, balance, network, error, connect, disconnect, sendInvestmentTx }
})
