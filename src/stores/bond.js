import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useBondStore = defineStore('bond', () => {
  const marketBonds = ref([])
  const portfolio = ref(JSON.parse(localStorage.getItem('bond_portfolio') || '[]'))
  const isLoading = ref(false)

  async function fetchBonds() {
    if (marketBonds.value.length > 0) return;

    // Cache Check
    const cached = sessionStorage.getItem('llama_bonds_cache');
    if (cached) {
      const { timestamp, data } = JSON.parse(cached);
      // TTL 1 hour (3600000 ms)
      if (Date.now() - timestamp < 3600000) {
        marketBonds.value = data;
        return;
      }
    }

    isLoading.value = true;
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)
      const res = await fetch('https://yields.llama.fi/pools', { signal: controller.signal })
      clearTimeout(timeoutId)
      const data = await res.json()
      
      const filtered = data.data.filter(p => 
        p.tvlUsd > 5000000 && 
        p.apy > 0 && 
        (p.symbol.includes('USD') || p.symbol.includes('DAI'))
      )
      
      marketBonds.value = filtered.slice(0, 30).map(p => ({
        id: p.pool,
        issuer: p.project,
        chain: p.chain,
        type: 'Stablecoin Yield',
        apy: Number(p.apy).toFixed(2),
        maturity: 'Open-ended',
        faceValue: 1,
        price: 1, 
        risk: p.tvlUsd > 100000000 ? 'Low' : p.tvlUsd > 50000000 ? 'Medium' : 'High',
        token: p.symbol,
        tvl: p.tvlUsd
      }))

      // Set Cache
      sessionStorage.setItem('llama_bonds_cache', JSON.stringify({
        timestamp: Date.now(),
        data: marketBonds.value
      }));
    } catch (e) {
      console.error('Failed to fetch real data:', e)
    } finally {
      isLoading.value = false;
    }
  }

  const portfolioValue = computed(() => portfolio.value.reduce((s, p) => s + p.currentValue, 0))
  const totalYield = computed(() => portfolio.value.reduce((s, p) => s + p.accruedYield, 0))
  const chains = computed(() => [...new Set(marketBonds.value.map(b => b.chain))])

  function recordInvestment(bondId, quantity, txHash) {
    const bond = marketBonds.value.find(b => b.id === bondId)
    if (!bond) return
    
    const cost = bond.price * quantity
    
    const existing = portfolio.value.find(p => p.bondId === bondId)
    if (existing) {
      const totalCost = (existing.quantity * existing.averagePrice) + cost
      existing.quantity += quantity
      existing.averagePrice = totalCost / existing.quantity
      existing.currentValue = existing.quantity * bond.price
      existing.accruedYield += cost * (bond.apy / 100 / 12) 
      existing.lastTxHash = txHash
    } else {
      portfolio.value.push({
        id: 'POS-' + String(portfolio.value.length + 1).padStart(3, '0'),
        bondId,
        chain: bond.chain,
        quantity,
        averagePrice: bond.price,
        currentValue: cost,
        accruedYield: cost * (bond.apy / 100 / 12),
        purchaseDate: new Date().toISOString().split('T')[0],
        lastTxHash: txHash
      })
    }
    
    localStorage.setItem('bond_portfolio', JSON.stringify(portfolio.value))
  }

  function harvestYield() {
    portfolio.value.forEach(p => p.accruedYield = 0)
    localStorage.setItem('bond_portfolio', JSON.stringify(portfolio.value))
  }

  const fmt = (n) => '$' + Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const getBond = (id) => marketBonds.value.find(b => b.id === id)

  return {
    marketBonds, portfolio, chains, isLoading,
    portfolioValue, totalYield,
    fetchBonds, recordInvestment, harvestYield, fmt, getBond
  }
})
