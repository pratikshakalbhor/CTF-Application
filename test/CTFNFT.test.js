const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

const ONE_ETHER = 10n ** 18n;
const PRICE = 1000n * ONE_ETHER;
const DEFAULT_BURN_BPS = 2000n; // 20%
const BPS = 10_000n;

describe("CTFNFT", function () {
  async function deployFixture() {
    const [owner, alice, bob, treasury] = await ethers.getSigners();
    const token = await ethers.deployContract("UtilityToken");
    const nft = await ethers.deployContract("CTFNFT", [
      await token.getAddress(),
      treasury.address,
    ]);
    return { token, nft, owner, alice, bob, treasury };
  }

  // Two listed NFTs: #1 priced at 1000 CTF, #2 priced at 2000 CTF
  async function listedFixture() {
    const ctx = await deployFixture();
    await ctx.nft.mintNFT("ipfs://ctf-1", PRICE);
    await ctx.nft.mintNFT("ipfs://ctf-2", PRICE * 2n);
    return ctx;
  }

  async function approve(ctx, signer, tokenId) {
    const price = await ctx.nft.getPrice(tokenId);
    await ctx.token.connect(signer).approve(await ctx.nft.getAddress(), price);
    return price;
  }

  describe("Deployment", function () {
    it("wires the token and the treasury", async function () {
      const { token, nft, treasury } = await loadFixture(deployFixture);
      expect(await nft.ctfToken()).to.equal(await token.getAddress());
      expect(await nft.treasury()).to.equal(treasury.address);
    });

    it("sets the default burn to 20%", async function () {
      const { nft } = await loadFixture(deployFixture);
      expect(await nft.burnBps()).to.equal(DEFAULT_BURN_BPS);
    });

    it("sets name and symbol", async function () {
      const { nft } = await loadFixture(deployFixture);
      expect(await nft.name()).to.equal("CTF NFT");
      expect(await nft.symbol()).to.equal("CTFNFT");
    });

    it("makes the deployer the owner", async function () {
      const { nft, owner } = await loadFixture(deployFixture);
      expect(await nft.owner()).to.equal(owner.address);
    });

    it("reverts on a zero token or treasury address", async function () {
      const { token, treasury } = await loadFixture(deployFixture);
      const factory = await ethers.getContractFactory("CTFNFT");

      await expect(factory.deploy(ethers.ZeroAddress, treasury.address)).to.be.revertedWithCustomError(
        factory,
        "ZeroAddress"
      );
      await expect(factory.deploy(await token.getAddress(), ethers.ZeroAddress)).to.be.revertedWithCustomError(
        factory,
        "ZeroAddress"
      );
    });
  });

  describe("mintNFT", function () {
    it("reverts when a non-owner tries to mint (users can never mint)", async function () {
      const { nft, alice } = await loadFixture(deployFixture);
      await expect(nft.connect(alice).mintNFT("ipfs://x", PRICE))
        .to.be.revertedWithCustomError(nft, "OwnableUnauthorizedAccount")
        .withArgs(alice.address);
    });

    it("reverts on a zero price", async function () {
      const { nft } = await loadFixture(deployFixture);
      await expect(nft.mintNFT("ipfs://x", 0)).to.be.revertedWithCustomError(nft, "InvalidPrice");
    });

    it("mints to the contract itself (listed for sale) and stores the price", async function () {
      const { nft, owner } = await loadFixture(deployFixture);

      await expect(nft.mintNFT("ipfs://ctf-1", PRICE))
        .to.emit(nft, "NFTMinted")
        .withArgs(1n, owner.address, PRICE, "ipfs://ctf-1");

      expect(await nft.ownerOf(1n)).to.equal(await nft.getAddress());
      expect(await nft.tokenURI(1n)).to.equal("ipfs://ctf-1");
      expect(await nft.getPrice(1n)).to.equal(PRICE);
      expect(await nft.getListedNFTs()).to.deep.equal([1n]);
      expect(await nft.getNFTsOfUser(await nft.getAddress())).to.deep.equal([1n]);
    });

    it("increments token ids and tracks every listing", async function () {
      const { nft } = await loadFixture(listedFixture);
      expect(await nft.getListedNFTs()).to.deep.equal([1n, 2n]);
      expect(await nft.getPrice(1n)).to.equal(PRICE);
      expect(await nft.getPrice(2n)).to.equal(PRICE * 2n);
    });

    it("returns 0 for the price of an unknown token", async function () {
      const { nft } = await loadFixture(deployFixture);
      expect(await nft.getPrice(999n)).to.equal(0n);
    });
  });

  describe("Owner configuration", function () {
    it("setBurnBps is owner-only", async function () {
      const { nft, alice } = await loadFixture(deployFixture);
      await expect(nft.connect(alice).setBurnBps(1000n))
        .to.be.revertedWithCustomError(nft, "OwnableUnauthorizedAccount")
        .withArgs(alice.address);
    });

    it("setBurnBps accepts up to 100% and rejects anything above", async function () {
      const { nft } = await loadFixture(deployFixture);

      await expect(nft.setBurnBps(10_000n)).to.emit(nft, "BurnBpsUpdated").withArgs(2000n, 10_000n);
      expect(await nft.burnBps()).to.equal(10_000n);

      await expect(nft.setBurnBps(10_001n))
        .to.be.revertedWithCustomError(nft, "InvalidBurnBps")
        .withArgs(10_001n);
      expect(await nft.burnBps()).to.equal(10_000n);
    });

    it("setTreasury is owner-only and rejects the zero address", async function () {
      const { nft, alice, bob } = await loadFixture(deployFixture);

      await expect(nft.connect(alice).setTreasury(alice.address))
        .to.be.revertedWithCustomError(nft, "OwnableUnauthorizedAccount")
        .withArgs(alice.address);

      await expect(nft.setTreasury(ethers.ZeroAddress)).to.be.revertedWithCustomError(
        nft,
        "ZeroAddress"
      );

      const previousTreasury = await nft.treasury();
      await expect(nft.setTreasury(bob.address))
        .to.emit(nft, "TreasuryUpdated")
        .withArgs(previousTreasury, bob.address);
      expect(await nft.treasury()).to.equal(bob.address);
    });

    it("setPrice updates an unsold NFT", async function () {
      const { nft, owner } = await loadFixture(listedFixture);

      await expect(nft.setPrice(1n, 42n * ONE_ETHER))
        .to.emit(nft, "PriceUpdated")
        .withArgs(1n, PRICE, 42n * ONE_ETHER);

      expect(await nft.getPrice(1n)).to.equal(42n * ONE_ETHER);
      expect(await nft.owner()).to.equal(owner.address);
    });

    it("setPrice is owner-only", async function () {
      const { nft, alice } = await loadFixture(listedFixture);
      await expect(nft.connect(alice).setPrice(1n, ONE_ETHER))
        .to.be.revertedWithCustomError(nft, "OwnableUnauthorizedAccount")
        .withArgs(alice.address);
    });

    it("setPrice rejects a zero price and unknown tokens", async function () {
      const { nft } = await loadFixture(listedFixture);
      await expect(nft.setPrice(1n, 0)).to.be.revertedWithCustomError(nft, "InvalidPrice");
      await expect(nft.setPrice(999n, ONE_ETHER))
        .to.be.revertedWithCustomError(nft, "NFTNotFound")
        .withArgs(999n);
    });

    it("setPrice rejects an already sold NFT", async function () {
      const { token, nft, alice } = await loadFixture(listedFixture);
      await token.mint(alice.address, PRICE);
      await approve({ token, nft }, alice, 1n);
      await nft.connect(alice).buyNFT(1n);

      await expect(nft.setPrice(1n, ONE_ETHER))
        .to.be.revertedWithCustomError(nft, "AlreadySold")
        .withArgs(1n);
    });
  });

  describe("buyNFT", function () {
    it("completes the sale: buyer owns the NFT, supply is burned, treasury is paid", async function () {
      const { token, nft, alice, treasury } = await loadFixture(listedFixture);
      await token.mint(alice.address, PRICE);
      await approve({ token, nft }, alice, 1n);

      const nftAddress = await nft.getAddress();
      const supplyBefore = await token.totalSupply();

      const tx = await nft.connect(alice).buyNFT(1n);
      await expect(tx)
        .to.emit(nft, "NFTBought")
        .withArgs(1n, alice.address, PRICE, 200n * ONE_ETHER, 800n * ONE_ETHER);

      expect(await nft.ownerOf(1n)).to.equal(alice.address);
      expect(await token.balanceOf(alice.address)).to.equal(0n);
      expect(await token.balanceOf(treasury.address)).to.equal(800n * ONE_ETHER);
      expect(await token.totalSupply()).to.equal(supplyBefore - 200n * ONE_ETHER);
      expect(await token.allowance(alice.address, nftAddress)).to.equal(0n);

      // Bookkeeping
      expect(await nft.getListedNFTs()).to.deep.equal([2n]);
      expect(await nft.getNFTsOfUser(alice.address)).to.deep.equal([1n]);
      expect(await nft.getNFTsOfUser(nftAddress)).to.deep.equal([2n]);
    });

    it("burn split math follows burnBps (0%, 20%, 25%, 100%)", async function () {
      const cases = [
        { bps: 0n, burn: 0n, treasury: 1000n * ONE_ETHER },
        { bps: 2000n, burn: 200n * ONE_ETHER, treasury: 800n * ONE_ETHER },
        { bps: 2500n, burn: 250n * ONE_ETHER, treasury: 750n * ONE_ETHER },
        { bps: 10_000n, burn: 1000n * ONE_ETHER, treasury: 0n },
      ];

      for (const c of cases) {
        const { token, nft, alice, treasury } = await loadFixture(listedFixture);
        await nft.setBurnBps(c.bps);
        await token.mint(alice.address, PRICE);
        await approve({ token, nft }, alice, 1n);

        const supplyBefore = await token.totalSupply();
        const treasuryBefore = await token.balanceOf(treasury.address);

        await expect(nft.connect(alice).buyNFT(1n))
          .to.emit(nft, "NFTBought")
          .withArgs(1n, alice.address, PRICE, c.burn, c.treasury);

        expect(await token.totalSupply()).to.equal(supplyBefore - c.burn);
        expect(await token.balanceOf(treasury.address)).to.equal(treasuryBefore + c.treasury);
        expect(await token.balanceOf(alice.address)).to.equal(0n);
        expect(await nft.ownerOf(1n)).to.equal(alice.address);
      }
    });

    it("uses the updated treasury after setTreasury", async function () {
      const { token, nft, alice, bob, treasury } = await loadFixture(listedFixture);
      await nft.setTreasury(bob.address);
      await token.mint(alice.address, PRICE);
      await approve({ token, nft }, alice, 1n);

      await nft.connect(alice).buyNFT(1n);

      expect(await token.balanceOf(bob.address)).to.equal(800n * ONE_ETHER);
      expect(await token.balanceOf(treasury.address)).to.equal(0n);
    });

    it("rejects buying an already sold NFT", async function () {
      const { token, nft, alice, bob } = await loadFixture(listedFixture);
      await token.mint(alice.address, PRICE);
      await approve({ token, nft }, alice, 1n);
      await nft.connect(alice).buyNFT(1n);

      await token.mint(bob.address, PRICE * 2n);
      await approve({ token, nft }, bob, 2n);

      await expect(nft.connect(bob).buyNFT(1n))
        .to.be.revertedWithCustomError(nft, "AlreadySold")
        .withArgs(1n);

      // Bob is untouched: payment never left his wallet
      expect(await token.balanceOf(bob.address)).to.equal(PRICE * 2n);
      expect(await token.allowance(bob.address, await nft.getAddress())).to.equal(PRICE * 2n);
      expect(await nft.ownerOf(1n)).to.equal(alice.address);
    });

    it("reverts when the allowance is too small", async function () {
      const { token, nft, alice } = await loadFixture(listedFixture);
      await token.mint(alice.address, PRICE);
      const nftAddress = await nft.getAddress();
      await token.connect(alice).approve(nftAddress, PRICE - 1n);

      // burnFrom consumes 200 CTF of the allowance first, so only 799 CTF
      // remain when the 800 CTF treasury transfer is attempted.
      await expect(nft.connect(alice).buyNFT(1n))
        .to.be.revertedWithCustomError(token, "ERC20InsufficientAllowance")
        .withArgs(nftAddress, PRICE - 1n - 200n * ONE_ETHER, 800n * ONE_ETHER);

      expect(await nft.ownerOf(1n)).to.equal(nftAddress);
      expect(await token.balanceOf(alice.address)).to.equal(PRICE);
      expect(await nft.getListedNFTs()).to.deep.equal([1n, 2n]);
    });

    it("reverts when the buyer never approved", async function () {
      const { token, nft, alice } = await loadFixture(listedFixture);
      await token.mint(alice.address, PRICE);

      await expect(nft.connect(alice).buyNFT(1n))
        .to.be.revertedWithCustomError(token, "ERC20InsufficientAllowance")
        .withArgs(await nft.getAddress(), 0n, 200n * ONE_ETHER);
    });

    it("reverts when the buyer cannot cover the price", async function () {
      const { token, nft, alice } = await loadFixture(listedFixture);
      await token.mint(alice.address, PRICE / 2n);
      await token.connect(alice).approve(await nft.getAddress(), PRICE);

      // 200 CTF burn succeeds, then the 800 CTF treasury payment fails
      await expect(nft.connect(alice).buyNFT(1n))
        .to.be.revertedWithCustomError(token, "ERC20InsufficientBalance")
        .withArgs(alice.address, 300n * ONE_ETHER, 800n * ONE_ETHER);

      expect(await nft.ownerOf(1n)).to.equal(await nft.getAddress());
      expect(await token.balanceOf(alice.address)).to.equal(PRICE / 2n);
      expect(await token.totalSupply()).to.equal(PRICE / 2n);
    });

    it("reverts for a token that does not exist", async function () {
      const { token, nft, alice } = await loadFixture(listedFixture);
      await token.mint(alice.address, PRICE);
      await token.connect(alice).approve(await nft.getAddress(), PRICE);

      await expect(nft.connect(alice).buyNFT(4242n))
        .to.be.revertedWithCustomError(nft, "NFTNotFound")
        .withArgs(4242n);
    });

    it("leaves nothing listed after every NFT is sold", async function () {
      const { token, nft, alice } = await loadFixture(listedFixture);
      await token.mint(alice.address, PRICE * 3n);

      await approve({ token, nft }, alice, 1n);
      await nft.connect(alice).buyNFT(1n);
      await approve({ token, nft }, alice, 2n);
      await nft.connect(alice).buyNFT(2n);

      expect(await nft.getListedNFTs()).to.deep.equal([]);
      expect(await nft.getNFTsOfUser(alice.address)).to.deep.equal([1n, 2n]);
      expect(await token.balanceOf(alice.address)).to.equal(0n);
    });
  });
});
