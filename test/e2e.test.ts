import { setDefaultResultOrder } from 'dns';
import { parseSeedPhrase } from 'near-seed-phrase';
import { KeyPair, NearAccount, Worker } from 'near-workspaces';
import { pause } from '../src';

setDefaultResultOrder('ipv4first'); // temp fix for node >v17

const mockSeedPhrase =
  'air minute wish amazing detect animal acoustic robot basket web brisk fragile';

describe('e2e', () => {
  let worker: Worker;
  let accounts: {
    root: NearAccount;
    controller: NearAccount;
    target: NearAccount;
    sender: NearAccount;
  };

  beforeEach(async () => {
    // Create sandbox
    worker = await Worker.init();

    // NOTE: the 2 bit is important here as it uses a separate keypair from mainnet/testnet
    const { secretKey } = parseSeedPhrase(mockSeedPhrase, "m/44'/397'/2'");

    // Deploy contract
    const root = worker.rootAccount;
    const target = await root.createSubAccount('target');
    const controller = await root.createSubAccount('controller');
    const sender = await root.createSubAccount('sender', {
      keyPair: KeyPair.fromString(secretKey as any),
    });

    await target.deploy('./test/artifacts/counter.wasm');

    await target.call(target, 'new', {
      pause_manager: controller.accountId,
    });

    // Get wasm file path from package.json test script in folder above
    await controller.deploy('./test/artifacts/aurora-controller-factory.wasm');

    await controller.call(controller, 'new', { dao: sender.accountId });

    // Save state for test runs, it is unique for each test
    accounts = { root, controller, target, sender };
  });

  afterEach(async () => {
    await worker.tearDown().catch((error) => {
      console.log('Failed to stop the Sandbox:', error);
    });
  });

  it('can deploy controller and target contract', async () => {
    const { controller } = accounts;
    const version = await controller.view<string>('version');

    expect(version).toBe('0.3.2');
  });

  it('can delegate_pause a deployed contract', async () => {
    const { controller, target, sender } = accounts;

    await expect(
      pause({
        networkId: 'near',
        chainId: 'local',
        accountId: target.accountId,
        target: controller.accountId,
        sender: sender.accountId,
        nodeUrl: worker.provider.connection.url,
      }),
    ).resolves.toBeUndefined();
  });
});
