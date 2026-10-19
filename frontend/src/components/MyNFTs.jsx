import NFTCard from "./NFTCard";

export default function MyNFTs({ account, nft }) {
  const owned = nft?.myNFTs ?? [];

  return (
    <div className="my-nfts">
      <div className="panel-head">
        <h2>My NFTs</h2>
        <span className="pill">{owned.length} owned</span>
      </div>

      {!account ? (
        <div className="empty">Connect your wallet to see your NFTs.</div>
      ) : owned.length === 0 ? (
        <div className="empty">You do not own any CTF NFTs yet.</div>
      ) : (
        <div className="nft-grid">
          {owned.map((item) => (
            <NFTCard key={item.tokenId.toString()} item={item} variant="owned" />
          ))}
        </div>
      )}
    </div>
  );
}
