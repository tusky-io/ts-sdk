import { Akord } from "../index";
import { initInstance } from './common';
import { apiKeyStatus } from '../constants';

let akord: Akord;

jest.setTimeout(3000000);

describe("Testing me functions", () => {

  beforeAll(async () => {
    akord = await initInstance();
  });

  it("should generate new api key", async () => {
    const apiKeys = await akord.apiKey.get();
    expect(apiKeys).toBeTruthy();
    expect(apiKeys[0]).toBeTruthy();
    expect(apiKeys[0].key).toBeTruthy();
    expect(apiKeys[0].address).toBeTruthy();
    expect(apiKeys[0].status).toEqual(apiKeyStatus.ACTIVE);
  });

  it("should revoke the api key", async () => {
    const apiKeys = await akord.apiKey.get();
    expect(apiKeys).toBeTruthy();
    expect(apiKeys.length).toBeGreaterThan(0);
    const apiKeyToRevoke = apiKeys[0].key;
    expect(apiKeyToRevoke).toBeTruthy();
    const revokedKey = await akord.apiKey.revoke(apiKeyToRevoke);

    expect(revokedKey).toBeTruthy();
    expect(revokedKey.status).toEqual(apiKeyStatus.REVOKED);
  });
});