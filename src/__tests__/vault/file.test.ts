import { BadRequest } from "../../errors/bad-request";
import { Tusky } from "../../index";
import { cleanup, initInstance, isEncrypted, testDataPath, vaultCreate } from '../common';
import { firstFileName } from '../data/content';
import { createReadStream, promises as fs } from 'fs';
import { status } from "../../constants";
import { pathToReadable } from "../../types/node/file";

let tusky: Tusky;

describe(`Testing ${isEncrypted ? "private" : "public"} file upload functions`, () => {

  let vaultId: string;

  beforeAll(async () => {
    tusky = await initInstance(isEncrypted);

    const vault = await vaultCreate(tusky, isEncrypted);
    vaultId = vault.id;
  });

  afterAll(async () => {
    await cleanup(tusky, vaultId);
  });

  it("should upload single-chunk file from path and download it", async () => {
    const id = await tusky.file.upload(vaultId, testDataPath + firstFileName);
    const type = "image/png";
    const file = await tusky.file.get(id);
    expect(file.id).toBeTruthy();
    expect(file.vaultId).toEqual(vaultId);
    expect(file.parentId).toEqual(vaultId);
    expect(file.status).toEqual(status.ACTIVE);
    expect(file.name).toEqual(firstFileName);
    expect(file.mimeType).toEqual(type);

    const response = await tusky.file.arrayBuffer(file.id);
    const buffer = await fs.readFile(testDataPath + firstFileName);
    const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
    expect(response).toEqual(arrayBuffer);
    expect((<any>response).byteLength).toEqual((<any>arrayBuffer).byteLength);
  });

  it.skip("should upload multi-chunk file from path and download it", async () => {
    const fileName = "11mb.png";
    const id = await tusky.file.upload(vaultId, testDataPath + fileName);

    const type = "image/png";
    const file = await tusky.file.get(id);
    expect(file.id).toBeTruthy();
    expect(file.vaultId).toEqual(vaultId);
    expect(file.parentId).toEqual(vaultId);
    expect(file.status).toEqual(status.ACTIVE);
    expect(file.name).toEqual(fileName);
    expect(file.mimeType).toEqual(type);

    const response = await tusky.file.arrayBuffer(file.id);
    const buffer = await fs.readFile(testDataPath + fileName);
    const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
    expect(response).toEqual(arrayBuffer);
    expect((<any>response).byteLength).toEqual((<any>arrayBuffer).byteLength);
  });

  it("should fail uploading an empty file", async () => {
    await expect(async () => {
      await tusky.file.upload(vaultId, testDataPath + "empty-file.md");
    }).rejects.toThrow(BadRequest);
  });

  it("should upload a file buffer", async () => {
    const buffer = await fs.readFile(testDataPath + firstFileName);
    const type = "image/png";

    const id = await tusky.file.upload(vaultId, buffer, { name: firstFileName, mimeType: type });
    
    const file = await tusky.file.get(id);
    expect(file.id).toBeTruthy();
    expect(file.vaultId).toEqual(vaultId);
    expect(file.parentId).toEqual(vaultId);
    expect(file.status).toEqual(status.ACTIVE);
    expect(file.name).toEqual(firstFileName);
    expect(file.mimeType).toEqual(type);
  });

  it("should upload a file buffer without provided mime type", async () => {
    const buffer = await fs.readFile(testDataPath + firstFileName);

    const id = await tusky.file.upload(vaultId, buffer, { name: firstFileName });
    const file = await tusky.file.get(id);
    expect(file.id).toBeTruthy();
    expect(file.name).toEqual(firstFileName);
  });

  it("should upload a file stream", async () => {
    const fileStream = createReadStream(testDataPath + firstFileName);
    const type = "image/png";

    const id = await tusky.file.upload(vaultId, fileStream, { name: firstFileName, mimeType: type });
    const file = await tusky.file.get(id);
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
    const id = await tusky.file.upload(vaultId, fileObject, { name: firstFileName });
    const file = await tusky.file.get(id);
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

  //   const { data, errors } = await tusky.file.batchUpload(vaultId, items);

  //   expect(errors.length).toEqual(0);
  //   expect(data.length).toEqual(batchSize);
  // });
});
