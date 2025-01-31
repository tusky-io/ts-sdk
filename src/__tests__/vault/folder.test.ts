import { Folder, Tusky } from "../../index";
import faker from '@faker-js/faker';
import { initInstance, folderCreate, cleanup, testDataPath, vaultCreate, isEncrypted } from '../common';
import { BadRequest } from "../../errors/bad-request";
import { firstFileName } from '../data/content';
import { status } from "../../constants";
import { createReadStream, promises as fs } from 'fs';

let tusky: Tusky;

describe(`Testing ${isEncrypted ? "private" : "public"} folder functions`, () => {
  let vaultId: string;
  let rootFolderId: string;
  let subFolderId: string;

  beforeAll(async () => {
    tusky = await initInstance(isEncrypted);

    const vault = await vaultCreate(tusky, isEncrypted);
    vaultId = vault.id;
  });

  afterAll(async () => {
    await cleanup(tusky, vaultId);
  });

  it("should create root folder", async () => {
    const rootFolder = await folderCreate(tusky, vaultId);
    rootFolderId = rootFolder.id;
  });

  it("should create a sub folder", async () => {
    const subFolder = await folderCreate(tusky, vaultId, rootFolderId);
    subFolderId = subFolder.id;
  });

  it("should create files in different folder levels and list them correctly", async () => {
    const id = await tusky.file.upload(vaultId, testDataPath + firstFileName);
    const file = await tusky.file.get(id);
    expect(file.id).toBeTruthy();
    expect(file.parentId).toEqual(vaultId);

    const rootFolderFileId = await tusky.file.upload(vaultId, testDataPath + firstFileName, { parentId: rootFolderId });
    expect(rootFolderFileId).toBeTruthy();
    const rootFolderFile = await tusky.file.get(rootFolderFileId);
    expect(rootFolderFile.parentId).toEqual(rootFolderId);

    const subFolderFileId = await tusky.file.upload(vaultId, testDataPath + firstFileName, { parentId: subFolderId });
    expect(subFolderFileId).toBeTruthy();
    const subFolderFile = await tusky.file.get(subFolderFileId);
    expect(subFolderFile.parentId).toEqual(subFolderId);

    const allVaultFiles = await tusky.file.listAll({ vaultId: vaultId });
    expect(allVaultFiles?.length).toEqual(3);

    const vaultRootFiles = await tusky.file.listAll({ parentId: vaultId });
    expect(vaultRootFiles?.length).toEqual(1);
    expect(vaultRootFiles[0].id).toEqual(id);
    expect(vaultRootFiles[0].parentId).toEqual(vaultId);

    const rootFolderFiles = await tusky.file.listAll({ parentId: rootFolderId });
    expect(rootFolderFiles?.length).toEqual(1);
    expect(rootFolderFiles[0].id).toEqual(rootFolderFileId);
    expect(rootFolderFiles[0].parentId).toEqual(rootFolderId);

    const subFolderFiles = await tusky.file.listAll({ parentId: subFolderId });
    expect(subFolderFiles?.length).toEqual(1);
    expect(subFolderFiles[0].id).toEqual(subFolderFileId);
    expect(subFolderFiles[0].parentId).toEqual(subFolderId);

    // should delete a file and list active/deleted files corretly
    await tusky.file.delete(subFolderFileId);
    const allFiles = await tusky.file.listAll({ vaultId: vaultId });
    const activeFiles = await tusky.file.listAll({ vaultId: vaultId, status: "active" });
    const deletedFiles = await tusky.file.listAll({ vaultId: vaultId, status: "deleted" });
    expect(allFiles?.length).toEqual(3);
    expect(activeFiles?.length).toEqual(2);
    expect(deletedFiles?.length).toEqual(1);
  });

  it("should delete root folder", async () => {
    await tusky.folder.delete(rootFolderId);

    const rootFolder = await tusky.folder.get(rootFolderId);
    expect(rootFolder.status).toEqual(status.DELETED);

    // this part is async
    // const subFolder = await tusky.folder.get(subFolderId);
    // expect(subFolder.status).toEqual(status.DELETED);
  });

  it("should fail adding new sub-folder to the deleted root folder", async () => {
    const name = faker.random.words();
    await expect(async () =>
      await tusky.folder.create(vaultId, name, { parentId: rootFolderId })
    ).rejects.toThrow(BadRequest);
  });

  it("should restore root deleted", async () => {
    await tusky.folder.restore(rootFolderId);

    const rootFolder = await tusky.folder.get(rootFolderId);
    expect(rootFolder.status).toEqual(status.ACTIVE);

    // this part is async
    // const subFolder = await tusky.folder.get(subFolderId);
    // expect(subFolder.status).toEqual(status.ACTIVE);
  });

  it("should list all root folders", async () => {
    const folders = await tusky.folder.listAll({ parentId: vaultId });
    expect(folders?.length).toEqual(1);
    expect(folders[0]?.id).toEqual(rootFolderId);
  });

  it("should list all sub-folders of the root folder", async () => {
    const folders = await tusky.folder.listAll({ parentId: rootFolderId });
    expect(folders?.length).toEqual(1);
    expect(folders[0]?.id).toEqual(subFolderId);
    expect(folders[0]?.parentId).toEqual(rootFolderId);
  });

  it("should fail deleting root folder permanently", async () => {
    await expect(async () =>
      await tusky.folder.deletePermanently(rootFolderId)
    ).rejects.toThrow(BadRequest);
  });
});

