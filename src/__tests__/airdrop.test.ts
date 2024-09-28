import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { Akord } from "../akord";
import { cleanup, initInstance, setupVault } from "./common";

let akord: Akord;

jest.setTimeout(3000000);

describe("Testing airdrop actions", () => {
  let vaultId: string;

  beforeEach(async () => {
    akord = await initInstance();
  });

  beforeAll(async () => {
    // set up private vault
    vaultId = await setupVault(false);
  });

  afterAll(async () => {
    await cleanup(akord, vaultId);
  });

  describe("Vault access control tests", () => {
    it("should airdrop access", async () => {
      const role = "CONTRIBUTOR";
      const expiresAt = new Date().getTime() + 24 * 60 * 60 * 1000;

      const { keypair, password } = await akord.vault.airdropAccess(vaultId, { expiresAt: expiresAt, role });
      expect(keypair).toBeTruthy();
      expect(password).toBeTruthy();

      const memberAkord = await Akord
        .withWallet({ walletSigner: keypair })
        .signIn();

      await memberAkord.withEncrypter({ password: password });

      const vault = await memberAkord.vault.get(vaultId);
      expect(vault).toBeTruthy();
      expect(vault.name).toBeTruthy();
    });

    it("should change access", async () => {
      await akord.vault.changeAccess(vaultId, "viewer");
    });

    it("should revoke access", async () => {
      await akord.vault.revokeAccess(vaultId);
    });
  });
});