import { ClientConfig } from "../config";
import { Api } from "./api";
import { apiConfig, ApiConfig } from "./config";
import { ApiClient } from "./api-client";
import { Membership } from "../types/membership";
import { Vault } from "../types/vault";
import { CreateFileTxPayload, CreateFolderTxPayload, CreateMembershipTxPayload, CreateVaultTxPayload, Transaction, UpdateFileTxPayload, UpdateFolderTxPayload, UpdateMembershipTxPayload, UpdateVaultTxPayload } from "../types/transaction";
import { Paginated } from "../types/paginated";
import { ListApiOptions, ListOptions, VaultApiGetOptions } from "../types/query-options";
import { User, UserMutable, UserPublicInfo } from "../types/user";
import { EncryptionMetadata } from "../types/encryption";
import { FileGetOptions } from "../core/file";
import { StreamConverter } from "../util/stream-converter";
import { File, Folder } from "../types";
import { Storage } from "../types/storage";
import { ApiKey } from "../types/api-key";
import { PaymentPlan, PaymentSession, PaymentSessionOptions } from "../types/payment";
import { CreateChallengeRequestPayload, GenerateJWTRequestPayload, GenerateJWTResponsePayload, VerifyChallengeRequestPayload } from "../types/auth";

export const defaultFileUploadOptions = {
  public: false
};

const DEFAULT_LIMIT = 1000;

export default class AkordApi extends Api {

  public config!: ApiConfig;

  constructor(config: ClientConfig) {
    super();
    this.config = apiConfig(config.env);
    this.autoExecute = config.autoExecute;
  }

  public async generateJWT(payload: GenerateJWTRequestPayload): Promise<GenerateJWTResponsePayload> {
    return new ApiClient()
      .env(this.config)
      .authProvider(payload.authProvider)
      .grantType(payload.grantType)
      .authCode(payload.authCode)
      .refreshToken(payload.refreshToken)
      .redirectUri(payload.redirectUri)
      .publicRoute(true)
      .generateJWT();
  };

  public async createAuthChallenge(payload: CreateChallengeRequestPayload): Promise<{ nonce: string }> {
    return new ApiClient()
      .env(this.config)
      .address(payload.address)
      .publicRoute(true)
      .createAuthChallenge();
  };

  public async verifyAuthChallenge(payload: VerifyChallengeRequestPayload): Promise<GenerateJWTResponsePayload> {
    return new ApiClient()
      .env(this.config)
      .address(payload.address)
      .signature(payload.signature)
      .publicRoute(true)
      .verifyAuthChallenge();
  };

  public async createFolder(tx: CreateFolderTxPayload): Promise<Folder> {
    return new ApiClient()
      .env(this.config)
      .vaultId(tx.vaultId)
      .parentId(tx.parentId)
      .name(tx.name)
      .autoExecute(this.autoExecute)
      .createFolder();
  };

  public async updateFolder(tx: UpdateFolderTxPayload): Promise<Folder> {
    return new ApiClient()
      .env(this.config)
      .resourceId(tx.id)
      .name(tx.name)
      .parentId(tx.parentId)
      .status(tx.status)
      .autoExecute(this.autoExecute)
      .updateFolder();
  };

  public async deleteFolder(id: string): Promise<void> {
    return new ApiClient()
      .env(this.config)
      .resourceId(id)
      .autoExecute(this.autoExecute)
      .deleteFolder();
  };

  public async createFile(tx: CreateFileTxPayload): Promise<File> {
    return new ApiClient()
      .env(this.config)
      .file(tx.file)
      .vaultId(tx.vaultId)
      .parentId(tx.parentId)
      .autoExecute(this.autoExecute)
      .createFile();
  };

  public async updateFile(tx: UpdateFileTxPayload): Promise<File> {
    return new ApiClient()
      .env(this.config)
      .resourceId(tx.id)
      .name(tx.name)
      .parentId(tx.parentId)
      .status(tx.status)
      .autoExecute(this.autoExecute)
      .updateFile();
  };

  public async deleteFile(id: string): Promise<void> {
    return new ApiClient()
      .env(this.config)
      .resourceId(id)
      .autoExecute(this.autoExecute)
      .deleteFile();
  };

  public async createVault(tx: CreateVaultTxPayload): Promise<Vault> {
    return new ApiClient()
      .env(this.config)
      .public(tx.public)
      .name(tx.name)
      .description(tx.description)
      .keys(tx.keys)
      .autoExecute(this.autoExecute)
      .createVault();
  };

  public async updateVault(tx: UpdateVaultTxPayload): Promise<Vault> {
    return new ApiClient()
      .env(this.config)
      .resourceId(tx.id)
      .name(tx.name)
      .description(tx.description)
      .status(tx.status)
      .autoExecute(this.autoExecute)
      .updateVault();
  };

  public async deleteVault(id: string): Promise<void> {
    return new ApiClient()
      .env(this.config)
      .resourceId(id)
      .autoExecute(this.autoExecute)
      .deleteVault();
  };

  public async getTrash(): Promise<Folder> {
    return new ApiClient()
      .env(this.config)
      .getTrash();
  }

  public async emptyTrash(): Promise<Folder> {
    return new ApiClient()
      .env(this.config)
      .emptyTrash();
  }

