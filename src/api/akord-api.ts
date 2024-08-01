import { ClientConfig } from "../config";
import { Api } from "./api";
import { apiConfig, ApiConfig } from "./config";
import { ApiClient } from "./api-client";
import { Logger } from "../logger";
import { Membership, MembershipKeys } from "../types/membership";
import { Vault } from "../types/vault";
import { FileTxPayload, FolderTxPayload, Transaction, TxPayload, VaultTxPayload } from "../types/transaction";
import { Paginated } from "../types/paginated";
import { ListApiOptions, ListOptions, VaultApiGetOptions } from "../types/query-options";
import { User, UserPublicInfo } from "../types/user";
import { EncryptionMetadata } from "../types/encryption";
import { FileGetOptions } from "../core/file";
import { StreamConverter } from "../util/stream-converter";
import { File, Folder } from "../types";
import { Storage } from "../types/storage";

export const defaultFileUploadOptions = {
  public: false
};

const RETRY_MAX = 3;
const RETRY_AFTER = 1000;

const DEFAULT_LIMIT = 1000;

export default class AkordApi extends Api {

  public config!: ApiConfig;

  constructor(config: ClientConfig) {
    super();
    this.config = apiConfig(config.env);
  }

  public async postContractTransaction<T>(tx: TxPayload, file?: any): Promise<T> {
    let retryCount = 0;
    let lastError: Error;
    while (retryCount < RETRY_MAX) {
      try {
        const object = await new ApiClient()
          .env(this.config)
          .vaultId(tx.vaultId)
          .file(file)
          .payload(tx)
          .transaction<T>()
        return object;
      } catch (error: any) {
        lastError = error;
        Logger.error(error);
        Logger.error(error.message);
        if (error?.statusCode >= 400 && error?.statusCode < 500) {
          retryCount = RETRY_MAX;
          throw error;
        } else {
          await new Promise(r => setTimeout(r, RETRY_AFTER));
          Logger.warn("Retrying...");
          retryCount++;
          Logger.warn("Retry count: " + retryCount);
        }
      }
    }
    Logger.log(`Request failed after ${RETRY_MAX} attempts.`);
    throw lastError;
  };

  public async createFolder(tx: FolderTxPayload): Promise<{ folder: Folder, digest: string, bytes: string }> {
    return  await new ApiClient()
    .env(this.config)
    .vaultId(tx.vaultId)
    .parentId(tx.parentId)
    .name(tx.name)
    .groupId(tx.groupId)
    .autoExecute(tx.autoExecute)
    .createFolder();
  };

  public async uploadFile(tx: FileTxPayload): Promise<{ file: File, digest: string, bytes: string }> {
    return  await new ApiClient()
    .env(this.config)
    .file(tx.file)
    .groupId(tx.groupId)
    .vaultId(tx.vaultId)
    .parentId(tx.parentId)
    .autoExecute(tx.autoExecute)
    .uploadFile();
  };

  public async createVault(tx: VaultTxPayload): Promise<{ vault: Vault, digest: string, bytes: string }> {
    return  await new ApiClient()
    .env(this.config)
    .groupId(tx.groupId)
    .owner(tx.owner)
    .groupId(tx.groupId)
    .objectId(tx.objectId)
    .membershipId(tx.membershipId)
    .public(tx.public)
    .timestamp(tx.timestamp)
    .autoExecute(tx.autoExecute)
    .name(tx.name)
    .createVault();
  };

  public async postTransaction(digest: string, signature: string): Promise<any> {
    return  await new ApiClient()
    .env(this.config)
    .digest(digest)
    .signature(signature)
    .postTransaction();
  };

  public async getMembers(vaultId: string): Promise<Array<Membership>> {
    return await new ApiClient()
      .env(this.config)
      .vaultId(vaultId)
      .getMembers();
  };

  public async getFiles(options?: ListApiOptions): Promise<Paginated<File>> {
    return await new ApiClient()
      .env(this.config)
      .queryParams({ ...options, raw: true })
      .getFiles();
  }

  public async downloadFile(id: string, options: FileGetOptions = {}): Promise<{ fileData: ArrayBuffer | ReadableStream<Uint8Array>, metadata: EncryptionMetadata & { vaultId?: string } }> {
    const { response } = await new ApiClient()
      .env(this.config)
      .resourceId(id)
      .public(options.public)
      .progressHook(options.progressHook)
      .cancelHook(options.cancelHook)
      .downloadFile();

    let fileData: ArrayBuffer | ReadableStream<Uint8Array>;
    if (options.responseType === 'arraybuffer') {
      fileData = await response.arrayBuffer();
    } else {
      if (response.body.getReader) {
        fileData = response.body;
      } else {
        fileData = StreamConverter.fromAsyncIterable(response.body as unknown as AsyncIterable<Uint8Array>);
      }
    }
    const metadata = {
      encryptedKey: response.headers.get("x-amz-meta-encrypted-key") || response.headers.get("x-amz-meta-encryptedkey"),
      iv: response.headers.get("x-amz-meta-initialization-vector") || response.headers.get("x-amz-meta-iv"),
      vaultId: response.headers.get("x-amz-meta-vault-id")
    };
    return { fileData, metadata };
  };

