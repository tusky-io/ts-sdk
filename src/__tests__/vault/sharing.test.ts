import { Tusky } from "../../tusky";
import { Forbidden } from "../../errors/forbidden";
import { cleanup, ENV_TEST_RUN, initInstance, isEncrypted, LOG_LEVEL, testDataPath, vaultCreate } from "../common";
import faker from '@faker-js/faker';
import { firstFileName, secondFileName } from "../data/content";
import { Unauthorized } from "../../errors/unauthorized";
import { TuskyBuilder } from "../../tusky-builder";

let tusky: Tusky;

const initTuskyFromPrivateKey = async (privateKey: string) => {
  const tusky = await new TuskyBuilder()
    .useWallet({ privateKey: privateKey })
    .useEnv(ENV_TEST_RUN)
    .useLogger({ logLevel: LOG_LEVEL })
    .build();

  await tusky.auth.signIn();
  return tusky;
}

describe("Testing airdrop actions", () => {
  let vaultId: string;
  let airdropeeAddress: string;
  let airdropeeMemberId: string;
  let airdropeeIdentityPrivateKey: string;
  let airdropeePassword: string;

  beforeAll(async () => {
    tusky = await initInstance(isEncrypted);

    const vault = await vaultCreate(tusky, isEncrypted);
    vaultId = vault.id;
  });

  afterAll(async () => {
    await cleanup(tusky, vaultId);
  });

  describe(`Sharing ${isEncrypted ? "private" : "public"} vault`, () => {
    it("should only list owner for all members of the vault", async () => {
      const members = await tusky.vault.members(vaultId);

      expect(members).toBeTruthy();
      expect(members.length).toEqual(1);
      expect(members[0]).toBeTruthy();
    });

    it("should airdrop access with an expiration date", async () => {
      const role = "contributor";
      const expiresAt = new Date().getTime() + 24 * 60 * 60 * 1000;

      const { identityPrivateKey, password, membership } = await tusky.vault.airdropAccess(vaultId, { expiresAt: expiresAt, role });
      expect(identityPrivateKey).toBeTruthy();
      isEncrypted ? expect(password).toBeTruthy() : expect(password).toBeFalsy();

      expect(membership).toBeTruthy();
      expect(membership.id).toBeTruthy();
      expect(membership.memberAddress).toBeTruthy();
      expect(membership.role).toEqual(role);
      expect(membership.expiresAt).toEqual(expiresAt.toString());
      isEncrypted ? expect(membership.keys).toBeTruthy() : expect(membership.keys).toBeFalsy();
      expect(membership.ownerAccess?.identityPrivateKey).toBeTruthy();
      isEncrypted ? expect(membership.ownerAccess?.password).toBeTruthy() : expect(membership.ownerAccess?.password).toBeFalsy();
    });

    it("should airdrop access with link name identifier", async () => {
      const name = faker.random.words(2);
      const { identityPrivateKey, password, membership } = await tusky.vault.airdropAccess(vaultId, { name });
      expect(identityPrivateKey).toBeTruthy();
      isEncrypted ? expect(password).toBeTruthy() : expect(password).toBeFalsy();

      expect(membership).toBeTruthy();
      expect(membership.id).toBeTruthy();
      expect(membership.memberAddress).toBeTruthy();
      expect(membership.memberDetails).toBeTruthy();
      expect(membership.memberDetails.name).toEqual(name);
      isEncrypted ? expect(membership.keys).toBeTruthy() : expect(membership.keys).toBeFalsy();
      expect(membership.ownerAccess?.identityPrivateKey).toBeTruthy();
      isEncrypted ? expect(membership.ownerAccess?.password).toBeTruthy() : expect(membership.ownerAccess?.password).toBeFalsy();

    });

    it("should airdrop access with user specified password and no expiration date", async () => {
      const role = "contributor";

      const password = faker.random.word();

      const { identityPrivateKey, membership } = await tusky.vault.airdropAccess(vaultId, { password, role });
      expect(identityPrivateKey).toBeTruthy();
      expect(password).toEqual(password);

      expect(membership).toBeTruthy();
      expect(membership.id).toBeTruthy();
      expect(membership.memberAddress).toBeTruthy();
      expect(membership.role).toEqual(role);
      expect(membership.expiresAt).toBeFalsy();
      airdropeeAddress = membership.memberAddress;
      airdropeeIdentityPrivateKey = identityPrivateKey;
      airdropeePassword = password;
      airdropeeMemberId = membership.id;
      expect(membership.ownerAccess?.identityPrivateKey).toBeTruthy();
      expect(membership.ownerAccess?.password).toBeFalsy();
    });

    it("should get vault by airdropee", async () => {
      const memberTusky = await initTuskyFromPrivateKey(airdropeeIdentityPrivateKey);

      expect(memberTusky.auth.getAddress()).toEqual(airdropeeAddress);

      await memberTusky.addEncrypter({ password: airdropeePassword });

      const vault = await memberTusky.vault.get(vaultId);
      expect(vault).toBeTruthy();
      expect(vault.name).toBeTruthy();
    });

    it("should list all members of the vault", async () => {
      const members = await tusky.vault.members(vaultId);

      expect(members).toBeTruthy();
      expect(members.length).toEqual(4);
    });

    it("should change access", async () => {
      const membership = await tusky.vault.changeAccess(airdropeeMemberId, "viewer");
      expect(membership).toBeTruthy();
      expect(membership.role).toEqual("viewer");
    });

    it("should revoke access", async () => {
      await tusky.vault.revokeAccess(airdropeeMemberId);
    });

    it("should list all members of the vault without the revoked one", async () => {
      const members = await tusky.vault.members(vaultId);

      expect(members).toBeTruthy();
      expect(members.length).toEqual(3);
    });

    it("should fail getting the vault from revoked member account", async () => {
      await expect(async () => {
        const memberTusky = await initTuskyFromPrivateKey(airdropeeIdentityPrivateKey);

        await memberTusky.addEncrypter({ password: airdropeePassword });

        const vault = await memberTusky.vault.get(vaultId);
        expect(vault).toBeTruthy();
        expect(vault.name).toBeTruthy();
      }).rejects.toThrow(Unauthorized);
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
      const { id } = await tusky.folder.create(vaultId, faker.random.word());
      folderId = id;

      fileId = await tusky.file.upload(vaultId, testDataPath + firstFileName);
    });

    it("should share file with a viewer member", async () => {
      const { membership, identityPrivateKey, password } = await tusky.vault.airdropAccess(vaultId, { allowedPaths: { files: [fileId] } });
      expect(identityPrivateKey).toBeTruthy();
      expect(password).toEqual(password);

      viewerIdentityPrivateKey = identityPrivateKey;
      viewerPassword = password;

      expect(membership).toBeTruthy();
      expect(membership.role).toEqual("viewer");
      expect(membership.allowedPaths).toBeTruthy();
      expect(membership.allowedPaths.files).toBeTruthy();
      expect(membership.allowedPaths.files).toContain(fileId);
    });

    it("should share file with a contributor member", async () => {
      const { membership, identityPrivateKey, password } = await tusky.vault.airdropAccess(vaultId, { role: "contributor", allowedPaths: { files: [fileId] } });
      expect(identityPrivateKey).toBeTruthy();
      expect(password).toEqual(password);

      contributorIdentityPrivateKey = identityPrivateKey;
      contributorPassword = password;

      expect(membership).toBeTruthy();
      expect(membership.role).toEqual("contributor");
      expect(membership.allowedPaths).toBeTruthy();
      expect(membership.allowedPaths.files).toBeTruthy();
      expect(membership.allowedPaths.files).toContain(fileId);
    });

    it("should get the file metadata by the viewer member", async () => {
      const memberTusky = await initTuskyFromPrivateKey(viewerIdentityPrivateKey);

      await memberTusky.addEncrypter({ password: viewerPassword });

      const file = await memberTusky.file.get(fileId);
      expect(file).toBeTruthy();
      expect(file.name).toBeTruthy();
    });

    it("should download the file by the viewer member", async () => {
      const memberTusky = await initTuskyFromPrivateKey(viewerIdentityPrivateKey);

      await memberTusky.addEncrypter({ password: viewerPassword });

      const response = await memberTusky.file.arrayBuffer(fileId);
      expect(response).toBeTruthy();
    });

    it("should fail renaming file by the viewer member", async () => {
      await expect(async () => {
        const memberTusky = await initTuskyFromPrivateKey(viewerIdentityPrivateKey);

        await memberTusky.addEncrypter({ password: viewerPassword });

        await memberTusky.file.rename(fileId, faker.random.word());
      }).rejects.toThrow(Forbidden);
    });

    it("should fail getting the folder by the viewer member with restricted access", async () => {
      await expect(async () => {
        const memberTusky = await initTuskyFromPrivateKey(viewerIdentityPrivateKey);

        await memberTusky.addEncrypter({ password: viewerPassword });

        await memberTusky.folder.get(folderId);
      }).rejects.toThrow(Forbidden);
    });

    it("should download the file by the contributor member", async () => {
      const memberTusky = await initTuskyFromPrivateKey(contributorIdentityPrivateKey);

      await memberTusky.addEncrypter({ password: contributorPassword });

      const response = await memberTusky.file.arrayBuffer(fileId);
      expect(response).toBeTruthy();
    });

    it("should rename the file by the contributor member", async () => {
      const memberTusky = await initTuskyFromPrivateKey(contributorIdentityPrivateKey);

      await memberTusky.addEncrypter({ password: contributorPassword });

      const name = faker.random.word();
      const file = await memberTusky.file.rename(fileId, name);
      expect(file).toBeTruthy();
      expect(file.name).toEqual(name);
    });

    it("should fail updating the folder by the contributor with restricted access", async () => {
      await expect(async () => {
        const memberTusky = await initTuskyFromPrivateKey(contributorIdentityPrivateKey);

        await memberTusky.addEncrypter({ password: contributorPassword });

        await memberTusky.folder.rename(folderId, faker.random.word());
      }).rejects.toThrow(Forbidden);
    });

    it("should upload another file by the owner", async () => {
      ownerFileId = await tusky.file.upload(vaultId, testDataPath + secondFileName);
    });

    it("should fail getting the owner's file metadata by the viewer member", async () => {
      await expect(async () => {
        const memberTusky = await initTuskyFromPrivateKey(viewerIdentityPrivateKey);

        await memberTusky.addEncrypter({ password: viewerPassword });

        await memberTusky.file.get(ownerFileId);
      }).rejects.toThrow(Forbidden);
    });

    it("should fail downloading owner's file by the contributor member", async () => {
      await expect(async () => {
        const memberTusky = await initTuskyFromPrivateKey(contributorIdentityPrivateKey);

        await memberTusky.addEncrypter({ password: contributorPassword });

        await memberTusky.file.arrayBuffer(ownerFileId);
      }).rejects.toThrow(Forbidden);
    });

    it("should share folder with a contributor member", async () => {
      const { id } = await tusky.folder.create(vaultId, faker.random.word());

      const { membership } = await tusky.vault.airdropAccess(vaultId, { role: "contributor", allowedPaths: { folders: [id] } });

      expect(membership).toBeTruthy();
      expect(membership.role).toEqual("contributor");
      expect(membership.allowedPaths).toBeTruthy();
      expect(membership.allowedPaths.folders).toBeTruthy();
      expect(membership.allowedPaths.folders).toContain(id);
    });
  });
});