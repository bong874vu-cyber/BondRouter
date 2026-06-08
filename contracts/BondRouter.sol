// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./ComplianceRegistry.sol";

interface IVerifier {
    function verify(uint256 commitment, bytes calldata zkProof) external view returns (bool);
}

/**
 * @title BondRouter
 * @dev Upgraded operational enterprise-grade BondRouter for managing USDC investments, 
 * secure on-chain ERC-1155 positions, Pedersen Commitment OTC escrows, and compliance checks.
 */
contract BondRouter is ERC1155, Ownable {
    
    // Compliance Registry contract reference
    ComplianceRegistry public complianceRegistry;

    // ZK Verifier contract reference
    address public zkVerifier;

    struct Tranche {
        uint256 totalDeposited;
        uint256 targetAPY; // in basis points, e.g. 500 for 5%
        uint256 accruedYield;
        uint256 yieldPerShare; // cumulative yield per share * 1e18
    }

    // Mapping: bondId => Tranche[2] (0 = Senior, 1 = Junior)
    mapping(string => Tranche[2]) public bondTranches;
    
    // User deposit tracking: user => bondId => trancheIndex => amount
    mapping(address => mapping(string => mapping(uint8 => uint256))) public userTrancheDeposited;
    
    // User last tracked yieldPerShare to calculate delta: user => bondId => trancheIndex => yieldPerShare
    mapping(address => mapping(string => mapping(uint8 => uint256))) public userLastYieldPerShare;
    
    // User unclaimed waterfall yield: user => amount
    mapping(address => uint256) public userUnclaimedWaterfallYield;

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
    event ComplianceRegistryUpdated(address indexed newRegistry);
    event ZkVerifierUpdated(address indexed newVerifier);
    event TrancheInvestment(address indexed user, string bondId, uint8 trancheIndex, uint256 amount);
    event WaterfallYieldDistributed(string bondId, uint256 seniorYield, uint256 juniorYield);
    event WaterfallYieldClaimed(address indexed user, uint256 amount);

    constructor() ERC1155("https://api.bondrouter.io/metadata/{id}.json") Ownable(msg.sender) {}

    /**
     * @dev Set compliance registry contract address.
     */
    function setComplianceRegistry(address _complianceRegistry) external onlyOwner {
        complianceRegistry = ComplianceRegistry(_complianceRegistry);
        emit ComplianceRegistryUpdated(_complianceRegistry);
    }

    /**
     * @dev Set ZK Verifier contract address.
     */
    function setZkVerifier(address _zkVerifier) external onlyOwner {
        zkVerifier = _zkVerifier;
        emit ZkVerifierUpdated(_zkVerifier);
    }

    /**
     * @dev Helper to convert bond ID string to a unique uint256 token ID.
     */
    function getBondTokenId(string memory bondId) public pure returns (uint256) {
        return uint256(keccak256(abi.encodePacked(bondId)));
    }

    /**
     * @dev Process an investment order with compliance checking and ERC-1155 token minting.
     * Native USDC (msg.value) is deposited directly into the treasury pool.
     */
    function invest(string memory bondId, uint256 amount) external payable {
        if (address(complianceRegistry) != address(0)) {
            require(complianceRegistry.isWhitelisted(msg.sender), "Investor is not whitelisted");
        }
        require(msg.value > 0, "Must deposit native USDC");
        require(msg.value == amount, "USDC amount mismatch with transfer value");

        userInvestments[msg.sender][bondId] += msg.value;
        bondTotalAllocated[bondId] += msg.value;

        // Mint compliant ERC-1155 token to represent position
        uint256 tokenId = getBondTokenId(bondId);
        _mint(msg.sender, tokenId, msg.value, "");

        emit Investment(msg.sender, bondId, amount);
    }

    /**
     * @dev Process an OTC order with Pedersen Commitment shielding.
     * The backing USDC amount (msg.value) is locked in escrow until ZK settlement.
     */
    function submitConfidentialOrder(string memory asset, uint256 sizeHash) external payable {
        if (address(complianceRegistry) != address(0)) {
            require(complianceRegistry.isWhitelisted(msg.sender), "Investor is not whitelisted");
        }
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

        // Validate proof using ZK Verifier
        require(zkVerifier != address(0), "ZK Verifier address not set");
        require(IVerifier(zkVerifier).verify(order.commitmentHash, zkProof), "Invalid zero-knowledge proof");

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
        if (address(complianceRegistry) != address(0)) {
            require(complianceRegistry.isWhitelisted(user), "Recipient is not whitelisted");
        }
        require(amount > 0, "Yield accrued must be greater than zero");
        userYieldBalances[user] += amount;
        emit YieldAccrued(user, amount);
    }

    /**
     * @dev Harvest accrued corporate yield, releasing native USDC from smart router to user wallet.
     */
    function harvestYield(uint256 amount) external {
        if (address(complianceRegistry) != address(0)) {
            require(complianceRegistry.isWhitelisted(msg.sender), "Investor is not whitelisted");
        }
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
     * @dev Helper to convert bond ID string and tranche index to a unique uint256 token ID.
     */
    function getTrancheTokenId(string memory bondId, uint8 trancheIndex) public pure returns (uint256) {
        return uint256(keccak256(abi.encodePacked(bondId, trancheIndex)));
    }

    /**
     * @dev Updates user outstanding yield for a specific tranche before altering deposits.
     */
    function _updateUserWaterfallYield(address user, string memory bondId, uint8 trancheIndex) internal {
        Tranche storage tranche = bondTranches[bondId][trancheIndex];
        uint256 deposited = userTrancheDeposited[user][bondId][trancheIndex];
        if (deposited > 0) {
            uint256 delta = tranche.yieldPerShare - userLastYieldPerShare[user][bondId][trancheIndex];
            if (delta > 0) {
                uint256 accrued = (deposited * delta) / 1e18;
                userUnclaimedWaterfallYield[user] += accrued;
            }
        }
        userLastYieldPerShare[user][bondId][trancheIndex] = tranche.yieldPerShare;
    }

    /**
     * @dev Invest in a specific risk tranche (0 = Senior, 1 = Junior) of a yield pool.
     */
    function investInTranche(string memory bondId, uint8 trancheIndex) external payable {
        if (address(complianceRegistry) != address(0)) {
            require(complianceRegistry.isWhitelisted(msg.sender), "Investor is not whitelisted");
        }
        require(trancheIndex == 0 || trancheIndex == 1, "Invalid tranche index");
        require(msg.value > 0, "Must deposit positive amount");

        Tranche storage senior = bondTranches[bondId][0];
        Tranche storage junior = bondTranches[bondId][1];
        if (senior.targetAPY == 0 && junior.targetAPY == 0) {
            senior.targetAPY = 500;   // 5% default
            junior.targetAPY = 1500;  // 15% default
        }

        // Accrue any pending yield first under old balance
        _updateUserWaterfallYield(msg.sender, bondId, trancheIndex);

        Tranche storage tranche = bondTranches[bondId][trancheIndex];
        tranche.totalDeposited += msg.value;
        userTrancheDeposited[msg.sender][bondId][trancheIndex] += msg.value;
        userLastYieldPerShare[msg.sender][bondId][trancheIndex] = tranche.yieldPerShare;

        uint256 tokenId = getTrancheTokenId(bondId, trancheIndex);
        _mint(msg.sender, tokenId, msg.value, "");

        emit TrancheInvestment(msg.sender, bondId, trancheIndex, msg.value);
    }

    /**
     * @dev Distribute yield pool revenue across tranches on-chain via waterfall priority rules.
     */
    function distributePoolYield(string memory bondId, uint256 totalYield) external onlyOwner {
        require(totalYield > 0, "Yield amount must be greater than zero");

        Tranche storage senior = bondTranches[bondId][0];
        Tranche storage junior = bondTranches[bondId][1];

        if (senior.targetAPY == 0 && junior.targetAPY == 0) {
            senior.targetAPY = 500;   // 5% default
            junior.targetAPY = 1500;  // 15% default
        }

        uint256 seniorYield = 0;
        uint256 juniorYield = 0;

        if (senior.totalDeposited > 0) {
            uint256 seniorPriority = (senior.totalDeposited * senior.targetAPY) / 10000;
            if (totalYield <= seniorPriority) {
                seniorYield = totalYield;
            } else {
                seniorYield = seniorPriority;
                juniorYield = totalYield - seniorPriority;
            }
        } else {
            // No senior depositors, all yield flows to junior
            juniorYield = totalYield;
        }

        if (seniorYield > 0 && senior.totalDeposited > 0) {
            senior.accruedYield += seniorYield;
            senior.yieldPerShare += (seniorYield * 1e18) / senior.totalDeposited;
        }

        if (juniorYield > 0 && junior.totalDeposited > 0) {
            junior.accruedYield += juniorYield;
            junior.yieldPerShare += (juniorYield * 1e18) / junior.totalDeposited;
        }

        emit WaterfallYieldDistributed(bondId, seniorYield, juniorYield);
    }

    /**
     * @dev Claim accrued waterfall yield for a specific tranche.
     */
    function claimWaterfallYield(string memory bondId, uint8 trancheIndex) external {
        require(trancheIndex == 0 || trancheIndex == 1, "Invalid tranche index");
        _updateUserWaterfallYield(msg.sender, bondId, trancheIndex);

        uint256 reward = userUnclaimedWaterfallYield[msg.sender];
        require(reward > 0, "No waterfall yield to claim");

        userUnclaimedWaterfallYield[msg.sender] = 0;
        payable(msg.sender).transfer(reward);

        emit WaterfallYieldClaimed(msg.sender, reward);
    }

    /**
     * @dev Claim all accrued waterfall yield across multiple pools.
     */
    function claimAllWaterfallYield(string[] calldata bondIds) external {
        for (uint256 i = 0; i < bondIds.length; i++) {
            _updateUserWaterfallYield(msg.sender, bondIds[i], 0);
            _updateUserWaterfallYield(msg.sender, bondIds[i], 1);
        }

        uint256 reward = userUnclaimedWaterfallYield[msg.sender];
        require(reward > 0, "No waterfall yield to claim");

        userUnclaimedWaterfallYield[msg.sender] = 0;
        payable(msg.sender).transfer(reward);

        emit WaterfallYieldClaimed(msg.sender, reward);
    }

    /**
     * @dev Administrative configuration of APY targets in basis points.
     */
    function setTrancheTargetApy(string memory bondId, uint256 seniorApy, uint256 juniorApy) external onlyOwner {
        bondTranches[bondId][0].targetAPY = seniorApy;
        bondTranches[bondId][1].targetAPY = juniorApy;
    }

    /**
     * @dev Hook to enforce transfer restrictions on ERC-1155 tokens between user wallets.
     */
    function _update(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory values
    ) internal virtual override {
        super._update(from, to, ids, values);
        
        // Skip check if it is a mint or burn
        if (from != address(0) && to != address(0)) {
            if (address(complianceRegistry) != address(0)) {
                require(complianceRegistry.isWhitelisted(to), "Recipient is not whitelisted");
            }
        }
    }

    /**
     * @dev Fallback to receive native gas (USDC).
     */
    receive() external payable {}
}
