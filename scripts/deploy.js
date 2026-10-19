const hre = require("hardhat");
const { exportAbis } = require("./export-abi");

// Amount of gas money handed to the owner on local networks (in ETH).
const LOCAL_GAS_FUND = "100";

/** Read an optional address from the environment, validating + checksumming it. */
function optionalAddress(value, name) {
  if (value === undefined || value === null || String(value).trim() === "") {
    return null;
  }
  const trimmed = String(value).trim();
  if (!hre.ethers.isAddress(trimmed)) {
    throw new Error(`${name} is not a valid address: "${trimmed}"`);
  }
  return hre.ethers.getAddress(trimmed);
}

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const { parseEther, formatEther } = hre.ethers;

  // Final owner of both contracts. Falls back to the deployer when unset.
  const ownerAddress = optionalAddress(process.env.OWNER_ADDRESS, "OWNER_ADDRESS");
  const owner = ownerAddress || deployer.address;

  // Treasury for NFT sales: explicit TREASURY_ADDRESS, otherwise the owner.
  const treasuryAddress = optionalAddress(
    process.env.TREASURY_ADDRESS,
    "TREASURY_ADDRESS"
  );
  const treasury = treasuryAddress || owner;

  // 1. UtilityToken
  const UtilityToken = await hre.ethers.getContractFactory("UtilityToken");
  const token = await UtilityToken.deploy();
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();

  // 2. CTFNFT
  const CTFNFT = await hre.ethers.getContractFactory("CTFNFT");
  const nft = await CTFNFT.deploy(tokenAddress, treasury);
  await nft.waitForDeployment();
  const nftAddress = await nft.getAddress();

  // 3. Mint the 1,000,000 CTF test tokens to the owner (deployer still owns
  //    the token at this point, so it is allowed to mint).
  const mintAmount = parseEther(process.env.TEST_TOKEN_AMOUNT || "1000000");
  await (await token.mint(owner, mintAmount)).wait();

  // 4. Hand ownership of both contracts to OWNER_ADDRESS.
  if (owner !== deployer.address) {
    await (await token.transferOwnership(owner)).wait();
    await (await nft.transferOwnership(owner)).wait();
  }

  // 5. Fund the owner with test ETH so it can pay gas on a local node.
  const isLocalNetwork =
    ["hardhat", "localhost"].includes(hre.network.name) ||
    hre.network.config.chainId === 31337;
  let funded = null;
  if (owner !== deployer.address) {
    if (!isLocalNetwork) {
      console.log(
        `Skipping test ETH transfer: only funded on local networks (current: ${hre.network.name}).`
      );
    } else {
      const value = parseEther(LOCAL_GAS_FUND);
      const balance = await hre.ethers.provider.getBalance(deployer.address);
      if (balance < value) {
        console.log(
          `Skipping test ETH transfer: deployer balance ${formatEther(balance)} ETH < ${LOCAL_GAS_FUND} ETH.`
        );
      } else {
        await (await deployer.sendTransaction({ to: owner, value })).wait();
        funded = value;
      }
    }
  }

  exportAbis();

  console.log("");
  console.log(`Network:            ${hre.network.name}`);
  console.log(`Deployer:           ${deployer.address}`);
  console.log(`Owner:              ${owner}`);
  console.log(`Treasury:           ${treasury}`);
  console.log(`UtilityToken (CTF): ${tokenAddress}`);
  console.log(`CTFNFT:             ${nftAddress}`);
  console.log(`Minted ${formatEther(mintAmount)} CTF to ${owner}`);
  if (owner !== deployer.address) {
    console.log(`Ownership transferred to ${owner} (UtilityToken + CTFNFT)`);
  }
  if (funded !== null) {
    console.log(`Sent ${formatEther(funded)} test ETH to ${owner}`);
  }
  console.log("");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
