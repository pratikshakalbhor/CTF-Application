import { useMemo, useState } from "react";
import { formatAmount, shortAddress } from "../lib/format";

const NFT_TYPES = new Set(["NFTMinted", "NFTBought", "PriceUpdated"]);
const TOKEN_TYPES = new Set(["CTFMinted", "CTFBurned"]);

const FILTERS = [
  { key: "all", label: "All" },
  { key: "nft", label: "NFT" },
  { key: "token", label: "Token" },
];

const BADGE = {
  NFTMinted: "mint",
  NFTBought: "buy",
  PriceUpdated: "price",
  CTFMinted: "mint",
  CTFBurned: "burn",
};

function describe(entry, decimals) {
  switch (entry.type) {
    case "NFTMinted":
      return {
        title: `NFT #${entry.tokenId} minted`,
        detail: `for ${formatAmount(entry.price, decimals)} CTF by ${shortAddress(entry.minter)}`,
      };
    case "NFTBought":
      return {
        title: `NFT #${entry.tokenId} bought by ${shortAddress(entry.buyer)}`,
        detail: `${formatAmount(entry.price, decimals)} CTF · ${formatAmount(
          entry.burned,
          decimals
        )} burned · ${formatAmount(entry.treasury, decimals)} to treasury`,
      };
    case "PriceUpdated":
      return {
        title: `NFT #${entry.tokenId} price updated`,
        detail: `${formatAmount(entry.previousPrice, decimals)} → ${formatAmount(
          entry.newPrice,
          decimals
        )} CTF`,
      };
    case "CTFMinted":
      return {
        title: "CTF minted",
        detail: `+${formatAmount(entry.amount, decimals)} CTF → ${shortAddress(entry.to)}`,
      };
    case "CTFBurned":
      return {
        title: "CTF burned",
        detail: `−${formatAmount(entry.amount, decimals)} CTF from ${shortAddress(entry.from)}`,
      };
    default:
      return { title: entry.type, detail: "" };
  }
}

/** Small collapsible section at the bottom of the page (closed by default). */
export default function TransactionLog({ activity, decimals = 18 }) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("all");

  const filtered = useMemo(() => {
    if (filter === "nft") return activity.filter((e) => NFT_TYPES.has(e.type));
    if (filter === "token") return activity.filter((e) => TOKEN_TYPES.has(e.type));
    return activity;
  }, [activity, filter]);

  return (
    <div className={`tx-log ${open ? "open" : ""}`}>
      <button
        className="tx-toggle"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <span className="tx-toggle-title">Transaction log</span>
        <span className="pill">{activity.length} events</span>
        <span className="chev">{open ? "▾" : "▸"}</span>
      </button>

      {open && (
        <div className="tx-body">
          <div className="filters">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                className={`chip ${filter === f.key ? "active" : ""}`}
                onClick={() => setFilter(f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div className="empty">No events found.</div>
          ) : (
            <ul className="tx-list">
              {filtered.map((entry) => {
                const { title, detail } = describe(entry, decimals);
                return (
                  <li key={entry.id} className="tx-item">
                    <span className={`tx-badge ${BADGE[entry.type] || ""}`}>
                      {entry.type}
                    </span>
                    <div className="tx-main">
                      <span className="tx-title">{title}</span>
                      <span className="tx-detail">{detail}</span>
                    </div>
                    <span className="tx-block">#{entry.blockNumber}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
