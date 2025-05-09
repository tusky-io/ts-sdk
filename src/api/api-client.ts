import { AxiosInstance, AxiosRequestConfig, AxiosRequestHeaders } from "axios";
import { v4 as uuidv4 } from "uuid";
import { Membership } from "../types/membership";
import { Paginated } from "../types/paginated";
import { Vault } from "../types/vault";
import { Auth } from "../auth";
import { retryableErrors, throwError } from "../errors/error-factory";
import { BadRequest } from "../errors/bad-request";
import { User } from "../types/user";
import { AllowedPaths, EncryptedVaultKeyPair, File, Folder } from "../types";
import fetch from "cross-fetch";
import { Storage } from "../types/storage";
import { logger } from "../logger";
import { httpClient } from "./http";
import { ApiKey } from "../types/api-key";
import { GenerateJWTResponsePayload } from "../types/auth";
import { InternalError } from "../errors/internal-error";
import { Collection } from "../types/collection";
import { NFT } from "../types/nft";

export class ApiClient {
  private _apiUrl: string;
  private _cdnUrl: string;

  private _auth: Auth;

  // API endpoints
  private _meUri: string = "me";
  private _keysUri: string = "keys";
  private _vaultUri: string = "vaults";
  private _fileUri: string = "files";
  private _folderUri: string = "folders";
  private _trashUri: string = "trash";
  private _membershipUri: string = "members";
  private _apiKeyUri: string = "api-keys";
  private _storageUri: string = "storage";
  private _subscriptionUri: string = "subscriptions";
  private _collectionUri: string = "collections";
  private _nftUri: string = "nfts";

  // path params
  private _resourceId: string;

  // request body
  private _name: string;
  private _status: string;
  private _vaultId: string;
  private _parentId: string;

  // auth specific
  private _authProvider: string;
  private _redirectUri: string;
  private _refreshToken: string;
  private _authCode: string;
  private _grantType: string;

  // vault specific
  private _encrypted: boolean;
  private _description: string;
  private _tags: Array<string>;
  private _keys: Array<EncryptedVaultKeyPair>;

  // member specific
  private _address: string;
  private _role: string;
  private _expiresAt: number;
  private _allowedStorage: number;
  private _allowedPaths: AllowedPaths;
  private _ownerAccess: string;

  // file specific
  private _numberOfChunks: number;

  // user specific
  private _picture: string;
  private _trashExpiration: number;

  // user encryption specific
  private _publicKey: string;
  private _encPrivateKey: string;
  private _encPrivateKeyBackup: string;

  // nft specific
  private _recipient: string;
  private _thumbnailUrl: string;
  private _projectUrl: string;
  private _creator: string;
  private _link: string;

  private _signature: string;
  private _digest: string;

  private _sdkVersion: string = `Tusky-SDK/${process.env.VERSION || "dev"}`;
  private _clientName: string;

  private _groupId: string;

  // axios
  private _httpClient: AxiosInstance;

  private _data: any = {};
  private _queryParams: any = {};
  private _progressId: string;
  private _progressHook: (
    percentageProgress: number,
    bytesProgress?: number,
    id?: string,
  ) => void;
  private _cancelHook: AbortController;

  // auxiliar
  private _publicRoute: boolean;
  private _totalBytes: number;
  private _uploadedBytes: number;

  constructor() {
    this._httpClient = httpClient;
  }

