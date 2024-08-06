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

export interface CreateVaultTxPayload {
  name?: string,
  description?: string
  public?: boolean
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