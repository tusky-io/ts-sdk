import { Service, ServiceConfig } from "./service";
import { IncorrectEncryptionKey } from "../../errors/incorrect-encryption-key";
import { EncryptedVaultKeyPair, Vault } from "../../types";
import { objects } from "../../constants";

class VaultService extends Service {
  name: string;
  description: string;

  constructor(config?: ServiceConfig) {
    super(config);
    this.type = objects.VAULT;
  }

  async setName(name: string) {
    this.name = await this.processWriteString(name);
  }

  async setDescription(description: string) {
    this.description = await this.processWriteString(description);
  }

  async setVaultContext(vaultId: string): Promise<void> {
    await super.setVaultContext(vaultId);
    this.setObjectId(vaultId);
    this.setObject(this.vault);
  }

  async processVault(
    object: Vault,
    shouldDecrypt: boolean,
    keys?: EncryptedVaultKeyPair[],
  ): Promise<Vault> {
    const vault = new Vault(object, keys);
    if (shouldDecrypt && vault.encrypted) {
      try {
        await vault.decrypt(this.encrypter);
      } catch (error) {
        throw new IncorrectEncryptionKey(error);
      }
    }
    return vault;
  }
}

export { VaultService };
