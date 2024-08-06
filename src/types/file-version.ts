import { Encryptable, encrypted, EncryptedKeys } from "@akord/crypto";

export class File extends Encryptable {
  @encrypted() name: string;
  id: string;
  blobId: string; // file reference off chain
  ref: string; // file reference on chain
  mimeType: string;
  owner: string;
  createdAt: string;
  updatedAt: string;
  status: string;
  size: number;
  external?: boolean;
  numberOfChunks?: number;
  chunkSize?: number;

  vaultId: string;
  parentId?: string;
  tags?: string[];

  // vault context
  __public__?: boolean;

  constructor(file: any, keys?: Array<EncryptedKeys>, publicKey?: string) {
    super(
      keys ? keys : file.__keys__,
      publicKey ? publicKey : file.__publicKey__
    );
    this.id = file.id;
    this.blobId = file.blobId;
    this.ref = file.ref;
    this.owner = file.owner;
    this.createdAt = file.createdAt;
    this.updatedAt = file.updatedAt;
    this.mimeType = file.mimeType;
    this.size = file.size;
    this.numberOfChunks = file.numberOfChunks;
    this.chunkSize = file.chunkSize;
    this.name = file.name;
    this.status = file.status;
    this.external = file.external;
    this.vaultId = file.vaultId;
    this.parentId = file.parentId;
    this.tags = file.tags;
    this.__public__ = file.__public__;
  }
}
