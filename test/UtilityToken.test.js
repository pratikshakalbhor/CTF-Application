const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

const MAX_SUPPLY = 1_000_000_000n * 10n ** 18n;
const ONE_ETHER = 10n ** 18n;

describe("UtilityToken", function () {
  async function deployFixture() {
    const [owner, alice, bob] = await ethers.getSigners();
    const token = await ethers.deployContract("UtilityToken");
    return { token, owner, alice, bob };
  }

  describe("Deployment", function () {
    it("sets name, symbol and 18 decimals", async function () {
      const { token } = await loadFixture(deployFixture);
      expect(await token.name()).to.equal("CTF Token");
      expect(await token.symbol()).to.equal("CTF");
      expect(await token.decimals()).to.equal(18);
    });

    it("starts with zero total supply", async function () {
      const { token } = await loadFixture(deployFixture);
      expect(await token.totalSupply()).to.equal(0n);
    });

    it("has a MAX_SUPPLY of 1,000,000,000 CTF", async function () {
      const { token } = await loadFixture(deployFixture);
      expect(await token.MAX_SUPPLY()).to.equal(MAX_SUPPLY);
    });

    it("makes the deployer the owner", async function () {
      const { token, owner } = await loadFixture(deployFixture);
      expect(await token.owner()).to.equal(owner.address);
    });
  });

  describe("Minting", function () {
    it("allows the owner to mint", async function () {
      const { token, alice } = await loadFixture(deployFixture);
      await token.mint(alice.address, 1000n * ONE_ETHER);
      expect(await token.balanceOf(alice.address)).to.equal(1000n * ONE_ETHER);
      expect(await token.totalSupply()).to.equal(1000n * ONE_ETHER);
    });

    it("reverts when a non-owner tries to mint", async function () {
      const { token, alice } = await loadFixture(deployFixture);
      await expect(token.connect(alice).mint(alice.address, ONE_ETHER))
        .to.be.revertedWithCustomError(token, "OwnableUnauthorizedAccount")
        .withArgs(alice.address);
    });

    it("reverts when minting to the zero address", async function () {
      const { token } = await loadFixture(deployFixture);
      await expect(token.mint(ethers.ZeroAddress, ONE_ETHER)).to.be.revertedWithCustomError(
        token,
        "ERC20InvalidReceiver"
      );
    });

    it("allows minting exactly up to the 1B cap", async function () {
      const { token, alice } = await loadFixture(deployFixture);
      await token.mint(alice.address, MAX_SUPPLY);
      expect(await token.totalSupply()).to.equal(MAX_SUPPLY);
    });

    it("reverts any mint that would exceed the cap", async function () {
      const { token, alice } = await loadFixture(deployFixture);
      await expect(token.mint(alice.address, MAX_SUPPLY + 1n))
        .to.be.revertedWithCustomError(token, "MaxSupplyExceeded")
        .withArgs(MAX_SUPPLY + 1n, MAX_SUPPLY);
      expect(await token.totalSupply()).to.equal(0n);
    });

    it("reverts when the remaining capacity is smaller than the amount", async function () {
      const { token, owner, alice } = await loadFixture(deployFixture);
      const half = MAX_SUPPLY / 2n;
      await token.mint(owner.address, half);

      await expect(token.mint(alice.address, half + 1n))
        .to.be.revertedWithCustomError(token, "MaxSupplyExceeded")
        .withArgs(half + 1n, half);

      // The last wei under the cap is still mintable
      await token.mint(alice.address, half);
      expect(await token.totalSupply()).to.equal(MAX_SUPPLY);
    });

    it("never lets total supply exceed the cap", async function () {
      const { token, owner, alice } = await loadFixture(deployFixture);
      for (let i = 0; i < 5; i++) {
        await token.mint(owner.address, MAX_SUPPLY / 5n);
      }
      expect(await token.totalSupply()).to.equal(MAX_SUPPLY);
      await expect(token.mint(alice.address, 1n))
        .to.be.revertedWithCustomError(token, "MaxSupplyExceeded")
        .withArgs(1n, 0n);
    });
  });

  describe("Burning", function () {
    it("lets any holder burn their own tokens", async function () {
      const { token, alice } = await loadFixture(deployFixture);
      await token.mint(alice.address, 500n * ONE_ETHER);

      await token.connect(alice).burn(200n * ONE_ETHER);

      expect(await token.balanceOf(alice.address)).to.equal(300n * ONE_ETHER);
      expect(await token.totalSupply()).to.equal(300n * ONE_ETHER);
    });

    it("lets an approved spender burn via burnFrom", async function () {
      const { token, owner, alice } = await loadFixture(deployFixture);
      await token.mint(alice.address, 500n * ONE_ETHER);
      await token.connect(alice).approve(owner.address, 100n * ONE_ETHER);

      await token.burnFrom(alice.address, 100n * ONE_ETHER);

      expect(await token.balanceOf(alice.address)).to.equal(400n * ONE_ETHER);
      expect(await token.allowance(alice.address, owner.address)).to.equal(0n);
    });

    it("reverts burnFrom without allowance", async function () {
      const { token, owner, alice } = await loadFixture(deployFixture);
      await token.mint(alice.address, 500n * ONE_ETHER);

      await expect(token.burnFrom(alice.address, ONE_ETHER))
        .to.be.revertedWithCustomError(token, "ERC20InsufficientAllowance")
        .withArgs(owner.address, 0n, ONE_ETHER);
    });

    it("blocks burning more than the sender's balance", async function () {
      const { token, alice } = await loadFixture(deployFixture);
      await token.mint(alice.address, ONE_ETHER);

      await expect(token.connect(alice).burn(2n * ONE_ETHER))
        .to.be.revertedWithCustomError(token, "ERC20InsufficientBalance")
        .withArgs(alice.address, ONE_ETHER, 2n * ONE_ETHER);
    });

    it("has no minimum supply floor - everything can be burned", async function () {
      const { token, alice } = await loadFixture(deployFixture);
      await token.mint(alice.address, MAX_SUPPLY);

      await token.connect(alice).burn(MAX_SUPPLY);

      expect(await token.totalSupply()).to.equal(0n);
    });

    it("frees up mint capacity again after burning", async function () {
      const { token, owner, alice } = await loadFixture(deployFixture);
      await token.mint(owner.address, MAX_SUPPLY);
      await expect(token.mint(alice.address, 1n)).to.be.revertedWithCustomError(
        token,
        "MaxSupplyExceeded"
      );

      await token.burn(1000n * ONE_ETHER);
      await token.mint(alice.address, 1000n * ONE_ETHER);

      expect(await token.totalSupply()).to.equal(MAX_SUPPLY);
      expect(await token.balanceOf(alice.address)).to.equal(1000n * ONE_ETHER);
    });
  });
});
