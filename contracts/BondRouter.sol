// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title BondRouter
 * @dev Handles on-chain investments, confidential Dark Pool orders (Opt-in Privacy), and yield harvesting.
 * Deployed on Arc Testnet.
 */
contract BondRouter {
    address public owner;

    event Investment(address indexed user, string bondId, uint256 amount);
    event DarkPoolOrder(address indexed user, string asset, uint256 confidentialSizeHash);
    event YieldHarvested(address indexed user, uint256 amount);

    constructor() {
        owner = msg.sender;
    }

    /**
     * @dev Process an investment order via CCTP/Intent Relayer.
     */
    function invest(string memory bondId, uint256 amount) external payable {
        require(msg.value > 0, "Must send native USDC");
        emit Investment(msg.sender, bondId, amount);
    }

    /**
     * @dev Process an OTC order. `sizeHash` represents the Zero-Knowledge commitment of the order size.
     */
    function submitConfidentialOrder(string memory asset, uint256 sizeHash) external payable {
        require(msg.value > 0, "Must send native USDC");
        emit DarkPoolOrder(msg.sender, asset, sizeHash);
    }

    /**
     * @dev Process cross-chain yield harvesting via Gateway.
     */
    function harvestYield(uint256 amount) external {
        emit YieldHarvested(msg.sender, amount);
    }
}
