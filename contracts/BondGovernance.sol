// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title BondGovernance
 * @dev Simple decentralized governance contract allowing ERC-1155 bond token holders to vote on platform upgrades.
 */
contract BondGovernance is ReentrancyGuard {
    
    struct Proposal {
        uint256 id;
        address creator;
        string description;
        uint256 actionId;
        uint256 votesFor;
        uint256 votesAgainst;
        uint256 startBlock;
        uint256 endBlock;
        bool executed;
        bool active;
    }

    address public bondRouter;
    uint256 public nextProposalId = 1;
    uint256 public constant VOTING_PERIOD_BLOCKS = 300; // Fast voting period for testnet demo (~1 hour)

    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => mapping(address => bool)) public hasVoted;

    event ProposalCreated(uint256 indexed proposalId, address indexed creator, string description, uint256 actionId);
    event VoteCast(uint256 indexed proposalId, address indexed voter, bool support, uint256 weight);
    event ProposalExecuted(uint256 indexed proposalId);

    constructor(address _bondRouter) {
        require(_bondRouter != address(0), "INVALID BOND ROUTER");
        bondRouter = _bondRouter;
    }

    /**
     * @notice Creates a new governance proposal for active holders
     */
    function createProposal(string calldata description, uint256 actionId) external returns (uint256) {
        uint256 proposalId = nextProposalId++;
        
        proposals[proposalId] = Proposal({
            id: proposalId,
            creator: msg.sender,
            description: description,
            actionId: actionId,
            votesFor: 0,
            votesAgainst: 0,
            startBlock: block.number,
            endBlock: block.number + VOTING_PERIOD_BLOCKS,
            executed: false,
            active: true
        });

        emit ProposalCreated(proposalId, msg.sender, description, actionId);
        return proposalId;
    }

    /**
     * @notice Cast vote using ERC-1155 bond balance as voting weight
     */
    function castVote(
        uint256 proposalId,
        bool support,
        uint256 tokenId
    ) external nonReentrant {
        Proposal storage proposal = proposals[proposalId];
        require(proposal.active, "PROPOSAL INACTIVE");
        require(block.number <= proposal.endBlock, "VOTING PERIOD EXPIRED");
        require(!hasVoted[proposalId][msg.sender], "VOTER ALREADY CASTED VOTE");

        // Query voting weight using ERC-1155 bond token balance
        uint256 weight = IERC1155(bondRouter).balanceOf(msg.sender, tokenId);
        if (weight == 0) {
            // Default to 1 base vote weight if they don't hold the specific token but are registered compliance users
            weight = 1;
        }

        if (support) {
            proposal.votesFor += weight;
        } else {
            proposal.votesAgainst += weight;
        }

        hasVoted[proposalId][msg.sender] = true;

        emit VoteCast(proposalId, msg.sender, support, weight);
    }

    /**
     * @notice Administrative closure and execution trigger of passed proposals
     */
    function executeProposal(uint256 proposalId) external nonReentrant {
        Proposal storage proposal = proposals[proposalId];
        require(proposal.active, "PROPOSAL INACTIVE");
        require(!proposal.executed, "PROPOSAL ALREADY EXECUTED");
        require(block.number > proposal.endBlock, "VOTING PERIOD STILL ACTIVE");
        require(proposal.votesFor > proposal.votesAgainst, "PROPOSAL FAILED DUE TO INSUFFICIENT SUPPORT");

        proposal.executed = true;
        proposal.active = false;

        emit ProposalExecuted(proposalId);
    }
}
