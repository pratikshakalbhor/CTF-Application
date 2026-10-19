import { useCallback, useEffect, useRef, useState } from "react";
import { BrowserProvider } from "ethers";
import { NETWORK } from "../config";

const detectWallet = () =>
  typeof window !== "undefined" && Boolean(window.ethereum);

/**
 * Wallet connection: provider, signer, account, chainId + MetaMask events.
 *
 * The provider is created with the "any" network on purpose: without it ethers
 * caches the first chain it sees and throws `network changed: X => Y` when the
 * user switches networks in MetaMask. With "any" ethers follows the wallet.
 * On every chain/account change the provider is rebuilt and `version` bumped so
 * consumers re-fetch balances, listings and stats.
 */
export function useWallet() {
  const [account, setAccount] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState(null);
  const [version, setVersion] = useState(0);
  const [hasWallet] = useState(detectWallet);

  const providerRef = useRef(null);

  const createProvider = useCallback(() => {
    // "any" => ethers will not pin the network and will not throw on change.
    const next = new BrowserProvider(window.ethereum, "any");
    // A network change error must never surface as an unhandled throw.
    next.on("error", (err) => {
      if (err?.code === "NETWORK_ERROR") return;
      console.warn("[wallet] provider error", err);
    });
    return next;
  }, []);

  useEffect(() => {
    if (!hasWallet) return undefined;
    const eth = window.ethereum;

    const installProvider = () => {
      try {
        providerRef.current?.destroy();
      } catch {
        /* ignore */
      }
      const next = createProvider();
      providerRef.current = next;

      next.on("network", (network) => {
        if (network?.chainId) setChainId(Number(network.chainId));
      });

      setProvider(next);
      setSigner(null);
      return next;
    };

    const initial = installProvider();

    const syncAccount = async () => {
      try {
        const accounts = await initial.listAccounts();
        setAccount(accounts.length ? accounts[0].address : null);
      } catch {
        /* ignore */
      }
    };
    const syncChain = async () => {
      try {
        const network = await initial.getNetwork();
        setChainId(Number(network.chainId));
      } catch {
        /* ignore */
      }
    };
    syncAccount();
    syncChain();

    const onAccountsChanged = (accounts) => {
      setAccount(accounts && accounts.length ? accounts[0] : null);
      setSigner(null);
      setVersion((v) => v + 1);
    };

    const onChainChanged = (hex) => {
      setChainId(parseInt(hex, 16));
      // Rebuild the provider so no cached network/state survives the switch.
      installProvider();
      setVersion((v) => v + 1);
    };

    eth.on?.("accountsChanged", onAccountsChanged);
    eth.on?.("chainChanged", onChainChanged);
    return () => {
      eth.removeListener?.("accountsChanged", onAccountsChanged);
      eth.removeListener?.("chainChanged", onChainChanged);
      try {
        providerRef.current?.destroy();
      } catch {
        /* ignore */
      }
    };
  }, [hasWallet, createProvider]);

  useEffect(() => {
    let cancelled = false;
    if (!provider || !account) {
      setSigner(null);
      return undefined;
    }
    provider
      .getSigner()
      .then((s) => {
        if (!cancelled) setSigner(s);
      })
      .catch(() => {
        if (!cancelled) setSigner(null);
      });
    return () => {
      cancelled = true;
    };
  }, [provider, account, version]);

  const connect = useCallback(async () => {
    if (!hasWallet) {
      setError("MetaMask (or another EIP-1193 wallet) was not detected.");
      return;
    }
    try {
      setConnecting(true);
      setError(null);
      const eth = window.ethereum;
      const accounts = await eth.request({ method: "eth_requestAccounts" });
      setAccount(accounts[0]);

      try {
        providerRef.current?.destroy();
      } catch {
        /* ignore */
      }
      const next = createProvider();
      providerRef.current = next;
      next.on("network", (network) => {
        if (network?.chainId) setChainId(Number(network.chainId));
      });
      setProvider(next);

      const network = await next.getNetwork();
      setChainId(Number(network.chainId));
      setVersion((v) => v + 1);
    } catch (e) {
      setError(e?.shortMessage || e?.message || "Failed to connect wallet.");
    } finally {
      setConnecting(false);
    }
  }, [hasWallet, createProvider]);

  const disconnect = useCallback(() => {
    setAccount(null);
    setSigner(null);
  }, []);

  const switchNetwork = useCallback(async () => {
    if (!hasWallet) return;
    const eth = window.ethereum;
    const hexChainId = `0x${NETWORK.chainId.toString(16)}`;
    try {
      setError(null);
      await eth.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: hexChainId }],
      });
    } catch (e) {
      const unknownChain =
        e?.code === 4902 || e?.data?.originalError?.code === 4902;
      if (unknownChain) {
        try {
          await eth.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: hexChainId,
                chainName: NETWORK.label,
                nativeCurrency: NETWORK.nativeCurrency,
                rpcUrls: [NETWORK.rpcUrl],
                blockExplorerUrls: NETWORK.blockExplorer
                  ? [NETWORK.blockExplorer]
                  : [],
              },
            ],
          });
        } catch (addError) {
          setError(addError?.message || "Failed to add the network.");
        }
      } else {
        setError(e?.message || "Failed to switch network.");
      }
    }
  }, [hasWallet]);

  return {
    hasWallet,
    account,
    chainId,
    provider,
    signer,
    connecting,
    error,
    version,
    isCorrectNetwork: chainId === NETWORK.chainId,
    connect,
    disconnect,
    switchNetwork,
  };
}
