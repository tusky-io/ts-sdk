import { Akord, Auth } from "../index";
import faker from '@faker-js/faker';
import { initInstance, folderCreate, cleanup, testDataPath, vaultCreate } from './common';
import { BadRequest } from "../errors/bad-request";
import { firstFileName } from "./data/content";
import { AkordWallet } from "@akord/crypto";
import EnokiSigner from "../../signers/enoki/src";
import { Env } from "../env";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { mockEnokiFlow } from "./auth";

let akord: Akord;

jest.setTimeout(3000000);

describe("Testing folder functions", () => {
  let vaultId: string;
  let rootFolderId: string;
  let subFolderId: string;

  // beforeEach(async () => {
  //   akord = await initInstance();
  //   const wallet = await AkordWallet.create("password");
  //   //Auth.configure({ env: "local" });
  //   expect(wallet).toBeTruthy();
  // });

  beforeAll(async () => {
    // akord = await initInstance();

    const jwt = await mockEnokiFlow() as string;

    console.log(jwt)

    const keypair = Ed25519Keypair.generate();
    const address = keypair.toSuiAddress();

    // const { salt, address } = await validateJWTWithEnoki(jwt);

    // console.log("SALT: " + salt)
    // console.log("ADDRESS: " + address)

    Auth.configure({ env: 'local', authToken: jwt });
    const signer = new EnokiSigner({ address: address, keypair: keypair });

    akord = new Akord({ signer: signer, env: "local" });
    const vault = await vaultCreate(akord, true);
    vaultId = vault.id;
  });

  afterAll(async () => {
    // await cleanup(akord, vaultId);
  });

  it("should create root folder", async () => {
    rootFolderId = await folderCreate(akord, vaultId);
  });

  // it("should create a sub folder", async () => {
  //   subFolderId = await folderCreate(akord, vaultId, rootFolderId);
  // });

  // it("should create files in different folder levels and list them correctly", async () => {
  //   const { id } = await akord.file.upload(testDataPath + firstFileName, { vaultId: vaultId });
  //   expect(id).toBeTruthy();

  //   const { id: rootFolderStackId } = await akord.file.upload(testDataPath + firstFileName, { vaultId: vaultId, parentId: rootFolderId });
  //   expect(rootFolderStackId).toBeTruthy();

  //   const { id: subFolderStackId } = await akord.file.upload(testDataPath + firstFileName, { vaultId: vaultId, parentId: subFolderId });
  //   expect(subFolderStackId).toBeTruthy();

  //   const allStacks = await akord.file.listAll(vaultId, { parentId: undefined });
  //   expect(allStacks?.length).toEqual(3);

  //   const rootFolderStacks = await akord.file.listAll(vaultId, { parentId: rootFolderId });
  //   expect(rootFolderStacks?.length).toEqual(1);
  //   expect(rootFolderStacks[0].id).toEqual(rootFolderStackId);

  //   const subFolderStacks = await akord.file.listAll(vaultId, { parentId: subFolderId });
  //   expect(subFolderStacks?.length).toEqual(1);
  //   expect(subFolderStacks[0].id).toEqual(subFolderStackId);
  // });

  // it("should delete root folder", async () => {
  //   await akord.folder.delete(rootFolderId);

  //   const rootFolder = await akord.folder.get(rootFolderId);
  //   expect(rootFolder.status).toEqual("DELETED");

  //   // this part is async
  //   // const subFolder = await akord.folder.get(subFolderId);
  //   // expect(subFolder.status).toEqual("DELETED");
  // });

  // it("should fail adding new sub-folder to the deleted root folder", async () => {
  //   const name = faker.random.words();
  //   await expect(async () =>
  //     await akord.folder.create(vaultId, name, { parentId: rootFolderId })
  //   ).rejects.toThrow(BadRequest);
  // });

  // it("should restore root deleted", async () => {
  //   await akord.folder.restore(rootFolderId);

  //   const rootFolder = await akord.folder.get(rootFolderId);
  //   expect(rootFolder.status).toEqual("ACTIVE");

  //   const subFolder = await akord.folder.get(subFolderId);
  //   expect(subFolder.status).toEqual("ACTIVE");
  // });

  // it("should list all root folders", async () => {
  //   const folders = await akord.folder.listAll(vaultId);
  //   expect(folders?.length).toEqual(1);
  //   expect(folders[0]?.id).toEqual(rootFolderId);
  // });

  // it("should list all sub-folders of the root folder", async () => {
  //   const folders = await akord.folder.listAll(vaultId, { parentId: rootFolderId });
  //   expect(folders?.length).toEqual(1);
  //   expect(folders[0]?.id).toEqual(subFolderId);
  //   expect(folders[0]?.parentId).toEqual(rootFolderId);
  // });
});