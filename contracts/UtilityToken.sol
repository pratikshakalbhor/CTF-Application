// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title UtilityToken - CTF event platform utility token
/// @notice ERC20 + ERC20Burnable with a hard 1B cap. Minting is owner-only,
///         burning is always allowed (no minimum supply floor).
contract UtilityToken is ERC20, ERC20Burnable, Ownable {
    /// @notice Hard cap: 1,000,000,000 CTF (18 decimals)
    uint256 public constant MAX_SUPPLY = 1_000_000_000 * 10 ** 18;

    /// @notice Thrown when a mint would push total supply above MAX_SUPPLY
    /// @param requested Amount the caller tried to mint
    /// @param available Amount still mintable under the cap
    error MaxSupplyExceeded(uint256 requested, uint256 available);

    constructor()
        ERC20("CTF Token", "CTF")
        Ownable(msg.sender)
    {}

    /// @notice Mint new tokens. Only callable by the owner.
    /// @param to Recipient of the newly minted tokens
    /// @param amount Amount to mint (18 decimals)
    function mint(address to, uint256 amount) external onlyOwner {
        uint256 available = MAX_SUPPLY - totalSupply();
        if (amount > available) {
            revert MaxSupplyExceeded(amount, available);
        }
        _mint(to, amount);
    }
}
