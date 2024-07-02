import { Akord } from "../index";
import { initInstance, testDataPath, setupVault, folderCreate } from './common';
import { firstFileName } from './data/content';
import { createFileLike } from "../core/file";
import { NotFound } from "../errors/not-found";
let akord: Akord;

jest.setTimeout(3000000);

function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

describe("Testing vault delete process", () => {
  let vaultId: string;
  let folderId: string;
  let stackId: string;


  beforeEach(async () => {
    akord = await initInstance();
  });

  beforeAll(async () => {
    vaultId = await setupVault();
  });

  it("should create new folder", async () => {
    folderId = await folderCreate(akord, vaultId);
  });

  it("should create new stack", async () => {
    const type = "image/png";

    stackId = (await akord.stack.create(vaultId, testDataPath + firstFileName, { parentId: folderId })).stackId;

    expect(stackId).toBeTruthy();

    const stack = await akord.stack.get(stackId);
    expect(stack.uri).toBeTruthy();
    expect(stack.status).toEqual("ACTIVE");
    expect(stack.name).toEqual(firstFileName);
    expect(stack.parentId).toEqual(folderId);
    expect(stack.versions.length).toEqual(1);
    expect(stack.versions[0].name).toEqual(firstFileName);
    expect(stack.versions[0].type).toEqual(type);

    const { data } = await akord.stack.getVersion(stackId, 0);
    const file = await createFileLike(testDataPath + firstFileName);
    expect(data).toEqual(await file.arrayBuffer());
  });

  it("should delete vault", async () => {
    await akord.vault.delete(vaultId);
    await wait(15000); // wait for 15 seconds
  });

  it("should fail fetching stack from deleted vault", async () => {
    await expect(async () =>
      await akord.stack.get(stackId)
    ).rejects.toThrow(NotFound);
  });

  it("should fail fetching folder from deleted vault", async () => {
    await expect(async () =>
      await akord.folder.get(folderId)
    ).rejects.toThrow(NotFound);
  });
});