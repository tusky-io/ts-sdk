import { Akord } from "../index";
import faker from '@faker-js/faker';
import { initInstance, folderCreate, cleanup, testDataPath, vaultCreate } from './common';
import { BadRequest } from "../errors/bad-request";
import { firstFileName } from './data/content';
import { status } from "../constants";

let akord: Akord;

jest.setTimeout(3000000);

describe("Testing folder functions", () => {
  let vaultId: string;
  let rootFolderId: string;
  let subFolderId: string;

  beforeAll(async () => {
    akord = await initInstance();

    const vault = await vaultCreate(akord, true);
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
    const { id, parentId } = await akord.file.upload(vaultId, testDataPath + firstFileName);
    expect(id).toBeTruthy();
    expect(parentId).toEqual(vaultId);

    const { id: rootFolderFileId, parentId: rootFolderFileParentId } = await akord.file.upload(vaultId, testDataPath + firstFileName, { parentId: rootFolderId });
    expect(rootFolderFileId).toBeTruthy();
    expect(rootFolderFileParentId).toEqual(rootFolderId);

    const { id: subFolderFileId, parentId: subFolderFileParentId } = await akord.file.upload(vaultId, testDataPath + firstFileName, { parentId: subFolderId });
    expect(subFolderFileId).toBeTruthy();
    expect(subFolderFileParentId).toEqual(subFolderId);

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
  });

  it("should delete root folder", async () => {
    await akord.folder.delete(rootFolderId);

    const rootFolder = await akord.folder.get(rootFolderId);
    expect(rootFolder.status).toEqual(status.DELETED);

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

    const subFolder = await akord.folder.get(subFolderId);
    expect(subFolder.status).toEqual(status.ACTIVE);
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