  clone(): ApiClient {
    const clone = new ApiClient();
    clone._apiUrl = this._apiUrl;
    clone._cdnUrl = this._cdnUrl;
    clone._auth = this._auth;
    clone._resourceId = this._resourceId;
    clone._vaultId = this._vaultId;
    clone._numberOfChunks = this._numberOfChunks;
    clone._encrypted = this._encrypted;
    clone._signature = this._signature;
    clone._digest = this._digest;
    clone._name = this._name;
    clone._description = this._description;
    clone._recipient = this._recipient;
    clone._thumbnailUrl = this._thumbnailUrl;
    clone._projectUrl = this._projectUrl;
    clone._creator = this._creator;
    clone._link = this._link;
    clone._tags = this._tags;
    clone._keys = this._keys;
    clone._address = this._address;
    clone._role = this._role;
    clone._expiresAt = this._expiresAt;
    clone._allowedStorage = this._allowedStorage;
    clone._allowedPaths = this._allowedPaths;
    clone._picture = this._picture;
    clone._trashExpiration = this._trashExpiration;
    clone._publicKey = this._publicKey;
    clone._encPrivateKey = this._encPrivateKey;
    clone._encPrivateKeyBackup = this._encPrivateKeyBackup;
    clone._ownerAccess = this._ownerAccess;

    clone._authProvider = this._authProvider;
    clone._redirectUri = this._redirectUri;
    clone._refreshToken = this._refreshToken;
    clone._authCode = this._authCode;
    clone._grantType = this._grantType;

    clone._status = this._status;
    clone._vaultId = this._vaultId;
    clone._parentId = this._parentId;
    clone._sdkVersion = this._clientName;
    clone._clientName = this._clientName;
    clone._groupId = this._groupId;
    clone._queryParams = this._queryParams;
    clone._progressId = this._progressId;
    clone._progressHook = this._progressHook;
    clone._cancelHook = this._cancelHook;
    clone._totalBytes = this._totalBytes;
    clone._uploadedBytes = this._uploadedBytes;
    clone._publicRoute = this._publicRoute;
    return clone;
  }

  env(config: { apiUrl: string; cdnUrl: string }): ApiClient {
    this._apiUrl = config.apiUrl;
    this._cdnUrl = config.cdnUrl;
    return this;
  }

  auth(auth: Auth): ApiClient {
    this._auth = auth;
    return this;
  }

  resourceId(resourceId: string): ApiClient {
    this._resourceId = resourceId;
    return this;
  }

  status(status: string): ApiClient {
    this._status = status;
    return this;
  }

  encrypted(encrypted: boolean): ApiClient {
    this._encrypted = encrypted;
    return this;
  }

  publicRoute(publicRoute: boolean): ApiClient {
    this._publicRoute = publicRoute;
    return this;
  }

  keys(keys: Array<EncryptedVaultKeyPair>): ApiClient {
    this._keys = keys;
    return this;
  }

  description(description: string): ApiClient {
    this._description = description;
    return this;
  }

  recipient(recipient: string): ApiClient {
    this._recipient = recipient;
    return this;
  }

  thumbnailUrl(thumbnailUrl: string): ApiClient {
    this._thumbnailUrl = thumbnailUrl;
    return this;
  }

  projectUrl(projectUrl: string): ApiClient {
    this._projectUrl = projectUrl;
    return this;
  }

  creator(creator: string): ApiClient {
    this._creator = creator;
    return this;
  }

  link(link: string): ApiClient {
    this._link = link;
    return this;
  }

  tags(tags: string[]): ApiClient {
    this._tags = tags;
    return this;
  }

  vaultId(vaultId: string): ApiClient {
    this._vaultId = vaultId;
    return this;
  }

  clientName(clientName: string): ApiClient {
    this._clientName = clientName;
    return this;
  }

  groupId(groupId: string): ApiClient {
    this._groupId = groupId;
    return this;
  }

  signature(signature: string): ApiClient {
    this._signature = signature;
    return this;
  }

  parentId(parentId: any): ApiClient {
    this._parentId = parentId;
    return this;
  }

  name(name: string): ApiClient {
    this._name = name;
    return this;
  }

  role(role: string): ApiClient {
    this._role = role;
    return this;
  }

  expiresAt(expiresAt: number): ApiClient {
    this._expiresAt = expiresAt;
    return this;
  }

  allowedStorage(allowedStorage: number): ApiClient {
    this._allowedStorage = allowedStorage;
    return this;
  }

  allowedPaths(allowedPaths: AllowedPaths): ApiClient {
    this._allowedPaths = allowedPaths;
    return this;
  }

