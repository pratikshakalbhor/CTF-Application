import { Contract } from "ethers";
import {
  UTILITY_TOKEN_ABI,
  CTF_NFT_ABI,
  tokenAddress,
  nftAddress,
} from "../config";

export function getTokenContract(runner) {
  return new Contract(tokenAddress, UTILITY_TOKEN_ABI, runner);
}

export function getNFTContract(runner) {
  return new Contract(nftAddress, CTF_NFT_ABI, runner);
}
