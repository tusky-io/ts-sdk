require("dotenv").config();
import { Akord } from "../index";
import faker from '@faker-js/faker';
import { mockEnokiFlow } from "./auth";
import { EnokiSigner } from "./enoki/signer";
import { status } from "../constants";
import { stopServer } from "./server";
import { createWriteStream } from "fs";
import { PNG } from "pngjs";
import { DEFAULT_STORAGE } from "../auth/jwt";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";

export const TESTING_ENV = "testnet";

export async function initInstance(isPublic = true): Promise<Akord> {
  let akord: Akord;
  if (process.env.API_KEY) {
    console.log("--- API key flow");
    akord = Akord
      .withApiKey({ apiKey: process.env.API_KEY })
      .withLogger({ logLevel: "debug", logToFile: true })
      .withApi({ env: process.env.ENV as any })
  } else if (process.env.AUTH_PROVIDER) {
    console.log("--- mock Enoki flow");
    const { tokens, address, keyPair } = await mockEnokiFlow();
    akord = Akord
      .withOAuth({ authProvider: process.env.AUTH_PROVIDER as any, redirectUri: "http://localhost:3000" })
      .withLogger({ logLevel: "debug", logToFile: true })
      .withSigner(new EnokiSigner({ address: address, keypair: keyPair }))
      .withApi({ env: process.env.ENV as any })

    DEFAULT_STORAGE.setItem(`akord_testnet_access_token`, tokens.accessToken);
    DEFAULT_STORAGE.setItem(`akord_testnet_id_token`, tokens.idToken);
    if (tokens.refreshToken) {
      DEFAULT_STORAGE.setItem(`akord_testnet_refresh_token`, tokens.refreshToken);
    }
  } else {
    const keypair = new Ed25519Keypair();
    akord = Akord
      .withWallet({ walletSigner: keypair })
      .withLogger({ logLevel: "debug", logToFile: true })
      .withApi({ env: process.env.ENV as any })
    await akord.signIn();
  }
  if (!isPublic) {
    const password = faker.random.word();
    await akord.me.setupPassword(password);
    await akord.withEncrypter({ password: password, keystore: true });
  }
  return akord;
}

export async function setupVault(isPublic = false): Promise<string> {
  const akord = await initInstance(isPublic);
  const vault = await vaultCreate(akord, isPublic);
  return vault.id;
}

export async function cleanup(akord?: Akord, vaultId?: string): Promise<void> {
  jest.clearAllTimers();
  stopServer();
  if (akord && vaultId) {
    await akord.vault.deletePermanently(vaultId);
  }
}

export const vaultCreate = async (akord: Akord, isPublic: boolean = false) => {
  const name = faker.random.words();
  const { id } = await akord.vault.create(name, { public: isPublic });

  // const membership = await akord.membership.get(membershipId);
  // expect(membership.status).toEqual("ACCEPTED");
  // expect(membership.role).toEqual("OWNER");

  const vault = await akord.vault.get(id);
  expect(vault.status).toEqual(status.ACTIVE);
  expect(vault.name).toEqual(name);
  return vault;
}

export const folderCreate = async (akord: Akord, vaultId: string, parentId?: string) => {
  const name = faker.random.words();
  const { id } = await akord.folder.create(vaultId, name, { parentId: parentId });

  const folder = await akord.folder.get(id);
  expect(folder.status).toEqual(status.ACTIVE);
  if (parentId) {
    expect(folder.parentId).toEqual(parentId);
  } else {
    expect(folder.parentId).toEqual(vaultId);
  }
  expect(folder.name).toEqual(name);
  return id;
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
