# Pause SDK

The Pause SDK provides a unified interface for pausing and unpausing smart contracts on supported blockchain networks (NEAR and Ethereum). This SDK leverages structured error handling so that consumers can programmatically inspect error codes and reasons.

## Features

- **Pause Functionality**:

  - **NEAR Chains**: Uses a delegated pause approach by calling the `delegate_pause` method on the controller contract.
  - **Ethereum Chains**: Directly calls the `pause` method on the contract.

- **Unpause Functionality** (Ethereum Only):

  - Unpauses contracts on Ethereum networks by calling the `unPause` method.

- **Structured Errors**:  
  All errors are thrown as instances of `PauseSdkError` with a code and an optional underlying error reason.

## Environment Variables & Configuration

The SDK expects certain environment variables (or configuration values) to be set up. These are generally provided via your configuration module (`./config`). Below is a summary of the key environment variables:

- **NEAR_MNEMONIC**  
  A mnemonic phrase used to derive keys for NEAR operations.

- **ETHEREUM_MNEMONIC**  
  A mnemonic phrase used to derive Ethereum wallet keys.

Ensure that these variables are set in your environment or configuration file so that the SDK can correctly derive keys and connect to the networks.

## Usage

### Importing and Calling Pause

```ts
import { pause, PauseSdkError, PauseOpts } from "@aurora-is-near/pause-sdk";

const pauseOpts: PauseOpts = {
  networkId: "NEAR", // or the corresponding SupportedChainId value
  chainId: "testnet", // or the appropriate chain id (number or string)
  accountId: "example-contract.testnet",
  methodName: "customPauseMethod", // (optional, NEAR only)
  sender: "example-sender.testnet", // (optional, NEAR only)
};

async function runPause() {
  try {
    await pause(pauseOpts);
    console.log("Contract paused successfully.");
  } catch (error) {
    if (error instanceof PauseSdkError) {
      console.error(`Pause failed: ${error.code} - ${error.message}`);
    } else {
      console.error("An unexpected error occurred", error);
    }
  }
}

runPause();
```
