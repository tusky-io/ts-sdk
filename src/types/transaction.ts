import { EncryptedVaultKeyPair } from "."
import { actions, objects } from "../constants"

export interface Transaction {
  id: string,
  action: actions,
  owner: string,
  vaultId: string,
  objectId: string,
  objectType: objects,
  status: string,
  timestamp: string
}

export interface CreateVaultTxPayload {
  name?: string,
  description?: string
  public?: boolean,
  keys?: Array<EncryptedVaultKeyPair>
}

export interface UpdateVaultTxPayload {
  id: string,
  name?: string,
  description?: string
  status?: string
}

export interface CreateFolderTxPayload {
  vaultId: string,
  name: string,
  parentId?: string,
}

export interface UpdateFolderTxPayload {
  id: string,
  name?: string,
  parentId?: string,
  status?: string
}

export interface CreateFileTxPayload {
  vaultId: string,
  file: any,
  parentId?: string,
}

export interface UpdateFileTxPayload {
  id: string,
  name?: string,
  parentId?: string,
  status?: string
}

export interface CreateMembershipTxPayload {
  vaultId: string,
  address: string,
  role: string,
  status?: string,
  expiresAt?: number,
}

export interface UpdateMembershipTxPayload {
  id: string,
  role?: string,
  status?: string,
  expiresAt?: number
}