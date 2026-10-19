import { NETWORK } from "../config";
import { formatAmount, shortAddress } from "../lib/format";

/**
 * Top bar wallet area: a pill with the shortened address + CTF balance and a
 * disconnect button when connected, a "Connect Wallet" button otherwise.
 */
export default function Wallet({ wallet, token }) {
  const { hasWallet, account, isCorrectNetwork, connecting, connect, disconnect } =
    wallet;

  if (!hasWallet) {
    return (
      <a
        className="btn primary"
        href="https://metamask.io/download/"
        target="_blank"
        rel="noreferrer"
      >
        Install MetaMask
      </a>
    );
  }

  if (!account) {
    return (
      <button className="btn primary" onClick={connect} disabled={connecting}>
        {connecting ? "Connecting…" : "Connect Wallet"}
      </button>
    );
  }

  return (
    <div className="wallet-pill">
      <span className="pill-addr" title={account}>
        {shortAddress(account, 3)}
      </span>
      <span className="pill-dot" />
      <span className="pill-bal">
        <strong>{formatAmount(token?.balance ?? null)}</strong>{" "}
        {token?.symbol || "CTF"}
      </span>
      {!isCorrectNetwork && <span className="pill-net">wrong network</span>}
      <button
        className="pill-x"
        onClick={disconnect}
        title={`Disconnect (${NETWORK.label})`}
        aria-label="Disconnect wallet"
      >
        ✕
      </button>
    </div>
  );
}
