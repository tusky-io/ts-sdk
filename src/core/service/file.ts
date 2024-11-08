import { Service, ServiceConfig } from "./service";
import { IncorrectEncryptionKey } from "../../errors/incorrect-encryption-key";
import { EncryptedVaultKeyPair, File } from "../../types";
import { objects } from "../../constants";

class FileService extends Service {

  name: string

  constructor(config?: ServiceConfig) {
    super(config);
    this.type = objects.FILE;
  }

  async setVaultContextFromNodeId(fileId: string) {
    const object = await this.api.getFile(fileId);
    const vault = await this.api.getVault(object.vaultId);
    this.setVault(vault);
    this.setVaultId(object.vaultId);
    this.setEncrypted(object.__encrypted__);
    await this.setMembershipKeys(object);
    this.setObject(object);
    this.setObjectId(fileId);
  }

  async processFile(object: File, shouldDecrypt: boolean, keys?: EncryptedVaultKeyPair[]): Promise<File> {
    const file = new File(object, keys);
    if ((await this.isEncrypted(file)) && shouldDecrypt) {
      try {
        await file.decrypt(this.encrypter);
      } catch (error) {
        throw new IncorrectEncryptionKey(error);
      }
    }
    return file;
  }

  private async isEncrypted(file: File) {
    return file.vaultId && file.__encrypted__;
  }

  async setName(name: string) {
    this.name = await this.processWriteString(name);
  }
}

export {
  FileService
}