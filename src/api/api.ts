import { ContractInput, ContractState, Tags } from "../types/contract";
import { Vault } from "../types/vault";
import { Membership, MembershipKeys } from "../types/membership";
import { Transaction, TxPayload } from "../types/transaction";
import { Paginated } from "../types/paginated";
import { ListApiOptions, ListOptions, ListPaginatedApiOptions, VaultApiGetOptions } from "../types/query-options";
import { User, UserPublicInfo } from "../types/user";
import { EncryptionMetadata } from "../types/encryption";
import { ApiConfig } from "./config";
import { FileGetOptions, FileUploadOptions } from "../core/file";
import { File, Folder} from "../types";
import { Storage, StorageBuyOptions, StorageBuyResponse } from "../types/storage";

abstract class Api {
  config: ApiConfig

  constructor() { }

  abstract postContractTransaction<T>(tx: TxPayload, file?: any, metadata?: any): Promise<T>

  abstract uploadFile(file: ArrayBuffer, tags: Tags, options?: FileUploadOptions): Promise<{ resourceUri: string[], resourceLocation: string }>

  abstract getUploadState(id: string): Promise<{ resourceUri: string[] }>

  abstract getContractState(vaultId: string): Promise<ContractState>

  abstract getFiles(options?: ListApiOptions): Promise<Paginated<File>>

  abstract downloadFile(id: string, options?: FileGetOptions): Promise<{ fileData: ArrayBuffer | ReadableStream, metadata: EncryptionMetadata & { vaultId?: string } }>

  abstract getStorageBalance(): Promise<Storage>
  
  abstract initPayment(amountInGbs: number, options: StorageBuyOptions): Promise<StorageBuyResponse>

  abstract confirmPayment(paymentId: string): Promise<StorageBuyResponse>

  abstract getMembershipKeys(vaultId: string): Promise<MembershipKeys>

  abstract existsUser(email: string): Promise<Boolean>

  abstract getUser(): Promise<User>

  abstract getUserPublicData(email: string): Promise<UserPublicInfo>

  abstract getFile(id: string): Promise<File>

  abstract getFolder(id: string): Promise<Folder>

  abstract getMembership(id: string, vaultId?: string): Promise<Membership>

  abstract getVault(id: string, options?: VaultApiGetOptions): Promise<Vault>

  abstract getVaults(options?: ListOptions): Promise<Paginated<Vault>>

  abstract getMemberships(options?: ListOptions): Promise<Paginated<Membership>>

  abstract getFilesByVaultId(vaultId: string, options?: ListOptions): Promise<Paginated<File>>

  abstract getFoldersByVaultId(vaultId: string, options?: ListOptions): Promise<Paginated<Folder>>

  abstract getMembershipsByVaultId(vaultId: string, options?: ListOptions): Promise<Paginated<Membership>>

  abstract getMembers(vaultId: string): Promise<Array<Membership>>

  abstract getTransactions(vaultId: string): Promise<Array<Transaction>>

  abstract getTransactionTags(id: string): Promise<Tags>

  abstract deleteVault(vaultId: string): Promise<void>
}

export {
  Api
}