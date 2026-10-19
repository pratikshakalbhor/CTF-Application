import { formatAmount } from "./format";

/**
 * Human readable messages for the custom errors the contracts can revert with.
 * Args are the decoded error arguments from ethers.
 */
const MESSAGES = {
  MaxSupplyExceeded: (args) =>
    `Mint would exceed the 1,000,000,000 CTF cap (requested ${formatAmount(
      args[0]
    )}, available ${formatAmount(args[1])}).`,
  InvalidPrice: () => "The price must be greater than zero.",
  AlreadySold: (args) => `NFT #${args[0]} has already been sold.`,
  NFTNotFound: (args) => `NFT #${args[0]} does not exist.`,
  NotListed: (args) => `NFT #${args[0]} is not currently listed for sale.`,
  InvalidBurnBps: (args) =>
    `Burn rate ${args[0]} bps is invalid (maximum is 10000 bps = 100%).`,
  ZeroAddress: () => "The zero address is not allowed.",
  OwnableUnauthorizedAccount: () => "Only the contract owner can do this.",
  OwnableInvalidOwner: () => "Invalid owner address.",
  ERC20InsufficientAllowance: (args) =>
    `Not enough CTF allowance: ${formatAmount(args[2])} needed, ${formatAmount(
      args[1]
    )} approved.`,
  ERC20InsufficientBalance: (args) =>
    `Not enough CTF: balance is ${formatAmount(args[1])} but ${formatAmount(
      args[2]
    )} is needed.`,
  ERC20InvalidReceiver: () => "Invalid token receiver.",
  ERC721NonexistentToken: (args) => `NFT #${args[0]} does not exist.`,
  ReentrancyGuardReentrantCall: () => "Reentrant call blocked.",
};

const isUserRejection = (error) =>
  error?.code === "ACTION_REJECTED" ||
  error?.code === 4001 ||
  /user (rejected|denied)/i.test(error?.message || "") ||
  /user rejected/i.test(error?.info?.error?.message || "");

/** Turn any ethers/wallet error into a readable string. */
export function describeError(error) {
  if (!error) return "Unknown error.";

  if (isUserRejection(error)) return "Transaction rejected in wallet.";

  if (error.revert?.name) {
    const formatter = MESSAGES[error.revert.name];
    if (formatter) {
      try {
        return formatter(error.revert.args || []);
      } catch {
        /* fall through */
      }
    }
    return `${error.revert.name}(${(error.revert.args || []).join(", ")})`;
  }

  if (typeof error.reason === "string" && error.reason.length > 0) {
    return error.reason;
  }
  if (typeof error.shortMessage === "string" && error.shortMessage.length > 0) {
    return error.shortMessage;
  }
  return error.message || "Transaction failed.";
}
