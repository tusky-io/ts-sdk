import { AkordWallet } from "@akord/crypto";
import { BadRequest } from "../errors/bad-request";
import { Akord } from "../index";
import { createFileLike } from "../types/file";
import { cleanup, initInstance, testDataPath, vaultCreate } from './common';
import { firstFileName } from './data/content';
import fs from "fs";
import { PNG } from "pngjs";
import { status } from "../constants";

let akord: Akord;
let wallet: AkordWallet;

jest.setTimeout(3000000);

describe("Testing file & folder upload functions", () => {

  let vaultId: string;
  let fileId: string;

  beforeAll(async () => {
    akord = await initInstance();

    const vault = await vaultCreate(akord, true);
    vaultId = vault.id;
  });

  afterAll(async () => {
    await cleanup(akord, vaultId);
  });

  it("should upload file from path", async () => {
    const file = await akord.file.upload(vaultId, testDataPath + firstFileName);
    const type = "image/png";
    expect(file.id).toBeTruthy();
    expect(file.vaultId).toEqual(vaultId);
    expect(file.parentId).toEqual(vaultId);
    expect(file.status).toEqual(status.ACTIVE);
    expect(file.name).toEqual(firstFileName);
    expect(file.mimeType).toEqual(type);
    fileId = file.id;
  });

  it("should download file", async () => {
    const response = await akord.file.download(fileId);
    const file = await createFileLike(testDataPath + firstFileName);
    expect(response).toEqual(await file.arrayBuffer());
  });

  it("should fail uploading an empty file", async () => {
    await expect(async () => {
      await akord.file.upload(vaultId, testDataPath + "empty-file.md");
    }).rejects.toThrow(BadRequest);
  });

  it("should upload a file buffer", async () => {
    const fileBuffer = fs.readFileSync(testDataPath + firstFileName);
    const type = "image/png";

    const file = await akord.file.upload(vaultId, fileBuffer, { name: firstFileName, mimeType: type });
    expect(file.id).toBeTruthy();
    expect(file.vaultId).toEqual(vaultId);
    expect(file.parentId).toEqual(vaultId);
    expect(file.status).toEqual(status.ACTIVE);
    expect(file.name).toEqual(firstFileName);
    expect(file.mimeType).toEqual(type);
  });

  it("should upload a file buffer without explicitly provided mime type", async () => {
    const fileBuffer = fs.readFileSync(testDataPath + firstFileName);
    const type = "image/png";

    const file = await akord.file.upload(vaultId, fileBuffer, { name: firstFileName });
    expect(file.id).toBeTruthy();
    expect(file.name).toEqual(firstFileName);
    expect(file.mimeType).toEqual(type);
  });

  it("should upload a file stream", async () => {
    const fileStream = fs.createReadStream(testDataPath + firstFileName);
    const type = "image/png";

    const file = await akord.file.upload(vaultId, fileStream, { name: firstFileName, mimeType: type });
    expect(file.id).toBeTruthy();
    expect(file.vaultId).toEqual(vaultId);
    expect(file.parentId).toEqual(vaultId);
    expect(file.status).toEqual(status.ACTIVE);
    expect(file.name).toEqual(firstFileName);
    expect(file.mimeType).toEqual(type);
  });

  it("should upload a file object", async () => {
    const fileObject = await createFileLike(testDataPath + firstFileName);
    const type = "image/png";
    const file = await akord.file.upload(vaultId, fileObject, { name: firstFileName });
    expect(file.id).toBeTruthy();
    expect(file.vaultId).toEqual(vaultId);
    expect(file.parentId).toEqual(vaultId);
    expect(file.status).toEqual(status.ACTIVE);
    expect(file.name).toEqual(firstFileName);
    expect(file.mimeType).toEqual(type);
  });

  it("should delete the file", async () => {
    await akord.file.delete(fileId);

    const file = await akord.file.get(fileId);
    expect(file.id).toBeTruthy();
    expect(file.vaultId).toEqual(vaultId);
    expect(file.parentId).toEqual(vaultId);
    expect(file.status).toEqual(status.DELETED);
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

// generate & save 11 MB pixel png file

const generateAndSavePixelFile = async (fileSizeMB: number, filePath: string) => {
  const totalBytes = fileSizeMB * 1024;
  const totalPixels = totalBytes / 4; // each pixel is 4 bytes (RGBA)
  const imageSize = Math.sqrt(totalPixels);
  let buffer = new Uint8Array(totalBytes);

  // fill the buffer with random pixel data
  for (let i = 0; i < totalBytes; i++) {
    buffer[i] = Math.floor(Math.random() * 256);
  }

  // create a PNG object
  const png = new PNG({
    width: imageSize,
    height: imageSize
  });

  // copy buffer data into the PNG data
  png.data = Buffer.from(buffer);

  // pack & save the PNG buffer
  await new Promise<void>((resolve, reject) => {
    const writeStream = fs.createWriteStream(filePath);
    png.pack().pipe(writeStream)
      .on('finish', () => {
        resolve();
      })
      .on('error', (err) => {
        reject(err);
      });
  });

}