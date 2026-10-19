# CTF Platform - Hardhat Project

Two contracts for the CTF event platform:

- **UtilityToken** - `CTF Token (CTF)`, ERC20 + ERC20Burnable, 1B hard cap, owner-only minting, no minimum supply floor (burning is never blocked).
- **CTFNFT** - ERC721URIStorage marketplace. The owner mints NFTs straight into the contract (listed for sale); buyers pay in CTF, `burnBps` of the price is burned (default 20%) and the rest goes to the treasury.

All event participation, rewards and normal token use happen off-chain in the backend.

## Setup

```bash
npm install
cp .env.example .env   # then fill in SEPOLIA_RPC_URL / PRIVATE_KEY / TREASURY_ADDRESS
```

## Compile (+ export ABIs to /abi)

```bash
npm run compile
```

## Test

```bash
npm test
```

## Deploy - local node

```bash
npm run node            # terminal 1: start the local Hardhat node
npm run deploy:local    # terminal 2: deploy to localhost
```

## Deploy - Sepolia

```bash
# .env must contain SEPOLIA_RPC_URL and PRIVATE_KEY
npm run deploy:sepolia
```

The deploy script deploys `UtilityToken`, then `CTFNFT`, mints test tokens to the deployer and prints both addresses.

## ABI export

```bash
npm run abi             # writes abi/UtilityToken.json and abi/CTFNFT.json
```

The export also runs automatically after every compile and deploy.
