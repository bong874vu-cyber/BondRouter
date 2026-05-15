const fs = require('fs');
const solc = require('solc');
const { ethers } = require('ethers');
require('dotenv').config();

const source = fs.readFileSync('contracts/BondRouter.sol', 'utf8');
const input = {
  language: 'Solidity',
  sources: { 'BondRouter.sol': { content: source } },
  settings: { outputSelection: { '*': { '*': ['abi', 'evm.bytecode'] } } }
};

const output = JSON.parse(solc.compile(JSON.stringify(input)));
if (output.errors && output.errors.filter(e => e.severity === 'error').length > 0) {
  console.error("Compilation error", output.errors);
  process.exit(1);
}

const contract = output.contracts['BondRouter.sol']['BondRouter'];

async function deploy() {
  const provider = new ethers.JsonRpcProvider('https://rpc.testnet.arc.network');
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  const factory = new ethers.ContractFactory(contract.abi, contract.evm.bytecode.object, wallet);
  
  console.log("Deploying contract...");
  const deployed = await factory.deploy();
  await deployed.waitForDeployment();
  const address = await deployed.getAddress();
  
  fs.writeFileSync('./src/contractAddress.json', JSON.stringify({ BondRouter: address }, null, 2));
  console.log('Successfully deployed to:', address);
}

deploy().catch(console.error);
