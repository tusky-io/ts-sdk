import { Service, ServiceConfig } from "./service";
import { IncorrectEncryptionKey } from "../../errors/incorrect-encryption-key";
import { EncryptedVaultKeyPair, File } from "../../types";
import { objects } from "../../constants";
import { createFileLike, FileLike } from "../../types/file";
import { arrayBufferToArray, base64ToArray } from "../../crypto";
import { encryptWithPublicKey } from "../../crypto-lib";

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

  async processFile(object: File, shouldDecrypt: boolean, keys?: EncryptedVaultKeyPair[]): Promise<File> {
    const file = new File(object, keys);
    if (shouldDecrypt) {
      try {
        await file.decrypt(this.encrypter);
      } catch (error) {
        throw new IncorrectEncryptionKey(error);
      }
    }
    return file;
  }

  async setFile(file: FileLike) {
    if (this.isPublic) {
      this.file = file;
    } else {
      await this.setName(file.name);
      const fileBuffer = arrayBufferToArray(await file.arrayBuffer());
      const currentVaultPublicKey = this.keys[this.keys.length - 1].publicKey;
      const encryptedFile = await encryptWithPublicKey(base64ToArray(currentVaultPublicKey), fileBuffer);
      this.file = await createFileLike(new TextEncoder().encode(JSON.stringify(encryptedFile)), { name: this.name, mimeType: file.type, lastModified: file.lastModified });
      console.log(this.file)
    }
  }

  async setName(name: string) {
    this.name = await this.processWriteString(name);
  }
}

export {
  FileService
}