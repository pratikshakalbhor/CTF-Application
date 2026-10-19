// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {UtilityToken} from "./UtilityToken.sol";

/// @title CTFNFT - NFT ticket/badge marketplace for the CTF event platform
/// @notice The owner mints NFTs straight into the contract (listed for sale).
///         Buyers pay in CTF tokens; part of the price is burned, the rest
///         goes to the treasury. All participation/rewards logic lives
///         off-chain in the backend.
contract CTFNFT is ERC721URIStorage, IERC721Receiver, Ownable, ReentrancyGuard {
    uint256 public constant BPS_DENOMINATOR = 10_000;

    /// @notice The ERC20 used to buy NFTs
    UtilityToken public immutable ctfToken;

    /// @notice Address that receives the non-burned part of every sale
    address public treasury;

    /// @notice Basis points of every sale that are burned (2000 = 20%)
    uint256 public burnBps = 2_000;

    uint256 private _nextTokenId = 1;

    mapping(uint256 => uint256) private _prices;
    mapping(uint256 => bool) private _sold;

    uint256[] private _listedTokenIds;
    /// @dev tokenId => index in _listedTokenIds + 1 (0 means "not listed")
    mapping(uint256 => uint256) private _listedIndex;

    mapping(address => uint256[]) private _ownedTokenIds;
    /// @dev tokenId => index in _ownedTokenIds[owner] + 1
    mapping(uint256 => uint256) private _ownedIndex;

    // ------------------------------------------------------------------
    // Errors
    // ------------------------------------------------------------------

    error NFTNotFound(uint256 tokenId);
    error AlreadySold(uint256 tokenId);
    error NotListed(uint256 tokenId);
    error InvalidPrice();
    error InvalidBurnBps(uint256 burnBps);
    error ZeroAddress();

    // ------------------------------------------------------------------
    // Events
    // ------------------------------------------------------------------

    event NFTMinted(uint256 indexed tokenId, address indexed minter, uint256 price, string uri);
    event NFTBought(
        uint256 indexed tokenId,
        address indexed buyer,
        uint256 price,
        uint256 burnedAmount,
        uint256 treasuryAmount
    );
    event PriceUpdated(uint256 indexed tokenId, uint256 previousPrice, uint256 newPrice);
    event BurnBpsUpdated(uint256 previousBurnBps, uint256 newBurnBps);
    event TreasuryUpdated(address previousTreasury, address newTreasury);

    constructor(address ctfToken_, address treasury_)
        ERC721("CTF NFT", "CTFNFT")
        Ownable(msg.sender)
    {
        if (ctfToken_ == address(0) || treasury_ == address(0)) {
            revert ZeroAddress();
        }
        ctfToken = UtilityToken(ctfToken_);
        treasury = treasury_;
    }

    // ------------------------------------------------------------------
    // Minting (owner only - users can never mint)
    // ------------------------------------------------------------------

    /// @notice Mint an NFT directly to the contract so it is listed for sale.
    /// @param uri Metadata URI of the NFT
    /// @param priceInTokens Sale price in CTF tokens
    /// @return tokenId The id of the freshly minted NFT
    function mintNFT(string memory uri, uint256 priceInTokens)
        external
        onlyOwner
        returns (uint256 tokenId)
    {
        if (priceInTokens == 0) revert InvalidPrice();

        tokenId = _nextTokenId++;
        _prices[tokenId] = priceInTokens;
        _sold[tokenId] = false;
        _addListed(tokenId);

        _safeMint(address(this), tokenId);
        _setTokenURI(tokenId, uri);

        emit NFTMinted(tokenId, msg.sender, priceInTokens, uri);
    }

    // ------------------------------------------------------------------
    // Buying
    // ------------------------------------------------------------------

    /// @notice Buy a listed NFT. The buyer must have approved this contract
    ///         for the full price; `burnBps` of the price is burned from the
    ///         buyer and the remainder is sent to the treasury.
    function buyNFT(uint256 tokenId) external nonReentrant {
        if (_ownerOf(tokenId) == address(0)) revert NFTNotFound(tokenId);
        if (_sold[tokenId]) revert AlreadySold(tokenId);
        if (ownerOf(tokenId) != address(this)) revert NotListed(tokenId);

        uint256 price = _prices[tokenId];
        if (price == 0) revert InvalidPrice();

        uint256 burnedAmount = (price * burnBps) / BPS_DENOMINATOR;
        uint256 treasuryAmount = price - burnedAmount;

        // Effects before interactions
        _sold[tokenId] = true;
        _removeListed(tokenId);

        if (burnedAmount > 0) {
            ctfToken.burnFrom(msg.sender, burnedAmount);
        }
        if (treasuryAmount > 0) {
            ctfToken.transferFrom(msg.sender, treasury, treasuryAmount);
        }

        _safeTransfer(address(this), msg.sender, tokenId, "");

        emit NFTBought(tokenId, msg.sender, price, burnedAmount, treasuryAmount);
    }

    // ------------------------------------------------------------------
    // Owner configuration
    // ------------------------------------------------------------------

    /// @notice Update the price of an unsold NFT.
    function setPrice(uint256 tokenId, uint256 newPrice) external onlyOwner {
        if (_ownerOf(tokenId) == address(0)) revert NFTNotFound(tokenId);
        if (_sold[tokenId]) revert AlreadySold(tokenId);
        if (newPrice == 0) revert InvalidPrice();

        uint256 previousPrice = _prices[tokenId];
        _prices[tokenId] = newPrice;

        emit PriceUpdated(tokenId, previousPrice, newPrice);
    }

    /// @notice Set the burn share of every sale, in basis points (max 10000 = 100%).
    function setBurnBps(uint256 newBurnBps) external onlyOwner {
        if (newBurnBps > BPS_DENOMINATOR) revert InvalidBurnBps(newBurnBps);

        uint256 previousBurnBps = burnBps;
        burnBps = newBurnBps;

        emit BurnBpsUpdated(previousBurnBps, newBurnBps);
    }

    /// @notice Set the treasury that receives the non-burned part of every sale.
    function setTreasury(address newTreasury) external onlyOwner {
        if (newTreasury == address(0)) revert ZeroAddress();

        address previousTreasury = treasury;
        treasury = newTreasury;

        emit TreasuryUpdated(previousTreasury, newTreasury);
    }

    // ------------------------------------------------------------------
    // Views
    // ------------------------------------------------------------------

    /// @notice Token ids currently listed for sale (minted and not sold yet)
    function getListedNFTs() external view returns (uint256[] memory) {
        return _listedTokenIds;
    }

    /// @notice Token ids currently owned by `user`
    function getNFTsOfUser(address user) external view returns (uint256[] memory) {
        return _ownedTokenIds[user];
    }

    /// @notice Sale price of `tokenId` (0 if the token does not exist)
    function getPrice(uint256 tokenId) external view returns (uint256) {
        return _prices[tokenId];
    }

    // ------------------------------------------------------------------
    // ERC721 receiver (the contract mints to itself)
    // ------------------------------------------------------------------

    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external pure override returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }

    // ------------------------------------------------------------------
    // Internal bookkeeping (ownership + listing arrays)
    // ------------------------------------------------------------------

    function _update(address to, uint256 tokenId, address auth)
        internal
        override
        returns (address)
    {
        address from = _ownerOf(tokenId);

        address previousOwner = super._update(to, tokenId, auth);

        if (from != address(0)) {
            _removeOwned(from, tokenId);
        }
        if (from == address(this) && to != address(this)) {
            _removeListed(tokenId);
        }
        if (to != address(0)) {
            _addOwned(to, tokenId);
        }

        return previousOwner;
    }

    function _addListed(uint256 tokenId) private {
        _listedTokenIds.push(tokenId);
        _listedIndex[tokenId] = _listedTokenIds.length;
    }

    function _removeListed(uint256 tokenId) private {
        uint256 indexPlusOne = _listedIndex[tokenId];
        if (indexPlusOne == 0) return;

        uint256 index = indexPlusOne - 1;
        uint256 lastIndex = _listedTokenIds.length - 1;
        if (index != lastIndex) {
            uint256 lastTokenId = _listedTokenIds[lastIndex];
            _listedTokenIds[index] = lastTokenId;
            _listedIndex[lastTokenId] = index + 1;
        }
        _listedTokenIds.pop();
        delete _listedIndex[tokenId];
    }

    function _addOwned(address account, uint256 tokenId) private {
        _ownedTokenIds[account].push(tokenId);
        _ownedIndex[tokenId] = _ownedTokenIds[account].length;
    }

    function _removeOwned(address account, uint256 tokenId) private {
        uint256 indexPlusOne = _ownedIndex[tokenId];
        if (indexPlusOne == 0) return;

        uint256 index = indexPlusOne - 1;
        uint256 lastIndex = _ownedTokenIds[account].length - 1;
        if (index != lastIndex) {
            uint256 lastTokenId = _ownedTokenIds[account][lastIndex];
            _ownedTokenIds[account][index] = lastTokenId;
            _ownedIndex[lastTokenId] = index + 1;
        }
        _ownedTokenIds[account].pop();
        delete _ownedIndex[tokenId];
    }
}
