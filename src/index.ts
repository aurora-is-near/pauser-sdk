import base58 from 'bs58';
import { ethers } from 'ethers';
import * as nearAPI from 'near-api-js';
import { parseSeedPhrase } from 'near-seed-phrase';
import {
  ETH_INDEX_BY_CHAIN_ID,
  ETHEREUM_DERIVATION_PATH,
  ETHEREUM_MNEMONIC,
  keyStore,
  MAINNET,
  NEAR_DEFAULT_PAUSE_ARGUMENTS,
  NEAR_DERIVATION_PATH,
  NEAR_INDEX_BY_CHAIN_ID,
  NEAR_LOCALNET_CONFIG,
  NEAR_MAINNET_CONFIG,
  NEAR_MNEMONIC,
  NEAR_TESTNET_CONFIG,
  RPC_URL_BY_CHAIN_ID,
  TESTNET,
} from './config';
import {
  Chainish,
  isEvmNetwork,
  isNearNetwork,
  isSupportedEVMChainId,
  isSupportedNearChainId,
} from './types';
import pausableAbi from './Pausable.abi';

/**
 * Custom error type for structured error handling in the Pause SDK.
 */
export class PauseSdkError extends Error {
  /**
   * Error code representing the type of error.
   */
  public code: string;

  /**
   * The underlying error that caused this error, if available.
   */
  public reason?: unknown;

  /**
   * Creates an instance of PauseSdkError.
   *
   * @param code - A string code representing the error type.
   * @param message - A descriptive error message.
   * @param reason - (Optional) The original error that triggered this error.
   */
  constructor(code: string, message: string, reason?: unknown) {
    super(message);
    this.code = code;
    this.reason = reason;
    Object.setPrototypeOf(this, PauseSdkError.prototype);
  }
}

type UnifiedPauseOpts = EthereumPauseOpts | NearPauseOpts;

type EthereumPauseOpts = {
  networkId: 'ethereum';
  chainId: number;
  /**
   * The contract address to pause.
   */
  accountId: string;
};

type NearPauseOpts = {
  networkId: 'near';
  chainId: string;
  /**
   * The account ID of the contract to pause.
   */
  accountId: string;
  /**
   * dictates the controller contract that will be called by delegate.
   */
  target: string;
  /**
   * controls the method that will be called by delegate.
   */
  methodName?: string;
  /**
   * controls the arguments used in the method call by delegate.
   */
  methodArgs?: unknown;
  /**
   * controls the accountId that performs the call.
   */
  sender?: string;
  /**
   * for testing purposes only, calls a local node if set
   */
  nodeUrl?: string;
  derivationPath?: string;
};

export interface IsPausableOpts {
  /**
   * The account ID or contract address to check.
   */
  accountId: string;
  /**
   * The ID of the network (e.g., 'near', 'ethereum').
   */
  networkId: string;
  /**
   * The chain ID (e.g., 'mainnet', 'testnet', or a number for Ethereum).
   */
  chainId: Chainish;
  /**
   * for testing purposes only, calls a local node if set
   */
  nodeUrl?: string;
}

/**
 * Checks if a contract is pausable on a given blockchain network.
 * This function currently performs basic validation of network and chain parameters.
 * In the future, it will include on-chain state validation to confirm pauseability.
 *
 * @param params - The parameters object.
 * @returns A promise that resolves to `true` if the contract is pausable, `false` otherwise.
 */
export async function isPausable({
  accountId,
  networkId,
  chainId,
  nodeUrl,
}: IsPausableOpts) {
  const isNearChain =
    isNearNetwork(networkId) && isSupportedNearChainId(chainId);

  const isEvmChain = isEvmNetwork(networkId) && isSupportedEVMChainId(chainId);

  if (!networkId || !accountId || !chainId || (!isNearChain && !isEvmChain)) {
    return false;
  }

  if (isNearChain) {
    const derivationPath = `${NEAR_DERIVATION_PATH}/${NEAR_INDEX_BY_CHAIN_ID[chainId]}'`;

    const { publicKey } = parseSeedPhrase(NEAR_MNEMONIC, derivationPath);

    const [, pk] = publicKey.split(':');
    const implicitAccountId = Buffer.from(base58.decode(pk)).toString('hex');
    let networkConfig = {
      ...NEAR_LOCALNET_CONFIG,
      nodeUrl: nodeUrl ?? '',
    };

    if (chainId === MAINNET) {
      networkConfig = NEAR_MAINNET_CONFIG;
    }

    if (chainId === TESTNET) {
      networkConfig = NEAR_TESTNET_CONFIG;
    }

    const nearConnection = await nearAPI.connect(networkConfig);
    const account = await nearConnection.account(implicitAccountId);

    try {
      const pluginResult = await account.viewFunction({
        contractId: accountId,
        methodName: 'pa_is_paused',
        args: NEAR_DEFAULT_PAUSE_ARGUMENTS,
      });

      if (!pluginResult) {
        return true;
      }
    } catch (error) {
      // Fail silently as the contract may be an engine contract
    }

    try {
      const engineResult = await account.viewFunction({
        contractId: accountId,
        methodName: 'get_paused_flags',
      });

      if (engineResult === '') {
        return true;
      }
    } catch (e) {
      // Fail silently as it may be an unpauseable contract
    }

    return false;
  }

  // TODO: read on-chain state for EVM to validate pauseability

  return true;
}

