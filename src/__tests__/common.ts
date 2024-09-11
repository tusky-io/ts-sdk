require("dotenv").config();
import { Akord } from "../index";
import faker from '@faker-js/faker';
import { mockEnokiFlow } from "./auth";
import EnokiSigner from "./enoki/signer";
import { status } from "../constants";
import { server } from "./server";

export const TESTING_ENV = "testnet";

export async function initInstance(): Promise<Akord> {
  if (process.env.API_KEY) {
    console.log("--- API key flow");
    return new Akord({ debug: true, logToFile: true, env: process.env.ENV as any, apiKey: process.env.API_KEY });
  } else {
    console.log("--- mock Enoki flow");
    const { jwt, address, keyPair } = await mockEnokiFlow();
    const signer = new EnokiSigner({ address: address, keypair: keyPair });
    return new Akord({ debug: true, logToFile: true, env: process.env.ENV as any, authTokenProvider: async () => jwt, signer: signer });
  }
}

export async function setupVault(isPublic = false): Promise<string> {
  const akord = await initInstance();
  const vault = await vaultCreate(akord, isPublic);
  return vault.id;
}

export async function cleanup(akord?: Akord, vaultId?: string): Promise<void> {
  jest.clearAllTimers();
  if (server) {
    server.close();
  }
  if (akord && vaultId) {
    await akord.vault.delete(vaultId);
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

export const testDataPath = "./src/__tests__/data/";
export const testDataOutPath = "./src/__tests__/data/out";