  picture(picture: string): ApiClient {
    this._picture = picture;
    return this;
  }

  trashExpiration(trashExpiration: number): ApiClient {
    this._trashExpiration = trashExpiration;
    return this;
  }

  publicKey(publicKey: string): ApiClient {
    this._publicKey = publicKey;
    return this;
  }

  encPrivateKey(encPrivateKey: string): ApiClient {
    this._encPrivateKey = encPrivateKey;
    return this;
  }

  encPrivateKeyBackup(encPrivateKeyBackup: string): ApiClient {
    this._encPrivateKeyBackup = encPrivateKeyBackup;
    return this;
  }

  ownerAccess(ownerAccess: string): ApiClient {
    this._ownerAccess = ownerAccess;
    return this;
  }

  authProvider(authProvider: string): ApiClient {
    this._authProvider = authProvider;
    return this;
  }

  redirectUri(redirectUri: string): ApiClient {
    this._redirectUri = redirectUri;
    return this;
  }

  refreshToken(refreshToken: string): ApiClient {
    this._refreshToken = refreshToken;
    return this;
  }

  authCode(authCode: string): ApiClient {
    this._authCode = authCode;
    return this;
  }

  grantType(grantType: string): ApiClient {
    this._grantType = grantType;
    return this;
  }

  address(address: string): ApiClient {
    this._address = address;
    return this;
  }

  digest(digest: string): ApiClient {
    this._digest = digest;
    return this;
  }

  data(data: any): ApiClient {
    this._data = data;
    return this;
  }

  queryParams(queryParams: any): ApiClient {
    if (queryParams) {
      const params = Object.fromEntries(
        Object.entries(queryParams).filter(([_, value]) => value),
      );
      this._queryParams = { ...this._queryParams, ...params };
    } else {
      this._queryParams = {};
    }
    return this;
  }

  totalBytes(totalBytes: number): ApiClient {
    this._totalBytes = totalBytes;
    return this;
  }

  loadedBytes(uploadedBytes: number): ApiClient {
    this._uploadedBytes = uploadedBytes;
    return this;
  }

  progressHook(
    hook: (
      percentageProgress: number,
      bytesProgress?: number,
      id?: string,
    ) => void,
    id?: string,
  ): ApiClient {
    this._progressHook = hook;
    this._progressId = id || uuidv4();
    return this;
  }

  cancelHook(hook: AbortController): ApiClient {
    this._cancelHook = hook;
    return this;
  }

  numberOfChunks(numberOfChunks: number): ApiClient {
    this._numberOfChunks = numberOfChunks;
    return this;
  }

  /**
   * Fetch currently authenticated user
   * @returns {Promise<User>}
   */
  async getMe(): Promise<User> {
    const me = await this.get(`${this._apiUrl}/${this._meUri}`);
    return new User(me);
  }

  /**
   * Update currently authenticated user
   * @uses:
   * - name()
   * - picture()
   * - encPrivateKey()
   * - encPrivateKeyBackup()
   * @returns {Promise<User>}
   */
  async updateMe(): Promise<User> {
    if (
      !this._name &&
      !this._picture &&
      !this._encPrivateKey &&
      !this._encPrivateKeyBackup
    ) {
      throw new BadRequest("Nothing to update.");
    }
    this.data({
      name: this._name,
      picture: this._picture,
      encPrivateKey: this._encPrivateKey,
      encPrivateKeyBackup: this._encPrivateKeyBackup,
    });

    return this.patch(`${this._apiUrl}/${this._meUri}`);
  }

  /**
   * Create user encryption keys backup
   * @uses:
   * - publicKey()
   * - encPrivateKey()
   * - encPrivateKeyBackup()
   * @returns {Promise<User>}
   */
  async createEncryptionKeys(): Promise<User> {
    if (!this._publicKey && !this._encPrivateKey) {
      throw new BadRequest("Nothing to create.");
    }
    this.data({
      publicKey: this._publicKey,
      encPrivateKey: this._encPrivateKey,
      encPrivateKeyBackup: this._encPrivateKeyBackup,
    });

    return this.post(`${this._apiUrl}/${this._meUri}/${this._keysUri}`);
  }

