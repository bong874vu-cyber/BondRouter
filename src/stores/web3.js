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
            params: [{ chainId: '0x1A4' }], // Arc Testnet Hex Chain ID
          });
        } catch (switchError) {
          if (switchError.code === 4902) {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [
                {
                  chainId: '0x1A4',
                  chainName: 'Arc Testnet',
                  rpcUrls: ['https://testnet-rpc.arc.tech'],
                  nativeCurrency: { name: 'Ethereum', symbol: 'ETH', decimals: 18 },
                  blockExplorerUrls: ['https://explorer.testnet.arc.tech/']
                }
              ]
            });
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
      error.value = parseError(e)
    }
  }

  function parseError(e) {
    const msg = e.message?.toLowerCase() || ''
    if (msg.includes('user rejected') || msg.includes('user denied')) return "TRANSACTION CANCELLED."
    if (msg.includes('insufficient funds')) return "NOT ENOUGH ETH FOR GAS."
    if (msg.includes('nonce')) return "NETWORK SYNC ERROR. PLEASE RESET WALLET."
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
    
    // We send a 0 ETH transaction to self, with data representing the bond ID to act as on-chain record
    const hexData = "0x" + Array.from(bondId).map(c => c.charCodeAt(0).toString(16)).padStart(2, '0').join('')
    
    const tx = await signer.sendTransaction({
      to: address.value,
      value: 0n,
      data: hexData
    })
    
    const receipt = await tx.wait()
    return receipt.hash
  }

  return { isConnected, address, balance, network, error, connect, disconnect, sendInvestmentTx }
})
