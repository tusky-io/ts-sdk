require("dotenv").config();
import { Akord } from "../index";
import faker from '@faker-js/faker';

export const TESTING_ENV = "testnet";

export async function initInstance(): Promise<Akord> {
  console.log("API KEY FLOW")
  return new Akord({ debug: true, logToFile: true, env: process.env.ENV as any, apiKey: process.env.API_KEY });
}

export async function setupVault(isPublic = false): Promise<string> {
  const akord = await initInstance();
  const { vaultId } = await vaultCreate(akord, isPublic);
  return vaultId;
}

export async function cleanup(akord: Akord, vaultId: string): Promise<void> {
  if (vaultId) {
    await akord.vault.delete(vaultId);
  }
}

export const vaultCreate = async (akord: Akord, isPublic: boolean = false) => {
  const name = faker.random.words();
  //const termsOfAccess = faker.lorem.sentences();
  const { id } = await akord.vault.create(name, { public: isPublic });

  // const membership = await akord.membership.get(membershipId);
  // expect(membership.status).toEqual("ACCEPTED");
  // expect(membership.role).toEqual("OWNER");

  const vault = await akord.vault.get(id);
  expect(vault.status).toEqual("ACTIVE");
  expect(vault.name).toEqual(name);
  return vault;
}

export const folderCreate = async (akord: Akord, vaultId: string, parentId?: string) => {
  const name = faker.random.words();
  const { id } = await akord.folder.create(vaultId, name, { parentId: parentId });

  const folder = await akord.folder.get(id);
  expect(folder.status).toEqual("ACTIVE");
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
