import { AllowedPaths, EncryptedVaultKeyPair } from ".";

export interface CreateVaultTxPayload {
  name?: string;
  description?: string;
  encrypted?: boolean;
  keys?: Array<EncryptedVaultKeyPair>;
  tags?: string[];
}

export interface UpdateVaultTxPayload {
  id: string;
  name?: string;
  description?: string;
  tags?: string[];
  status?: string;
  keys?: Array<EncryptedVaultKeyPair>;
}

export interface CreateFolderTxPayload {
  vaultId: string;
  name: string;
  parentId?: string;
}

export interface UpdateFolderTxPayload {
  id: string;
  name?: string;
  parentId?: string;
  status?: string;
}

export interface CreateFileTxPayload {
  vaultId: string;
  file: any;
  parentId?: string;
}

export interface UpdateFileTxPayload {
  id: string;
  name?: string;
  parentId?: string;
  status?: string;
}

export interface CreateMembershipTxPayload {
  vaultId: string;
  address: string;
  role: string;
  status?: string;
  name?: string;
  expiresAt?: number;
  keys?: EncryptedVaultKeyPair[];
  publicKey?: string;
  encPrivateKey?: string;
  ownerAccess?: string;
  allowedStorage?: number;
  allowedPaths?: AllowedPaths;
}

export interface UpdateMembershipTxPayload {
  id: string;
  role?: string;
  status?: string;
  expiresAt?: number;
  keys?: { [key: string]: EncryptedVaultKeyPair[] };
}
