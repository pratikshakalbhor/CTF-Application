import UtilityTokenAbi from "./abi/UtilityToken.json";
import CTFNFTAbi from "./abi/CTFNFT.json";

export const UTILITY_TOKEN_ABI = UtilityTokenAbi;
export const CTF_NFT_ABI = CTFNFTAbi;

export const BPS_DENOMINATOR = 10_000;

/**
 * Network presets. `VITE_CHAIN` selects which one the UI targets:
 *   VITE_CHAIN=localhost  -> Hardhat node (chainId 31337, default)
 *   VITE_CHAIN=sepolia    -> Sepolia testnet (chainId 11155111)
 */
const NETWORKS = {
  localhost: {
    key: "localhost",
    label: "Hardhat Localhost",
    chainId: 31337,
    // Deterministic addresses produced by `npm run deploy:local`
    tokenAddress: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
    nftAddress: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
    rpcUrl: "http://127.0.0.1:8545",
    blockExplorer: null,
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    activityFromBlock: 0,
  },
  sepolia: {
    key: "sepolia",
    label: "Sepolia Testnet",
    chainId: 11155111,
    tokenAddress: import.meta.env.VITE_SEPOLIA_TOKEN_ADDRESS || "",
    nftAddress: import.meta.env.VITE_SEPOLIA_NFT_ADDRESS || "",
    rpcUrl:
      import.meta.env.VITE_SEPOLIA_RPC_URL ||
      "https://ethereum-sepolia-rpc.publicnode.com",
    blockExplorer: "https://sepolia.etherscan.io",
    nativeCurrency: { name: "Sepolia Ether", symbol: "ETH", decimals: 18 },
    activityFromBlock: Number(import.meta.env.VITE_SEPOLIA_DEPLOY_BLOCK || 0),
  },
};

const requested = String(import.meta.env.VITE_CHAIN || "localhost").toLowerCase();
export const NETWORK = NETWORKS[requested] || NETWORKS.localhost;

export const tokenAddress = NETWORK.tokenAddress;
export const nftAddress = NETWORK.nftAddress;
export const chainId = NETWORK.chainId;

export const isConfigured = (address) =>
  typeof address === "string" && /^0x[a-fA-F0-9]{40}$/.test(address);
