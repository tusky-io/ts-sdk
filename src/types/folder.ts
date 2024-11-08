import { EncryptedVaultKeyPair } from ".";
import { Encryptable, encrypted } from "../crypto";

export class Folder extends Encryptable {
  @encrypted() name: string;
  size: number;

  id: string;
  type: string;
  owner: string;
  createdAt: string;
  updatedAt: string;
  status: string;

  vaultId: string;
  parentId?: string;

  // vault context
  __encrypted__?: boolean;

  constructor(folder: any, keys?: Array<EncryptedVaultKeyPair>) {
    super(keys ? keys : folder.__keys__);
    this.id = folder.id;
    this.owner = folder.owner;
    this.createdAt = folder.createdAt;
    this.updatedAt = folder.updatedAt;
    this.type = folder.type;
    this.size = folder.size;
    this.name = folder.name;
    this.status = folder.status;
    this.vaultId = folder.vaultId;
    this.parentId = folder.parentId;
    this.__encrypted__ = folder.__encrypted__;
  }
}