import { Akord } from "../index";
import faker from '@faker-js/faker';
import { initInstance, testDataPath, testDataOutPath, setupVault, cleanup } from './common';
import { firstFileName, secondFileName } from './data/content';
import { createFileLike } from "../core/file";
import fs from "fs";
import { BadRequest } from "../errors/bad-request";
import { PNG } from "pngjs";

let akord: Akord;

jest.setTimeout(3000000);

describe("Testing stack functions", () => {
  let vaultId: string;
  let stackId: string;

  beforeEach(async () => {
    akord = await initInstance();
  });

  beforeAll(async () => {
    vaultId = await setupVault();
  });

  afterAll(async () => {
    await cleanup(vaultId);
  });

  it("should create stack from path", async () => {
    const { stackId, uri } = await akord.stack.create(vaultId, testDataPath + firstFileName);
    expect(stackId).toBeTruthy();
    expect(uri).toBeTruthy();

    const stack = await akord.stack.get(stackId);
    expect(stack.uri).toBeTruthy();
    expect(stack.status).toEqual("ACTIVE");
    expect(stack.name).toEqual(firstFileName);
    expect(stack.versions.length).toEqual(1);
    expect(stack.versions[0].name).toEqual(firstFileName);

    const { data } = await akord.stack.getVersion(stack.id, 0);
    const file = await createFileLike(testDataPath + firstFileName);
    expect(stack.versions[0].type).toEqual(file.type);
    expect(data).toEqual(await file.arrayBuffer());
  });

  it("should fail uploading an empty file", async () => {
    await expect(async () => {
      await akord.stack.create(vaultId, testDataPath + "empty-file.md");
    }).rejects.toThrow(BadRequest);
  });

  it("should create stack from file buffer", async () => {
    const fileBuffer = fs.readFileSync(testDataPath + firstFileName);
    const type = "image/png";

    const { stackId, uri } = await akord.stack.create(vaultId, fileBuffer, { name: firstFileName, mimeType: type });
    expect(stackId).toBeTruthy();
    expect(uri).toBeTruthy();

    const stack = await akord.stack.get(stackId);
    expect(stack.uri).toBeTruthy();
    expect(stack.status).toEqual("ACTIVE");
    expect(stack.name).toEqual(firstFileName);
    expect(stack.versions.length).toEqual(1);
    expect(stack.versions[0].name).toEqual(firstFileName);
    expect(stack.versions[0].type).toEqual(type);

    const { data } = await akord.stack.getVersion(stackId, 0);
    const file = await createFileLike(testDataPath + firstFileName);
    expect(data).toEqual(await file.arrayBuffer());
  });

  it("should create stack from file buffer without explicitly provided mime type", async () => {
    const fileBuffer = fs.readFileSync(testDataPath + firstFileName);
    const type = "image/png";

    const { stackId, uri } = await akord.stack.create(vaultId, fileBuffer, { name: firstFileName });
    expect(stackId).toBeTruthy();
    expect(uri).toBeTruthy();

    const stack = await akord.stack.get(stackId);
    expect(stack.uri).toBeTruthy();
    expect(stack.status).toEqual("ACTIVE");
    expect(stack.name).toEqual(firstFileName);
    expect(stack.versions.length).toEqual(1);
    expect(stack.versions[0].name).toEqual(firstFileName);
    expect(stack.versions[0].type).toEqual(type);

    const { data } = await akord.stack.getVersion(stackId, 0);
    const file = await createFileLike(testDataPath + firstFileName);
    expect(data).toEqual(await file.arrayBuffer());
  });

  it("should create stack from file stream", async () => {
    const fileStream = fs.createReadStream(testDataPath + firstFileName);
    const type = "image/png";

    const { stackId, uri } = await akord.stack.create(vaultId, fileStream, { name: firstFileName, mimeType: type });
    expect(stackId).toBeTruthy();
    expect(uri).toBeTruthy();

    const stack = await akord.stack.get(stackId);
    expect(stack.uri).toBeTruthy();
    expect(stack.status).toEqual("ACTIVE");
    expect(stack.name).toEqual(firstFileName);
    expect(stack.versions.length).toEqual(1);
    expect(stack.versions[0].name).toEqual(firstFileName);
    expect(stack.versions[0].type).toEqual(type);

    const { data } = await akord.stack.getVersion(stackId, 0);
    const file = await createFileLike(testDataPath + firstFileName);
    expect(data).toEqual(await file.arrayBuffer());
  });

  it("should create stack from file object", async () => {
    const file = await createFileLike(testDataPath + firstFileName);

    stackId = (await akord.stack.create(vaultId, file)).stackId;

    const stack = await akord.stack.get(stackId);
    expect(stack.uri).toBeTruthy();
    expect(stack.status).toEqual("ACTIVE");
    expect(stack.name).toEqual(firstFileName);
    expect(stack.versions.length).toEqual(1);
    expect(stack.versions[0].name).toEqual(firstFileName);
    expect(stack.versions[0].type).toEqual(file.type);

    const { data } = await akord.stack.getVersion(stackId, 0);
    expect(data).toEqual(await file.arrayBuffer());
  });


  it("should download the stack", async () => {
    const { name, data } = await akord.stack.getVersion(stackId, 0);
    await akord.stack.download(stackId, 0, { path: testDataOutPath });
    const file = await createFileLike(`${testDataOutPath}/${name}`);

    expect(data).toEqual(await file.arrayBuffer());
  });

  it("should upload new revision", async () => {
    const { uri } = await akord.stack.uploadRevision(stackId, testDataPath + secondFileName);
    expect(uri).toBeTruthy();

    const stack = await akord.stack.get(stackId);
    expect(stack.uri).toBeTruthy();
    expect(stack.versions.length).toEqual(2);
    expect(stack.versions[0].name).toEqual(firstFileName);
    expect(stack.versions[1].name).toEqual(secondFileName);

    const { data } = await akord.stack.getVersion(stackId);
    const file = await createFileLike(testDataPath + secondFileName);
    expect(stack.versions[1].type).toEqual(file.type);
    expect(data).toEqual(await file.arrayBuffer());

    const firstFile = await createFileLike(testDataPath + firstFileName);
    const { data: firstFileData } = await akord.stack.getVersion(stackId, 0);
    expect(firstFileData).toEqual(await firstFile.arrayBuffer());
  });

  it("should rename the stack", async () => {
    const name = faker.random.words();

    await akord.stack.rename(stackId, name);

    const stack = await akord.stack.get(stackId);
    expect(stack.uri).toBeTruthy();
    expect(stack.name).toEqual(name);
    expect(stack.versions.length).toEqual(2);
    expect(stack.versions[0].name).toEqual(firstFileName);
    expect(stack.versions[1].name).toEqual(secondFileName);

    const firstFile = await createFileLike(testDataPath + firstFileName);
    const { data: firstFileData } = await akord.stack.getVersion(stackId, 0);
    expect(firstFileData).toEqual(await firstFile.arrayBuffer());

    const secondFile = await createFileLike(testDataPath + secondFileName);

    const { data: secondFileData } = await akord.stack.getVersion(stackId);
    expect(secondFileData).toEqual(await secondFile.arrayBuffer());
  });

  it("should revoke the stack", async () => {
    await akord.stack.revoke(stackId)
    const stack = await akord.stack.get(stackId);
    expect(stack.status).toEqual("REVOKED");
  });

  it("should restore the stack", async () => {
    await akord.stack.restore(stackId)
    const stack = await akord.stack.get(stackId);
    expect(stack.status).toEqual("ACTIVE");
  });

  it("should upload large file (bigger than chunk size)", async () => {
    const name = "pixels.png";
    const type = "image/png";

    // generate & save 11 MB pixel png file
    await generateAndSavePixelFile(11, testDataPath + name);

    const { stackId, uri } = await akord.stack.create(vaultId, testDataPath + name);
    expect(stackId).toBeTruthy();
    expect(uri).toBeTruthy();

    const stack = await akord.stack.get(stackId);
    expect(stack.uri).toBeTruthy();
    expect(stack.status).toEqual("ACTIVE");
    expect(stack.name).toEqual(name);
    expect(stack.versions.length).toEqual(1);
    expect(stack.versions[0].name).toEqual(name);
    expect(stack.versions[0].type).toEqual(type);
    expect(stack.versions[0].numberOfChunks).toBeGreaterThan(1);

    const { data } = await akord.stack.getVersion(stackId, 0);
    const pixelFile = await createFileLike(testDataPath + name);
    expect(data).toEqual(await pixelFile.arrayBuffer());
  });
});

const generateAndSavePixelFile = async (fileSizeMB: number, filePath: string) => {
  const totalBytes = fileSizeMB * 1024 * 1024;
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
