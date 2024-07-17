import { Akord, Auth } from "../index";
import faker from '@faker-js/faker';
import { initInstance, folderCreate, setupVault, cleanup, testDataPath, vaultCreate } from './common';
import { BadRequest } from "../errors/bad-request";
import { firstFileName } from "./data/content";
import { AkordWallet } from "@akord/crypto";

let akord: Akord;

jest.setTimeout(3000000);

describe("Testing folder functions", () => {
  let vaultId: string;
  let rootFolderId: string;
  let subFolderId: string;

  beforeEach(async () => {
    akord = await initInstance();
    const wallet = await AkordWallet.create("password");
    Auth.configure({ env: "carmella" });
    expect(wallet).toBeTruthy();
  });

  beforeAll(async () => {
    const akord = await initInstance();
    const { vaultId } = await vaultCreate(akord, true);
    return vaultId;
  });

  afterAll(async () => {
    await cleanup(vaultId);
  });

  it("should create root folder", async () => {
    rootFolderId = await folderCreate(akord, vaultId);
  });

  it("should create a sub folder", async () => {
    subFolderId = await folderCreate(akord, vaultId, rootFolderId);
  });

  it("should create stacks in different folder levels and list them correctly", async () => {
    const { id } = await akord.file.upload(testDataPath + firstFileName, { vaultId: vaultId });
    expect(id).toBeTruthy();

    const { id: rootFolderStackId } = await akord.file.upload(testDataPath + firstFileName, { vaultId: vaultId, parentId: rootFolderId });
    expect(rootFolderStackId).toBeTruthy();

    const { stackId: subFolderStackId } = await akord.file.upload(testDataPath + firstFileName, { vaultId: vaultId, parentId: subFolderId });
    expect(subFolderStackId).toBeTruthy();

    const allStacks = await akord.file.listAll(vaultId);
    expect(allStacks?.length).toEqual(3);

    const rootFolderStacks = await akord.file.listAll(vaultId, { parentId: rootFolderId });
    expect(rootFolderStacks?.length).toEqual(1);
    expect(rootFolderStacks[0].id).toEqual(rootFolderStackId);

    const subFolderStacks = await akord.file.listAll(vaultId, { parentId: subFolderId });
    expect(subFolderStacks?.length).toEqual(1);
    expect(subFolderStacks[0].id).toEqual(subFolderStackId);
  });

  it("should revoke root folder", async () => {
    await akord.folder.delete(rootFolderId);

    const rootFolder = await akord.folder.get(rootFolderId);
    expect(rootFolder.status).toEqual("DELETED");

    const subFolder = await akord.folder.get(subFolderId);
    expect(subFolder.status).toEqual("DELETED");
  });

  it("should fail adding new sub-folder to the revoked root folder", async () => {
    const name = faker.random.words();
    await expect(async () =>
      await akord.folder.create(vaultId, name, { parentId: rootFolderId })
    ).rejects.toThrow(BadRequest);
  });

  it("should restore root folder", async () => {
    await akord.folder.restore(rootFolderId);

    const rootFolder = await akord.folder.get(rootFolderId);
    expect(rootFolder.status).toEqual("ACTIVE");

    const subFolder = await akord.folder.get(subFolderId);
    expect(subFolder.status).toEqual("ACTIVE");
  });

  it("should list all root folders", async () => {
    const folders = await akord.folder.listAll(vaultId);
    expect(folders?.length).toEqual(1);
    expect(folders[0]?.id).toEqual(rootFolderId);
  });

  it("should list all sub-folders of the root folder", async () => {
    const folders = await akord.folder.listAll(vaultId, { parentId: rootFolderId });
    expect(folders?.length).toEqual(1);
    expect(folders[0]?.id).toEqual(subFolderId);
    expect(folders[0]?.parentId).toEqual(rootFolderId);
  });
});