import { EncryptedKeys } from "@akord/crypto";
import { Service, ServiceConfig } from "./service";
import { IncorrectEncryptionKey } from "../../errors/incorrect-encryption-key";
import { NotFound } from "../../errors/not-found";
import { Vault, VaultTxPayload } from "../../types";
import { objects } from "../../constants";

class VaultService extends Service {

  name: string;
  description: string;
  membershipId: string;

  constructor(config?: ServiceConfig) {
    super(config);
    this.type = objects.VAULT;
  }

  async formatTransaction() {
    const tx = await super.formatTransaction() as VaultTxPayload;
    if (this.name) {
      tx.name =  await this.processWriteString(this.name);
    }
    if (this.description) {
      tx.description =  await this.processWriteString(this.description);
    }
    tx.membershipId = this.membershipId;
    tx.public = this.isPublic;
    return tx;
  }

  setName(name: string) {
    this.name = name;
  }

  setDescription(description: string) {
    this.description = description;
  }

  setMembershipId(membershipId: string) {
    this.membershipId = membershipId;
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