import { Api } from "./api";
import { apiConfig } from "./config";
import { ApiClient } from "./api-client";
import { Membership } from "../types/membership";
import { Vault } from "../types/vault";
import {
  CreateFolderTxPayload,
  CreateMembershipTxPayload,
  CreateVaultTxPayload,
  Transaction,
  UpdateFileTxPayload,
  UpdateFolderTxPayload,
  UpdateMembershipTxPayload,
  UpdateVaultTxPayload,
} from "../types/transaction";
import { Paginated } from "../types/paginated";
import {
  ListApiOptions,
  ListOptions,
  VaultApiGetOptions,
} from "../types/query-options";
import { User, UserMutable, UserPublicInfo } from "../types/user";
import { FileGetOptions } from "../core/file";
import { StreamConverter } from "../util/stream-converter";
import { File, Folder } from "../types";
import { Storage } from "../types/storage";
import { ApiKey } from "../types/api-key";
import {
  PaymentPlan,
  PaymentSession,
  PaymentSessionOptions,
} from "../types/payment";
import {
  CreateChallengeRequestPayload,
  GenerateJWTRequestPayload,
  GenerateJWTResponsePayload,
  VerifyChallengeRequestPayload,
} from "../types/auth";
import { Auth } from "../auth";
import { ApiConfig } from "../config";

export const defaultFileUploadOptions = {
  encrypted: true,
};

const DEFAULT_LIMIT = 1000;

export default class TuskyApi extends Api {
  protected auth: Auth;

  constructor(config: ApiConfig) {
    super();
    this.config = apiConfig(config.env);
    this.clientName = config.clientName;
    this.autoExecute = config.autoExecute;
    this.auth = config.auth;
  }

  public async generateJWT(
    payload: GenerateJWTRequestPayload,
  ): Promise<GenerateJWTResponsePayload> {
    return new ApiClient()
      .env(this.config)
      .clientName(this.clientName)
      .auth(this.auth)
      .authProvider(payload.authProvider)
      .grantType(payload.grantType)
      .authCode(payload.authCode)
      .refreshToken(payload.refreshToken)
      .redirectUri(payload.redirectUri)
      .publicRoute(true)
      .generateJWT();
  }

  public async createAuthChallenge(
    payload: CreateChallengeRequestPayload,
  ): Promise<{ nonce: string }> {
    return new ApiClient()
      .env(this.config)
      .clientName(this.clientName)
      .address(payload.address)
      .publicRoute(true)
      .createAuthChallenge();
  }

  public async verifyAuthChallenge(
    payload: VerifyChallengeRequestPayload,
  ): Promise<GenerateJWTResponsePayload> {
    return new ApiClient()
      .env(this.config)
      .clientName(this.clientName)
      .address(payload.address)
      .signature(payload.signature)
      .publicRoute(true)
      .verifyAuthChallenge();
  }

  public async createFolder(tx: CreateFolderTxPayload): Promise<Folder> {
    return new ApiClient()
      .env(this.config)
      .clientName(this.clientName)
      .auth(this.auth)
      .vaultId(tx.vaultId)
      .parentId(tx.parentId)
      .name(tx.name)
      .autoExecute(this.autoExecute)
      .createFolder();
  }

  public async updateFolder(tx: UpdateFolderTxPayload): Promise<Folder> {
    return new ApiClient()
      .env(this.config)
      .clientName(this.clientName)
      .auth(this.auth)
      .resourceId(tx.id)
      .name(tx.name)
      .parentId(tx.parentId)
      .status(tx.status)
      .autoExecute(this.autoExecute)
      .updateFolder();
  }

  public async deleteFolder(id: string): Promise<void> {
    return new ApiClient()
      .env(this.config)
      .clientName(this.clientName)
      .auth(this.auth)
      .resourceId(id)
      .autoExecute(this.autoExecute)
      .deleteFolder();
  }

  public async updateFile(tx: UpdateFileTxPayload): Promise<File> {
    return new ApiClient()
      .env(this.config)
      .clientName(this.clientName)
      .auth(this.auth)
      .resourceId(tx.id)
      .name(tx.name)
      .parentId(tx.parentId)
      .status(tx.status)
      .autoExecute(this.autoExecute)
      .updateFile();
  }

  public async deleteFile(id: string): Promise<void> {
    return new ApiClient()
      .env(this.config)
      .clientName(this.clientName)
      .auth(this.auth)
      .resourceId(id)
      .autoExecute(this.autoExecute)
      .deleteFile();
  }

  public async createVault(tx: CreateVaultTxPayload): Promise<Vault> {
    return new ApiClient()
      .env(this.config)
      .clientName(this.clientName)
      .auth(this.auth)
      .encrypted(tx.encrypted)
      .name(tx.name)
      .description(tx.description)
      .tags(tx.tags)
      .keys(tx.keys)
      .autoExecute(this.autoExecute)
      .createVault();
  }

