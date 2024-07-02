import { Akord, Auth } from "../index";
import { initInstance, testDataPath } from './common';
import { zipFileName } from './data/content';
import faker from "@faker-js/faker";

let akord: Akord;

jest.setTimeout(3000000);

describe("Testing zip functions", () => {
  let vaultId: string;

  beforeAll(async () => {
    akord = await initInstance();
    vaultId = (await akord.vault.create(faker.random.words(), {
      public: true,
      cloud: true
    })).vaultId;
    console.log("vaultId: " + vaultId)
  });

  afterAll(async () => {
    await akord.vault.delete(vaultId);
    await Auth.signOut();
  });

  it("should upload zip from path", async () => {
    await akord.zip.upload(vaultId, testDataPath + zipFileName);
  });
});
