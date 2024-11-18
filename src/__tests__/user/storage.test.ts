import { Tusky } from "../../index";
import { cleanup, initInstance } from '../common';

let tusky: Tusky;

describe("Testing storage functions", () => {

  beforeAll(async () => {
    tusky = await initInstance(false);
  });

  afterAll(async () => {
    await cleanup(tusky);
  });

  it("should get user storage balance", async () => {
    const storage = await tusky.storage.get();
    expect(storage).toBeTruthy();
    expect(storage.storageTotal).toBeGreaterThan(0);
    expect(storage.storageAvailable).toBeGreaterThanOrEqual(0);
  });
});
