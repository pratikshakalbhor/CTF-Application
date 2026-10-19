import NFTCard from "./NFTCard";

export default function Marketplace({
  account,
  token,
  nft,
  writeContracts,
  onRefresh,
  loading,
}) {
  const listed = nft?.listed ?? [];

  return (
    <div className="marketplace">
      <div className="panel-head">
        <h2>NFTs</h2>
        <span className="pill">{listed.length} listed</span>
      </div>

      {listed.length === 0 ? (
        <div className="empty">
          {loading && !nft
            ? "Loading listings…"
            : "No NFTs are currently listed for sale."}
        </div>
      ) : (
        <div className="nft-grid">
          {listed.map((item) => (
            <NFTCard
              key={item.tokenId.toString()}
              item={item}
              variant="market"
              account={account}
              token={token}
              nft={nft}
              writeContracts={writeContracts}
              onRefresh={onRefresh}
            />
          ))}
        </div>
      )}
    </div>
  );
}
