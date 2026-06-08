import hre from "hardhat";
import fs from "fs";

async function main() {
  console.log("Deploying compliance architecture to Arc Testnet...");

  // Get active connection
  const connection = await hre.network.getOrCreate();
  const { ethers } = connection;

  // 1. Deploy ComplianceRegistry
  const ComplianceRegistry = await ethers.getContractFactory("ComplianceRegistry");
  const registry = await ComplianceRegistry.deploy();
  await registry.waitForDeployment();
  const registryAddress = await registry.getAddress();
  console.log(`ComplianceRegistry deployed to: ${registryAddress}`);

  // 2. Deploy BondRouter
  const BondRouter = await ethers.getContractFactory("BondRouter");
  const router = await BondRouter.deploy();
  await router.waitForDeployment();
  const routerAddress = await router.getAddress();
  console.log(`BondRouter deployed to: ${routerAddress}`);

  // 3. Link ComplianceRegistry in BondRouter
  console.log("Linking ComplianceRegistry in BondRouter...");
  const tx = await router.setComplianceRegistry(registryAddress);
  await tx.wait();
  console.log("ComplianceRegistry linked successfully.");

  // 4. Save addresses to JSON for the frontend to consume
  fs.writeFileSync(
    "./src/contractAddress.json",
    JSON.stringify({ 
      BondRouter: routerAddress,
      ComplianceRegistry: registryAddress
    }, null, 2)
  );
  console.log("Contract addresses saved to src/contractAddress.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
