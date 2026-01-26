import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Tusky } from "../index";
import { initInstance, testDataPath } from './common';
import faker from '@faker-js/faker';
import { Forbidden } from '../errors/forbidden';
import { firstFileName } from './data/content';
import { promises as fs } from 'fs';

let tusky: Tusky;

const USDC_COIN = "0x2::coin::Coin<0xa1ec7fc00a6f40db9693ad1415d0c193ad3906494428cf252621037bd7117e29::usdc::USDC>"

describe(`Testing TGA functions`, () => {

  let vaultId: string;
  let vaultName: string;
  let membershipId: string;

  const memberRole = "viewer";
  const capacity = 50;

  beforeAll(async () => {
    tusky = await initInstance(false);
  });

  it("should create a vault with TGA", async () => {
    const name = faker.random.word();

    const vault = await tusky.vault.create(name, { whitelist: { token: USDC_COIN, memberRole: memberRole, capacity: capacity } });
    expect(vault).toBeTruthy();
    expect(vault.id).toBeTruthy();
    expect(vault.name).toEqual(name);
    expect(vault.whitelist).toBeTruthy();
    expect(vault.whitelist?.id).toBeTruthy();
    expect(vault.whitelist?.capId).toBeTruthy();
    expect(vault.whitelist?.tgaId).toBeTruthy();
    expect(vault.whitelist?.token).toEqual(USDC_COIN);
    expect(vault.whitelist?.memberRole).toEqual(memberRole);
    expect(vault.whitelist?.capacity).toEqual(capacity);
    vaultId = vault.id;
    vaultName = name;
  });

  it("should fail joining the whitelist by the user with an empty wallet", async () => {
    await expect(async () => {
      const random = new Ed25519Keypair();
      const whitelistTusky = await Tusky.init({ wallet: { keypair: random }, env: "local" });
      await whitelistTusky.auth.signIn();
      const membership = await whitelistTusky.vault.join(vaultId);
    }).rejects.toThrow(Forbidden);
  });

  it("should join the whitelist by the user with a wallet holding a required token", async () => {
    const keypair = Ed25519Keypair.deriveKeypair(process.env.TEST_WALLET_MNEMONIC as string)
    const whitelistTusky = await Tusky.init({ wallet: { keypair: keypair }, env: "local" });
    await whitelistTusky.auth.signIn();
    const membership = await whitelistTusky.vault.join(vaultId);
    expect(membership).toBeTruthy();
    expect(membership.role).toEqual(memberRole);
    membershipId = membership.id;

    const vault = await whitelistTusky.vault.get(vaultId);
    expect(vault.name).toEqual(vaultName);
  });

  it("should revoke user from the whitelist", async () => {
    await tusky.vault.revokeAccess(membershipId);
  });

  it("should upload file to the whitelist vault", async () => {
    const id = await tusky.file.upload(vaultId, testDataPath + firstFileName);
    const type = "image/png";
    const file = await tusky.file.get(id);
    expect(file.id).toBeTruthy();
    expect(file.vaultId).toEqual(vaultId);
    expect(file.name).toEqual(firstFileName);
    expect(file.mimeType).toEqual(type);

    const response = await tusky.file.arrayBuffer(file.id);
    const buffer = await fs.readFile(testDataPath + firstFileName);
    const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
    expect(response).toEqual(arrayBuffer);
    expect((<any>response).byteLength).toEqual((<any>arrayBuffer).byteLength);
  });
});