  public async createMembership(tx: CreateMembershipTxPayload): Promise<Membership> {
    return new ApiClient()
      .env(this.config)
      .address(tx.address)
      .role(tx.role)
      .expiresAt(tx.expiresAt)
      .autoExecute(this.autoExecute)
      .createMembership();
  };

  public async updateMembership(tx: UpdateMembershipTxPayload): Promise<Membership> {
    return new ApiClient()
      .env(this.config)
      .resourceId(tx.id)
      .role(tx.role)
      .status(tx.status)
      .expiresAt(tx.expiresAt)
      .autoExecute(this.autoExecute)
      .updateMembership();
  };

  public async postTransaction(digest: string, signature: string): Promise<any> {
    return new ApiClient()
      .env(this.config)
      .digest(digest)
      .signature(signature)
      .postTransaction();
  };

  public async getMembers(vaultId: string): Promise<Array<Membership>> {
    return new ApiClient()
      .env(this.config)
      .vaultId(vaultId)
      .getMembers();
  };

  public async downloadFile(id: string, options: FileGetOptions = {}): Promise<{ fileData: ArrayBuffer | ReadableStream<Uint8Array>, metadata: EncryptionMetadata & { vaultId?: string } }> {
    const { response } = await new ApiClient()
      .env(this.config)
      .resourceId(id)
      .public(options.public)
      // .progressHook(options.progressHook)
      // .cancelHook(options.cancelHook)
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

  public async getStorage(): Promise<Storage> {
    return new ApiClient()
      .env(this.config)
      .getStorage();
  }

  public async getPaymentPlans(): Promise<PaymentPlan[]> {
    return new ApiClient()
      .env(this.config)
      .getPaymentPlans();
  }

  public async createPaymentSession(options: PaymentSessionOptions): Promise<PaymentSession> {
    return new ApiClient()
      .env(this.config)
      .data(options)
      .createPaymentSession();
  }

  public async getUserPublicData(email: string): Promise<UserPublicInfo> {
    return new ApiClient()
      .env(this.config)
      .queryParams({ email })
      .getUserPublicData();
  };

  public async getMe(): Promise<User> {
    return new ApiClient()
      .env(this.config)
      .getMe();
  };

  public async updateMe(input: UserMutable): Promise<User> {
    return new ApiClient()
      .env(this.config)
      .name(input.name)
      .picture(input.picture)
      .termsAccepted(input.termsAccepted)
      .encPrivateKey(input.encPrivateKey)
      .updateMe();
  };

  public async getFile(id: string): Promise<File> {
    return new ApiClient()
      .env(this.config)
      .resourceId(id)
      .getFile();
  };

  public async getFolder(id: string): Promise<Folder> {
    return new ApiClient()
      .env(this.config)
      .resourceId(id)
      .getFolder();
  };

  public async getMembership(id: string): Promise<Membership> {
    return new ApiClient()
      .env(this.config)
      .resourceId(id)
      .getMembership();
  };

  public async getVault(id: string, options?: VaultApiGetOptions): Promise<Vault> {
    return new ApiClient()
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

  public async getMemberships(options: ListOptions = {}): Promise<Paginated<Membership>> {
    return new ApiClient()
      .env(this.config)
      .queryParams({
        limit: options.limit || DEFAULT_LIMIT,
        nextToken: options.nextToken
      })
      .getMemberships();
  };

  public async getVaults(options: ListOptions = {}): Promise<Paginated<Vault>> {
    return new ApiClient()
      .env(this.config)
      .queryParams({
        status: options.status,
        limit: options.limit || DEFAULT_LIMIT,
        nextToken: options.nextToken
      })
      .getVaults();
  };

  public async getFiles(options: ListApiOptions = {}): Promise<Paginated<File>> {
    return new ApiClient()
      .env(this.config)
      .queryParams({
        vaultId: options.vaultId,
        parentId: options.parentId,
        status: options.status,
        limit: options.limit || DEFAULT_LIMIT,
        nextToken: options.nextToken
      })
      .getFiles();
  };

  public async getFolders(options: ListApiOptions = {}): Promise<Paginated<Folder>> {
    return new ApiClient()
      .env(this.config)
      .queryParams({
        vaultId: options.vaultId,
        parentId: options.parentId,
        status: options.status,
        limit: options.limit || DEFAULT_LIMIT,
        nextToken: options.nextToken
      })
      .getFolders();
  };

  public async getMembershipsByVaultId(vaultId: string, options: ListOptions = {}): Promise<Paginated<Membership>> {
    return new ApiClient()
      .env(this.config)
      .vaultId(vaultId)
      .queryParams({
        vaultId: vaultId,
        status: options.status,
        limit: options.limit || DEFAULT_LIMIT,
        nextToken: options.nextToken
      })
      .getMembershipsByVaultId();
  };

  public async getTransactions(vaultId: string): Promise<Array<Transaction>> {
    return new ApiClient()
      .env(this.config)
      .vaultId(vaultId)
      .getTransactions();
  }

  public async getApiKeys(): Promise<Paginated<ApiKey>> {
    return new ApiClient()
      .env(this.config)
      .getApiKeys();
  }

  public async generateApiKey(): Promise<ApiKey> {
    return new ApiClient()
      .env(this.config)
      .generateApiKey();
  }

  public async revokeApiKey(key: string): Promise<ApiKey> {
    return new ApiClient()
      .env(this.config)
      .resourceId(key)
      .revokeApiKey();
  }
}

export {
  AkordApi
}