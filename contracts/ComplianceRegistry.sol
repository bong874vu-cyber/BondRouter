// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ComplianceRegistry
 * @dev Manage whitelisted addresses eligible to purchase or trade tokenized bonds.
 */
contract ComplianceRegistry is Ownable {
    mapping(address => bool) private _whitelist;

    event WhitelistUpdated(address indexed investor, bool status);

    constructor() Ownable(msg.sender) {}

    /**
     * @dev Admin function to update whitelist status of an investor.
     */
    function whitelistInvestor(address investor, bool status) external onlyOwner {
        _whitelist[investor] = status;
        emit WhitelistUpdated(investor, status);
    }

    /**
     * @dev External view to check if an address is whitelisted.
     */
    function isWhitelisted(address investor) external view returns (bool) {
        return _whitelist[investor];
    }
}
