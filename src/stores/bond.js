import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useBondStore = defineStore('bond', () => {
  const walletBalance = ref(150000)

  // Discovered bonds across chains
  const marketBonds = ref([
    { id: 'BND-ARC-01', issuer: 'Arc Treasury', chain: 'Arc Testnet', type: 'T-Bill Equivalent', apy: 5.25, maturity: '2025-08-10', faceValue: 100, price: 98.50, risk: 'Low', token: 'aTBILL' },
    { id: 'BND-ETH-04', issuer: 'Global Corp', chain: 'Ethereum', type: 'Corporate Bond', apy: 8.10, maturity: '2026-05-15', faceValue: 1000, price: 950.00, risk: 'Medium', token: 'GCBND' },
    { id: 'BND-POL-09', issuer: 'Green Energy', chain: 'Polygon', type: 'Green Bond', apy: 6.75, maturity: '2025-12-01', faceValue: 500, price: 485.50, risk: 'Low', token: 'GRNB' },
    { id: 'BND-BASE-02', issuer: 'Tech Ventures', chain: 'Base', type: 'High Yield', apy: 12.50, maturity: '2026-11-30', faceValue: 100, price: 88.00, risk: 'High', token: 'TVHY' },
    { id: 'BND-ARB-11', issuer: 'Real Estate Trust', chain: 'Arbitrum', type: 'Mortgage Backed', apy: 7.40, maturity: '2027-01-15', faceValue: 1000, price: 965.00, risk: 'Medium', token: 'REMB' },
  ])

  // User's portfolio
  const portfolio = ref([
    { id: 'POS-001', bondId: 'BND-ARC-01', chain: 'Arc Testnet', quantity: 500, averagePrice: 98.20, currentValue: 49250, accruedYield: 1250, purchaseDate: '2025-01-15' },
    { id: 'POS-002', bondId: 'BND-POL-09', chain: 'Polygon', quantity: 100, averagePrice: 480.00, currentValue: 48550, accruedYield: 2100, purchaseDate: '2024-11-01' },
  ])

  const portfolioValue = computed(() => portfolio.value.reduce((s, p) => s + p.currentValue, 0))
  const totalYield = computed(() => portfolio.value.reduce((s, p) => s + p.accruedYield, 0))

  const chains = computed(() => [...new Set(marketBonds.value.map(b => b.chain))])

  function invest(bondId, quantity) {
    const bond = marketBonds.value.find(b => b.id === bondId)
    if (!bond) return
    
    const cost = bond.price * quantity
    if (cost > walletBalance.value) {
      alert("Insufficient Gateway Unified Balance")
      return
    }

    walletBalance.value -= cost
    
    // Check if we already own this bond
    const existing = portfolio.value.find(p => p.bondId === bondId)
    if (existing) {
      const totalCost = (existing.quantity * existing.averagePrice) + cost
      existing.quantity += quantity
      existing.averagePrice = totalCost / existing.quantity
      existing.currentValue = existing.quantity * bond.price
    } else {
      portfolio.value.push({
        id: 'POS-' + String(portfolio.value.length + 1).padStart(3, '0'),
        bondId,
        chain: bond.chain,
        quantity,
        averagePrice: bond.price,
        currentValue: cost,
        accruedYield: 0,
        purchaseDate: new Date().toISOString().split('T')[0]
      })
    }
  }

  function harvestYield() {
    walletBalance.value += totalYield.value
    portfolio.value.forEach(p => p.accruedYield = 0)
  }

  const fmt = (n) => '$' + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const getBond = (id) => marketBonds.value.find(b => b.id === id)

  return {
    walletBalance, marketBonds, portfolio, chains,
    portfolioValue, totalYield,
    invest, harvestYield, fmt, getBond
  }
})
