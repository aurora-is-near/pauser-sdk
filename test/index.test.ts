import { pause, PauseSdkError, unpause } from '../src';

describe('pause', () => {
  it('should throw an INVALID_PARAMETERS error for pause with invalid input', async () => {
    await expect(
      pause({ networkId: 'ethereum', chainId: 1, accountId: '' }),
    ).rejects.toThrow(PauseSdkError);
  });
});

describe('unpause', () => {
  it('should throw an INVALID_PARAMETERS error for unpause with invalid input', async () => {
    await expect(
      unpause({ networkId: 'ethereum', chainId: 1, accountId: '' }),
    ).rejects.toThrow(PauseSdkError);
  });
});