  /**
   * Update currently authenticated user encryption keys backup
   * @uses:
   * - publicKey()
   * - encPrivateKey()
   * - encPrivateKeyBackup()
   * @returns {Promise<User>}
   */
  async updateEncryptionKeys(): Promise<User> {
    if (
      !this._publicKey &&
      !this._encPrivateKey &&
      !this._encPrivateKeyBackup
    ) {
      throw new BadRequest("Nothing to update.");
    }
    this.data({
      publicKey: this._publicKey,
      encPrivateKey: this._encPrivateKey,
      encPrivateKeyBackup: this._encPrivateKeyBackup,
    });

    return this.patch(`${this._apiUrl}/${this._meUri}/${this._keysUri}`);
  }

  /**
   * Deletes currently authenticated user encryption keys
   * @returns {Promise<void>}
   */
  async deleteEncryptionKeys(): Promise<void> {
    return this.delete(`${this._apiUrl}/${this._meUri}/${this._keysUri}`);
  }

  /**
   *
   * @uses:
   * - vaultId()
   * @returns {Promise<Paginated<Membership>>}
   */
  async getMembers(): Promise<Paginated<Membership>> {
    return this.get(
      `${this._apiUrl}/${this._vaultUri}/${this._vaultId}/members`,
    );
  }

  /**
   * Get memberships for currently authenticated user
   * @uses:
   * - queryParams() - limit, nextToken
   * @returns {Promise<Paginated<Membership>>}
   */
  async getMemberships(): Promise<Paginated<Membership>> {
    return this.get(`${this._apiUrl}/${this._membershipUri}`);
  }

  /**
   * Get vaults for currently authenticated user
   * @uses:
   * - queryParams() - status, limit, nextToken
   * @returns {Promise<Paginated<Vault>>}
   */
  async getVaults(): Promise<Paginated<Vault>> {
    return this.get(`${this._apiUrl}/${this._vaultUri}`);
  }

  /**
   * Get files for currently authenticated user
   * @uses:
   * - queryParams() - vaultId, parentId, status, limit, nextToken
   * @returns {Promise<Paginated<File>>}
   */
  async getFiles(): Promise<Paginated<File>> {
    return this.get(`${this._apiUrl}/files`);
  }

  /**
   * Get folders for currently authenticated user
   * @uses:
   * - queryParams() - status, vaultId, parentId, limit, nextToken
   * @returns {Promise<Paginated<Folder>>}
   */
  async getFolders(): Promise<Paginated<Folder>> {
    return this.get(`${this._apiUrl}/folders`);
  }

  /**
   * Get memberships by vault id
   * @uses:
   * - vaultId()
   * - queryParams() - status, limit, nextToken
   * @returns {Promise<Paginated<Membership>>}
   */
  async getMembershipsByVaultId(): Promise<Paginated<Membership>> {
    return this.get(
      `${this._apiUrl}/${this._vaultUri}/${this._vaultId}/${this._membershipUri}`,
    );
  }

  /**
   * Get file by id
   * @uses:
   * - resourceId()
   * @returns {Promise<File>}
   */
  async getFile(): Promise<File> {
    return this.get(`${this._apiUrl}/files/${this._resourceId}`);
  }

  /**
   * Get folder by id
   * @uses:
   * - resourceId()
   * @returns {Promise<Folder>}
   */
  async getFolder(): Promise<Folder> {
    return this.get(`${this._apiUrl}/folders/${this._resourceId}`);
  }

  /**
   * Get membership by id
   * @uses:
   * - resourceId()
   * @returns {Promise<Membership>}
   */
  async getMembership(): Promise<Membership> {
    return this.get(
      `${this._apiUrl}/${this._vaultUri}/${this._membershipUri}/${this._resourceId}`,
    );
  }

