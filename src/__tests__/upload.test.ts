import { BadRequest } from "../errors/bad-request";
import { Akord, Auth } from "../index";
import { createFileLike } from "../types/file";
import { TESTING_ENV, cleanup, initInstance, setupVault, testDataPath, vaultCreate } from './common';
import { firstFileName } from './data/content';
import fs from "fs";

let akord: Akord;

jest.setTimeout(3000000);

describe("Testing file & folder upload functions", () => {

  let vaultId: string;
  let fileId: string;
  let fileUri: string;

  beforeEach(async () => {
    akord = await initInstance();
  });

  beforeAll(async () => {
    vaultId = await setupVault(true);
  });

  afterAll(async () => {
    await cleanup(akord, vaultId);
  });

  it("should upload file from path", async () => {
    const id = await akord.file.upload(vaultId, testDataPath + firstFileName)
    fileId = id;
    const file = await akord.file.get(id);
    console.log(file);
  });

  it("should download file from uri", async () => {
    const response = await akord.file.download(fileId);
    console.log(response);
  });

  it("should upload file from path", async () => {
    const id = await akord.file.upload(testDataPath + firstFileName, { vaultId: vaultId });
    const type = "image/png";
    expect(id).toBeTruthy();
    const file = await akord.file.get(id);
    expect(file.name).toEqual(firstFileName);
    expect(file.mimeType).toEqual(type);
  });

  it("should fail uploading an empty file", async () => {
    await expect(async () => {
      await akord.file.upload(testDataPath + "empty-file.md", { vaultId: vaultId });
    }).rejects.toThrow(BadRequest);
  });

  it("should upload a file buffer", async () => {
    const fileBuffer = fs.readFileSync(testDataPath + firstFileName);
    const type = "image/png";

    const id = await akord.file.upload(vaultId, fileBuffer, { name: firstFileName, mimeType: type });
    const file = await akord.file.get(id);
    expect(file.id).toBeTruthy();
    expect(file.name).toEqual(firstFileName);
    expect(file.mimeType).toEqual(type);
  });

  it("should upload a file buffer without explicitly provided mime type", async () => {
    const fileBuffer = fs.readFileSync(testDataPath + firstFileName);
    const type = "image/png";

    const id = await akord.file.upload(vaultId, fileBuffer, { name: firstFileName });
    const file = await akord.file.get(id);
    expect(file.id).toBeTruthy();
    expect(file.name).toEqual(firstFileName);
    expect(file.mimeType).toEqual(type);
  });

  it("should upload a file stream", async () => {
    const fileStream = fs.createReadStream(testDataPath + firstFileName);
    const type = "image/png";

    const id = await akord.file.upload(vaultId, fileStream, { name: firstFileName, mimeType: type });
    const file = await akord.file.get(id);
    expect(file.id).toBeTruthy();
    expect(file.name).toEqual(firstFileName);
    expect(file.mimeType).toEqual(type);
  });

  it("should upload a file object", async () => {
    const fileObject = await createFileLike(testDataPath + firstFileName);
    const type = "image/png";
    const id = await akord.file.upload(vaultId, fileObject, { name: firstFileName });
    const file = await akord.file.get(id);
    expect(file.id).toBeTruthy();
    expect(file.name).toEqual(firstFileName);
    expect(file.mimeType).toEqual(type);
  });

  // const batchSize = 10;
  // it(`should upload a batch of ${batchSize} files`, async () => {
  //   const fileName = "logo.png"

  //   const items = [] as any;
  //   for (let i = 0; i < batchSize; i++) {
  //     items.push({ file: testDataPath + fileName });
  //   }

  //   const { data, errors } = await akord.file.batchUpload(vaultId, items);

  //   expect(errors.length).toEqual(0);
  //   expect(data.length).toEqual(batchSize);
  // });
});