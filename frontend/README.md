# CTF Event Platform — Frontend

React + Vite + ethers v6 UI for the CTF contracts (`UtilityToken` + `CTFNFT`).
No UI library — plain CSS.

## Features

- **Top bar** — CTF hexagon logo, `NFTs` / `My NFTs` nav, and a wallet pill with
  the shortened address (e.g. `0x4A2…9F3`) + CTF balance. Shows a
  **Connect Wallet** button when disconnected.
- **Connect screen** — centered "Connect Your Wallet" card with MetaMask (working),
  Trust Wallet, WalletConnect and Coinbase Wallet shown disabled with a
  "Coming soon" tag.
- **Marketplace (NFTs)** — card grid with artwork, name, **rarity badge**
  (Common/Rare/Epic read from the metadata `attributes`), `#tokenId`, price in CTF
  and a burn/treasury split preview. **2-step buy**: `approve` the CTF price, then
  `buyNFT`, with clear status text. Buys are disabled with an explanation when the
  balance is too low or the NFT is sold.
- **My NFTs** — `getNFTsOfUser(account)` in the same card style.
- **Owner panel** — shown only when the connected account is the contract owner:
  mint NFT (URI + price) and mint CTF as the primary forms; `setPrice`, burn % and
  treasury kept as small secondary sections.
- **Transaction log** — collapsible section at the bottom; decodes `NFTMinted`,
  `NFTBought` (burned + treasury amounts), `PriceUpdated` and CTF mint/burn events,
  with All / NFT / Token filters.
- **Auto refresh** — polls every 15s (configurable) and refreshes after every
  transaction.
- Custom contract errors (`MaxSupplyExceeded`, `InvalidPrice`, `AlreadySold`,
  `NFTNotFound`, `NotListed`, …) are mapped to readable messages.

## 1. Install

```bash
cd frontend
npm install
```

## 2. Point the UI at a network

Configuration lives in `src/config.js` and is selected with the `VITE_CHAIN`
environment variable (see `.env`).

### Local Hardhat node (default)

`VITE_CHAIN=localhost` targets chainId **31337** and uses the deterministic
addresses produced by the project's `npm run deploy:local`. From the project root:

```bash
npm run node           # terminal 1
npm run deploy:local   # terminal 2
```

Then start the UI:

```bash
npm run dev            # http://localhost:5173
```

Import one of the Hardhat test accounts into MetaMask and add the network
`http://127.0.0.1:8545` / chainId `31337`.

### Sepolia (chainId 11155111)

Deploy first (`npm run deploy:sepolia` in the project root), then set in
`frontend/.env`:

```bash
VITE_CHAIN=sepolia
VITE_SEPOLIA_TOKEN_ADDRESS=0x...
VITE_SEPOLIA_NFT_ADDRESS=0x...
VITE_SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/<key>
VITE_SEPOLIA_DEPLOY_BLOCK=<block the contracts were deployed at>
```

Setting `VITE_SEPOLIA_DEPLOY_BLOCK` keeps the activity-log scan fast. Restart
`npm run dev` after changing `.env`.

## 3. Build

```bash
npm run build     # outputs to dist/
npm run preview   # serve the production build on :4173
```

## Configuration reference (`frontend/.env`)

| Variable | Purpose |
| --- | --- |
| `VITE_CHAIN` | `localhost` (default) or `sepolia` |
| `VITE_SEPOLIA_TOKEN_ADDRESS` / `VITE_SEPOLIA_NFT_ADDRESS` | deployed Sepolia addresses |
| `VITE_SEPOLIA_RPC_URL` | Sepolia RPC endpoint |
| `VITE_SEPOLIA_DEPLOY_BLOCK` | start block for the activity log |
| `VITE_REFRESH_MS` | auto-refresh interval (default `15000`) |
| `VITE_ACTIVITY_LOOKBACK` | past blocks scanned on non-local networks |
| `VITE_IPFS_GATEWAY` | gateway for `ipfs://` URIs (default `https://ipfs.io/ipfs/`) |

## Notes

- Reads use the injected wallet provider, so a wallet must be installed even for
  read-only views.
- The buy flow approves the **exact** price (not unlimited), which is consumed by
  the burn + treasury transfer, so every purchase is a fresh 2-step flow.
- The owner panel appears automatically when the connected account equals
  `CTFNFT.owner()`.
