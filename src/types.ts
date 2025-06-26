import {
  AURORA,
  ETH_INDEX_BY_CHAIN_ID,
  ETHEREUM,
  ETHEREUM_NETWORK,
  LOCALNET,
  MAINNET,
  NEAR_INDEX_BY_CHAIN_ID,
  NEAR_NETWORK,
  TESTNET,
} from './config';

type SupportedEVMChainId = keyof typeof ETH_INDEX_BY_CHAIN_ID;

export function isSupportedEVMChainId(
  chainId: number | string,
): chainId is SupportedEVMChainId {
  return chainId === ETHEREUM || chainId === AURORA;
}

type SupportedNearChainId = keyof typeof NEAR_INDEX_BY_CHAIN_ID;

export function isSupportedNearChainId(
  chainId: string | number,
): chainId is SupportedNearChainId {
  return chainId === MAINNET || chainId === TESTNET || chainId === LOCALNET;
}

export type SupportedChainId = SupportedEVMChainId | SupportedNearChainId;

export type SupportedNetwork = typeof ETHEREUM_NETWORK | typeof NEAR_NETWORK;

export function isEvmNetwork(network: string) {
  return network === ETHEREUM_NETWORK;
}

export function isNearNetwork(network: string) {
  return network === NEAR_NETWORK;
}

export function isSupportedNetwork(
  network: string,
): network is SupportedNetwork {
  return isEvmNetwork(network) || isNearNetwork(network);
}

export type Chainish = string | number;
