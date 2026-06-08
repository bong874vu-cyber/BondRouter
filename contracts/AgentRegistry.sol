// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title AgentRegistry (ERC-8004 Compliant)
 * @notice Registers AI Agent identities, defines daily spending limits, and whitelists execution targets on Arc Testnet.
 */
contract AgentRegistry {
    address public owner;

    struct AgentInfo {
        address owner;
        uint256 dailyLimit;
        uint256 spentToday;
        uint256 lastSpentTimestamp;
        bool active;
        string metadataURI;
    }

    mapping(address => AgentInfo) public agents;
    mapping(address => mapping(address => bool)) public allowedCounterparties; // agent => target => allowed

    event AgentRegistered(address indexed agent, address indexed owner, uint256 dailyLimit, string metadataURI);
    event LimitUpdated(address indexed agent, uint256 newLimit);
    event AgentStatusChanged(address indexed agent, bool active);
    event CounterpartyWhitelisted(address indexed agent, address indexed target, bool allowed);
    event AgentExecution(address indexed agent, address indexed target, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "NOT OWNER");
        _;
    }

    modifier onlyAgentOwner(address agent) {
        require(agents[agent].owner == msg.sender, "NOT AGENT OWNER");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * @notice Register an AI agent wallet with daily limit and metadata URI
     */
    function registerAgent(
        address agent,
        uint256 dailyLimit,
        string calldata metadataURI
    ) external {
        require(agents[agent].owner == address(0), "AGENT ALREADY REGISTERED");
        
        agents[agent] = AgentInfo({
            owner: msg.sender,
            dailyLimit: dailyLimit,
            spentToday: 0,
            lastSpentTimestamp: block.timestamp,
            active: true,
            metadataURI: metadataURI
        });

        emit AgentRegistered(agent, msg.sender, dailyLimit, metadataURI);
    }

    /**
     * @notice Update the daily spending limit for a delegated agent
     */
    function updateDailyLimit(address agent, uint256 newLimit) external onlyAgentOwner(agent) {
        agents[agent].dailyLimit = newLimit;
        emit LimitUpdated(agent, newLimit);
    }

    /**
     * @notice Toggle the active state of an agent
     */
    function setAgentActive(address agent, bool active) external onlyAgentOwner(agent) {
        agents[agent].active = active;
        emit AgentStatusChanged(agent, active);
    }

    /**
     * @notice Add/remove an allowed destination target address for an agent's transfers
     */
    function setCounterpartyWhitelist(
        address agent,
        address target,
        bool allowed
    ) external onlyAgentOwner(agent) {
        allowedCounterparties[agent][target] = allowed;
        emit CounterpartyWhitelisted(agent, target, allowed);
    }

    /**
     * @notice Security modifier method called by target contracts to check limit policies and record spendings
     */
    function checkAndSpend(
        address agent,
        address target,
        uint256 amount
    ) external returns (bool) {
        AgentInfo storage info = agents[agent];
        require(info.active, "AGENT INACTIVE OR SUSPENDED");
        require(msg.sender == info.owner || msg.sender == agent, "UNAUTHORIZED CALLER");
        
        // Reset spent limit if 24 hours have elapsed
        if (block.timestamp - info.lastSpentTimestamp >= 1 days) {
            info.spentToday = 0;
            info.lastSpentTimestamp = block.timestamp;
        }

        require(info.spentToday + amount <= info.dailyLimit, "DAILY SPENDING LIMIT EXCEEDED");
        
        // Whitelist validation check if active
        if (target != address(0)) {
            require(allowedCounterparties[agent][target], "TARGET COUNTERPARTY NOT WHITELISTED");
        }

        info.spentToday += amount;
        emit AgentExecution(agent, target, amount);
        return true;
    }
}
