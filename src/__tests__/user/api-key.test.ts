import { ApiKey, Tusky } from "../../index";
import { cleanup, initInstance } from '../common';
import { apiKeyStatus } from '../../constants';

let tusky: Tusky;

describe("Testing api key functions", () => {

  beforeAll(async () => {
    tusky = await initInstance(false);
  });

  afterAll(async () => {
    await cleanup(tusky);
  });

  it("should generate new api key", async () => {
    const apiKey = await tusky.apiKey.generate();
    console.log(apiKey)
    expect(apiKey).toBeTruthy();
    expect(apiKey.key).toBeTruthy();
    expect(apiKey.address).toBeTruthy();
    expect(apiKey.status).toEqual(apiKeyStatus.ACTIVE);
  });

  it("should revoke the api key", async () => {
    const apiKeys = await tusky.apiKey.listAll();
    expect(apiKeys).toBeTruthy();
    expect(apiKeys.length).toBeGreaterThan(0);
    const apiKeyToRevoke = apiKeys[0].key;
    expect(apiKeyToRevoke).toBeTruthy();
    await tusky.apiKey.revoke(apiKeyToRevoke);
    const apiKeysWithRevokedKey = await tusky.apiKey.listAll();
    const revokedKey = apiKeysWithRevokedKey.find((apiKey: ApiKey) => apiKey.key === apiKeyToRevoke);
    expect(revokedKey).toBeTruthy();
    expect(revokedKey!.status).toEqual(apiKeyStatus.REVOKED);
  });
});
