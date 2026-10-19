import { useState } from "react";
import Media from "./Media";
import { useMetadata } from "../hooks/useMetadata";
import { useAction } from "../hooks/useAction";
import { nftAddress } from "../config";
import { formatAmount, splitPrice, bpsToPercent } from "../lib/format";

const RARITIES = ["common", "rare", "epic"];

/** Pull the "Rarity" trait out of the metadata attributes, if it exists. */
function rarityOf(attributes) {
  if (!Array.isArray(attributes)) return null;
  const hit = attributes.find(
    (attr) => String(attr?.trait_type ?? "").toLowerCase() === "rarity"
  );
  if (hit?.value === null || hit?.value === undefined || hit?.value === "") {
    return null;
  }
  const label = String(hit.value);
  const key = label.toLowerCase();
  return { label, key: RARITIES.includes(key) ? key : "other" };
}

/**
 * Shared NFT card (marketplace + My NFTs): artwork, name, rarity badge,
 * #tokenId, price in CTF with the burn/treasury split preview and the
 * 2-step Approve → Buy flow for listings.
 */
export default function NFTCard({
  item,
  variant = "market",
  account,
  token,
  nft,
  writeContracts,
  onRefresh,
}) {
  const action = useAction();
  const [bought, setBought] = useState(false);

  const id = item.tokenId.toString();
  const label = `NFT #${id}`;
  const meta = useMetadata(item.uri, label);
  const rarity = rarityOf(meta.attributes);

  const decimals = token?.decimals ?? 18;
  const price = variant === "market" ? (item.price ?? null) : null;
  const { burn, treasury } = splitPrice(price, nft?.burnBps ?? 0);

  const balance = token?.balance ?? null;
  const allowance = token?.allowance ?? null;
  const connected = Boolean(account && writeContracts);
  const balanceKnown = balance !== null && price !== null;
  const canAfford = balanceKnown && balance >= price;
  const approved = allowance !== null && price !== null && allowance >= price;
  const busy = Boolean(action.pending);
  const sold = bought;

  const run = (fn) => async () => {
    const ok = await action.run(fn.label, fn.build);
    if (ok) {
      fn.onDone?.();
      onRefresh?.();
    }
  };

  return (
    <article className="nft-card">
      <Media src={meta.image} loading={meta.loading} label={label} />
      {rarity && <span className={`rarity ${rarity.key}`}>{rarity.label}</span>}

      <div className="nft-body">
        <div className="nft-head">
          <span className="nft-name" title={meta.name || label}>
            {meta.name || label}
          </span>
          <span className="nft-id">#{id}</span>
        </div>

        {variant === "market" ? (
          <>
            <div className="nft-price">
              <span className="price-value">{formatAmount(price, decimals)}</span>
              <span className="price-unit">CTF</span>
            </div>

            <div className="split">
              <span>burn {formatAmount(burn, decimals)}</span>
              <span>treasury {formatAmount(treasury, decimals)}</span>
              <span>{bpsToPercent(nft?.burnBps ?? 0)}</span>
            </div>

            <div className="steps">
              <span
                className={`step-dot ${approved || sold ? "done" : connected ? "active" : ""}`}
              >
                1
              </span>
              <span className="step-label">Approve</span>
              <span className={`step-dot ${sold ? "done" : approved ? "active" : ""}`}>
                2
              </span>
              <span className="step-label">Buy</span>
            </div>

            {sold ? (
              <>
                <button className="btn" disabled>
                  Sold
                </button>
                <p className="status info">This NFT has been sold.</p>
              </>
            ) : !connected ? (
              <button className="btn" disabled>
                Connect wallet to buy
              </button>
            ) : !balanceKnown ? (
              <button className="btn" disabled>
                Waiting for CTF balance…
              </button>
            ) : !canAfford ? (
              <>
                <button className="btn" disabled>
                  Insufficient CTF balance
                </button>
                <p className="status error">
                  Needs {formatAmount(price, decimals)} CTF — your balance is{" "}
                  {formatAmount(balance, decimals)} CTF.
                </p>
              </>
            ) : !approved ? (
              <button
                className="btn primary"
                disabled={busy}
                onClick={run({
                  label: "Approve CTF",
                  build: () => writeContracts.token.approve(nftAddress, price),
                })}
              >
                {busy ? "Approving…" : `1 · Approve ${formatAmount(price, decimals)} CTF`}
              </button>
            ) : (
              <button
                className="btn primary"
                disabled={busy}
                onClick={run({
                  label: "Buy NFT",
                  build: () => writeContracts.nft.buyNFT(item.tokenId),
                  onDone: () => setBought(true),
                })}
              >
                {busy ? "Buying…" : `2 · Buy for ${formatAmount(price, decimals)} CTF`}
              </button>
            )}

            {action.pending && (
              <p className="status pending">Waiting for {action.pending}…</p>
            )}
            {action.error && <p className="status error">{action.error}</p>}
            {action.success && <p className="status success">{action.success}</p>}
          </>
        ) : (
          <span className="owned-tag">Owned</span>
        )}
      </div>
    </article>
  );
}