  /**
   * Get vault by id
   * @uses:
   * - resourceId()
   * - queryParams() - withNodes, withMemberships, withMemos, withStacks, withFolders
   * @returns {Promise<Vault>}
   */
  async getVault(): Promise<Vault> {
    return this.get(`${this._apiUrl}/${this._vaultUri}/${this._resourceId}`);
  }

  /**
   * Get user api keys
   * @returns {Promise<Paginated<ApiKey>>}
   */
  async getApiKeys(): Promise<Paginated<ApiKey>> {
    return this.get(`${this._apiUrl}/${this._apiKeyUri}`);
  }

  /**
   * Generate new api key
   * @uses:
   * - resourceId()
   * @returns {Promise<ApiKey>}
   */
  async generateApiKey(): Promise<ApiKey> {
    return this.post(`${this._apiUrl}/${this._apiKeyUri}`);
  }

  /**
   * Revoke an existing api key
   * @uses:
   * - resourceId()
   * @returns {Promise<ApiKey>}
   */
  async revokeApiKey(): Promise<ApiKey> {
    return this.delete(
      `${this._apiUrl}/${this._apiKeyUri}/${this._resourceId}`,
    );
  }

  /**
   * Get nft collections for currently authenticated user
   * @uses:
   * - queryParams() - limit, nextToken
   * @returns {Promise<Paginated<Collection>>}
   */
  async getCollections(): Promise<Paginated<Collection>> {
    return this.get(`${this._apiUrl}/${this._collectionUri}`);
  }

  /**
   * Get nfts for currently authenticated user
   * @uses:
   * - queryParams() - status, limit, nextToken
   * @returns {Promise<Paginated<NFT>>}
   */
  async getNfts(): Promise<Paginated<NFT>> {
    return this.get(`${this._apiUrl}/${this._nftUri}`);
  }

  /**
   * Get nft by id
   * @uses:
   * - resourceId()
   * @returns {Promise<NFT>}
   */
  async getNft(): Promise<NFT> {
    return this.get(`${this._apiUrl}/${this._nftUri}/${this._resourceId}`);
  }

  /**
   * Get collection by id
   * @uses:
   * - resourceId()
   * @returns {Promise<Collection>}
   */
  async getCollection(): Promise<Collection> {
    return this.get(
      `${this._apiUrl}/${this._collectionUri}/${this._resourceId}`,
    );
  }

  /**
   *
   * @requires:
   * - name()
   * @uses:
   * - description()
   * @returns {Promise<NFT>}
   */
  async mintNft(): Promise<NFT> {
    if (!this._name) {
      throw new BadRequest(
        "Missing name input. Use ApiClient#name() to add it",
      );
    }

    this.data({
      name: this._name,
      description: this._description,
      fileId: this._resourceId,
      recipient: this._recipient,
      link: this._link,
      creator: this._creator,
      thumbnailUrl: this._thumbnailUrl,
      projectUrl: this._projectUrl,
    });

    return this.post(`${this._apiUrl}/${this._nftUri}`);
  }

  /**
   *
   * @requires:
   * @uses:
   * - description()
   * @returns {Promise<NFT>}
   */
  async mintCollection(): Promise<Collection> {
    this.data({
      description: this._description,
      folderId: this._resourceId,
      recipient: this._recipient,
      link: this._link,
      creator: this._creator,
      thumbnailUrl: this._thumbnailUrl,
      projectUrl: this._projectUrl,
    });

    return this.post(`${this._apiUrl}/${this._collectionUri}`);
  }

  async post(url: string): Promise<any> {
    return this.fetch("post", url);
  }

  async put(url: string): Promise<any> {
    return this.fetch("put", url);
  }

  async patch(url: string): Promise<any> {
    return this.fetch("patch", url);
  }

  async get(url: string): Promise<any> {
    return this.fetch("get", url);
  }

  async delete(url: string): Promise<any> {
    return this.fetch("delete", url);
  }

