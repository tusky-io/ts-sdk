import { EncryptedKeys } from "@akord/crypto";
import { Service, ServiceConfig } from "./service";
import { IncorrectEncryptionKey } from "../../errors/incorrect-encryption-key";
import { File } from "../../types";
import { objects } from "../../constants";
import { FileLike } from "../../types/file";

class FileService extends Service {

  file: FileLike
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
    this.setIsPublic(object.__public__);
    await this.setMembershipKeys(object);
    this.setObject(object);
    this.setObjectId(fileId);
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
    // TODO: encrypt file here
    this.file = file;
  }

  async setName(name: string) {
    this.name =  await this.processWriteString(name);
  }
}

export {
  FileService
}