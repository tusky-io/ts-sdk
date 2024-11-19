import { Tusky } from "../../index";
import { cleanup, folderCreate, initInstance, vaultCreate } from '../common';

let tusky: Tusky;

describe("Testing trash functions", () => {

  let trashId: string;
  let privateFolderId: string;
  let publicFolderId: string;

  beforeAll(async () => {
    tusky = await initInstance(true);
  });

  afterAll(async () => {
    await cleanup(tusky);
  });

  it("should get user trash", async () => {
    const trash = await tusky.trash.get();
    expect(trash).toBeTruthy();
    expect(trash.id).toBeTruthy();
    expect(trash.size).toEqual(0);
    trashId = trash.id;
  });

  it("should move private folder to trash & get trash content", async () => {
    const vault = await vaultCreate(tusky, true);
    const folder = await folderCreate(tusky, vault.id);
    privateFolderId = folder.id;
    await tusky.folder.delete(folder.id);
    const trashContent = await tusky.folder.listAll({ parentId: trashId });
    expect(trashContent).toBeTruthy();
    expect(trashContent.length).toEqual(1);
    expect(trashContent[0]).toBeTruthy();
    expect(trashContent[0].id).toEqual(folder.id);
    expect(trashContent[0].name).toEqual(folder.name);
  });

  it("should move public folder to trash & get trash content", async () => {
    const vault = await vaultCreate(tusky, false);
    const folder = await folderCreate(tusky, vault.id);
    publicFolderId = folder.id;
    await tusky.folder.delete(folder.id);
    const trashContent = await tusky.folder.listAll({ parentId: trashId });
    const privateFolder = await tusky.folder.get(privateFolderId);
    expect(trashContent).toBeTruthy();
    expect(trashContent.length).toEqual(2);
    expect(trashContent[0]).toBeTruthy();
    expect(trashContent[0].id).toEqual(folder.id);
    expect([folder.id, privateFolder.id]).toContain(trashContent[0].id);
    expect([folder.name, privateFolder.name]).toContain(trashContent[0].name);
    expect(trashContent[1]).toBeTruthy();
    expect([folder.id, privateFolder.id]).toContain(trashContent[1].id);
    expect([folder.name, privateFolder.name]).toContain(trashContent[1].name);
  });

  it("should empty trash", async () => {
    const trash = await tusky.trash.empty();
    expect(trash).toBeTruthy();
    expect(trash.id).toBeTruthy();
    expect(trash.size).toEqual(0);
  });
});