import { EncryptedKeys } from "@akord/crypto";
import { Service, ServiceConfig } from "./service";
import { IncorrectEncryptionKey } from "../../errors/incorrect-encryption-key";
import { NotFound } from "../../errors/not-found";
import { Vault } from "../../types";
import { objectType } from "../../constants";

class VaultService extends Service {

  constructor(config?: ServiceConfig) {
    super(config);
    this.objectType = objectType.VAULT;
  }

  async setVaultContext(vaultId: string): Promise<void> {
    await super.setVaultContext(vaultId);
    this.setObjectId(vaultId);
    this.setObject(this.vault);
  }

  async processVault(object: Vault, shouldDecrypt: boolean, keys?: EncryptedKeys[]): Promise<Vault> {
    const vault = new Vault(object, keys);
    if (shouldDecrypt && !vault.public) {
      try {
        await vault.decrypt();
      } catch (error) {
        throw new IncorrectEncryptionKey(error);
      }
    }
    return vault;
  }

  getTagIndex(tags: string[], tag: string): number {
    const index = tags.indexOf(tag);
    if (index === -1) {
      throw new NotFound("Could not find tag: " + tag + " for given vault.");
    }
    return index;
  }
}

export {
  VaultService
}