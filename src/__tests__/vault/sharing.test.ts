import { Akord } from "../../akord";
import { Forbidden } from "../../errors/forbidden";
import { cleanup, ENV_TEST_RUN, initInstance, isEncrypted, LOG_LEVEL, testDataPath, vaultCreate } from "../common";
import faker from '@faker-js/faker';
import { firstFileName, secondFileName } from "../data/content";
import { membershipStatus, status } from "../../constants";

let akord: Akord;

const initAkordFromPrivateKey = (privateKey: string) => {
  return Akord
    .withWallet({ walletPrivateKey: privateKey })
    .withApi({ env: ENV_TEST_RUN })
    .withLogger({ logLevel: LOG_LEVEL })
    .signIn();
}

describe("Testing airdrop actions", () => {
  let vaultId: string;
  let airdropeeAddress: string;
  let airdropeeMemberId: string;
  let airdropeeIdentityPrivateKey: string;
  let airdropeePassword: string;

  beforeAll(async () => {
    akord = await initInstance(isEncrypted);

    const vault = await vaultCreate(akord, isEncrypted);
    vaultId = vault.id;
  });

  afterAll(async () => {
    await cleanup(akord, vaultId);
  });

  describe(`Sharing ${isEncrypted ? "private" : "public"} vault`, () => {
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
      isEncrypted ? expect(password).toBeTruthy() : expect(password).toBeFalsy();

      expect(membership).toBeTruthy();
      expect(membership.id).toBeTruthy();
      expect(membership.memberAddress).toBeTruthy();
      expect(membership.role).toEqual(role);
      expect(membership.expiresAt).toEqual(expiresAt.toString());
      isEncrypted ? expect(membership.keys).toBeTruthy() : expect(membership.keys).toBeFalsy();
    });

    it("should airdrop access with link name identifier", async () => {
      const name = faker.random.words(2);
      const { identityPrivateKey, password, membership } = await akord.vault.airdropAccess(vaultId, { name });
      expect(identityPrivateKey).toBeTruthy();
      isEncrypted ? expect(password).toBeTruthy() : expect(password).toBeFalsy();

      expect(membership).toBeTruthy();
      expect(membership.id).toBeTruthy();
      expect(membership.memberAddress).toBeTruthy();
      expect(membership.memberDetails).toBeTruthy();
      expect(membership.memberDetails.name).toEqual(name);
      isEncrypted ? expect(membership.keys).toBeTruthy() : expect(membership.keys).toBeFalsy();
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
      const memberAkord = await initAkordFromPrivateKey(airdropeeIdentityPrivateKey);

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
        const memberAkord = await initAkordFromPrivateKey(airdropeeIdentityPrivateKey);

        await memberAkord.withEncrypter({ password: airdropeePassword });

        const vault = await memberAkord.vault.get(vaultId);
        expect(vault).toBeTruthy();
        expect(vault.name).toBeTruthy();
      }).rejects.toThrow(Forbidden);
    });
  });

  describe(`Sharing a part of a ${isEncrypted ? "private" : "public"} vault`, () => {
    let viewerIdentityPrivateKey: string;
    let viewerPassword: string;
    let contributorIdentityPrivateKey: string;
    let contributorPassword: string;
    let folderId: string;
    let fileId: string;
    let ownerFileId: string;

    it("should create file & folder by the owner", async () => {
      const { id } = await akord.folder.create(vaultId, faker.random.word());
      folderId = id;

      fileId = await akord.file.upload(vaultId, testDataPath + firstFileName);
    });

    it("should share file with a viewer member", async () => {
      const { membership, identityPrivateKey, password } = await akord.vault.airdropAccess(vaultId, { allowedPaths: { files: [fileId] } });

      viewerIdentityPrivateKey = identityPrivateKey;
      viewerPassword = password;

      expect(membership).toBeTruthy();
      expect(membership.role).toEqual("viewer");
      expect(membership.allowedPaths).toBeTruthy();
      expect(membership.allowedPaths.files).toBeTruthy();
      expect(membership.allowedPaths.files).toContain(fileId);
    });

    it("should share file with a contributor member", async () => {
      const { membership, identityPrivateKey, password } = await akord.vault.airdropAccess(vaultId, { role: "contributor", allowedPaths: { files: [fileId] } });

      contributorIdentityPrivateKey = identityPrivateKey;
      contributorPassword = password;

      expect(membership).toBeTruthy();
      expect(membership.role).toEqual("contributor");
      expect(membership.allowedPaths).toBeTruthy();
      expect(membership.allowedPaths.files).toBeTruthy();
      expect(membership.allowedPaths.files).toContain(fileId);
    });

    it("should get the file metadata by the viewer member", async () => {
      const memberAkord = await initAkordFromPrivateKey(viewerIdentityPrivateKey);

      await memberAkord.withEncrypter({ password: viewerPassword });

      const file = await memberAkord.file.get(fileId);
      expect(file).toBeTruthy();
      expect(file.name).toBeTruthy();
    });

    it("should download the file by the viewer member", async () => {
      const memberAkord = await initAkordFromPrivateKey(viewerIdentityPrivateKey);

      await memberAkord.withEncrypter({ password: viewerPassword });

      const response = await memberAkord.file.arrayBuffer(fileId);
      expect(response).toBeTruthy();
    });

    it("should fail renaming file by the viewer member", async () => {
      await expect(async () => {
        const memberAkord = await initAkordFromPrivateKey(viewerIdentityPrivateKey);

        await memberAkord.withEncrypter({ password: viewerPassword });

        await memberAkord.file.rename(fileId, faker.random.word());
      }).rejects.toThrow(Forbidden);
    });

    it("should fail getting the folder by the viewer member with restricted access", async () => {
      await expect(async () => {
        const memberAkord = await initAkordFromPrivateKey(viewerIdentityPrivateKey);

        await memberAkord.withEncrypter({ password: viewerPassword });

        await memberAkord.folder.get(folderId);
      }).rejects.toThrow(Forbidden);
    });

    it("should download the file by the contributor member", async () => {
      const memberAkord = await initAkordFromPrivateKey(contributorIdentityPrivateKey);

      await memberAkord.withEncrypter({ password: contributorPassword });

      const response = await memberAkord.file.arrayBuffer(fileId);
      expect(response).toBeTruthy();
    });

    it("should rename the file by the contributor member", async () => {
      const memberAkord = await initAkordFromPrivateKey(contributorIdentityPrivateKey);

      await memberAkord.withEncrypter({ password: contributorPassword });

      const name = faker.random.word();
      const file = await memberAkord.file.rename(fileId, name);
      expect(file).toBeTruthy();
      expect(file.name).toEqual(name);
    });

    it("should fail updating the folder by the contributor with restricted access", async () => {
      await expect(async () => {
        const memberAkord = await initAkordFromPrivateKey(contributorIdentityPrivateKey);

        await memberAkord.withEncrypter({ password: contributorPassword });

        await memberAkord.folder.rename(folderId, faker.random.word());
      }).rejects.toThrow(Forbidden);
    });

    it("should upload another file by the owner", async () => {
      ownerFileId = await akord.file.upload(vaultId, testDataPath + secondFileName);
    });

    it("should fail getting the owner's file metadata by the viewer member", async () => {
      await expect(async () => {
        const memberAkord = await initAkordFromPrivateKey(viewerIdentityPrivateKey);

        await memberAkord.withEncrypter({ password: viewerPassword });

        await memberAkord.file.get(ownerFileId);
      }).rejects.toThrow(Forbidden);
    });

    it("should fail downloading owner's file by the contributor member", async () => {
      await expect(async () => {
        const memberAkord = await initAkordFromPrivateKey(contributorIdentityPrivateKey);

        await memberAkord.withEncrypter({ password: contributorPassword });

        await memberAkord.file.arrayBuffer(ownerFileId);
      }).rejects.toThrow(Forbidden);
    });

    it("should share folder with a contributor member", async () => {
      const { id } = await akord.folder.create(vaultId, faker.random.word());

      const { membership } = await akord.vault.airdropAccess(vaultId, { role: "contributor", allowedPaths: { folders: [id] } });

      expect(membership).toBeTruthy();
      expect(membership.role).toEqual("contributor");
      expect(membership.allowedPaths).toBeTruthy();
      expect(membership.allowedPaths.folders).toBeTruthy();
      expect(membership.allowedPaths.folders).toContain(id);
    });
  });
});