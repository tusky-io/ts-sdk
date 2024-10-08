import { Akord } from "../akord";
import { cleanup, initInstance, setupVault, vaultCreate } from "./common";
import faker from '@faker-js/faker';

let akord: Akord;

jest.setTimeout(3000000);

describe("Testing airdrop actions", () => {
  let vaultId: string;
  let airdropeeAddress: string;
  let airdropeeIdentityPrivateKey: string;
  let airdropeePassword: string;

  beforeAll(async () => {
    // set up private vault
    akord = await initInstance(false);

    const vault = await vaultCreate(akord, false);
    vaultId = vault.id;
  });

  describe("Vault access control tests", () => {
    it("should only list owner for all members of the vault", async () => {
      const members = await akord.vault.members(vaultId);

      expect(members).toBeTruthy();
      expect(members.length).toEqual(1);
      expect(members[0]).toBeTruthy();
    });

    it("should airdrop access with an expiration date", async () => {
      const role = "contributor";
      const expiresAt = new Date().getTime() + 24 * 60 * 60 * 1000;

      const { identityPrivateKey, password, membership } = await akord.vault.airdropAccess(vaultId, { expiresAt: expiresAt, role });
      expect(identityPrivateKey).toBeTruthy();
      expect(password).toBeTruthy();

      expect(membership).toBeTruthy();
      expect(membership.id).toBeTruthy();
      expect(membership.memberAddress).toBeTruthy();
      expect(membership.role).toEqual(role);
      expect(membership.expiresAt).toEqual(expiresAt.toString());
    });

    it("should airdrop access with user specified password and no expiration date", async () => {
      const role = "viewer";

      const password = faker.random.word();

      const { identityPrivateKey, membership } = await akord.vault.airdropAccess(vaultId, { password, role });
      expect(identityPrivateKey).toBeTruthy();

      expect(membership).toBeTruthy();
      expect(membership.id).toBeTruthy();
      expect(membership.memberAddress).toBeTruthy();
      expect(membership.role).toEqual(role);
      expect(membership.expiresAt).toBeFalsy();
      airdropeeAddress = membership.memberAddress;
      airdropeeIdentityPrivateKey = identityPrivateKey;
      airdropeePassword = password;
    });

    it("should get vault by airdropee", async () => {
      const memberAkord = await Akord
      .withWallet({ walletPrivateKey: airdropeeIdentityPrivateKey })
      .signIn();

      expect(memberAkord.address).toEqual(airdropeeAddress);

      await memberAkord.withEncrypter({ password: airdropeePassword, keystore: true });

      const vault = await memberAkord.vault.get(vaultId);
      expect(vault).toBeTruthy();
      expect(vault.name).toBeTruthy();
    });

    it("should list all members of the vault", async () => {
      const members = await akord.vault.members(vaultId);

      expect(members).toBeTruthy();
      expect(members.length).toEqual(3);
    });

    // it("should change access", async () => {
    //   await akord.vault.changeAccess(vaultId, "viewer");
    // });

    // it("should revoke access", async () => {
    //   await akord.vault.revokeAccess(vaultId);
    // });
  });
});