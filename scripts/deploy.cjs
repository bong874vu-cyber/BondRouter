const hre = require("hardhat");

async function main() {
  console.log("Deploying BondRouter to Arc Testnet...");

  const BondRouter = await hre.ethers.getContractFactory("BondRouter");
  const contract = await BondRouter.deploy();
  await contract.waitForDeployment();
  
  const address = await contract.getAddress();
  console.log(`BondRouter deployed to: ${address}`);
  
  // Write address to a JSON file for frontend to use
  const fs = require("fs");
  fs.writeFileSync(
    "./src/contractAddress.json",
    JSON.stringify({ BondRouter: address }, null, 2)
  );
  console.log("Contract address saved to src/contractAddress.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
