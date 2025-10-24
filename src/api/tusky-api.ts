import { Api } from "./api";
import { apiConfig } from "./config";
import { ApiClient } from "./api-client";
import { Membership } from "../types/membership";
import { Vault } from "../types/vault";
import {
  CreateFolderTreeTxPayload,
  CreateFolderTxPayload,
  CreateMembershipTxPayload,
  CreateVaultTxPayload,
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
import { User, UserEncryptionKeys, UserMutable } from "../types/user";
import { FileGetOptions } from "../core/file";
import { StreamConverter } from "../util/stream-converter";
import { File, Folder } from "../types";
import { Storage } from "../types/storage";
import { ApiKey } from "../types/api-key";
import {
  CreateChallengeRequestPayload,
  GenerateJWTRequestPayload,
  GenerateJWTResponsePayload,
  VerifyChallengeRequestPayload,
} from "../types/auth";
import { Auth } from "../auth";
import { ApiConfig } from "../config";
import { Collection } from "../types/collection";
import { NFT } from "../types/nft";
import { CollectionMetadata, NFTMetadata } from "../core/nft";

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
      .createFolder();
  }

  public async createFolderTree(
    tx: CreateFolderTreeTxPayload,
  ): Promise<{ folderIdMap: Record<string, string> }> {
    return new ApiClient()
      .env(this.config)
      .clientName(this.clientName)
      .auth(this.auth)
      .vaultId(tx.vaultId)
      .parentId(tx.parentId)
      .data(tx.paths)
      .createFolderTree();
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
      .updateFolder();
  }

  public async deleteFolder(id: string): Promise<void> {
    return new ApiClient()
      .env(this.config)
      .clientName(this.clientName)
      .auth(this.auth)
      .resourceId(id)
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
      .updateFile();
  }

  public async deleteFile(id: string): Promise<void> {
    return new ApiClient()
      .env(this.config)
      .clientName(this.clientName)
      .auth(this.auth)
      .resourceId(id)
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
      .updateVault();
  }

  public async purgeVault(id: string): Promise<void> {
    return new ApiClient()
      .env(this.config)
      .clientName(this.clientName)
      .auth(this.auth)
      .resourceId(id)
      .purgeVault();
  }

  public async deleteVault(id: string): Promise<void> {
    return new ApiClient()
      .env(this.config)
      .clientName(this.clientName)
      .auth(this.auth)
      .resourceId(id)
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
      .updateMembership();
  }

  public async deleteMembership(tx: UpdateMembershipTxPayload): Promise<void> {
    return new ApiClient()
      .env(this.config)
      .clientName(this.clientName)
      .auth(this.auth)
      .resourceId(tx.id)
      .keys(tx.keys as any)
      .deleteMembership();
  }

  public async getMembers(
    options: ListApiOptions = {},
  ): Promise<Paginated<Membership>> {
    return new ApiClient()
      .env(this.config)
      .clientName(this.clientName)
      .auth(this.auth)
      .vaultId(options.vaultId)
      .queryParams({
        limit: options.limit || DEFAULT_LIMIT,
        nextToken: options.nextToken,
      })
      .getMembers();
  }

  public async downloadFile(
    id: string,
    options: FileGetOptions = {},
  ): Promise<{
    data: ArrayBuffer | ReadableStream<Uint8Array>;
    headers: Headers;
  }> {
    const response = await new ApiClient()
      .env(this.config)
      .clientName(this.clientName)
      .auth(this.auth)
      .resourceId(id)
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
    return { data, headers: response.headers };
  }

  public async getStorage(): Promise<Storage> {
    return new ApiClient()
      .env(this.config)
      .clientName(this.clientName)
      .auth(this.auth)
      .getStorage();
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
      .updateMe();
  }

  public async verifyMe(): Promise<void> {
    return new ApiClient()
      .env(this.config)
      .clientName(this.clientName)
      .auth(this.auth)
      .verifyMe();
  }

  public async createEncryptionKeys(input: UserEncryptionKeys): Promise<User> {
    return new ApiClient()
      .env(this.config)
      .clientName(this.clientName)
      .auth(this.auth)
      .publicKey(input.publicKey)
      .encPrivateKey(input.encPrivateKey)
      .encPrivateKeyBackup(input.encPrivateKeyBackup)
      .createEncryptionKeys();
  }

  public async updateEncryptionKeys(input: UserEncryptionKeys): Promise<User> {
    return new ApiClient()
      .env(this.config)
      .clientName(this.clientName)
      .auth(this.auth)
      .publicKey(input.publicKey)
      .encPrivateKey(input.encPrivateKey)
      .encPrivateKeyBackup(input.encPrivateKeyBackup)
      .updateEncryptionKeys();
  }

  public async deleteEncryptionKeys(): Promise<void> {
    return new ApiClient()
      .env(this.config)
      .clientName(this.clientName)
      .auth(this.auth)
      .deleteEncryptionKeys();
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
    options: ListApiOptions & { uploadId?: string } = {},
  ): Promise<Paginated<File>> {
    return new ApiClient()
      .env(this.config)
      .clientName(this.clientName)
      .auth(this.auth)
      .queryParams({
        vaultId: options.vaultId,
        parentId: options.parentId,
        uploadId: options.uploadId,
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

  public async getCollection(id: string): Promise<Collection> {
    return new ApiClient()
      .env(this.config)
      .clientName(this.clientName)
      .auth(this.auth)
      .resourceId(id)
      .getCollection();
  }

  public async getNft(id: string): Promise<NFT> {
    return new ApiClient()
      .env(this.config)
      .clientName(this.clientName)
      .auth(this.auth)
      .resourceId(id)
      .getNft();
  }

  public async getNfts(options: ListOptions = {}): Promise<Paginated<NFT>> {
    return new ApiClient()
      .env(this.config)
      .clientName(this.clientName)
      .auth(this.auth)
      .queryParams({
        status: options.status,
        parentId: options.parentId,
        limit: options.limit || DEFAULT_LIMIT,
        nextToken: options.nextToken,
      })
      .getNfts();
  }

  public async getCollections(
    options: ListOptions = {},
  ): Promise<Paginated<Collection>> {
    return new ApiClient()
      .env(this.config)
      .clientName(this.clientName)
      .auth(this.auth)
      .queryParams({
        status: options.status,
        parentId: options.parentId,
        limit: options.limit || DEFAULT_LIMIT,
        nextToken: options.nextToken,
      })
      .getCollections();
  }

  public async mintNft(tx: NFTMetadata): Promise<NFT> {
    return new ApiClient()
      .env(this.config)
      .clientName(this.clientName)
      .auth(this.auth)
      .name(tx.name)
      .description(tx.description)
      .recipient(tx.recipient)
      .creator(tx.creator)
      .thumbnailUrl(tx.thumbnailUrl)
      .link(tx.link)
      .projectUrl(tx.projectUrl)
      .resourceId(tx.fileId)
      .mintNft();
  }

  public async mintCollection(tx: CollectionMetadata): Promise<Collection> {
    return new ApiClient()
      .env(this.config)
      .clientName(this.clientName)
      .auth(this.auth)
      .description(tx.description)
      .recipient(tx.recipient)
      .creator(tx.creator)
      .thumbnailUrl(tx.thumbnailUrl)
      .link(tx.link)
      .projectUrl(tx.projectUrl)
      .resourceId(tx.folderId)
      .mintCollection();
  }
}

export { TuskyApi };
