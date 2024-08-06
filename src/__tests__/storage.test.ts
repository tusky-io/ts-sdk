import { BadRequest } from "../errors/bad-request";
import { Akord } from "../index";
import { initInstance } from './common';


let akord: Akord;

jest.setTimeout(3000000);

const testIfProd = process.env.ENV === 'v2' ? test : test.skip;
const testIfDev = process.env.ENV === 'dev' ? test : test.skip;
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

describe("Testing storage functions", () => {

  beforeAll(async () => {
    akord = await initInstance();
  });

  it("should get storage balance", async () => {
    const storageBalance = await akord.storage.get();
    expect(storageBalance).toBeTruthy();
    expect(storageBalance.storageTotal).toBeGreaterThan(0);
    expect(storageBalance.storageTotal).toBeGreaterThan(0);
  });
});