  async fetch(method: string, url: string): Promise<any> {
    const config = {
      method,
      url: this._queryParams
        ? this.addQueryParams(url, this._queryParams)
        : url,
      headers: {
        "Content-Type": "application/json",
        ...this.getCustomHeaders(),
        ...(!this._publicRoute
          ? await this._auth.getAuthorizationHeader()
          : {}),
      },
    } as AxiosRequestConfig;
    if (this._data) {
      config.data = this._data;
    }
    logger.info(`Request ${config.method}: ` + config.url);
    logger.debug(config);

    return await retry(async () => {
      try {
        const response = await this._httpClient(config);
        return response.data;
      } catch (error) {
        logger.debug(config);
        throwError(error.response?.status, error.response?.data?.msg, error);
      }
    });
  }

  addQueryParams = function (url: string, params: any) {
    const queryParams = new URLSearchParams(JSON.parse(JSON.stringify(params)));
    url += "?" + queryParams.toString();
    return url;
  };

  /**
   *
   * @requires:
   * - resourceId()
   * @uses:
   * - name()
   * - parentId()
   * - status()
   * @returns {Promise<File>}
   */
  async updateFile(): Promise<File> {
    if (!this._resourceId) {
      throw new BadRequest(
        "Missing resource id input. Use ApiClient#resourceId() to add it",
      );
    }
    this.data({
      name: this._name,
      parentId: this._parentId,
      status: this._status,
    });
    return this.patch(`${this._apiUrl}/${this._fileUri}/${this._resourceId}`);
  }

  /**
   *
   * @requires:
   * - resourceId()
   * @returns {Promise<void>}
   */
  async deleteFile(): Promise<void> {
    if (!this._resourceId) {
      throw new BadRequest(
        "Missing resource id input. Use ApiClient#resourceId() to add it",
      );
    }
    return this.delete(`${this._apiUrl}/${this._fileUri}/${this._resourceId}`);
  }

  /**
   *
   * @requires:
   * - vaultId()
   * - name()
   * @uses:
   * - parentId()
   * @returns {Promise<Folder>}
   */
  async createFolder(): Promise<Folder> {
    if (!this._vaultId) {
      throw new BadRequest(
        "Missing vault id input. Use ApiClient#vaultId() to add it",
      );
    }
    if (!this._name) {
      throw new BadRequest(
        "Missing name input. Use ApiClient#name() to add it",
      );
    }

    this.data({
      vaultId: this._vaultId,
      parentId: this._parentId,
      name: this._name,
    });

    return this.post(`${this._apiUrl}/${this._folderUri}`);
  }

  /**
   *
   * @requires:
   * - vaultId()
   * @uses:
   * - parentId()
   * @returns {Promise<Folder>}
   */
  async createFolderTree(): Promise<{ folderIdMap: Record<string, string> }> {
    if (!this._vaultId) {
      throw new BadRequest(
        "Missing vault id input. Use ApiClient#vaultId() to add it",
      );
    }
    if (!this._data) {
      throw new BadRequest(
        "Missing name input. Use ApiClient#data() to add it",
      );
    }

    this.data({
      vaultId: this._vaultId,
      parentId: this._parentId,
      paths: this._data,
    });

    return this.post(`${this._apiUrl}/${this._folderUri}/tree`);
  }

  /**
   *
   * @requires:
   * - address()
   * @returns {Promise<string>}
   */
  async createAuthChallenge(): Promise<{ nonce: string }> {
    if (!this._address) {
      throw new BadRequest(
        "Missing address input. Use ApiClient#address() to add it",
      );
    }

    this.data({
      address: this._address,
    });

    return this.post(`${this._apiUrl}/auth/create-challenge`);
  }

  /**
   *
   * @requires:
   * - address()
   * - signature()
   * @returns {Promise<string>}
   */
  async verifyAuthChallenge(): Promise<GenerateJWTResponsePayload> {
    if (!this._address) {
      throw new BadRequest(
        "Missing address input. Use ApiClient#address() to add it",
      );
    }

    if (!this._signature) {
      throw new BadRequest(
        "Missing signature input. Use ApiClient#signature() to add it",
      );
    }

    this.data({
      address: this._address,
      signature: this._signature,
    });

    return this.post(`${this._apiUrl}/auth/verify-challenge`);
  }

