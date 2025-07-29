import { Tusky } from "../../index";
import { cleanup, initInstance } from '../common';

let tusky: Tusky;

describe("Testing quota functions", () => {

  beforeAll(async () => {
    tusky = await initInstance(false);
  });

  afterAll(async () => {
    await cleanup(tusky);
  });

  it("should get user quota", async () => {
    const quota = await tusky.quota.get();
    expect(quota).toBeTruthy();
    expect(quota.transactions).toBeGreaterThanOrEqual(0);
    expect(quota.bandwidth).toBeGreaterThanOrEqual(0);
    expect(quota.allowedTransactions).toBeGreaterThanOrEqual(0);
    expect(quota.allowedBandwidth).toBeGreaterThanOrEqual(0);
    expect(quota.transactionResetTime).toBeGreaterThanOrEqual(0);
    expect(quota.bandwidthResetTime).toBeGreaterThanOrEqual(0);
  });
});
