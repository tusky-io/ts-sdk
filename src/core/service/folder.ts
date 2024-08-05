import { EncryptedKeys } from "@akord/crypto";
import { Service, ServiceConfig } from "./service";
import { IncorrectEncryptionKey } from "../../errors/incorrect-encryption-key";
import { Folder } from "../../types";
import { objects } from "../../constants";

class FolderService extends Service {

  name: string;

  constructor(config?: ServiceConfig) {
    super(config);
    this.type = objects.FOLDER;
  }

  async setVaultContextFromNodeId(folderId: string) {
    const object = await this.api.getFolder(folderId);
    const vault = await this.api.getVault(object.vaultId);
    this.setVault(vault);
    this.setVaultId(object.vaultId);
    this.setIsPublic(object.__public__);
    await this.setMembershipKeys(object);
    this.setObject(object);
    this.setObjectId(folderId);
    this.setType(this.type);
  }

  async processFolder(object: Folder, shouldDecrypt: boolean, keys?: EncryptedKeys[]): Promise<Folder> {
    const folder = new Folder(object, keys);
    if (shouldDecrypt) {
      try {
        await folder.decrypt();
      } catch (error) {
        throw new IncorrectEncryptionKey(error);
      }
    }
    return folder;
  }

  async setName(name: string) {
    this.name =  await this.processWriteString(name);
  }
}

export {
  FolderService
}