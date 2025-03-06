import base58 from "bs58";
import { ethers } from "ethers";
import nearAPI, { Contract, KeyPair } from "near-api-js";
import { parseSeedPhrase } from "near-seed-phrase";
import {
  ETH_INDEX_BY_CHAIN_ID,
  ETHEREUM_DERIVATION_PATH,
  ETHEREUM_MNEMONIC,
  isSupportedEVMChainId,
  isSupportedNearChainId,
  keyStore,
  MAINNET,
  NEAR_CONTROLLER_CONTRACT,
  NEAR_DEFAULT_PAUSE_METHOD,
  NEAR_DERIVATION_PATH,
  NEAR_INDEX_BY_CHAIN_ID,
  NEAR_MAINNET_CONFIG,
  NEAR_MNEMONIC,
  NEAR_TESTNET_CONFIG,
  RPC_URL_BY_CHAIN_ID,
} from "./config";
import pausableAbi from "./Pausable.abi";

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
  public reason?: any;

  /**
   * Creates an instance of PauseSdkError.
   *
   * @param code - A string code representing the error type.
   * @param message - A descriptive error message.
   * @param reason - (Optional) The original error that triggered this error.
   */
  constructor(code: string, message: string, reason?: any) {
    super(message);
    this.code = code;
    this.reason = reason;
    Object.setPrototypeOf(this, PauseSdkError.prototype);
  }
}

/**
 * Interface representing the NEAR controller contract.
 */
interface ControllerContract extends Contract {
  delegate_pause: (args: any) => Promise<void>;
}

/**
 * Options for pausing a contract.
 */
export interface PauseOpts {
  /**
   * Network ID which identifies the blockchain network (e.g. NEAR or Ethereum).
   */
  networkId: string;
  /**
   * The chain ID. For Ethereum it should be a number; for NEAR a string is acceptable.
   */
  chainId: number | string;
  /**
   * The account ID of the contract to pause.
   */
  accountId: string;
  /**
   * Only applies to NEAR chains, controls the method that will be called by delegate.
   */
  methodName?: string;
  /**
   * Only applies to NEAR chains, controls the accountId that performs the call.
   */
  sender?: string;
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
export async function pause(opts: PauseOpts): Promise<void> {
  const { networkId, chainId, accountId, sender } = opts;
  const network = typeof chainId === "string" ? parseInt(chainId) : chainId;
  const isNearChain = isSupportedNearChainId(chainId);
  const isEvmChain = isSupportedEVMChainId(chainId);

  // Validate required parameters.
  if (!networkId || !chainId || !accountId || !(isNearChain || isEvmChain)) {
    throw new PauseSdkError(
      "INVALID_PARAMETERS",
      "Missing or invalid parameters provided",
    );
  }

  if (isNearChain) {
    // Derivation path with trailing `'` is required.
    const derivationPath = `${NEAR_DERIVATION_PATH}/${NEAR_INDEX_BY_CHAIN_ID[chainId]}'`;
    console.info(`Deriving public key from ${derivationPath}`);

    const { publicKey, secretKey } = parseSeedPhrase(
      NEAR_MNEMONIC,
      derivationPath,
    );
    const keypair = KeyPair.fromString(secretKey);
    console.info(`Public Key: ${publicKey}`);

    const [, pk] = publicKey.split(":");
    const implicitAccountId = Buffer.from(base58.decode(pk)).toString("hex");
    const signer = sender || implicitAccountId;
    console.info(`Signer: ${signer}`);

    await keyStore.setKey(chainId, signer, keypair);

    const nearConnection = await nearAPI.connect(
      chainId === MAINNET ? NEAR_MAINNET_CONFIG : NEAR_TESTNET_CONFIG,
    );

    const account = await nearConnection.account(signer);
    const contract = new nearAPI.Contract(account, NEAR_CONTROLLER_CONTRACT, {
      changeMethods: ["delegate_pause"],
      viewMethods: [],
      useLocalViewExecution: true,
    }) as ControllerContract;

    try {
      await contract.delegate_pause({
        args: {
          receiver_id: accountId,
          pause_method_name: opts.methodName || NEAR_DEFAULT_PAUSE_METHOD,
        },
      });
    } catch (e) {
      throw new PauseSdkError(
        "NEAR_PAUSE_ERROR",
        "Error occurred while executing delegate_pause on NEAR chain",
        e,
      );
    }
  }

  if (isEvmChain) {
    const rpcUrl = RPC_URL_BY_CHAIN_ID[chainId];
    const provider = new ethers.JsonRpcProvider(rpcUrl, network);

    const derivationPath = `${ETHEREUM_DERIVATION_PATH}/${ETH_INDEX_BY_CHAIN_ID[chainId]}`;
    console.info(`Deriving public key from ${derivationPath}`);

    const wallet = ethers.HDNodeWallet.fromMnemonic(
      ethers.Mnemonic.fromPhrase(ETHEREUM_MNEMONIC),
      derivationPath,
    ).connect(provider);
    console.info(`Signer: ${wallet.publicKey}`);

    const contract = new ethers.Contract(accountId, pausableAbi, wallet);
    try {
      await contract.pause();
    } catch (e) {
      throw new PauseSdkError(
        "EVM_PAUSE_ERROR",
        "Error occurred while executing pause on EVM chain",
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
      "INVALID_PARAMETERS",
      "Missing or invalid parameters provided",
    );
  }

  const rpcUrl = RPC_URL_BY_CHAIN_ID[chainId];
  const provider = new ethers.JsonRpcProvider(rpcUrl, chainId);
  const derivationPath = `${ETHEREUM_DERIVATION_PATH}/${ETH_INDEX_BY_CHAIN_ID[chainId]}`;
  console.info(`Deriving public key from ${derivationPath}`);

  const wallet = ethers.HDNodeWallet.fromMnemonic(
    ethers.Mnemonic.fromPhrase(ETHEREUM_MNEMONIC),
    derivationPath,
  ).connect(provider);
  console.info(`Signer: ${wallet.publicKey}`);

  const contract = new ethers.Contract(accountId, pausableAbi, wallet);
  try {
    await contract.unPause();
  } catch (e) {
    throw new PauseSdkError(
      "EVM_UNPAUSE_ERROR",
      "Error occurred while executing unpause on EVM chain",
      e,
    );
  }
}
