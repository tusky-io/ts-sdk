import { ClientConfig } from "../config";
import { Api } from "./api";
import { apiConfig, ApiConfig } from "./config";
import { ApiClient } from "./api-client";
import { Logger } from "../logger";
import { Membership, MembershipKeys, RoleType } from "../types/membership";
import { ContractInput, ContractState, Tags } from "../types/contract";
import { NodeType, StorageType } from "../types/node";
import { Vault } from "../types/vault";
import { Transaction } from "../types/transaction";
import { Paginated } from "../types/paginated";
import { ListApiOptions, ListOptions, ListPaginatedApiOptions, VaultApiGetOptions } from "../types/query-options";
import { User, UserPublicInfo } from "../types/user";
import { EncryptionMetadata } from "../types/encryption";
import { FileUploadOptions, FileGetOptions } from "../core/file";
import { StreamConverter } from "../util/stream-converter";
import { ZipLog, ZipUploadApiOptions } from "../types/zip";
import { FileVersion } from "../types";
import { Storage, StorageBuyOptions, StorageBuyResponse } from "../types/storage";

export const defaultFileUploadOptions = {
  storage: StorageType.ARWEAVE,
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

  public async postContractTransaction<T>(vaultId: string, input: ContractInput, tags: Tags, state?: any, overrideState?: boolean, metadata?: any): Promise<{ id: string, object: T }> {
    let retryCount = 0;
    let lastError: Error;
    while (retryCount < RETRY_MAX) {
      try {
        const { id, object } = await new ApiClient()
          .env(this.config)
          .vaultId(vaultId)
          .metadata(metadata)
          .input(input)
          .state(state, overrideState)
          .tags(tags)
          .transaction<T>()
        Logger.log("Uploaded contract interaction with id: " + id);
        return { id, object };
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

  public async getMembers(vaultId: string): Promise<Array<Membership>> {
    return await new ApiClient()
      .env(this.config)
      .vaultId(vaultId)
      .getMembers();
  };

  public async initContractId(tags: Tags, state?: any): Promise<string> {
    const contractId = await new ApiClient()
      .env(this.config)
      .tags(tags)
      .state(state)
      .contract()
    Logger.log("Created contract with id: " + contractId);
    return contractId;
  };

  public async uploadFile(file: ArrayBuffer, tags: Tags, options: FileUploadOptions = defaultFileUploadOptions): Promise<{ resourceUri: string[], resourceLocation: string }> {
    const uploadOptions = {
      ...defaultFileUploadOptions,
      ...options
    }
    const resource = await new ApiClient()
      .env(this.config)
      .data(file)
      .tags(tags)
      .public(uploadOptions.public)
      .storage(uploadOptions.storage)
      .progressHook(uploadOptions.progressHook)
      .cancelHook(uploadOptions.cancelHook)
      .uploadFile()
    Logger.log("Uploaded file with uri: " + resource.resourceUri);

    return resource;
  };

  public async getUploadState(id: string): Promise<{ resourceUri: string[] }> {
    try {
      const resource = await new ApiClient()
        .env(this.config)
        .resourceId(id)
        .getUploadState()

      return resource;
    } catch (error) {
      return null; // upload state not saved yet
    }
  };

  public async getFiles(options?: ListApiOptions): Promise<Paginated<FileVersion>> {
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
    console.log(response.headers)
    const metadata = {
      encryptedKey: response.headers.get("x-amz-meta-encrypted-key") || response.headers.get("x-amz-meta-encryptedkey"),
      iv: response.headers.get("x-amz-meta-initialization-vector") || response.headers.get("x-amz-meta-iv"),
      vaultId: response.headers.get("x-amz-meta-vault-id")
    };
    return { fileData, metadata };
  };

  public async getZipLogs(options?: ListPaginatedApiOptions): Promise<Paginated<ZipLog>> {
    return await new ApiClient()
      .env(this.config)
      .queryParams(options)
      .getZipLogs();
  }

  public async uploadZip(file: ArrayBuffer, vaultId: string, options: ZipUploadApiOptions = {}): Promise<{ sourceId: string, multipartToken?: string }> {
    return await new ApiClient()
      .env(this.config)
      .data(file)
      .queryParams({ ...options, vaultId })
      .progressHook(options.progressHook)
      .cancelHook(options.cancelHook)
      .uploadZip();
  };

  public async getStorageBalance(): Promise<Storage> {
    return await new ApiClient()
      .env(this.config)
      .getStorageBalance();
  }

  public async initPayment(amountInGbs: number, options: StorageBuyOptions = {}): Promise<StorageBuyResponse> {
    return await new ApiClient()
      .env(this.config)
      .data({ quantity: amountInGbs, ...options })
      .postPayments();
  }

  public async confirmPayment(paymentId: string): Promise<StorageBuyResponse> {
    return await new ApiClient()
      .env(this.config)
      .confirmPayment(paymentId);
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


  public async updateUser(name: string, avatarUri: string[]): Promise<void> {
    await new ApiClient()
      .env(this.config)
      .data({
        name: name,
        avatarUri: avatarUri
      })
      .updateUser();
  };

  public async deleteVault(vaultId: string): Promise<void> {
    await new ApiClient()
      .env(this.config)
      .vaultId(vaultId)
      .deleteVault();
  }

  public async inviteNewUser(vaultId: string, email: string, role: RoleType, message?: string): Promise<{ id: string }> {
    return await new ApiClient()
      .env(this.config)
      .vaultId(vaultId)
      .data({
        email: email,
        role: role
      })
      .metadata({ message })
      .invite();
  }

  public async revokeInvite(vaultId: string, membershipId: string): Promise<{ id: string }> {
    return await new ApiClient()
      .env(this.config)
      .vaultId(vaultId)
      .resourceId(membershipId)
      .revokeInvite();
  }

  public async inviteResend(vaultId: string, membershipId: string): Promise<{ id: string }> {
    return await new ApiClient()
      .env(this.config)
      .vaultId(vaultId)
      .resourceId(membershipId)
      .inviteResend();
  }

  public async getNode<T>(id: string, type: NodeType): Promise<T> {
    return await new ApiClient()
      .env(this.config)
      .resourceId(id)
      .queryParams({ type })
      .getNode();
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

  public async getNodeState(stateId: string): Promise<any> {
    return await new ApiClient()
      .env(this.config)
      .resourceId(stateId)
      .downloadState()
  };

  public async getContractState(objectId: string): Promise<ContractState> {
    const contract = await new ApiClient()
      .env(this.config)
      .vaultId(objectId)
      .getContract();
    return contract.state;
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

  public async getNodesByVaultId<T>(vaultId: string, type: NodeType, options: ListOptions = {}): Promise<Paginated<T>> {
    return await new ApiClient()
      .env(this.config)
      .vaultId(vaultId)
      .queryParams({
        type,
        parentId: options.parentId,
        tags: JSON.stringify(options.tags ? options.tags : {}),
        filter: JSON.stringify(options.filter ? options.filter : {}),
        limit: options.limit || DEFAULT_LIMIT,
        nextToken: options.nextToken
      })
      .getNodesByVaultId<T>();
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

  public async getTransactionTags(id: string): Promise<Tags> {
    return await new ApiClient()
      .env(this.config)
      .resourceId(id)
      .getTransactionTags();
  }
}

export {
  AkordApi
}