describe(`Testing ${isEncrypted ? "private" : "public"} folder upload functions`, () => {
  beforeAll(async () => {
    tusky = await initInstance(isEncrypted);
  });

  it("should upload folder with its contents and keep the right structure", async () => {
    const vault = await vaultCreate(tusky, isEncrypted);
    await tusky.folder.upload(vault.id, testDataPath + "folder-structure", { includeRootFolder: true });
    const files = await tusky.file.listAll({ vaultId: vault.id });
    expect(files).toBeTruthy();
    expect(files.length).toEqual(4);
    const folders = await tusky.folder.listAll({ vaultId: vault.id });
    expect(folders).toBeTruthy();
    expect(folders.length).toEqual(4);
  });

  it("should upload folder with its contents and keep the right structure", async () => {
    const vault = await vaultCreate(tusky, isEncrypted);
    await tusky.folder.upload(vault.id, testDataPath + "folder-structure", { includeRootFolder: false });
    const files = await tusky.file.listAll({ vaultId: vault.id });
    expect(files).toBeTruthy();
    expect(files.length).toEqual(4);
    const folders = await tusky.folder.listAll({ vaultId: vault.id });
    expect(folders).toBeTruthy();
    expect(folders.length).toEqual(3);
  });

  it("should upload folder to parent folder with its contents and keep the right structure", async () => {
    const vault = await vaultCreate(tusky, isEncrypted);
    const parentFolder = await folderCreate(tusky, vault.id);
    await tusky.folder.upload(vault.id, testDataPath + "folder-structure", { includeRootFolder: false, parentId: parentFolder.id });
    const files = await tusky.file.listAll({ vaultId: vault.id });
    expect(files).toBeTruthy();
    expect(files.length).toEqual(4);
    expect(files.map((file) => file.parentId)).toContain(parentFolder.id);
    for (let file of files) {
      const response = await tusky.file.arrayBuffer(file.id);
      const buffer = await fs.readFile(testDataPath + firstFileName);
      const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
      expect(response).toEqual(arrayBuffer);
      expect((<any>response).byteLength).toEqual((<any>arrayBuffer).byteLength);
    }

    const folders = await tusky.folder.listAll({ vaultId: vault.id });
    expect(folders).toBeTruthy();
    expect(folders.length).toEqual(4);
    expect(folders.map((folder) => folder.parentId)).toContain(parentFolder.id);
  });

  it("should upload folder to parent folder with its contents including hidden files", async () => {
    const vault = await vaultCreate(tusky, isEncrypted);
    const parentFolder = await folderCreate(tusky, vault.id);
    await tusky.folder.upload(vault.id, testDataPath + "folder-structure", { skipHidden: false, parentId: parentFolder.id });
    const files = await tusky.file.listAll({ vaultId: vault.id });
    expect(files).toBeTruthy();
    expect(files.length).toEqual(5);
    expect(files.map((file) => file.parentId)).toContain(parentFolder.id);

    const folders = await tusky.folder.listAll({ vaultId: vault.id });
    expect(folders).toBeTruthy();
    expect(folders.length).toEqual(4);
    expect(folders.map((folder) => folder.parentId)).toContain(parentFolder.id);
  });
});