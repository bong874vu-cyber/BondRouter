require("dotenv").config();
const hardhatEthers = require("@nomicfoundation/hardhat-ethers").default || require("@nomicfoundation/hardhat-ethers");

module.exports = {
  solidity: "0.8.28",
  plugins: [hardhatEthers],
  networks: {
    arc: {
      type: "http",
      url: "https://rpc.testnet.arc.network",
      chainId: 5042002,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    }
  }
};
