require("dotenv").config();
import { AkordWallet } from "@akord/crypto";
import { Akord, Auth } from "../index";
import faker from '@faker-js/faker';
import { email, password } from './data/test-credentials';
import { Env } from "../env";

export async function initInstance(): Promise<Akord> {
  if (process.env.API_KEY && process.env.BACKUP_PHRASE) {
    console.log("API KEY FLOW")
    Auth.configure({ env: process.env.ENV as any, apiKey: process.env.API_KEY });
    const wallet = await AkordWallet.importFromBackupPhrase(process.env.BACKUP_PHRASE);
    return new Akord({ encrypter: wallet, signer: wallet, debug: true, logToFile: true, env: process.env.ENV as any });
  } else if (process.env.PASSWORDLESS) {
    const wallet = await AkordWallet.create("password");
    Auth.configure({ env: 'carmella' });
    await Auth.signUpWithWallet(wallet);
    await Auth.signInWithWallet(wallet);
    return new Akord({ signer: wallet, encrypter: wallet, env: process.env.ENV as Env });
  } else {
    if (!password || !email) {
      throw new Error("Please configure Akord credentials: email, password.");
    }
    Auth.configure({ env: process.env.ENV as any });
    const { wallet } = await Auth.signIn(email, password);
    return new Akord({ encrypter: wallet, signer: wallet, debug: true, logToFile: true, env: process.env.ENV as any });
  }
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
  await Auth.signOut();
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
