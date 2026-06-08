// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title Verifier
 * @dev On-chain zero-knowledge proof verification contract for Pedersen commitments.
 * Validates algebraic constraints: g^z1 * h^z2 == T * C^challenge (mod p).
 */
contract Verifier {
    
    /**
     * @dev Verify the zero-knowledge proof for a given Pedersen commitment.
     * @param commitment The public Pedersen commitment value (C).
     * @param zkProof The ABI-encoded proof byte array containing (g, h, p, T, z1, z2).
     */
    function verify(uint256 commitment, bytes calldata zkProof) external view returns (bool) {
        if (zkProof.length != 192) { // 6 values * 32 bytes = 192 bytes
            return false;
        }
        
        (
            uint256 g,
            uint256 h,
            uint256 p,
            uint256 T,
            uint256 z1,
            uint256 z2
        ) = abi.decode(zkProof, (uint256, uint256, uint256, uint256, uint256, uint256));
        
        // p must be a valid prime modulus
        if (p <= 1) return false;
        
        // Challenge c = keccak256(g, h, commitment, T) mod (p - 1)
        uint256 challenge = uint256(keccak256(abi.encodePacked(g, h, commitment, T))) % (p - 1);
        
        // lhs = (g^z1 * h^z2) mod p
        uint256 g_z1 = expMod(g, z1, p);
        uint256 h_z2 = expMod(h, z2, p);
        uint256 lhs = mulmod(g_z1, h_z2, p);
        
        // rhs = (T * C^challenge) mod p
        uint256 c_c = expMod(commitment, challenge, p);
        uint256 rhs = mulmod(T, c_c, p);
        
        return lhs == rhs;
    }
    
    /**
     * @dev Performs modular exponentiation using the EVM 0x05 precompiled contract.
     */
    function expMod(uint256 base, uint256 exponent, uint256 modulus) internal view returns (uint256 result) {
        if (modulus == 0) return 0;
        if (exponent == 0) return 1;
        
        assembly {
            let pointer := mload(0x40)
            mstore(pointer, 0x20)         // Length of Base
            mstore(add(pointer, 0x20), 0x20) // Length of Exponent
            mstore(add(pointer, 0x40), 0x20) // Length of Modulus
            mstore(add(pointer, 0x60), base)
            mstore(add(pointer, 0x80), exponent)
            mstore(add(pointer, 0xa0), modulus)
            
            // Call modular exponentiation precompile (0x05)
            if iszero(staticcall(gas(), 0x05, pointer, 0xc0, pointer, 0x20)) {
                revert(0, 0)
            }
            result := mload(pointer)
        }
    }
}