  /**
   *
   * @requires:
   * - authProvider()
   * - grantType()
   * @uses:
   * - redirectUri()
   * - code()
   * - refreshToken()
   * @returns {Promise<string>}
   */
  async generateJWT(): Promise<GenerateJWTResponsePayload> {
    if (!this._authProvider) {
      throw new BadRequest(
        "Missing authProvider input. Use ApiClient#authProvider() to add it",
      );
    }

    if (!this._grantType) {
      throw new BadRequest(
        "Missing grantType input. Use ApiClient#grantType() to add it",
      );
    }

    this.data({
      authProvider: this._authProvider,
      grantType: this._grantType,
      redirectUri: this._redirectUri,
      code: this._authCode,
      refreshToken: this._refreshToken,
    });

    return this.post(`${this._apiUrl}/auth/token`);
  }

  /**
   *
   * @requires:
   * - resourceId()
   * @uses:
   * - name()
   * - parentId()
   * - status()
   * @returns {Promise<Folder>}
   */
  async updateFolder(): Promise<Folder> {
    if (!this._resourceId) {
      throw new BadRequest(
        "Missing resource id input. Use ApiClient#resourceId() to add it",
      );
    }
    this.data({
      name: this._name,
      parentId: this._parentId,
      status: this._status,
    });

    return this.patch(`${this._apiUrl}/${this._folderUri}/${this._resourceId}`);
  }

  /**
   *
   * @requires:
   * - resourceId()
   * @returns {Promise<void>}
   */
  async deleteFolder(): Promise<void> {
    if (!this._resourceId) {
      throw new BadRequest(
        "Missing resource id input. Use ApiClient#resourceId() to add it",
      );
    }
    return this.delete(
      `${this._apiUrl}/${this._folderUri}/${this._resourceId}`,
    );
  }

  /**
   *
   * @requires:
   * - name()
   * @uses:
   * - description()
   * - encrypted()
   * - tags()
   * - keys()
   * @returns {Promise<Vault>}
   */
  async createVault(): Promise<Vault> {
    if (!this._name) {
      throw new BadRequest(
        "Missing name input. Use ApiClient#name() to add it",
      );
    }

    this.data({
      name: this._name,
      description: this._description,
      encrypted: this._encrypted,
      tags: this._tags,
      keys: this._keys,
    });

    return this.post(`${this._apiUrl}/${this._vaultUri}`);
  }

  /**
   *
   * @requires:
   * - resourceId()
   * @uses:
   * - name()
   * - description()
   * - status()
   * @returns {Promise<Vault>}
   */
  async updateVault(): Promise<Vault> {
    if (!this._resourceId) {
      throw new BadRequest(
        "Missing resource id input. Use ApiClient#resourceId() to add it",
      );
    }
    this.data({
      name: this._name,
      description: this._description,
      tags: this._tags,
      status: this._status,
    });
    return this.patch(`${this._apiUrl}/${this._vaultUri}/${this._resourceId}`);
  }

  /**
   *
   * @requires:
   * - resourceId()
   * @returns {Promise<void>}
   */
  async deleteVault(): Promise<void> {
    if (!this._resourceId) {
      throw new BadRequest(
        "Missing resource id input. Use ApiClient#resourceId() to add it",
      );
    }
    return this.delete(`${this._apiUrl}/${this._vaultUri}/${this._resourceId}`);
  }

  async getTrash(): Promise<Folder> {
    const data = await this.get(`${this._apiUrl}/${this._trashUri}`);
    return new Folder(data);
  }

  async emptyTrash(): Promise<Folder> {
    const data = await this.delete(`${this._apiUrl}/${this._trashUri}`);
    return new Folder(data);
  }

