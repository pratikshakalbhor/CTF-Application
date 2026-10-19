const OTHER_WALLETS = [
  { name: "Trust Wallet", icon: "🛡️", hint: "Mobile & browser wallet" },
  { name: "WalletConnect", icon: "🔗", hint: "Scan a code with a mobile wallet" },
  { name: "Coinbase Wallet", icon: "🔵", hint: "Coinbase self-custody wallet" },
];

/** Centered "Connect Your Wallet" card. Only MetaMask is wired up. */
export default function ConnectScreen({ wallet }) {
  return (
    <section className="connect-screen">
      <div className="connect-card">
        <div className="connect-logo">
          <span className="logo-hex">CTF</span>
        </div>

        <h1>Connect Your Wallet</h1>
        <p className="connect-sub">Pick a wallet to enter the CTF marketplace.</p>

        <div className="wallet-rows">
          {wallet.hasWallet ? (
            <button
              className="wallet-row"
              onClick={wallet.connect}
              disabled={wallet.connecting}
            >
              <span className="wallet-ico">🦊</span>
              <span className="wallet-meta">
                <span className="wallet-name">MetaMask</span>
                <span className="wallet-hint">Browser extension</span>
              </span>
              <span className="wallet-go">
                {wallet.connecting ? "Connecting…" : "Connect"}
              </span>
            </button>
          ) : (
            <a
              className="wallet-row"
              href="https://metamask.io/download/"
              target="_blank"
              rel="noreferrer"
            >
              <span className="wallet-ico">🦊</span>
              <span className="wallet-meta">
                <span className="wallet-name">MetaMask</span>
                <span className="wallet-hint">Not installed — get the extension</span>
              </span>
              <span className="wallet-go">Install</span>
            </a>
          )}

          {OTHER_WALLETS.map((w) => (
            <button key={w.name} className="wallet-row disabled" type="button" disabled>
              <span className="wallet-ico">{w.icon}</span>
              <span className="wallet-meta">
                <span className="wallet-name">{w.name}</span>
                <span className="wallet-hint">{w.hint}</span>
              </span>
              <span className="soon">Coming soon</span>
            </button>
          ))}
        </div>

        {wallet.connecting && (
          <p className="status pending">Waiting for MetaMask…</p>
        )}
        {wallet.error && <p className="status error">{wallet.error}</p>}

        <p className="connect-note">Only MetaMask is supported right now.</p>
      </div>
    </section>
  );
}
