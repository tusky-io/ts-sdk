import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Tusky } from "../index";
import { initInstance } from './common';
import faker from '@faker-js/faker';
import { SUI_COINS, SUI_TYPE } from '../index';
import { Forbidden } from '../errors/forbidden';

let tusky: Tusky;

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

    const vault = await tusky.vault.create(name, { whitelist: { token: { type: "COIN", address: SUI_COINS["USDC"] }, memberRole: memberRole, capacity: capacity } });
    expect(vault).toBeTruthy();
    expect(vault.id).toBeTruthy();
    expect(vault.name).toEqual(name);
    expect(vault.whitelist).toBeTruthy();
    expect(vault.whitelist?.id).toBeTruthy();
    expect(vault.whitelist?.capId).toBeTruthy();
    expect(vault.whitelist?.token).toEqual(SUI_TYPE["COIN"] + "<" + SUI_COINS["USDC"] + ">");
    expect(vault.whitelist?.memberRole).toEqual(memberRole);
    expect(vault.whitelist?.capacity).toEqual(capacity)
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
});