  public async getStorageBalance(): Promise<Storage> {
    return await new ApiClient()
      .env(this.config)
      .getStorageBalance();
  }

  public async existsUser(email: string): Promise<Boolean> {
    return await new ApiClient()
      .env(this.config)
      .queryParams({ email })
      .existsUser();
  }

  public async getUserPublicData(email: string): Promise<UserPublicInfo> {
    return await new ApiClient()
      .env(this.config)
      .queryParams({ email })
      .getUserPublicData();
  };

  public async getUser(): Promise<User> {
    return await new ApiClient()
      .env(this.config)
      .getUser();
  };

  public async deleteVault(vaultId: string): Promise<void> {
    await new ApiClient()
      .env(this.config)
      .vaultId(vaultId)
      .deleteVault();
  }

  public async getFile(id: string): Promise<File> {
    return await new ApiClient()
      .env(this.config)
      .resourceId(id)
      .getFile();
  };

  public async getFolder(id: string): Promise<Folder> {
    return await new ApiClient()
      .env(this.config)
      .resourceId(id)
      .getFolder();
  };

  public async getMembership(id: string): Promise<Membership> {
    return await new ApiClient()
      .env(this.config)
      .resourceId(id)
      .getMembership();
  };

  public async getVault(id: string, options?: VaultApiGetOptions): Promise<Vault> {
    return await new ApiClient()
      .env(this.config)
      .resourceId(id)
      .queryParams({
        withNodes: options?.withNodes,
        withMemberships: options?.deep,
        withMemos: options?.deep,
        withStacks: options?.deep,
        withFolders: options?.deep,
      })
      .getVault();
  };

  public async getMembershipKeys(vaultId: string): Promise<MembershipKeys> {
    return await new ApiClient()
      .env(this.config)
      .vaultId(vaultId)
      .getMembershipKeys();
  };

  public async getMemberships(options: ListOptions = {}): Promise<Paginated<Membership>> {
    return await new ApiClient()
      .env(this.config)
      .queryParams({
        limit: options.limit || DEFAULT_LIMIT,
        nextToken: options.nextToken
      })
      .getMemberships();
  };

  public async getVaults(options: ListOptions = {}): Promise<Paginated<Vault>> {
    return await new ApiClient()
      .env(this.config)
      .queryParams({
        tags: JSON.stringify(options.tags ? options.tags : {}),
        filter: JSON.stringify(options.filter ? options.filter : {}),
        limit: options.limit || DEFAULT_LIMIT,
        nextToken: options.nextToken
      })
      .getVaults();
  };

  public async getFilesByVaultId(vaultId: string, options: ListOptions = {}): Promise<Paginated<File>> {
    return await new ApiClient()
      .env(this.config)
      .vaultId(vaultId)
      .queryParams({
        parentId: options.parentId,
        filter: JSON.stringify(options.filter ? options.filter : {}),
        limit: options.limit || DEFAULT_LIMIT,
        nextToken: options.nextToken
      })
      .getFilesByVaultId();
  };

  public async getFoldersByVaultId(vaultId: string, options: ListOptions = {}): Promise<Paginated<Folder>> {
    return await new ApiClient()
      .env(this.config)
      .vaultId(vaultId)
      .queryParams({
        parentId: options.parentId,
        filter: JSON.stringify(options.filter ? options.filter : {}),
        limit: options.limit || DEFAULT_LIMIT,
        nextToken: options.nextToken
      })
      .getFoldersByVaultId();
  };

  public async getMembershipsByVaultId(vaultId: string, options: ListOptions = {}): Promise<Paginated<Membership>> {
    return await new ApiClient()
      .env(this.config)
      .vaultId(vaultId)
      .queryParams({
        filter: JSON.stringify(options.filter ? options.filter : {}),
        limit: options.limit || DEFAULT_LIMIT,
        nextToken: options.nextToken
      })
      .getMembershipsByVaultId();
  };

  public async getTransactions(vaultId: string): Promise<Array<Transaction>> {
    return await new ApiClient()
      .env(this.config)
      .vaultId(vaultId)
      .getTransactions();
  }
}

export {
  AkordApi
}
