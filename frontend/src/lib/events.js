import { ZeroAddress } from "ethers";
import { NETWORK } from "../config";

const MAX_ENTRIES = 50;

async function getFromBlock(provider) {
  if (NETWORK.activityFromBlock > 0) return NETWORK.activityFromBlock;
  if (NETWORK.chainId === 31337) return 0;
  const latest = await provider.getBlockNumber();
  const lookback = Number(import.meta.env.VITE_ACTIVITY_LOOKBACK || 5000);
  return Math.max(0, latest - lookback);
}

/**
 * Scan both contracts for the events we care about and normalise them into a
 * single, newest-first feed.
 */
export async function loadActivity(provider, token, nft) {
  const fromBlock = await getFromBlock(provider);
  const toBlock = "latest";

  const [minted, bought, priceUpdated, ctfMinted, ctfBurned] = await Promise.all([
    nft.queryFilter(nft.filters.NFTMinted(), fromBlock, toBlock),
    nft.queryFilter(nft.filters.NFTBought(), fromBlock, toBlock),
    nft.queryFilter(nft.filters.PriceUpdated(), fromBlock, toBlock),
    token.queryFilter(token.filters.Transfer(ZeroAddress, null), fromBlock, toBlock),
    token.queryFilter(token.filters.Transfer(null, ZeroAddress), fromBlock, toBlock),
  ]);

  const entries = [];
  const add = (type, log, extra) =>
    entries.push({
      id: `${log.transactionHash}-${log.index}`,
      type,
      blockNumber: log.blockNumber,
      txHash: log.transactionHash,
      ...extra,
    });

  for (const log of minted) {
    add("NFTMinted", log, {
      tokenId: log.args.tokenId,
      minter: log.args.minter,
      price: log.args.price,
      uri: log.args.uri,
    });
  }
  for (const log of bought) {
    add("NFTBought", log, {
      tokenId: log.args.tokenId,
      buyer: log.args.buyer,
      price: log.args.price,
      burned: log.args.burnedAmount,
      treasury: log.args.treasuryAmount,
    });
  }
  for (const log of priceUpdated) {
    add("PriceUpdated", log, {
      tokenId: log.args.tokenId,
      previousPrice: log.args.previousPrice,
      newPrice: log.args.newPrice,
    });
  }
  for (const log of ctfMinted) {
    add("CTFMinted", log, { to: log.args.to, amount: log.args.value });
  }
  for (const log of ctfBurned) {
    add("CTFBurned", log, { from: log.args.from, amount: log.args.value });
  }

  return entries
    .sort((a, b) => b.blockNumber - a.blockNumber)
    .slice(0, MAX_ENTRIES);
}
