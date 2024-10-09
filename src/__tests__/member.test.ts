import { Akord } from "../akord";
import { Forbidden } from "../errors/forbidden";
import { cleanup, initInstance, setupVault, vaultCreate } from "./common";
import faker from '@faker-js/faker';

let akord: Akord;

jest.setTimeout(3000000);

const isPublic = false;

describe("Testing airdrop actions", () => {
  let vaultId: string;
  let airdropeeAddress: string;
  let airdropeeMemberId: string;
  let airdropeeIdentityPrivateKey: string;
  let airdropeePassword: string;

  beforeAll(async () => {
    // set up private vault
    akord = await initInstance(isPublic);

    const vault = await vaultCreate(akord, isPublic);
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
      isPublic ? expect(password).toBeFalsy() : expect(password).toBeTruthy();

      expect(membership).toBeTruthy();
      expect(membership.id).toBeTruthy();
      expect(membership.memberAddress).toBeTruthy();
      expect(membership.role).toEqual(role);
      expect(membership.expiresAt).toEqual(expiresAt.toString());
      isPublic ? expect(membership.keys).toBeFalsy() : expect(membership.keys).toBeTruthy();
    });

    it("should airdrop access with user specified password and no expiration date", async () => {
      const role = "contributor";

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
      airdropeeMemberId = membership.id;
    });

    it("should get vault by airdropee", async () => {
      const memberAkord = await Akord
      .withWallet({ walletPrivateKey: airdropeeIdentityPrivateKey })
      .signIn();

      expect(memberAkord.address).toEqual(airdropeeAddress);

      await memberAkord.withEncrypter({ password: airdropeePassword });

      const vault = await memberAkord.vault.get(vaultId);
      expect(vault).toBeTruthy();
      expect(vault.name).toBeTruthy();
    });

    it("should list all members of the vault", async () => {
      const members = await akord.vault.members(vaultId);

      expect(members).toBeTruthy();
      expect(members.length).toEqual(3);
    });

    it("should change access", async () => {
      const membership = await akord.vault.changeAccess(airdropeeMemberId, "viewer");
      expect(membership).toBeTruthy();
      expect(membership.role).toEqual("viewer");
    });

    it("should revoke access", async () => {
      const membership = await akord.vault.revokeAccess(airdropeeMemberId);
      expect(membership).toBeTruthy();
      expect(membership.status).toEqual("revoked");
    });

    it("should list all members of the vault with the revoked one", async () => {
      const members = await akord.vault.members(vaultId);

      expect(members).toBeTruthy();
      expect(members.length).toEqual(3);
      expect(members.map(member => member.status)).toContain("revoked");
    });

    it("should fail getting the vault from revoked member account", async () => {
      await expect(async () => {
        const memberAkord = await Akord
          .withWallet({ walletPrivateKey: airdropeeIdentityPrivateKey })
          .signIn();

        await memberAkord.withEncrypter({ password: airdropeePassword });

        const vault = await memberAkord.vault.get(vaultId);
        expect(vault).toBeTruthy();
        expect(vault.name).toBeTruthy();
      }).rejects.toThrow(Forbidden);
    });
  });
});