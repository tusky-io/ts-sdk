import { ContractInput, ContractState, Tags } from "../types/contract";
import { Vault } from "../types/vault";
import { Membership, MembershipKeys } from "../types/membership";
import { Transaction } from "../types/transaction";
import { Paginated } from "../types/paginated";
import { ListApiOptions, ListOptions, ListPaginatedApiOptions, VaultApiGetOptions } from "../types/query-options";
import { User, UserPublicInfo } from "../types/user";
import { EncryptionMetadata } from "../types/encryption";
import { ApiConfig } from "./config";
import { FileGetOptions, FileUploadOptions } from "../core/file";
import { ZipLog, ZipUploadApiOptions } from "../types/zip";
import { FileVersion } from "../types";
import { Storage, StorageBuyOptions, StorageBuyResponse } from "../types/storage";

abstract class Api {
  config: ApiConfig

  constructor() { }

  abstract postContractTransaction<T>(vaultId: string, input: ContractInput, tags: Tags, state?: any, overrideState?: boolean, metadata?: any): Promise<{ id: string, object: T }>

  abstract initContractId(tags: Tags, state?: any): Promise<string>

  abstract uploadFile(file: ArrayBuffer, tags: Tags, options?: FileUploadOptions): Promise<{ resourceUri: string[], resourceLocation: string }>

  abstract getUploadState(id: string): Promise<{ resourceUri: string[] }>

  abstract getZipLogs(options?: ListPaginatedApiOptions): Promise<Paginated<ZipLog>>

  abstract uploadZip(file: ArrayBuffer, vaultId: string, options?: ZipUploadApiOptions): Promise<{ sourceId: string, multipartToken?: string }>

  abstract getContractState(vaultId: string): Promise<ContractState>

  abstract getFiles(options?: ListApiOptions): Promise<Paginated<FileVersion>>

  abstract downloadFile(id: string, options?: FileGetOptions): Promise<{ fileData: ArrayBuffer | ReadableStream, metadata: EncryptionMetadata & { vaultId?: string } }>

  abstract getStorageBalance(): Promise<Storage>
  
  abstract initPayment(amountInGbs: number, options: StorageBuyOptions): Promise<StorageBuyResponse>

  abstract confirmPayment(paymentId: string): Promise<StorageBuyResponse>

  abstract getMembershipKeys(vaultId: string): Promise<MembershipKeys>

  abstract existsUser(email: string): Promise<Boolean>

  abstract getUser(): Promise<User>

  abstract getUserPublicData(email: string): Promise<UserPublicInfo>

  abstract getNode<T>(id: string, type: string, vaultId?: string): Promise<T>

  abstract getMembership(id: string, vaultId?: string): Promise<Membership>

  abstract getVault(id: string, options?: VaultApiGetOptions): Promise<Vault>

  abstract getNodeState(stateId: string): Promise<any>

  abstract getVaults(options?: ListOptions): Promise<Paginated<Vault>>

  abstract getMemberships(options?: ListOptions): Promise<Paginated<Membership>>

  abstract getNodesByVaultId<T>(vaultId: string, type: string, options?: ListOptions): Promise<Paginated<T>>

  abstract getMembershipsByVaultId(vaultId: string, options?: ListOptions): Promise<Paginated<Membership>>

  abstract getMembers(vaultId: string): Promise<Array<Membership>>

  abstract getTransactions(vaultId: string): Promise<Array<Transaction>>

  abstract getTransactionTags(id: string): Promise<Tags>

  abstract updateUser(name: string, avatarUri: string[]): Promise<void>

  abstract deleteVault(vaultId: string): Promise<void>

  abstract inviteNewUser(vaultId: string, email: string, role: string, message?: string): Promise<{ id: string }>

  abstract revokeInvite(vaultId: string, membershipId: string): Promise<{ id: string }>

  abstract inviteResend(vaultId: string, membershipId: string): Promise<{ id: string }>
}

export {
  Api
}