import { Akord } from "../../index";
import { cleanup, initInstance } from '../common';
import { apiKeyStatus } from '../../constants';

let akord: Akord;

describe("Testing api key functions", () => {

  beforeAll(async () => {
    akord = await initInstance(false);
  });

  afterAll(async () => {
    await cleanup(akord);
  });

  it("should generate new api key", async () => {
    const apiKey = await akord.apiKey.generate();
    console.log(apiKey)
    expect(apiKey).toBeTruthy();
    expect(apiKey.key).toBeTruthy();
    expect(apiKey.address).toBeTruthy();
    expect(apiKey.status).toEqual(apiKeyStatus.ACTIVE);
  });

  it("should revoke the api key", async () => {
    const apiKeys = await akord.apiKey.listAll();
    expect(apiKeys).toBeTruthy();
    expect(apiKeys.length).toBeGreaterThan(0);
    const apiKeyToRevoke = apiKeys[0].key;
    expect(apiKeyToRevoke).toBeTruthy();
    const revokedKey = await akord.apiKey.revoke(apiKeyToRevoke);

    expect(revokedKey).toBeTruthy();
    expect(revokedKey.status).toEqual(apiKeyStatus.REVOKED);
  });
});