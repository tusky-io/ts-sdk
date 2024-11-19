require("dotenv").config();
import { Tusky, Env } from "../index";
import faker from '@faker-js/faker';
import { mockEnokiFlow } from "./auth";
import { EnokiSigner } from "./enoki/signer";
import { status } from "../constants";
import { stopServer } from "./server";
import { createWriteStream } from "fs";
import { PNG } from "pngjs";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { logger } from "../logger";

// check if the encrypted flag is present
export const isEncrypted = process.argv.includes('--encrypted');
export const LOG_LEVEL = "error";
export const ENV_TEST_RUN = (process.env.ENV || "dev") as Env;

export async function initInstance(encrypted = true): Promise<Tusky> {
  let tusky: Tusky;
  if (process.env.API_KEY) {
    console.log("--- API key flow");
    tusky = Tusky
      .withApiKey({ apiKey: process.env.API_KEY })
      .withLogger({ logLevel: LOG_LEVEL, logToFile: true })
      .withApi({ env: ENV_TEST_RUN })
  } else if (process.env.AUTH_PROVIDER) {
    console.log("--- mock Enoki flow");
    const { tokens, address, keyPair } = await mockEnokiFlow();
    tusky = Tusky
      .withOAuth({ authProvider: process.env.AUTH_PROVIDER as any, redirectUri: "http://localhost:3000" })
      .withLogger({ logLevel: LOG_LEVEL, logToFile: true })
      .withSigner(new EnokiSigner({ address: address, keypair: keyPair }))
      .withApi({ env: ENV_TEST_RUN });
  } else {
    const keypair = new Ed25519Keypair();
    tusky = Tusky
      .withWallet({ walletSigner: keypair })
      .withLogger({ logLevel: LOG_LEVEL, logToFile: true })
      .withApi({ env: ENV_TEST_RUN })
    await tusky.signIn();
  }
  if (encrypted) {
    const password = faker.random.word();
    await tusky.me.setupPassword(password);
    await tusky.withEncrypter({ password: password, keystore: true });
  }
  return tusky;
}

export async function setupVault(isEncrypted = true): Promise<string> {
  const tusky = await initInstance(isEncrypted);
  const vault = await vaultCreate(tusky, isEncrypted);
  return vault.id;
}

export async function cleanup(tusky?: Tusky, vaultId?: string): Promise<void> {
  jest.clearAllTimers();
  stopServer();
  logger.debug("Post test cleanup");
  try {
    if (tusky && vaultId) {
      const files = await tusky.file.listAll({ vaultId: vaultId });
      for (const file of files) {
        if (file.status !== status.DELETED) {
          await tusky.file.delete(file.id);
        }
        await tusky.file.deletePermanently(file.id);
      }
      const folders = await tusky.folder.listAll({ vaultId: vaultId });
      for (const folder of folders) {
        if (folder.status !== status.DELETED) {
          await tusky.folder.delete(folder.id);
        }
        await tusky.folder.deletePermanently(folder.id);
      }
      await new Promise((resolve) => setTimeout(resolve, 10000));
      await tusky.vault.delete(vaultId);
    }
  } catch(error) {
    logger.error("Post test cleanup failed");
    logger.error(error);
  }
}

export const vaultCreate = async (tusky: Tusky, encrypted: boolean = true) => {
  const name = faker.random.words();
  const { id } = await tusky.vault.create(name, { encrypted: encrypted });

  const vault = await tusky.vault.get(id);
  expect(vault.status).toEqual(status.ACTIVE);
  expect(vault.name).toEqual(name);
  return vault;
}

export const folderCreate = async (tusky: Tusky, vaultId: string, parentId?: string) => {
  const name = faker.random.words();
  const { id } = await tusky.folder.create(vaultId, name, { parentId: parentId });

  const folder = await tusky.folder.get(id);
  expect(folder.status).toEqual(status.ACTIVE);
  if (parentId) {
    expect(folder.parentId).toEqual(parentId);
  } else {
    expect(folder.parentId).toEqual(vaultId);
  }
  expect(folder.name).toEqual(name);
  return folder;
}

export const generateAndSavePixelFile = async (fileSizeMB: number, filePath: string) => {
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
    const writeStream = createWriteStream(filePath);
    png.pack().pipe(writeStream)
      .on('finish', () => {
        resolve();
      })
      .on('error', (err) => {
        reject(err);
      });
  });
}

export const testDataPath = "./src/__tests__/data/";
export const testDataGeneratedPath = "./src/__tests__/data/generated/";
export const testDataOutPath = "./src/__tests__/data/out";
