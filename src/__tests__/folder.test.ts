import { Akord } from "../index";
import faker from '@faker-js/faker';
import { initInstance, folderCreate, cleanup, testDataPath, vaultCreate, isEncrypted } from './common';
import { BadRequest } from "../errors/bad-request";
import { firstFileName } from './data/content';
import { status } from "../constants";

let akord: Akord;

jest.setTimeout(3000000);

describe(`Testing ${isEncrypted ? "private" : "public"} folder functions`, () => {
  let vaultId: string;
  let rootFolderId: string;
  let subFolderId: string;

  beforeAll(async () => {
    akord = await initInstance(isEncrypted);

    const vault = await vaultCreate(akord, isEncrypted);
    vaultId = vault.id;
  });

  afterAll(async () => {
    await cleanup(akord, vaultId);
  });

  it("should create root folder", async () => {
    rootFolderId = await folderCreate(akord, vaultId);
  });

  it("should create a sub folder", async () => {
    subFolderId = await folderCreate(akord, vaultId, rootFolderId);
  });

  it("should create files in different folder levels and list them correctly", async () => {
    const id = await akord.file.upload(vaultId, testDataPath + firstFileName);
    const file = await akord.file.get(id);
    expect(file.id).toBeTruthy();
    expect(file.parentId).toEqual(vaultId);

    const rootFolderFileId = await akord.file.upload(vaultId, testDataPath + firstFileName, { parentId: rootFolderId });
    expect(rootFolderFileId).toBeTruthy();
    const rootFolderFile = await akord.file.get(rootFolderFileId);
    expect(rootFolderFile.parentId).toEqual(rootFolderId);

    const subFolderFileId = await akord.file.upload(vaultId, testDataPath + firstFileName, { parentId: subFolderId });
    expect(subFolderFileId).toBeTruthy();
    const subFolderFile = await akord.file.get(subFolderFileId);
    expect(subFolderFile.parentId).toEqual(subFolderId);

    const allVaultFiles = await akord.file.listAll({ vaultId: vaultId, parentId: undefined });
    expect(allVaultFiles?.length).toEqual(3);

    const vaultRootFiles = await akord.file.listAll({ vaultId: vaultId });
    expect(vaultRootFiles?.length).toEqual(1);
    expect(vaultRootFiles[0].id).toEqual(id);
    expect(vaultRootFiles[0].parentId).toEqual(vaultId);

    const rootFolderFiles = await akord.file.listAll({ parentId: rootFolderId });
    expect(rootFolderFiles?.length).toEqual(1);
    expect(rootFolderFiles[0].id).toEqual(rootFolderFileId);
    expect(rootFolderFiles[0].parentId).toEqual(rootFolderId);

    const subFolderFiles = await akord.file.listAll({ parentId: subFolderId });
    expect(subFolderFiles?.length).toEqual(1);
    expect(subFolderFiles[0].id).toEqual(subFolderFileId);
    expect(subFolderFiles[0].parentId).toEqual(subFolderId);

    // should delete a file and list active/deleted files corretly
    await akord.file.delete(subFolderFileId);
    const allFiles = await akord.file.listAll({ vaultId: vaultId, parentId: undefined });
    const activeFiles = await akord.file.listAll({ vaultId: vaultId, parentId: undefined, status: "active" });
    const deletedFiles = await akord.file.listAll({ vaultId: vaultId, parentId: undefined, status: "deleted" });
    expect(allFiles?.length).toEqual(3);
    expect(activeFiles?.length).toEqual(2);
    expect(deletedFiles?.length).toEqual(1);
  });

  it("should delete root folder", async () => {
    await akord.folder.delete(rootFolderId);

    const rootFolder = await akord.folder.get(rootFolderId);
    expect(rootFolder.status).toEqual(status.DELETED);
    const deletedFolders = await akord.folder.listAll({ vaultId: vaultId, parentId: undefined, status: "deleted" });
    expect(deletedFolders?.length).toEqual(1);

    // this part is async
    // const subFolder = await akord.folder.get(subFolderId);
    // expect(subFolder.status).toEqual(status.DELETED);
  });

  it("should fail adding new sub-folder to the deleted root folder", async () => {
    const name = faker.random.words();
    await expect(async () =>
      await akord.folder.create(vaultId, name, { parentId: rootFolderId })
    ).rejects.toThrow(BadRequest);
  });

  it("should restore root deleted", async () => {
    await akord.folder.restore(rootFolderId);

    const rootFolder = await akord.folder.get(rootFolderId);
    expect(rootFolder.status).toEqual(status.ACTIVE);

    // this part is async
    // const subFolder = await akord.folder.get(subFolderId);
    // expect(subFolder.status).toEqual(status.ACTIVE);
  });

  it("should list all root folders", async () => {
    const folders = await akord.folder.listAll({ vaultId });
    expect(folders?.length).toEqual(1);
    expect(folders[0]?.id).toEqual(rootFolderId);
  });

  it("should list all sub-folders of the root folder", async () => {
    const folders = await akord.folder.listAll({ parentId: rootFolderId });
    expect(folders?.length).toEqual(1);
    expect(folders[0]?.id).toEqual(subFolderId);
    expect(folders[0]?.parentId).toEqual(rootFolderId);
  });

  it("should fail deleting root folder permanently", async () => {
    await expect(async () =>
      await akord.folder.deletePermanently(rootFolderId)
    ).rejects.toThrow(BadRequest);
  });

  it("should delete root folder", async () => {
    await akord.folder.delete(rootFolderId);

    const rootFolder = await akord.folder.get(rootFolderId);
    expect(rootFolder.status).toEqual(status.DELETED);
  });

  it("should delete root folder permanently", async () => {
    await akord.folder.deletePermanently(rootFolderId);
  });
});