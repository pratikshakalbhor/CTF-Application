import { useEffect, useState } from "react";
import { useAction } from "../hooks/useAction";
import { bpsToPercent, formatAmount, parseAmount } from "../lib/format";

const Field = ({ label, children }) => (
  <label className="field">
    <span>{label}</span>
    {children}
  </label>
);

export default function OwnerPanel({ token, nft, writeContracts, onDone }) {
  const { pending, error, success, run } = useAction();
  const decimals = token?.decimals ?? 18;

  const [mintTo, setMintTo] = useState("");
  const [mintAmount, setMintAmount] = useState("1000");
  const [nftUri, setNftUri] = useState("");
  const [nftPrice, setNftPrice] = useState("100");
  const [burnBps, setBurnBps] = useState("2000");
  const [treasury, setTreasury] = useState("");
  const [priceTokenId, setPriceTokenId] = useState("");
  const [priceValue, setPriceValue] = useState("");

  useEffect(() => {
    if (nft) setBurnBps(String(nft.burnBps));
  }, [nft?.burnBps]);

  useEffect(() => {
    if (nft) setTreasury(nft.treasury);
  }, [nft?.treasury]);

  const disabled = !writeContracts || Boolean(pending);

  const send = async (label, build) => {
    const ok = await run(label, build);
    if (ok) onDone?.();
    return ok;
  };

  return (
    <div className="owner">
      <div className="panel-head">
        <h2>Owner panel</h2>
        <span className="pill owner-pill">owner only</span>
      </div>

      <div className="owner-primary">
        <div className="owner-card">
          <h3>Mint NFT</h3>
          <Field label="Metadata URI">
            <input
              type="text"
              placeholder="ipfs://… or https://…"
              value={nftUri}
              onChange={(e) => setNftUri(e.target.value)}
            />
          </Field>
          <Field label="Price (CTF)">
            <input
              type="text"
              value={nftPrice}
              onChange={(e) => setNftPrice(e.target.value)}
            />
          </Field>
          <button
            className="btn primary"
            disabled={disabled}
            onClick={() =>
              send("Mint NFT", () =>
                writeContracts.nft.mintNFT(nftUri.trim(), parseAmount(nftPrice, decimals))
              )
            }
          >
            Mint NFT
          </button>
        </div>

        <div className="owner-card">
          <h3>Mint CTF tokens</h3>
          <Field label="Recipient">
            <input
              type="text"
              placeholder="0x…"
              value={mintTo}
              onChange={(e) => setMintTo(e.target.value)}
            />
          </Field>
          <Field label="Amount (CTF)">
            <input
              type="text"
              value={mintAmount}
              onChange={(e) => setMintAmount(e.target.value)}
            />
          </Field>
          <button
            className="btn primary"
            disabled={disabled}
            onClick={() =>
              send("Mint CTF", () =>
                writeContracts.token.mint(mintTo.trim(), parseAmount(mintAmount, decimals))
              )
            }
          >
            Mint tokens
          </button>
        </div>
      </div>

      <div className="owner-secondary">
        <h4 className="owner-sub-title">Contract settings</h4>
        <div className="owner-secondary-grid">
          <div className="owner-card small">
            <h3>Set price</h3>
            <Field label="Token id">
              <input
                type="text"
                value={priceTokenId}
                onChange={(e) => setPriceTokenId(e.target.value)}
              />
            </Field>
            <Field label="New price (CTF)">
              <input
                type="text"
                value={priceValue}
                onChange={(e) => setPriceValue(e.target.value)}
              />
            </Field>
            <button
              className="btn primary"
              disabled={disabled}
              onClick={() =>
                send("Update price", () =>
                  writeContracts.nft.setPrice(priceTokenId, parseAmount(priceValue, decimals))
                )
              }
            >
              Update price
            </button>
          </div>

          <div className="owner-card small">
            <h3>Burn %</h3>
            <Field label={`Basis points (current ${nft ? nft.burnBps.toString() : "-"})`}>
              <input
                type="text"
                value={burnBps}
                onChange={(e) => setBurnBps(e.target.value)}
              />
            </Field>
            <p className="hint">
              {Number.isFinite(Number(burnBps)) ? bpsToPercent(Number(burnBps)) : "-"} of
              every sale is burned. Max 10000 (100%).
            </p>
            <button
              className="btn primary"
              disabled={disabled}
              onClick={() => send("Set burn rate", () => writeContracts.nft.setBurnBps(burnBps))}
            >
              Update burn rate
            </button>
          </div>

          <div className="owner-card small">
            <h3>Treasury</h3>
            <Field label="Treasury address">
              <input
                type="text"
                placeholder="0x…"
                value={treasury}
                onChange={(e) => setTreasury(e.target.value)}
              />
            </Field>
            <button
              className="btn primary"
              disabled={disabled}
              onClick={() =>
                send("Set treasury", () => writeContracts.nft.setTreasury(treasury.trim()))
              }
            >
              Update treasury
            </button>
          </div>
        </div>
      </div>

      {pending && <p className="status pending">Waiting for {pending}…</p>}
      {error && <p className="status error">{error}</p>}
      {success && <p className="status success">{success}</p>}
      {token && nft && (
        <p className="hint">
          Cap remaining:{" "}
          {formatAmount(
            token.maxSupply > token.totalSupply ? token.maxSupply - token.totalSupply : 0n,
            token.decimals,
            0
          )}{" "}
          CTF · Listed NFTs: {nft.listed.length}
        </p>
      )}
    </div>
  );
}
