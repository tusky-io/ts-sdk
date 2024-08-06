import { Encryptable, encrypted, EncryptedKeys } from "@akord/crypto";

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
  tags?: string[];

  // vault context
  __public__?: boolean;

  constructor(folder: any, keys?: Array<EncryptedKeys>) {
    super(
      keys ? keys : folder.__keys__,
      folder.__publicKey__
    );
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
    this.tags = folder.tags;
    this.__public__ = folder.__public__;
  }
}