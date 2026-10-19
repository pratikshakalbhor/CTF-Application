/**
 * scripts/check-rpc.js — connectivity probe for the Sepolia deployment setup.
 *
 * Calls eth_chainId and reads the deployer's ETH balance on the sepolia
 * network, then prints ONLY:
 *   - the chain id
 *   - the deployer address
 *   - the balance in ETH
 *
 * It never prints the RPC URL or the private key; error messages are redacted
 * (URLs and long hex values are masked) before being shown.
 *
 * Usage: npx hardhat run scripts/check-rpc.js --network sepolia
 */
require("dotenv").config();

const hre = require("hardhat");

const EXPECTED_CHAIN_ID = 11155111n;
const TIMEOUT_MS = 30_000;

/** Strip anything secret-looking (URLs w/ API keys, private keys) from errors. */
function safeMessage(error) {
  let message = String(
    error?.shortMessage || error?.info?.error?.message || error?.message || error
  );
  message = message.replace(/https?:\/\/[^\s"')]+/gi, "[rpc-url]");
  message = message.replace(/0x[a-fA-F0-9]{64,}/g, "[redacted]");
  return message;
}

function withTimeout(promise, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`${label} timed out after ${TIMEOUT_MS / 1000}s`)),
      TIMEOUT_MS
    );
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/** Derive the deployer address locally — no RPC needed, never prints the key. */
function localDeployerAddress() {
  if (!process.env.PRIVATE_KEY) return null;
  try {
    return new hre.ethers.Wallet(process.env.PRIVATE_KEY).address;
  } catch {
    console.error("deployer:   PRIVATE_KEY is set but is not a valid key");
    return null;
  }
}

async function main() {
  const provider = hre.ethers.provider;
  let failed = false;

  // 1. eth_chainId
  try {
    const network = await withTimeout(provider.getNetwork(), "eth_chainId");
    const note =
      network.chainId === EXPECTED_CHAIN_ID ? "" : `  (expected ${EXPECTED_CHAIN_ID})`;
    console.log(`chain id:   ${network.chainId}${note}`);
    if (network.chainId !== EXPECTED_CHAIN_ID) failed = true;
  } catch (error) {
    failed = true;
    console.error(`chain id:   unreachable — ${safeMessage(error)}`);
  }

  // 2. deployer address (hardhat signers, falling back to a local derivation)
  let deployer = null;
  try {
    const signers = await withTimeout(hre.ethers.getSigners(), "eth_accounts");
    deployer = signers[0]?.address ?? null;
  } catch {
    /* signer listing needs the RPC; fall back to local derivation below */
  }
  deployer = deployer || localDeployerAddress();

  if (!deployer) {
    console.log("deployer:   not configured — PRIVATE_KEY is not set");
    process.exitCode = 1;
    return;
  }
  console.log(`deployer:   ${deployer}`);

  // 3. balance in ETH
  try {
    const balance = await withTimeout(
      provider.getBalance(deployer),
      "eth_getBalance"
    );
    console.log(`balance:    ${hre.ethers.formatEther(balance)} ETH`);
  } catch (error) {
    failed = true;
    console.error(`balance:    unreachable — ${safeMessage(error)}`);
  }

  if (failed) process.exitCode = 1;
}

main().catch((error) => {
  console.error(`check failed: ${safeMessage(error)}`);
  process.exitCode = 1;
});