  public async updateVault(tx: UpdateVaultTxPayload): Promise<Vault> {
    return new ApiClient()
      .env(this.config)
      .clientName(this.clientName)
      .auth(this.auth)
      .resourceId(tx.id)
      .name(tx.name)
      .description(tx.description)
      .tags(tx.tags)
      .status(tx.status)
      .autoExecute(this.autoExecute)
      .updateVault();
  }

  public async deleteVault(id: string): Promise<void> {
    return new ApiClient()
      .env(this.config)
      .clientName(this.clientName)
      .auth(this.auth)
      .resourceId(id)
      .autoExecute(this.autoExecute)
      .deleteVault();
  }

  public async getTrash(): Promise<Folder> {
    return new ApiClient()
      .env(this.config)
      .clientName(this.clientName)
      .auth(this.auth)
      .getTrash();
  }

  public async emptyTrash(): Promise<Folder> {
    return new ApiClient()
      .env(this.config)
      .clientName(this.clientName)
      .auth(this.auth)
      .emptyTrash();
  }

  public async createMembership(
    tx: CreateMembershipTxPayload,
  ): Promise<Membership> {
    return new ApiClient()
      .env(this.config)
      .clientName(this.clientName)
      .auth(this.auth)
      .vaultId(tx.vaultId)
      .address(tx.address)
      .role(tx.role)
      .expiresAt(tx.expiresAt)
      .keys(tx.keys)
      .name(tx.name)
      .encPrivateKey(tx.encPrivateKey)
      .ownerAccess(tx.ownerAccess)
      .allowedStorage(tx.allowedStorage)
      .allowedPaths(tx.allowedPaths)
      .autoExecute(this.autoExecute)
      .createMembership();
  }

  public async updateMembership(
    tx: UpdateMembershipTxPayload,
  ): Promise<Membership> {
    return new ApiClient()
      .env(this.config)
      .clientName(this.clientName)
      .auth(this.auth)
      .resourceId(tx.id)
      .role(tx.role)
      .status(tx.status)
      .expiresAt(tx.expiresAt)
      .keys(tx.keys as any)
      .autoExecute(this.autoExecute)
      .updateMembership();
  }

  public async postTransaction(
    digest: string,
    signature: string,
  ): Promise<any> {
    return new ApiClient()
      .env(this.config)
      .clientName(this.clientName)
      .auth(this.auth)
      .digest(digest)
      .signature(signature)
      .postTransaction();
  }

  public async getMembers(vaultId: string): Promise<Array<Membership>> {
    return new ApiClient()
      .env(this.config)
      .clientName(this.clientName)
      .auth(this.auth)
      .vaultId(vaultId)
      .getMembers();
  }

  public async downloadFile(
    id: string,
    options: FileGetOptions = {},
  ): Promise<ArrayBuffer | ReadableStream<Uint8Array>> {
    const response = await new ApiClient()
      .env(this.config)
      .clientName(this.clientName)
      .auth(this.auth)
      .resourceId(id)
      .encrypted(options.encrypted)
      // .progressHook(options.progressHook)
      // .cancelHook(options.cancelHook)
      .downloadFile();

    let data: ArrayBuffer | ReadableStream<Uint8Array>;
    if (options.responseType === "arraybuffer") {
      data = await response.arrayBuffer();
    } else {
      if (response.body.getReader) {
        data = response.body;
      } else {
        data = StreamConverter.fromAsyncIterable(
          response.body as unknown as AsyncIterable<Uint8Array>,
        );
      }
    }
    return data;
  }

  public async getStorage(): Promise<Storage> {
    return new ApiClient()
      .env(this.config)
      .clientName(this.clientName)
      .auth(this.auth)
      .getStorage();
  }

  public async getPaymentPlans(): Promise<PaymentPlan[]> {
    return new ApiClient()
      .env(this.config)
      .clientName(this.clientName)
      .auth(this.auth)
      .getPaymentPlans();
  }

  public async createSubscriptionPaymentSession(
    options: PaymentSessionOptions,
  ): Promise<PaymentSession> {
    return new ApiClient()
      .env(this.config)
      .clientName(this.clientName)
      .auth(this.auth)
      .data(options)
      .createSubscriptionPaymentSession();
  }

  public async getUserPublicData(email: string): Promise<UserPublicInfo> {
    return new ApiClient()
      .env(this.config)
      .clientName(this.clientName)
      .auth(this.auth)
      .queryParams({ email })
      .getUserPublicData();
  }

