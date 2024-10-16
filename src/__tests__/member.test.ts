import { Akord } from "../akord";
import { Forbidden } from "../errors/forbidden";
import { cleanup, initInstance, setupVault, testDataPath, vaultCreate } from "./common";
import faker from '@faker-js/faker';
import { firstFileName, secondFileName } from "./data/content";

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

  describe("Sharing vault", () => {
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

    it("should airdrop access with link name identifier", async () => {
      const name = faker.random.words(2);
      const { identityPrivateKey, password, membership } = await akord.vault.airdropAccess(vaultId, { name });
      expect(identityPrivateKey).toBeTruthy();
      isPublic ? expect(password).toBeFalsy() : expect(password).toBeTruthy();

      expect(membership).toBeTruthy();
      expect(membership.id).toBeTruthy();
      expect(membership.memberAddress).toBeTruthy();
      expect(membership.memberDetails).toBeTruthy();
      expect(membership.memberDetails.name).toEqual(name);
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
      expect(members.length).toEqual(4);
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
      expect(members.length).toEqual(4);
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

  describe("Sharing a part of a vault", () => {
    let airdropeeIdentityPrivateKey: string;
    let airdropeePassword: string;
    let folderId: string;
    let fileId: string;
    let ownerFileId: string;

    it("should create file & folder by the owner", async () => {
      const { id } = await akord.folder.create(vaultId, "name");
      folderId = id;

      fileId = await akord.file.upload(vaultId, testDataPath + firstFileName);
    });

    it("should share only file with a member", async () => {
      const { membership, identityPrivateKey, password } = await akord.vault.airdropAccess(vaultId, { contextPath: { file: [fileId] } });

      airdropeeIdentityPrivateKey = identityPrivateKey;
      airdropeePassword = password;

      expect(membership).toBeTruthy();
      expect(membership.contextPath).toBeTruthy();
      expect(membership.contextPath.file).toBeTruthy();
      expect(membership.contextPath.file).toContain(fileId);
    });

    it("should get the file metadata from the member account", async () => {
      const memberAkord = await Akord
        .withWallet({ walletPrivateKey: airdropeeIdentityPrivateKey })
        .signIn();

      await memberAkord.withEncrypter({ password: airdropeePassword });

      const file = await memberAkord.file.get(fileId);
      expect(file).toBeTruthy();
      expect(file.name).toBeTruthy();
    });

    it("should download the file from the member account", async () => {
      const memberAkord = await Akord
        .withWallet({ walletPrivateKey: airdropeeIdentityPrivateKey })
        .signIn();

      await memberAkord.withEncrypter({ password: airdropeePassword });

      const response = await akord.file.arrayBuffer(fileId);
      expect(response).toBeTruthy();
    });

    it("should fail getting the folder from the member account", async () => {
      await expect(async () => {
        const memberAkord = await Akord
          .withWallet({ walletPrivateKey: airdropeeIdentityPrivateKey })
          .signIn();

        await memberAkord.withEncrypter({ password: airdropeePassword });

        await memberAkord.folder.get(folderId);
      }).rejects.toThrow(Forbidden);
    });

    it("should upload another file by the owner", async () => {
      ownerFileId = await akord.file.upload(vaultId, testDataPath + secondFileName);
    });

    it("should fail getting the owner's file metadata by the member", async () => {
      await expect(async () => {
        const memberAkord = await Akord
          .withWallet({ walletPrivateKey: airdropeeIdentityPrivateKey })
          .signIn();

        await memberAkord.withEncrypter({ password: airdropeePassword });

        await memberAkord.file.get(ownerFileId);
      }).rejects.toThrow(Forbidden);
    });

    it("should fail downloading owner's file by the member", async () => {
      await expect(async () => {
        const memberAkord = await Akord
          .withWallet({ walletPrivateKey: airdropeeIdentityPrivateKey })
          .signIn();

        await memberAkord.withEncrypter({ password: airdropeePassword });

        await akord.file.arrayBuffer(ownerFileId);
      }).rejects.toThrow(Forbidden);
    });
  });
});