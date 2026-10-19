import { formatAmount, bpsToPercent } from "../lib/format";

export default function TokenStats({ token, nft, loading }) {
  if (!token) {
    return (
      <div className="empty">
        {loading ? "Loading token stats…" : "Token stats unavailable."}
      </div>
    );
  }

  const total = token.totalSupply ?? 0n;
  const max = token.maxSupply ?? 0n;
  const remaining = max > total ? max - total : 0n;
  const percent = max > 0n ? Number((total * 10_000n) / max) / 100 : 0;

  return (
    <div className="stats">
      <div className="panel-head">
        <h2>
          {token.name} <span className="ticker">{token.symbol}</span>
        </h2>
        {nft && (
          <span className="pill" title="Share of every NFT sale that is burned">
            burn {bpsToPercent(nft.burnBps)}
          </span>
        )}
      </div>

      <div className="stat-grid">
        <div className="stat">
          <span className="stat-label">Total supply</span>
          <span className="stat-value">{formatAmount(total, token.decimals, 0)}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Max supply</span>
          <span className="stat-value">{formatAmount(max, token.decimals, 0)}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Mintable left</span>
          <span className="stat-value">{formatAmount(remaining, token.decimals, 0)}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Decimals</span>
          <span className="stat-value">{token.decimals}</span>
        </div>
      </div>

      <div className="progress" title={`${percent}% of the cap minted`}>
        <div className="progress-fill" style={{ width: `${Math.min(percent, 100)}%` }} />
      </div>
      <div className="progress-caption">
        {percent.toFixed(2)}% of the 1,000,000,000 CTF cap minted
      </div>

      <div className="kv">
        <span>Your balance</span>
        <strong>
          {formatAmount(token.balance ?? null)} {token.symbol}
        </strong>
      </div>
      {nft && (
        <div className="kv">
          <span>Treasury</span>
          <strong className="mono">{nft.treasury}</strong>
        </div>
      )}
    </div>
  );
}
