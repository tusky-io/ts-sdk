import { BadRequest } from "../../errors/bad-request";
import { Akord } from "../../index";
import { cleanup, generateAndSavePixelFile, initInstance, isEncrypted, testDataGeneratedPath, testDataPath, vaultCreate } from '../common';
import { firstFileName } from '../data/content';
import { createReadStream, promises as fs } from 'fs';
import { status } from "../../constants";
import { pathToReadable } from "../../types/node/file";

let akord: Akord;

jest.setTimeout(3000000);

describe(`Testing ${isEncrypted ? "private" : "public"} file upload functions`, () => {

  let vaultId: string;

  beforeAll(async () => {
    akord = await initInstance(isEncrypted);

    const vault = await vaultCreate(akord, isEncrypted);
    vaultId = vault.id;
  });

  afterAll(async () => {
    await cleanup(akord, vaultId);
  });

  it("should upload single-chunk file from path and download it", async () => {
    const id = await akord.file.upload(vaultId, testDataPath + firstFileName);
    const type = "image/png";
    const file = await akord.file.get(id);
    expect(file.id).toBeTruthy();
    expect(file.vaultId).toEqual(vaultId);
    expect(file.parentId).toEqual(vaultId);
    expect(file.status).toEqual(status.ACTIVE);
    expect(file.name).toEqual(firstFileName);
    expect(file.mimeType).toEqual(type);

    const response = await akord.file.arrayBuffer(file.id);
    const buffer = await fs.readFile(testDataPath + firstFileName);
    const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
    expect(response).toEqual(arrayBuffer);
  });

  it("should upload multi-chunk file from path and download it", async () => {
    const fileName = "11mb.png";
    await generateAndSavePixelFile(11, testDataGeneratedPath + fileName);
    const id = await akord.file.upload(vaultId, testDataGeneratedPath + fileName);

    const type = "image/png";
    const file = await akord.file.get(id);
    expect(file.id).toBeTruthy();
    expect(file.vaultId).toEqual(vaultId);
    expect(file.parentId).toEqual(vaultId);
    expect(file.status).toEqual(status.ACTIVE);
    expect(file.name).toEqual(fileName);
    expect(file.mimeType).toEqual(type);

    const response = await akord.file.arrayBuffer(file.id);
    const buffer = await fs.readFile(testDataGeneratedPath + fileName);
    const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
    expect(response).toEqual(arrayBuffer);
  });

  it("should fail uploading an empty file", async () => {
    await expect(async () => {
      await akord.file.upload(vaultId, testDataPath + "empty-file.md");
    }).rejects.toThrow(BadRequest);
  });

  it("should upload a file buffer", async () => {
    const buffer = await fs.readFile(testDataPath + firstFileName);
    const type = "image/png";

    const id = await akord.file.upload(vaultId, buffer, { name: firstFileName, mimeType: type });
    
    const file = await akord.file.get(id);
    expect(file.id).toBeTruthy();
    expect(file.vaultId).toEqual(vaultId);
    expect(file.parentId).toEqual(vaultId);
    expect(file.status).toEqual(status.ACTIVE);
    expect(file.name).toEqual(firstFileName);
    expect(file.mimeType).toEqual(type);
  });

  it("should upload a file buffer without provided mime type", async () => {
    const buffer = await fs.readFile(testDataPath + firstFileName);

    const id = await akord.file.upload(vaultId, buffer, { name: firstFileName });
    const file = await akord.file.get(id);
    expect(file.id).toBeTruthy();
    expect(file.name).toEqual(firstFileName);
  });

  it("should upload a file stream", async () => {
    const fileStream = createReadStream(testDataPath + firstFileName);
    const type = "image/png";

    const id = await akord.file.upload(vaultId, fileStream, { name: firstFileName, mimeType: type });
    const file = await akord.file.get(id);
    expect(file.id).toBeTruthy();
    expect(file.vaultId).toEqual(vaultId);
    expect(file.parentId).toEqual(vaultId);
    expect(file.status).toEqual(status.ACTIVE);
    expect(file.name).toEqual(firstFileName);
    expect(file.mimeType).toEqual(type);
  });

  it("should upload a file object", async () => {
    const fileObject = await pathToReadable(testDataPath + firstFileName);
    const type = "image/png";
    const id = await akord.file.upload(vaultId, fileObject, { name: firstFileName });
    const file = await akord.file.get(id);
    expect(file.id).toBeTruthy();
    expect(file.vaultId).toEqual(vaultId);
    expect(file.parentId).toEqual(vaultId);
    expect(file.status).toEqual(status.ACTIVE);
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
