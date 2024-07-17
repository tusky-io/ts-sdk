import { EncryptionKeys } from "@akord/crypto"
import { actions, objects } from "../constants"

export interface Transaction {
  id: string,
  action: actions,
  postedAt: string,
  address: string,
  publicSigningKey: string,
  vaultId: string,
  actionRef: actions,
  groupRef: string,
  objectId: string,
  type: objects,
  status: string
}

export interface TxPayload {
  action: actions,
  timestamp: string,
  owner: string,
  public: boolean,
  vaultId: string,
  parentId: string,
  objectId: string,
  type: objects,
  status: string,
  userAgent: string,
  groupId: string
}

export interface VaultTxPayload extends TxPayload {
  membershipId: string
  name: string,
  description: string
}

export interface FolderTxPayload extends TxPayload {
  name: string
}

export interface FileTxPayload extends TxPayload {
  name: string,
  mimeType: string,
  size: number,
  blobId: string,
  numberOfChunks: number,
  chunkSize: number,
  lastModified: number
}

export interface MembershipTxPayload extends TxPayload {
  keys: EncryptionKeys[]
}

export type TxPayloads = TxPayload | VaultTxPayload | FolderTxPayload | FileTxPayload | MembershipTxPayload;