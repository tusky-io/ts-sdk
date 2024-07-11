import { AkordWallet } from "@akord/crypto";
import { BadRequest } from "../errors/bad-request";
import { Akord, Auth } from "../index";
import { createFileLike } from "../types/file";
import { cleanup, initInstance, setupVault, testDataPath, vaultCreate } from './common';
import { firstFileName } from './data/content';
import fs from "fs";

let akord: Akord;
let wallet: AkordWallet;

jest.setTimeout(3000000);

describe("Testing file & folder upload functions", () => {

  let vaultId: string;
  let fileId: string;
  let fileUri: string;

  beforeAll(async () => {
    wallet = await AkordWallet.create("password");
    Auth.configure({ env: "carmella" });
    await Auth.signUpWithWallet(wallet);
    await Auth.signInWithWallet(wallet);
    akord = new Akord({ signer: wallet, encrypter: wallet, env: "carmella" });
    vaultId = (await vaultCreate(akord, true)).vaultId;
  });

  afterAll(async () => {
    await cleanup(vaultId);
  });
  
  // it("should upload file from path", async () => {
  //   const { uri, fileId: responseFileId } = await akord.file.upload(testDataPath + firstFileName, { cloud: true });
  //   fileId = responseFileId;
  //   fileUri = uri;
  // });

  // it("should download file from uri", async () => {
  //   const response = await akord.file.download(fileId);
  //   console.log(response);
  // });

  it("should upload file from path", async () => {
    // const file = await akord.file.upload(testDataPath + firstFileName, { vaultId: vaultId });
    // expect(file.id).toBeTruthy();
    // expect(file.blobId).toBeTruthy();
  });

  // it("should fail uploading an empty file", async () => {
  //   await expect(async () => {
  //     await akord.file.upload(testDataPath + "empty-file.md", { vaultId: vaultId });
  //   }).rejects.toThrow(BadRequest);
  // });

  // it("should create stack from file buffer", async () => {
  //   const fileBuffer = fs.readFileSync(testDataPath + firstFileName);
  //   const type = "image/png";

  //   const file = await akord.file.upload(fileBuffer, { name: firstFileName, mimeType: type, vaultId: vaultId });
  //   expect(file.id).toBeTruthy();
  //   expect(file.blobId).toBeTruthy();
  // });

  // it("should create stack from file buffer without explicitly provided mime type", async () => {
  //   const fileBuffer = fs.readFileSync(testDataPath + firstFileName);
  //   const type = "image/png";

  //   const file = await akord.file.upload(fileBuffer, { name: firstFileName, vaultId: vaultId });
  //   expect(file.id).toBeTruthy();
  //   expect(file.blobId).toBeTruthy();

  // });

  // it("should create stack from file stream", async () => {
  //   const fileStream = fs.createReadStream(testDataPath + firstFileName);
  //   const type = "image/png";

  //   const file = await akord.file.upload(fileStream, { vaultId: vaultId, name: firstFileName, mimeType: type });
  //   expect(file.id).toBeTruthy();
  //   expect(file.blobId).toBeTruthy();

  // });

  // it("should create stack from file object", async () => {
  //   const fileObject = await createFileLike(testDataPath + firstFileName);
  //   const file = await akord.file.upload(fileObject, { vaultId: vaultId, name: firstFileName });
  //   expect(file.id).toBeTruthy();
  //   expect(file.blobId).toBeTruthy();
  // });

  // const batchSize = 10;
  // it(`should upload a batch of ${batchSize} files`, async () => {
  //   const fileName = "logo.png"

  //   const items = [] as any;
  //   for (let i = 0; i < batchSize; i++) {
  //     items.push({ file: testDataPath + fileName, options: { cloud: true } });
  //   }

  //   const { data, errors } = await akord.file.batchUpload(items);

  //   expect(errors.length).toEqual(0);
  //   expect(data.length).toEqual(batchSize);
  // });
});