/**
 * Pauses a contract on a supported blockchain network.
 *
 * For NEAR chains, it calls the `delegate_pause` method on the controller contract.
 * For Ethereum chains, it calls the `pause` method on the specified contract.
 *
 * @param opts - The options required to perform the pause operation.
 * @throws {PauseSdkError} Throws structured errors for invalid parameters or if pausing fails.
 */
export async function pause(opts: UnifiedPauseOpts): Promise<void> {
  const { networkId, chainId, accountId } = opts;
  const network = typeof chainId === 'string' ? parseInt(chainId, 10) : chainId;
  const isNearChain = networkId === 'near' && isSupportedNearChainId(chainId);
  const isEvmChain = networkId === 'ethereum' && isSupportedEVMChainId(chainId);

  // Validate required parameters.
  if (!networkId || !chainId || !accountId || !(isNearChain || isEvmChain)) {
    throw new PauseSdkError(
      'INVALID_PARAMETERS',
      'Missing or invalid parameters provided',
    );
  }

  if (isNearChain) {
    // Derivation path with trailing `'` is required.
    const derivationPath =
      opts.derivationPath ??
      `${NEAR_DERIVATION_PATH}/${NEAR_INDEX_BY_CHAIN_ID[chainId]}'`;

    const { publicKey, secretKey } = parseSeedPhrase(
      NEAR_MNEMONIC,
      derivationPath,
    );

    const keypair = nearAPI.KeyPair.fromString(secretKey);

    const [, pk] = publicKey.split(':');
    const implicitAccountId = Buffer.from(base58.decode(pk)).toString('hex');
    const signer = opts.sender ?? implicitAccountId;

    await keyStore.setKey(chainId, signer, keypair);

    let networkConfig = {
      ...NEAR_LOCALNET_CONFIG,
      nodeUrl: opts.nodeUrl ?? '',
    };

    if (chainId === MAINNET) {
      networkConfig = NEAR_MAINNET_CONFIG;
    }

    if (chainId === TESTNET) {
      networkConfig = NEAR_TESTNET_CONFIG;
    }

    const nearConnection = await nearAPI.connect(networkConfig);

    const account = await nearConnection.account(signer);

    try {
      await account.functionCall({
        contractId: opts.target,
        methodName: 'delegate_pause',
        args: {
          receiver_id: accountId,
          pause_method_name: opts.methodName,
          pause_arguments: opts.methodArgs,
        },
        attachedDeposit: 1,
      });
    } catch (e) {
      throw new PauseSdkError(
        'NEAR_PAUSE_ERROR',
        'Error occurred while executing delegate_pause on NEAR chain',
        e,
      );
    }
  }

  if (isEvmChain) {
    const rpcUrl = RPC_URL_BY_CHAIN_ID[chainId];
    const provider = new ethers.JsonRpcProvider(rpcUrl, network);

    const derivationPath = `${ETHEREUM_DERIVATION_PATH}/${ETH_INDEX_BY_CHAIN_ID[chainId]}`;

    const wallet = ethers.HDNodeWallet.fromMnemonic(
      ethers.Mnemonic.fromPhrase(ETHEREUM_MNEMONIC),
      derivationPath,
    ).connect(provider);

    const contract = new ethers.Contract(accountId, pausableAbi, wallet);

    try {
      await contract.pause();
    } catch (e) {
      throw new PauseSdkError(
        'EVM_PAUSE_ERROR',
        'Error occurred while executing pause on EVM chain',
        e,
      );
    }
  }
}

/**
 * Options for unpausing a contract on an Ethereum chain.
 */
export interface UnpauseOpts {
  /**
   * Network ID which identifies the blockchain network.
   */
  networkId: string;
  /**
   * The chain ID (Ethereum chains only).
   */
  chainId: number;
  /**
   * The account ID of the contract to unpause.
   */
  accountId: string;
}

/**
 * Unpauses a contract on a supported Ethereum chain.
 *
 * This function only supports Ethereum chains.
 *
 * @param opts - The options required to perform the unpause operation.
 * @throws {PauseSdkError} Throws structured errors for invalid parameters or if unpausing fails.
 */
export async function unpause(opts: UnpauseOpts): Promise<void> {
  const { networkId, chainId, accountId } = opts;
  const isEvmChain = isSupportedEVMChainId(chainId);

  if (!networkId || !chainId || !accountId || !isEvmChain) {
    throw new PauseSdkError(
      'INVALID_PARAMETERS',
      'Missing or invalid parameters provided',
    );
  }

  const rpcUrl = RPC_URL_BY_CHAIN_ID[chainId];
  const provider = new ethers.JsonRpcProvider(rpcUrl, chainId);
  const derivationPath = `${ETHEREUM_DERIVATION_PATH}/${ETH_INDEX_BY_CHAIN_ID[chainId]}`;

  const wallet = ethers.HDNodeWallet.fromMnemonic(
    ethers.Mnemonic.fromPhrase(ETHEREUM_MNEMONIC),
    derivationPath,
  ).connect(provider);

  const contract = new ethers.Contract(accountId, pausableAbi, wallet);

  try {
    await contract.unPause();
  } catch (e) {
    throw new PauseSdkError(
      'EVM_UNPAUSE_ERROR',
      'Error occurred while executing unpause on EVM chain',
      e,
    );
  }
}
