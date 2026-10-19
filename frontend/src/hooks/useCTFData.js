import { useCallback, useEffect, useRef, useState } from "react";
import { getTokenContract, getNFTContract } from "../lib/contracts";
import { loadActivity } from "../lib/events";
import { tokenAddress, nftAddress, isConfigured } from "../config";

const REFRESH_MS = Number(import.meta.env.VITE_REFRESH_MS || 15000);

/**
 * Reads token stats, contract config, listings, the connected user's NFTs and
 * the event feed. Auto refreshes (default every 15s).
 *
 * `refreshKey` should change whenever the wallet, account or chain changes so
 * every value is re-fetched from the new provider.
 */
export function useCTFData({ provider, account, enabled, refreshKey = 0 }) {
  const [state, setState] = useState({
    loading: false,
    error: null,
    lastUpdated: null,
    token: null,
    nft: null,
    activity: [],
  });

  // Monotonic id: results from a superseded provider/account are ignored.
  const generation = useRef(0);
  const activityRef = useRef([]);

  const refresh = useCallback(async () => {
    if (
      !provider ||
      !enabled ||
      !isConfigured(tokenAddress) ||
      !isConfigured(nftAddress)
    ) {
      return;
    }

    const run = ++generation.current;
    setState((prev) => ({ ...prev, loading: true }));

    try {
      const token = getTokenContract(provider);
      const nft = getNFTContract(provider);

      const [
        name,
        symbol,
        decimalsRaw,
        totalSupply,
        maxSupply,
        owner,
        burnBps,
        treasury,
        listedIds,
        allowanceRaw,
        balanceRaw,
        myIds,
      ] = await Promise.all([
        token.name(),
        token.symbol(),
        token.decimals(),
        token.totalSupply(),
        token.MAX_SUPPLY(),
        nft.owner(),
        nft.burnBps(),
        nft.treasury(),
        nft.getListedNFTs(),
        account ? token.allowance(account, nftAddress) : Promise.resolve(null),
        account ? token.balanceOf(account) : Promise.resolve(null),
        account ? nft.getNFTsOfUser(account) : Promise.resolve([]),
      ]);

      const decimals = Number(decimalsRaw);

      const listed = await Promise.all(
        listedIds.map(async (tokenId) => ({
          tokenId,
          price: await nft.getPrice(tokenId),
          uri: await nft.tokenURI(tokenId),
        }))
      );

      const myNFTs = await Promise.all(
        myIds.map(async (tokenId) => ({
          tokenId,
          uri: await nft.tokenURI(tokenId),
        }))
      );

      let activity = activityRef.current;
      try {
        activity = await loadActivity(provider, token, nft);
        activityRef.current = activity;
      } catch {
        /* keep the previous feed when the log scan fails */
      }

      if (run !== generation.current) return;

      setState({
        loading: false,
        error: null,
        lastUpdated: Date.now(),
        token: {
          name,
          symbol,
          decimals,
          totalSupply,
          maxSupply,
          balance: balanceRaw,
          allowance: allowanceRaw,
        },
        nft: { owner, burnBps, treasury, listed, myNFTs },
        activity,
      });
    } catch (e) {
      if (run !== generation.current) return;
      setState((prev) => ({
        ...prev,
        loading: false,
        error: e?.shortMessage || e?.message || "Failed to load contract data.",
      }));
    }
  }, [provider, account, enabled, refreshKey]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!enabled) return undefined;
    const id = setInterval(refresh, REFRESH_MS);
    return () => clearInterval(id);
  }, [refresh, enabled]);

  return { ...state, refresh };
}
