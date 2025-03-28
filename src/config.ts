import { keyStores } from 'near-api-js';

export const ETHEREUM = 1;
export const AURORA = 1313161554;

export const RPC_URL_BY_CHAIN_ID = {
  1: 'https://eth.llamarpc.com',
  1313161554: 'https://mainnet.aurora.dev',
};
export const ETH_INDEX_BY_CHAIN_ID = {
  1: '0/0',
  1313161554: '0/1',
};

type SupportedEVMChainId = keyof typeof ETH_INDEX_BY_CHAIN_ID;

export function isSupportedEVMChainId(
  chainId: number | string,
): chainId is SupportedEVMChainId {
  return chainId === ETHEREUM || chainId === AURORA;
}

export const ETHEREUM_NETWORK = 'ethereum';
export const ETHEREUM_DERIVATION_PATH = "m/44'/60'/0'";
export const ETHEREUM_MNEMONIC =
  process.env.ETH_PRIVATE_KEY ??
  'test test test test test test test test test test test junk';

export const NEAR_NETWORK = 'near';
export const NEAR_DERIVATION_PATH = "m/44'/397'";
export const NEAR_MNEMONIC =
  process.env.NEAR_PRIVATE_KEY ??
  'air minute wish amazing detect animal acoustic robot basket web brisk fragile';

export const MAINNET = 'mainnet';
export const TESTNET = 'testnet';
export const LOCALNET = 'local';
export const NEAR_CHAINS = [MAINNET, TESTNET, LOCALNET];
export const NEAR_INDEX_BY_CHAIN_ID = {
  [MAINNET]: '0',
  [TESTNET]: '1',
  [LOCALNET]: '2',
};

type SupportedNearChainId = keyof typeof NEAR_INDEX_BY_CHAIN_ID;

export function isSupportedNearChainId(
  chainId: string | number,
): chainId is SupportedNearChainId {
  return chainId === MAINNET || chainId === TESTNET || chainId === LOCALNET;
}

export type SupportedChainId = SupportedEVMChainId | SupportedNearChainId;

export const keyStore = new keyStores.InMemoryKeyStore();
export const NEAR_MAINNET_CONFIG = {
  networkId: MAINNET,
  keyStore,
  nodeUrl: 'https://rpc.mainnet.near.org',
  walletUrl: 'https://wallet.mainnet.near.org',
  helperUrl: 'https://helper.mainnet.near.org',
  explorerUrl: 'https://nearblocks.io',
};
export const NEAR_TESTNET_CONFIG = {
  networkId: TESTNET,
  keyStore,
  nodeUrl: 'https://rpc.testnet.near.org',
  walletUrl: 'https://testnet.mynearwallet.com/',
  helperUrl: 'https://helper.testnet.near.org',
  explorerUrl: 'https://testnet.nearblocks.io',
};
export const NEAR_LOCALNET_CONFIG = {
  networkId: LOCALNET,
  keyStore,
};

export const NEAR_DEFAULT_PAUSE_METHOD = 'pa_pause_feature';

export const NEAR_DEFAULT_PAUSE_ARGUMENTS = { key: 'ALL' };
