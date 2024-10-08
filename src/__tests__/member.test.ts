import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { Akord } from "../akord";
import { cleanup, initInstance, setupVault, vaultCreate } from "./common";
import { decodeSuiPrivateKey } from "@mysten/sui/cryptography";

let akord: Akord;

jest.setTimeout(3000000);

describe("Testing airdrop actions", () => {
  let vaultId: string;

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

    it("should airdrop access", async () => {
      const role = "contributor";
      const expiresAt = new Date().getTime() + 24 * 60 * 60 * 1000;

      const { identityPrivateKey, password, membership } = await akord.vault.airdropAccess(vaultId, { expiresAt: expiresAt, role });
      expect(identityPrivateKey).toBeTruthy();
      expect(password).toBeTruthy();

      expect(membership).toBeTruthy();
      expect(membership.id).toBeTruthy();
      expect(membership.role).toEqual(role);
      expect(membership.expiresAt).toEqual(expiresAt.toString());

      const memberAkord = await Akord
        .withWallet({ walletSigner: Ed25519Keypair.fromSecretKey(decodeSuiPrivateKey(identityPrivateKey).secretKey) })
        .signIn();

      await memberAkord.withEncrypter({ password: password, keystore: true });

      const vault = await memberAkord.vault.get(vaultId);
      expect(vault).toBeTruthy();
      expect(vault.name).toBeTruthy();
    });

    it("should list two members of the vault", async () => {
      const members = await akord.vault.members(vaultId);

      expect(members).toBeTruthy();
      expect(members.length).toEqual(2);
      expect(members[0]).toBeTruthy();
      expect(members[0].memberAddress).toBeTruthy();
      expect(members[1]).toBeTruthy();
      expect(members[1].memberAddress).toBeTruthy();
    });

    // it("should change access", async () => {
    //   await akord.vault.changeAccess(vaultId, "viewer");
    // });

    // it("should revoke access", async () => {
    //   await akord.vault.revokeAccess(vaultId);
    // });
  });
});