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
export const MAINNET_RPC = 'https://free.rpc.fastnear.com';
export const TESTNET_RPC = 'https://test.rpc.fastnear.com';
export const NEAR_CHAINS = [MAINNET, TESTNET, LOCALNET];
export const NEAR_INDEX_BY_CHAIN_ID = {
  [MAINNET]: '0',
  [TESTNET]: '1',
  [LOCALNET]: '2',
};

export const NEAR_DEFAULT_PAUSE_METHOD = 'pa_pause_feature';

export const NEAR_DEFAULT_PAUSE_ARGUMENTS = { key: 'ALL' };

export const NEAR_TO_YOCTONEAR_RATE = 0.000000000000000000000001;
