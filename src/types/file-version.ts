import { FileLocationOptions, FileMetadataOptions, Hooks } from "../core/file";
import { EncryptedVaultKeyPair } from ".";
import { Encryptable, encrypted } from "../crypto";

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
  expiresAt?: string;
  numberOfChunks?: number;
  chunkSize?: number;
  encryptedAesKey?: string; // encrypted AES key used to encrypt private files

  vaultId: string;
  parentId?: string;

  // vault context
  __encrypted__?: boolean;

  constructor(file: any, keys?: Array<EncryptedVaultKeyPair>) {
    super(keys ? keys : file.__keys__);
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
    this.encryptedAesKey = file.encryptedAesKey;
    this.name = file.name;
    this.status = file.status;
    this.external = file.external;
    this.expiresAt = file.expiresAt;
    this.vaultId = file.vaultId;
    this.parentId = file.parentId;
    this.tags = file.tags;
    this.__encrypted__ = file.__encrypted__;
  }
}

export type FileUploadOptions = Hooks & FileLocationOptions & FileMetadataOptions

export type FileDownloadOptions = Hooks & {
  path?: string,
  skipSave?: boolean,
  encrypted?: boolean,
}