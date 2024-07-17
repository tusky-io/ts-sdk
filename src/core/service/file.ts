import { EncryptedKeys } from "@akord/crypto";
import { Service, ServiceConfig } from "./service";
import { IncorrectEncryptionKey } from "../../errors/incorrect-encryption-key";
import { File, FileTxPayload } from "../../types";
import { objects } from "../../constants";
import { FileLike } from "../../types/file";

class FileService extends Service {

  file: FileLike
  name: string

  constructor(config?: ServiceConfig) {
    super(config);
    this.type = objects.FILE;
  }

  async formatTransaction() {
    const tx = await super.formatTransaction() as FileTxPayload;
    if (this.file) {
      tx.name = await this.processWriteString(this.file.name);
      tx.mimeType = this.file.type;
      tx.size = this.file.size;
      tx.lastModified = this.file.lastModified;
    }
    if (this.name) {
      tx.name = await this.processWriteString(this.name);
    }
    return tx;
  }

  async setVaultContextFromNodeId(fileId: string, vaultId?: string) {
    const object = await this.api.getFile(fileId);
    const vault = await this.api.getVault(object.vaultId);
    this.setVault(vault);
    this.setVaultId(object.vaultId);
    this.setIsPublic(object.__public__);
    await this.setMembershipKeys(object);
    this.setObject(object);
    this.setObjectId(fileId);
    this.setType(this.type);
  }

  async processFile(object: File, shouldDecrypt: boolean, keys?: EncryptedKeys[]): Promise<File> {
    const file = new File(object, keys);
    if (shouldDecrypt) {
      try {
        await file.decrypt();
      } catch (error) {
        throw new IncorrectEncryptionKey(error);
      }
    }
    return file;
  }

  setFile(file: FileLike) {
    this.file = file;
  }

  setName(name: string) {
    this.name = name;
  }
}

export {
  FileService
}