  public async getMe(): Promise<User> {
    return new ApiClient()
      .env(this.config)
      .clientName(this.clientName)
      .auth(this.auth)
      .getMe();
  }

  public async updateMe(input: UserMutable): Promise<User> {
    return new ApiClient()
      .env(this.config)
      .clientName(this.clientName)
      .auth(this.auth)
      .name(input.name)
      .picture(input.picture)
      .termsAccepted(input.termsAccepted)
      .encPrivateKey(input.encPrivateKey)
      .encPrivateKeyBackup(input.encPrivateKeyBackup)
      .updateMe();
  }

  public async getFile(id: string): Promise<File> {
    return new ApiClient()
      .env(this.config)
      .clientName(this.clientName)
      .auth(this.auth)
      .resourceId(id)
      .getFile();
  }

  public async getFolder(id: string): Promise<Folder> {
    return new ApiClient()
      .env(this.config)
      .clientName(this.clientName)
      .auth(this.auth)
      .resourceId(id)
      .getFolder();
  }

  public async getMembership(id: string): Promise<Membership> {
    return new ApiClient()
      .env(this.config)
      .clientName(this.clientName)
      .auth(this.auth)
      .resourceId(id)
      .getMembership();
  }

  public async getVault(
    id: string,
    options?: VaultApiGetOptions,
  ): Promise<Vault> {
    return new ApiClient()
      .env(this.config)
      .clientName(this.clientName)
      .auth(this.auth)
      .resourceId(id)
      .queryParams({
        withNodes: options?.withNodes,
        withMemberships: options?.deep,
        withMemos: options?.deep,
        withStacks: options?.deep,
        withFolders: options?.deep,
      })
      .getVault();
  }

  public async getMemberships(
    options: ListOptions = {},
  ): Promise<Paginated<Membership>> {
    return new ApiClient()
      .env(this.config)
      .clientName(this.clientName)
      .auth(this.auth)
      .queryParams({
        limit: options.limit || DEFAULT_LIMIT,
        nextToken: options.nextToken,
      })
      .getMemberships();
  }

  public async getVaults(options: ListOptions = {}): Promise<Paginated<Vault>> {
    return new ApiClient()
      .env(this.config)
      .clientName(this.clientName)
      .auth(this.auth)
      .queryParams({
        status: options.status,
        limit: options.limit || DEFAULT_LIMIT,
        nextToken: options.nextToken,
      })
      .getVaults();
  }

  public async getFiles(
    options: ListApiOptions = {},
  ): Promise<Paginated<File>> {
    return new ApiClient()
      .env(this.config)
      .clientName(this.clientName)
      .auth(this.auth)
      .queryParams({
        vaultId: options.vaultId,
        parentId: options.parentId,
        status: options.status,
        limit: options.limit || DEFAULT_LIMIT,
        nextToken: options.nextToken,
      })
      .getFiles();
  }

  public async getFolders(
    options: ListApiOptions = {},
  ): Promise<Paginated<Folder>> {
    return new ApiClient()
      .env(this.config)
      .clientName(this.clientName)
      .auth(this.auth)
      .queryParams({
        vaultId: options.vaultId,
        parentId: options.parentId,
        status: options.status,
        limit: options.limit || DEFAULT_LIMIT,
        nextToken: options.nextToken,
      })
      .getFolders();
  }

  public async getMembershipsByVaultId(
    vaultId: string,
    options: ListOptions = {},
  ): Promise<Paginated<Membership>> {
    return new ApiClient()
      .env(this.config)
      .clientName(this.clientName)
      .auth(this.auth)
      .vaultId(vaultId)
      .queryParams({
        vaultId: vaultId,
        status: options.status,
        limit: options.limit || DEFAULT_LIMIT,
        nextToken: options.nextToken,
      })
      .getMembershipsByVaultId();
  }

  public async getTransactions(vaultId: string): Promise<Array<Transaction>> {
    return new ApiClient()
      .env(this.config)
      .clientName(this.clientName)
      .auth(this.auth)
      .vaultId(vaultId)
      .getTransactions();
  }

  public async getApiKeys(): Promise<Paginated<ApiKey>> {
    return new ApiClient()
      .env(this.config)
      .clientName(this.clientName)
      .auth(this.auth)
      .getApiKeys();
  }

  public async generateApiKey(): Promise<ApiKey> {
    return new ApiClient()
      .env(this.config)
      .clientName(this.clientName)
      .auth(this.auth)
      .generateApiKey();
  }

  public async revokeApiKey(key: string): Promise<ApiKey> {
    return new ApiClient()
      .env(this.config)
      .clientName(this.clientName)
      .auth(this.auth)
      .resourceId(key)
      .revokeApiKey();
  }
}

export { TuskyApi };
