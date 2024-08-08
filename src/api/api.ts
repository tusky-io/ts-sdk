import { Vault } from "../types/vault";
import { Membership, MembershipKeys } from "../types/membership";
import { CreateVaultTxPayload, CreateFileTxPayload, CreateFolderTxPayload, Transaction, UpdateVaultTxPayload, UpdateFolderTxPayload, UpdateMembershipTxPayload, CreateMembershipTxPayload, UpdateFileTxPayload } from "../types/transaction";
import { Paginated } from "../types/paginated";
import { ListApiOptions, ListOptions, VaultApiGetOptions } from "../types/query-options";
import { User, UserMutable, UserPublicInfo } from "../types/user";
import { EncryptionMetadata } from "../types/encryption";
import { ApiConfig } from "./config";
import { FileGetOptions } from "../core/file";
import { File, Folder } from "../types";
import { Storage } from "../types/storage";

abstract class Api {
  config: ApiConfig
  autoExecute: boolean // if set to true, transactions will be admin signed & executed

  constructor() { }

  abstract getMe(): Promise<User>

  abstract updateMe(input: UserMutable): Promise<User>

  abstract createFile(tx: CreateFileTxPayload): Promise<File>

  abstract updateFile(tx: UpdateFileTxPayload): Promise<File>

  abstract createFolder(tx: CreateFolderTxPayload): Promise<Folder>

  abstract updateFolder(tx: UpdateFolderTxPayload): Promise<Folder>

  abstract createVault(tx: CreateVaultTxPayload): Promise<Vault>

  abstract updateVault(tx: UpdateVaultTxPayload): Promise<Vault>

  abstract createMembership(tx: CreateMembershipTxPayload): Promise<Membership>

  abstract updateMembership(tx: UpdateMembershipTxPayload): Promise<Membership>

  abstract postTransaction(digest: string, signature: string): Promise<any>

  abstract downloadFile(id: string, options?: FileGetOptions): Promise<{ fileData: ArrayBuffer | ReadableStream, metadata: EncryptionMetadata & { vaultId?: string } }>

  abstract getStorageBalance(): Promise<Storage>

  abstract getUserPublicData(email: string): Promise<UserPublicInfo>

  abstract getFile(id: string): Promise<File>

  abstract getFolder(id: string): Promise<Folder>

  abstract getMembership(id: string): Promise<Membership>

  abstract getVault(id: string, options?: VaultApiGetOptions): Promise<Vault>

  abstract getVaults(options?: ListOptions): Promise<Paginated<Vault>>

  abstract getMemberships(options?: ListOptions): Promise<Paginated<Membership>>

  abstract getFiles(options?: ListApiOptions): Promise<Paginated<File>>

  abstract getFolders(options?: ListApiOptions): Promise<Paginated<Folder>>

  abstract getMembershipsByVaultId(vaultId: string, options?: ListOptions): Promise<Paginated<Membership>>

  abstract getMembers(vaultId: string): Promise<Array<Membership>>

  abstract getTransactions(vaultId: string): Promise<Array<Transaction>>
}

export {
  Api
}