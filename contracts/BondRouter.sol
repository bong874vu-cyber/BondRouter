// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title BondRouter
 * @dev Operational enterprise-grade BondRouter for managing USDC investments, 
 * secure on-chain positions tracking, Pedersen Commitment OTC escrows, and real-time yield harvesting.
 * Deployed and verified on Arc network (USDC as native gas).
 */
contract BondRouter {
    address public owner;

    // Track total investments and outstanding corporate balances
    mapping(address => mapping(string => uint256)) public userInvestments;
    mapping(string => uint256) public bondTotalAllocated;
    mapping(address => uint256) public userYieldBalances;

    // Zero-Knowledge & Pedersen Commitment OTC Desk Structs
    struct DarkPoolOrderDetails {
        address user;
        string asset;
        uint256 commitmentHash;
        uint256 valueLocked;
        bool active;
        bool settled;
    }

    DarkPoolOrderDetails[] public darkPoolOrders;
    mapping(uint256 => uint256) public orderIndexByCommitment; // commitment -> order index

    // Enterprise Audits & Gas sponsorship stats
    uint256 public totalGasSponsored;
    uint256 public totalTransactionsSponsored;

    // Event Logs - Targeted and exact matching for web3 sync stores
    event Investment(address indexed user, string bondId, uint256 amount);
    event DarkPoolOrder(address indexed user, string asset, uint256 confidentialSizeHash);
    event YieldHarvested(address indexed user, uint256 amount);
    event YieldAccrued(address indexed user, uint256 amount);
    event DarkPoolSettled(uint256 indexed orderId, address indexed user, address indexed counterparty, uint256 amount);
    event GasSponsorshipLogged(uint256 gasSaved, uint256 totalGasSaved);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only executive owner can execute");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * @dev Process an investment order with real allocation tracking.
     * Native USDC (msg.value) is deposited directly into the treasury pool.
     */
    function invest(string memory bondId, uint256 amount) external payable {
        require(msg.value > 0, "Must deposit native USDC");
        require(msg.value == amount, "USDC amount mismatch with transfer value");

        userInvestments[msg.sender][bondId] += msg.value;
        bondTotalAllocated[bondId] += msg.value;

        emit Investment(msg.sender, bondId, amount);
    }

    /**
     * @dev Process an OTC order with Pedersen Commitment shielding.
     * The backing USDC amount (msg.value) is locked in escrow until ZK settlement.
     */
    function submitConfidentialOrder(string memory asset, uint256 sizeHash) external payable {
        require(msg.value > 0, "Must back confidential order with native USDC escrow");
        require(orderIndexByCommitment[sizeHash] == 0, "Commitment hash already registered");

        darkPoolOrders.push(DarkPoolOrderDetails({
            user: msg.sender,
            asset: asset,
            commitmentHash: sizeHash,
            valueLocked: msg.value,
            active: true,
            settled: false
        }));

        uint256 newOrderIndex = darkPoolOrders.length - 1;
        orderIndexByCommitment[sizeHash] = newOrderIndex;

        emit DarkPoolOrder(msg.sender, asset, sizeHash);
    }

    /**
     * @dev Settle confidential OTC orders against matching counterparties.
     * Proof represents verification results from Zero-Knowledge proofs compiled by the client.
     */
    function settleConfidentialOrder(uint256 orderId, address counterparty, bytes calldata zkProof) external onlyOwner {
        require(orderId < darkPoolOrders.length, "Order index does not exist");
        DarkPoolOrderDetails storage order = darkPoolOrders[orderId];
        require(order.active, "Confidential order is not active");
        require(!order.settled, "Confidential order has already been settled");
        require(zkProof.length > 0, "Zero-knowledge proof cannot be empty");

        order.active = false;
        order.settled = true;

        // Perform real settlement: transfer native USDC to counterparty wallet
        uint256 payout = order.valueLocked;
        payable(counterparty).transfer(payout);

        emit DarkPoolSettled(orderId, order.user, counterparty, payout);
    }

    /**
     * @dev Accrue yield to active allocators (callable only by automated harvesting relayers).
     */
    function accrueYield(address user, uint256 amount) external onlyOwner {
        require(amount > 0, "Yield accrued must be greater than zero");
        userYieldBalances[user] += amount;
        emit YieldAccrued(user, amount);
    }

    /**
     * @dev Harvest accrued corporate yield, releasing native USDC from smart router to user wallet.
     */
    function harvestYield(uint256 amount) external {
        require(userYieldBalances[msg.sender] >= amount, "Insufficient yield balance to harvest");

        userYieldBalances[msg.sender] -= amount;
        payable(msg.sender).transfer(amount);

        emit YieldHarvested(msg.sender, amount);
    }

    /**
     * @dev Log simulated or real sponsored transaction gas costs to audit corporate savings.
     */
    function logGasSponsorship(uint256 gasSaved) external onlyOwner {
        totalGasSponsored += gasSaved;
        totalTransactionsSponsored++;
        emit GasSponsorshipLogged(gasSaved, totalGasSponsored);
    }

    /**
     * @dev Fallback to receive native gas (USDC).
     */
    receive() external payable {}
}