  /**
   *
   * @requires:
   * - vaultId()
   * - address()
   * - role()
   * @uses:
   * - expiresAt()
   * - keys()
   * - encPrivateKey()
   * - allowedStorage()
   * - allowedPaths()
   * @returns {Promise<Membership>}
   */
  async createMembership(): Promise<Membership> {
    if (!this._vaultId) {
      throw new BadRequest(
        "Missing address input. Use ApiClient#vaultId() to add it",
      );
    }
    if (!this._address) {
      throw new BadRequest(
        "Missing address input. Use ApiClient#address() to add it",
      );
    }
    if (!this._role) {
      throw new BadRequest(
        "Missing role input. Use ApiClient#role() to add it",
      );
    }

    this.data({
      address: this._address,
      role: this._role,
      expiresAt: this._expiresAt,
      name: this._name,
      keys: this._keys,
      encPrivateKey: this._encPrivateKey,
      ownerAccess: this._ownerAccess,
      allowedStorage: this._allowedStorage,
      allowedPaths: this._allowedPaths,
    });

    return this.post(
      `${this._apiUrl}/${this._vaultUri}/${this._vaultId}/${this._membershipUri}`,
    );
  }

  /**
   *
   * @requires:
   * - resourceId()
   * @uses:
   * - role()
   * - expiresAt()
   * - status()
   * - keys()
   * @returns {Promise<Membership>}
   */
  async updateMembership(): Promise<Membership> {
    if (!this._resourceId) {
      throw new BadRequest(
        "Missing resource id input. Use ApiClient#resourceId() to add it",
      );
    }
    this.data({
      role: this._role,
      expiresAt: this._expiresAt,
      status: this._status,
      keys: this._keys,
    });
    return this.patch(
      `${this._apiUrl}/${this._vaultUri}/${this._membershipUri}/${this._resourceId}`,
    );
  }

  /**
   *
   * @requires:
   * - resourceId()
   * @uses:
   * - keys()
   * @returns {Promise<void>}
   */
  async deleteMembership(): Promise<void> {
    if (!this._resourceId) {
      throw new BadRequest(
        "Missing resource id input. Use ApiClient#resourceId() to add it",
      );
    }
    this.data({
      keys: this._keys,
    });
    return this.delete(
      `${this._apiUrl}/${this._vaultUri}/${this._membershipUri}/${this._resourceId}`,
    );
  }

  /**
   *
   * @requires:
   * - resourceId()
   * @uses:
   * - responseType()
   * - encrypted()
   * - progressHook()
   * - cancelHook()
   * - numberOfChunks()
   */
  async downloadFile() {
    if (!this._resourceId) {
      throw new BadRequest(
        "Missing resource id to download. Use ApiClient#resourceId() to add it",
      );
    }

    const config = {
      method: "get",
      signal: this._cancelHook ? this._cancelHook.signal : null,
      headers: this.getCustomHeaders(),
    } as RequestInit;

    const url = `${this._cdnUrl}/${this._resourceId}`;

    logger.info(`Request ${config.method}: ` + url);

    try {
      const response = await fetch(url, config);
      return response;
    } catch (error) {
      throwError(error.response?.status, error.response?.data?.msg, error);
    }
  }

  async getStorage(): Promise<Storage> {
    const data = await this.get(`${this._apiUrl}/${this._storageUri}`);
    return new Storage(data);
  }

  private getCustomHeaders(): AxiosRequestHeaders {
    const headers = {
      "SDK-Version": this._sdkVersion,
    };
    if (this._clientName) {
      headers["Client-Name"] = this._clientName;
    }
    return headers;
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function retry<T>(
  fn: () => Promise<T>,
  force: boolean = false,
  retries: number = 5,
  delayMs: number = 1000,
): Promise<T> {
  let attempt = 0;

  while (attempt < retries) {
    try {
      return await fn();
    } catch (error) {
      if (force || retryableErrors.some((type) => error instanceof type)) {
        attempt++;
        logger.warn(`Retry attempt ${attempt} failed. Retrying...`);
        if (attempt >= retries) {
          throw error;
        }
        await delay(delayMs);
      } else {
        throw error;
      }
    }
  }
  throw new InternalError("Retry attempts exceeded");
}
