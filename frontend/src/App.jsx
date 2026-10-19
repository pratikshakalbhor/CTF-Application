import { useMemo, useState } from "react";
import { useWallet } from "./hooks/useWallet";
import { useCTFData } from "./hooks/useCTFData";
import { NETWORK, tokenAddress, nftAddress, isConfigured } from "./config";
import { getTokenContract, getNFTContract } from "./lib/contracts";
import Wallet from "./components/Wallet";
import ConnectScreen from "./components/ConnectScreen";
import OwnerPanel from "./components/OwnerPanel";
import Marketplace from "./components/Marketplace";
import MyNFTs from "./components/MyNFTs";
import TransactionLog from "./components/TransactionLog";

export default function App() {
  const wallet = useWallet();
  const [page, setPage] = useState("nfts"); // "nfts" | "mine"

  const configured = isConfigured(tokenAddress) && isConfigured(nftAddress);
  const enabled = Boolean(wallet.provider) && wallet.isCorrectNetwork && configured;
  const connected = Boolean(wallet.account);

  const { token, nft, activity, loading, error, refresh } = useCTFData({
    provider: wallet.provider,
    account: wallet.account,
    enabled,
    refreshKey: wallet.version,
  });

  const writeContracts = useMemo(() => {
    if (!wallet.signer) return null;
    return {
      token: getTokenContract(wallet.signer),
      nft: getNFTContract(wallet.signer),
    };
  }, [wallet.signer]);

  const isOwner = Boolean(
    wallet.account &&
      nft?.owner &&
      wallet.account.toLowerCase() === nft.owner.toLowerCase()
  );

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-left">
          <span className="logo" title="CTF Event Platform">
            <span className="logo-hex">CTF</span>
          </span>
          <nav className="nav">
            <button
              className={`nav-link ${page === "nfts" ? "active" : ""}`}
              onClick={() => setPage("nfts")}
            >
              NFTs
            </button>
            <button
              className={`nav-link ${page === "mine" ? "active" : ""}`}
              onClick={() => setPage("mine")}
            >
              My NFTs
            </button>
          </nav>
        </div>
        <Wallet wallet={wallet} token={token} />
      </header>

      {connected && !wallet.isCorrectNetwork && (
        <div className="banner">
          <span>
            Wrong network — this app targets <strong>{NETWORK.label}</strong> (chainId{" "}
            {NETWORK.chainId}).
          </span>
          <button className="btn small" onClick={wallet.switchNetwork}>
            Switch network
          </button>
        </div>
      )}

      {!configured && (
        <div className="banner">
          Contract addresses for <strong>{NETWORK.label}</strong> are not configured.
          Set them in <code>frontend/.env</code>.
        </div>
      )}

      {connected && wallet.error && <div className="banner">{wallet.error}</div>}
      {error && <div className="banner">{error}</div>}

      {!connected ? (
        <ConnectScreen wallet={wallet} />
      ) : (
        <main className="page">
          {page === "nfts" ? (
            <>
              <section className="panel">
                <Marketplace
                  account={wallet.account}
                  token={token}
                  nft={nft}
                  writeContracts={writeContracts}
                  onRefresh={refresh}
                  loading={loading}
                />
              </section>

              {isOwner && (
                <section className="panel">
                  <OwnerPanel
                    token={token}
                    nft={nft}
                    writeContracts={writeContracts}
                    onDone={refresh}
                  />
                </section>
              )}
            </>
          ) : (
            <section className="panel">
              <MyNFTs account={wallet.account} nft={nft} />
            </section>
          )}

          <TransactionLog activity={activity} decimals={token?.decimals ?? 18} />
        </main>
      )}
    </div>
  );
}
