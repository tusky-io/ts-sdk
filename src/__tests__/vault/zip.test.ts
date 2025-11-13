import { faker } from "@faker-js/faker";
import { cleanup, initInstance, testDataPath } from "../common";
import { Tusky } from "../../tusky";
import { zipFileName } from "../data/content";

let tusky: Tusky;

jest.setTimeout(3000000);

// skipped for now as the process is async
describe.skip("Testing zip functions", () => {
  let vaultId: string;

  beforeAll(async () => {
    tusky = await initInstance(false);
    vaultId = (await tusky.vault.create(faker.random.words(), {
      encrypted: false,
    })).id;
    console.log("vaultId: " + vaultId);
  });

  afterAll(async () => {
    await cleanup(tusky, vaultId);
  });

  it("should upload zip from path", async () => {
    await new Promise(resolve => setTimeout(resolve, 1000));

    const uploadId = await tusky.zip.upload(vaultId, testDataPath + zipFileName);
    expect(uploadId).toBeTruthy();


    // wait for files to be uncompressed
    await new Promise(resolve => setTimeout(resolve, 5000));

    const files = await tusky.file.listAll({ uploadId: uploadId });
    expect(files).toBeTruthy();
    expect(files.length).toEqual(2);
    expect([files[0].name, files[1].name]).toContain("image_8100.jpg");
    expect([files[0].name, files[1].name]).toContain("image_8102.jpg");
  });
});