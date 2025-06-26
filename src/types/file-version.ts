import { FileLocationOptions, FileMetadataOptions, Hooks } from "../core/file";
import { EncryptedVaultKeyPair } from ".";
import { Encryptable, encrypted } from "../crypto";

export class File extends Encryptable {
  @encrypted() name: string;
  id: string; // file reference off chain - internal Tusky upload id

  // Walrus & Sui related fields

  // populated together with encodedAt or storedAt
  blobId: string; // file reference off chain - Walrus blob id (computed deterministically from blob content)

  // populated together with storedAt
  quiltId: string; // blob id of quilt (batch) containing the file
  quiltPatchId: string; // file reference in quilt batch, can be used to retrieve the file from Walrus
  blobObjectId: string; // file reference on chain - Sui object id
  ref: string; // file reference on chain - Sui object id (depracated - please use blobObjectId)
  network: "mainnet" | "testnet"; // Sui network
  storedEpoch?: number;
  certifiedEpoch?: number;
  endEpoch?: number;

  createdAt: string; // uploaded to Tusky timestamp
  encodedAt?: string; // encoded by Tusky timestamp
  storedAt?: string; // stored on Walrus timestamp
  expiresAt?: string; // will expire from Walrus timestamp

  // file metadata
  mimeType: string;
  owner: string;
  updatedAt: string;
  status: string;
  size: number;
  external?: boolean;
  numberOfChunks?: number;
  chunkSize?: number;
  encryptedAesKey?: string; // encrypted AES key used to encrypt private files

  // vault context
  vaultId: string;
  parentId?: string;
  __encrypted__?: boolean;

  constructor(file: any, keys?: Array<EncryptedVaultKeyPair>) {
    super(keys ? keys : file.__keys__);
    this.id = file.id;
    this.blobId = file.blobId;
    this.quiltId = file.quiltId;
    this.quiltPatchId = file.quiltPatchId;
    this.blobObjectId = file.blobObjectId;
    this.ref = file.ref;
    this.network = file.network;
    this.owner = file.owner;
    this.createdAt = file.createdAt;
    this.updatedAt = file.updatedAt;
    this.storedAt = file.storedAt;
    this.encodedAt = file.encodedAt;
    this.certifiedEpoch = file.certifiedEpoch;
    this.storedEpoch = file.storedEpoch;
    this.endEpoch = file.endEpoch;
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

export type FileUploadOptions = Hooks &
  FileLocationOptions &
  FileMetadataOptions;

export type FileDownloadOptions = Hooks & {
  path?: string;
  skipSave?: boolean;
};
