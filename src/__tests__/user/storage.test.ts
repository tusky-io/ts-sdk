import { Akord } from "../../index";
import { cleanup, initInstance } from '../common';


let akord: Akord;

jest.setTimeout(3000000);

describe("Testing storage functions", () => {

  beforeAll(async () => {
    akord = await initInstance(false);
  });

  afterAll(async () => {
    await cleanup(akord);
  });

  it("should get user storage balance", async () => {
    const storage = await akord.storage.get();
    expect(storage).toBeTruthy();
    expect(storage.storageTotal).toBeGreaterThan(0);
    expect(storage.storageAvailable).toBeGreaterThanOrEqual(0);
  });
});
