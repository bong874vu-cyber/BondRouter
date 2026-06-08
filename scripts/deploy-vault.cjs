const fs = require('fs');
const path = require('path');
const solc = require('solc');
const { ethers } = require('ethers');
require('dotenv').config();

const contractPath = path.resolve('E:/Airdrop ARC/The Stablecoins Commerce Stack Challenge/garadieu/track-2-CashFlow360/contracts/CashFlowVault.sol');
console.log("Reading contract from:", contractPath);
const source = fs.readFileSync(contractPath, 'utf8');

const input = {
  language: 'Solidity',
  sources: { 'CashFlowVault.sol': { content: source } },
  settings: { outputSelection: { '*': { '*': ['abi', 'evm.bytecode'] } } }
};

console.log("Compiling CashFlowVault...");
const output = JSON.parse(solc.compile(JSON.stringify(input)));

if (output.errors) {
  output.errors.forEach(err => console.error(err.formattedMessage));
  const errors = output.errors.filter(e => e.severity === 'error');
  if (errors.length > 0) {
    console.error("Compilation failed with errors.");
    process.exit(1);
  }
}

const contract = output.contracts['CashFlowVault.sol']['CashFlowVault'];

async function deploy() {
  const provider = new ethers.JsonRpcProvider('https://rpc.testnet.arc.network');
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error("No PRIVATE_KEY found in env");
    process.exit(1);
  }
  const wallet = new ethers.Wallet(privateKey, provider);
  console.log("Deploying from address:", wallet.address);

  const balance = await provider.getBalance(wallet.address);
  console.log("Deployer balance:", ethers.formatUnits(balance, 18), "USDC (native)");

  const factory = new ethers.ContractFactory(contract.abi, contract.evm.bytecode.object, wallet);
  
  // Constructor arguments: USDC address on Arc
  const usdcAddress = "0x3600000000000000000000000000000000000000";
  console.log("Deploying contract with USDC address:", usdcAddress);
  
  const deployed = await factory.deploy(usdcAddress);
  console.log("Transaction hash:", deployed.deploymentTransaction().hash);
  await deployed.waitForDeployment();
  const address = await deployed.getAddress();
  
  console.log('Successfully deployed CashFlowVault to:', address);
}

deploy().catch(console.error);
