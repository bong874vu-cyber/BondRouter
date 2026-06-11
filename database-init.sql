-- =====================================================================
-- BONDRouter OS - DATABASE INITIALIZATION SCRIPT (PostgreSQL / Supabase)
-- =====================================================================
-- This script provisions the off-chain indexing schema for RWA investment events, 
-- OTC Dark Pool commitments, compliance whitelist state, sponsored gas metrics,
-- and Circle Developer-Controlled Wallets distribution telemetry.
-- =====================================================================

-- 1. EXTENSIONS (Required for UUID generation in standalone Postgres)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABLES DEFINITIONS
CREATE TABLE IF NOT EXISTS investors (
    address VARCHAR(42) PRIMARY KEY CHECK (address ~ '^0x[a-fA-F0-9]{40}$'),
    email VARCHAR(255) UNIQUE,
    is_whitelisted BOOLEAN DEFAULT FALSE,
    registered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS investments (
    tx_hash VARCHAR(66) PRIMARY KEY CHECK (tx_hash ~ '^0x[a-fA-F0-9]{64}$'),
    user_address VARCHAR(42) NOT NULL REFERENCES investors(address) ON DELETE CASCADE,
    bond_id VARCHAR(100) NOT NULL,
    amount NUMERIC(28, 6) NOT NULL CHECK (amount >= 0), -- USDC is 6 decimals on-chain
    block_number BIGINT NOT NULL CHECK (block_number >= 0),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS dark_pool_orders (
    order_id SERIAL PRIMARY KEY,
    user_address VARCHAR(42) NOT NULL REFERENCES investors(address) ON DELETE CASCADE,
    asset VARCHAR(20) NOT NULL,
    commitment_hash VARCHAR(78) UNIQUE NOT NULL, -- Pedersen commitment scalar
    value_locked NUMERIC(28, 6) NOT NULL CHECK (value_locked >= 0),
    tx_hash VARCHAR(66) NOT NULL CHECK (tx_hash ~ '^0x[a-fA-F0-9]{64}$'),
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SETTLED', 'CANCELLED')),
    counterparty VARCHAR(42) CHECK (counterparty IS NULL OR counterparty ~ '^0x[a-fA-F0-9]{40}$'),
    settlement_tx_hash VARCHAR(66) CHECK (settlement_tx_hash IS NULL OR settlement_tx_hash ~ '^0x[a-fA-F0-9]{64}$'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    settled_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS circle_wallets (
    wallet_id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    purpose VARCHAR(20) NOT NULL CHECK (purpose IN ('RESERVES', 'PAYOUTS', 'GROWTH')),
    address VARCHAR(42) UNIQUE NOT NULL CHECK (address ~ '^0x[a-fA-F0-9]{40}$'),
    blockchain VARCHAR(50) DEFAULT 'BASE-SEPOLIA',
    token VARCHAR(10) DEFAULT 'USDC' CHECK (token IN ('USDC', 'EURC')),
    balance NUMERIC(28, 6) DEFAULT 0.00 CHECK (balance >= 0),
    allocation_pct INT NOT NULL CHECK (allocation_pct BETWEEN 0 AND 100),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS circle_distributions (
    distribution_id VARCHAR(100) PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    amount NUMERIC(28, 6) NOT NULL CHECK (amount >= 0),
    reserves_split NUMERIC(28, 6) NOT NULL CHECK (reserves_split >= 0),
    payroll_split NUMERIC(28, 6) NOT NULL CHECK (payroll_split >= 0),
    growth_split NUMERIC(28, 6) NOT NULL CHECK (growth_split >= 0),
    circle_tx_hash VARCHAR(66) CHECK (circle_tx_hash IS NULL OR circle_tx_hash ~ '^0x[a-fA-F0-9]{64}$'),
    status VARCHAR(20) NOT NULL CHECK (status IN ('SIMULATED', 'SETTLED'))
);

CREATE TABLE IF NOT EXISTS gas_sponsorship_logs (
    id SERIAL PRIMARY KEY,
    gas_saved_wei NUMERIC(36, 0) NOT NULL CHECK (gas_saved_wei >= 0), -- 18 decimals
    total_gas_sponsored_wei NUMERIC(36, 0) NOT NULL CHECK (total_gas_sponsored_wei >= 0),
    tx_hash VARCHAR(66) CHECK (tx_hash ~ '^0x[a-fA-F0-9]{64}$'),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. INDEXES FOR OPTIMAL RETRIEVAL
CREATE INDEX IF NOT EXISTS idx_investments_user ON investments(user_address);
CREATE INDEX IF NOT EXISTS idx_investments_bond ON investments(bond_id);
CREATE INDEX IF NOT EXISTS idx_dark_pool_user ON dark_pool_orders(user_address);
CREATE INDEX IF NOT EXISTS idx_dark_pool_commitment ON dark_pool_orders(commitment_hash);
CREATE INDEX IF NOT EXISTS idx_circle_wallets_purpose ON circle_wallets(purpose);
CREATE INDEX IF NOT EXISTS idx_gas_logs_timestamp ON gas_sponsorship_logs(timestamp);

-- 4. DATABASE TRIGGERS & FUNCTIONS FOR UPDATING TIMESTAMPS
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_investor_modtime
    BEFORE UPDATE ON investors
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_wallet_modtime
    BEFORE UPDATE ON circle_wallets
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

-- 5. ROW LEVEL SECURITY (RLS) POLICIES FOR SUPABASE
-- Enable RLS on all tables
ALTER TABLE investors ENABLE ROW LEVEL SECURITY;
ALTER TABLE investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE dark_pool_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE circle_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE circle_distributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE gas_sponsorship_logs ENABLE ROW LEVEL SECURITY;

-- Public read-only access for transparency & compliance audit reports
CREATE POLICY "Allow public read access to sponsored gas ledger"
    ON gas_sponsorship_logs FOR SELECT USING (true);

CREATE POLICY "Allow public read access to corporate allocations"
    ON circle_wallets FOR SELECT USING (true);

CREATE POLICY "Allow public read access to yield waterfall splits"
    ON circle_distributions FOR SELECT USING (true);

-- Secured User-specific access (where authenticated user corresponds to investor address)
CREATE POLICY "Allow users to manage own investor profile"
    ON investors FOR ALL USING (auth.uid()::text = address::text);

CREATE POLICY "Allow users to view their investment ledger"
    ON investments FOR SELECT USING (auth.uid()::text = user_address::text);

CREATE POLICY "Allow users to view their dark pool commitments"
    ON dark_pool_orders FOR SELECT USING (auth.uid()::text = user_address::text);
