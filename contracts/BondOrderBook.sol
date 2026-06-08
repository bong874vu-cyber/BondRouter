// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IERC1155Receiver {
    function onERC1155Received(
        address operator,
        address from,
        uint256 id,
        uint256 value,
        bytes calldata data
    ) external returns (bytes4);

    function onERC1155BatchReceived(
        address operator,
        address from,
        uint256[] calldata ids,
        uint256[] calldata values,
        bytes calldata data
    ) external returns (bytes4);
}

/**
 * @title BondOrderBook
 * @dev On-chain Central Limit Order Book (CLOB) matching secondary trades of ERC-1155 Bond positions using native USDC (gas token).
 */
contract BondOrderBook is ReentrancyGuard, IERC1155Receiver {
    
    struct Order {
        uint256 id;
        address user;
        uint256 tokenId;
        uint256 quantity;
        uint256 price; // in USDC (native gas token value)
        bool isBuy; // true = Bid, false = Ask
        bool active;
    }

    address public bondRouter;
    uint256 public nextOrderId = 1;
    mapping(uint256 => Order) public orders;

    event OrderPlaced(uint256 indexed orderId, address indexed user, uint256 indexed tokenId, uint256 quantity, uint256 price, bool isBuy);
    event OrderCancelled(uint256 indexed orderId);
    event OrderMatched(uint256 indexed buyOrderId, uint256 indexed sellOrderId, uint256 quantity, uint256 price);

    constructor(address _bondRouter) {
        require(_bondRouter != address(0), "INVALID BOND ROUTER");
        bondRouter = _bondRouter;
    }

    /**
     * @notice Place a limit order. For bids (isBuy == true), value in USDC must be sent via msg.value.
     * For asks (isBuy == false), ERC-1155 tokens are escrowed into this contract.
     */
    function placeLimitOrder(
        uint256 tokenId,
        uint256 quantity,
        uint256 price,
        bool isBuy
    ) external payable nonReentrant {
        require(quantity > 0, "QUANTITY MUST BE POSITIVE");
        require(price > 0, "PRICE MUST BE POSITIVE");

        if (isBuy) {
            uint256 requiredUSDC = quantity * price;
            require(msg.value == requiredUSDC, "INCORRECT USDC VALUE SENT");
        } else {
            require(msg.value == 0, "SELL ORDERS CANNOT CARRY VALUE");
            // Escrow ERC-1155 tokens
            IERC1155(bondRouter).safeTransferFrom(msg.sender, address(this), tokenId, quantity, "");
        }

        orders[nextOrderId] = Order({
            id: nextOrderId,
            user: msg.sender,
            tokenId: tokenId,
            quantity: quantity,
            price: price,
            isBuy: isBuy,
            active: true
        });

        emit OrderPlaced(nextOrderId, msg.sender, tokenId, quantity, price, isBuy);
        nextOrderId++;
    }

    /**
     * @notice Cancel an active limit order and recover locked escrow funds.
     */
    function cancelOrder(uint256 orderId) external nonReentrant {
        Order storage order = orders[orderId];
        require(order.active, "ORDER IS INACTIVE OR CLOSED");
        require(order.user == msg.sender, "NOT ORDER OWNER");

        order.active = false;

        if (order.isBuy) {
            // Refund native USDC
            uint256 refundAmount = order.quantity * order.price;
            payable(msg.sender).transfer(refundAmount);
        } else {
            // Refund ERC-1155 bonds
            IERC1155(bondRouter).safeTransferFrom(address(this), msg.sender, order.tokenId, order.quantity, "");
        }

        emit OrderCancelled(orderId);
    }

    /**
     * @notice Match a buy order and sell order.
     */
    function matchOrders(uint256 buyOrderId, uint256 sellOrderId) external nonReentrant {
        Order storage buyOrder = orders[buyOrderId];
        Order storage sellOrder = orders[sellOrderId];

        require(buyOrder.active && sellOrder.active, "BOTH ORDERS MUST BE ACTIVE");
        require(buyOrder.isBuy, "BUY ORDER MUST BE A BID");
        require(!sellOrder.isBuy, "SELL ORDER MUST BE AN ASK");
        require(buyOrder.tokenId == sellOrder.tokenId, "TOKEN IDS DO NOT MATCH");
        require(buyOrder.price >= sellOrder.price, "PRICE CRITERIA NOT MET");

        uint256 matchQuantity = buyOrder.quantity < sellOrder.quantity ? buyOrder.quantity : sellOrder.quantity;
        uint256 tradePrice = sellOrder.price; // Clear at sell price

        // Total cost
        uint256 totalCost = matchQuantity * tradePrice;

        // Perform settlement: Transfer ERC-1155 to Buyer
        IERC1155(bondRouter).safeTransferFrom(address(this), buyOrder.user, buyOrder.tokenId, matchQuantity, "");

        // Transfer USDC to Seller
        payable(sellOrder.user).transfer(totalCost);

        // Refund buyer any excess USDC if bid price exceeded ask price
        if (buyOrder.price > tradePrice) {
            uint256 surplus = matchQuantity * (buyOrder.price - tradePrice);
            payable(buyOrder.user).transfer(surplus);
        }

        // Update remaining balances
        buyOrder.quantity -= matchQuantity;
        sellOrder.quantity -= matchQuantity;

        if (buyOrder.quantity == 0) {
            buyOrder.active = false;
        }
        if (sellOrder.quantity == 0) {
            sellOrder.active = false;
        }

        emit OrderMatched(buyOrderId, sellOrderId, matchQuantity, tradePrice);
    }

    // ERC-1155 Receiver Implementation
    function onERC1155Received(
        address,
        address,
        uint256,
        uint256,
        bytes calldata
    ) external pure override returns (bytes4) {
        return this.onERC1155Received.selector;
    }

    function onERC1155BatchReceived(
        address,
        address,
        uint256[] calldata,
        uint256[] calldata,
        bytes calldata
    ) external pure override returns (bytes4) {
        return this.onERC1155BatchReceived.selector;
    }

    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == 0x01ffc9a7 // ERC165
            || interfaceId == 0xf23a6e61 // IERC1155Receiver onERC1155Received
            || interfaceId == 0xbc197c81; // IERC1155Receiver onERC1155BatchReceived
    }
}
