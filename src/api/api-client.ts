import { AxiosInstance, AxiosRequestConfig } from "axios";
import { v4 as uuidv4 } from "uuid";
import { Membership } from "../types/membership";
import { Transaction } from "../types/transaction";
import { Paginated } from "../types/paginated";
import { Vault } from "../types/vault";
import { Auth } from "../auth";
import { retryableErrors, throwError } from "../errors/error-factory";
import { BadRequest } from "../errors/bad-request";
import { User, UserPublicInfo } from "../types/user";
import { EncryptedVaultKeyPair, File, Folder } from "../types";
import fetch from "cross-fetch";
import { Storage } from "../types/storage";
import { logger } from "../logger";
import { httpClient } from "./http";
import { ApiKey } from "../types/api-key";
import { PaymentPlan, PaymentSession } from "../types/payment";
import { GenerateJWTResponsePayload } from "../types/auth";
import { InternalError } from "../errors/internal-error";

export class ApiClient {
  private _apiUrl: string;
  private _cdnUrl: string;

  private _auth: Auth;

  // API endpoints
  private _meUri: string = "me";
  private _vaultUri: string = "vaults";
  private _fileUri: string = "files";
  private _folderUri: string = "folders";
  private _trashUri: string = "trash";
  private _membershipUri: string = "members";
  private _transactionUri: string = "transactions";
  private _userUri: string = "users";
  private _apiKeyUri: string = "api-keys";
  private _storageUri: string = "storage";
  private _paymentUri: string = "payments";

  // path params
  private _resourceId: string;

  // request body
  private _name: string
  private _status: string
  private _vaultId: string;
  private _parentId: string;

  // auth specific
  private _authProvider: string;
  private _redirectUri: string;
  private _refreshToken: string;
  private _authCode: string
  private _grantType: string

  // vault specific
  private _public: boolean
  private _description: string
  private _keys: Array<EncryptedVaultKeyPair>

  // member specific
  private _address: string;
  private _role: string;
  private _expiresAt: number;
  private _allowedStorage: number;
  private _contextPath: string;

  // file specific
  private _numberOfChunks: number;

  // user specific
  private _picture: string;
  private _termsAccepted: boolean;
  private _trashExpiration: number;
  private _encPrivateKey: string;
  private _encPrivateKeyBackup: string;

  private _autoExecute: boolean

  private _signature: string
  private _digest: string

  private _userAgent: string
  private _groupId: string

  // axios
  private _httpClient: AxiosInstance;

  private _data: any = {};
  private _queryParams: any = {};
  private _progressId: string;
  private _progressHook: (
    percentageProgress: number,
    bytesProgress?: number,
    id?: string
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
    clone._public = this._public;
    clone._signature = this._signature;
    clone._digest = this._digest;
    clone._name = this._name;
    clone._description = this._description;
    clone._keys = this._keys;
    clone._address = this._address;
    clone._role = this._role;
    clone._expiresAt = this._expiresAt;
    clone._allowedStorage = this._allowedStorage;
    clone._contextPath = this._contextPath;
    clone._picture = this._picture;
    clone._trashExpiration = this._trashExpiration;
    clone._termsAccepted = this._termsAccepted;
    clone._encPrivateKey = this._encPrivateKey;
    clone._encPrivateKeyBackup = this._encPrivateKeyBackup;

    clone._authProvider = this._authProvider;
    clone._redirectUri = this._redirectUri;
    clone._refreshToken = this._refreshToken;
    clone._authCode = this._authCode;
    clone._grantType = this._grantType;

    clone._status = this._status;
    clone._autoExecute = this._autoExecute;
    clone._vaultId = this._vaultId;
    clone._parentId = this._parentId;
    clone._userAgent = this._userAgent;
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

  env(config: {
    apiUrl: string;
    cdnUrl: string;
  }): ApiClient {
    this._apiUrl = config.apiUrl;
    this._cdnUrl = config.cdnUrl
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

  public(isPublic: boolean): ApiClient {
    this._public = isPublic;
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

  vaultId(vaultId: string): ApiClient {
    this._vaultId = vaultId;
    return this;
  }

  userAgent(userAgent: string): ApiClient {
    this._userAgent = userAgent;
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

  contextPath(contextPath: string): ApiClient {
    this._contextPath = contextPath;
    return this;
  }

  picture(picture: string): ApiClient {
    this._picture = picture;
    return this;
  }

  termsAccepted(termsAccepted: boolean): ApiClient {
    this._termsAccepted = termsAccepted;
    return this;
  }

  trashExpiration(trashExpiration: number): ApiClient {
    this._trashExpiration = trashExpiration;
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

  autoExecute(autoExecute: boolean): ApiClient {
    this._autoExecute = autoExecute;
    return this;
  }

  data(data: any): ApiClient {
    this._data = data;
    return this;
  }

  queryParams(queryParams: any): ApiClient {
    if (queryParams) {
      const params = Object.fromEntries(
        Object.entries(queryParams).filter(([_, value]) => value)
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
      id?: string
    ) => void,
    id?: string
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
   * - termsAccepted()
   * - encPrivateKey()
   * - encPrivateKeyBackup()
   * @returns {Promise<User>}
   */
  async updateMe(): Promise<User> {
    if (!this._name && !this._picture && !this._termsAccepted && !this._encPrivateKey && !this._encPrivateKeyBackup) {
      throw new BadRequest("Nothing to update.");
    }
    this.data({
      name: this._name,
      picture: this._picture,
      termsAccepted: this._termsAccepted,
      encPrivateKey: this._encPrivateKey,
      encPrivateKeyBackup: this._encPrivateKeyBackup
    });

    return this.patch(`${this._apiUrl}/${this._meUri}`);
  }

  /**
   *
   * @uses:
   * - queryParams() - email
   * @returns {Promise<UserPublicInfo>}
   */
  async getUserPublicData(): Promise<UserPublicInfo> {
    return this.get(`${this._apiUrl}/${this._userUri}`);
  }

  /**
   *
   * @uses:
   * - vaultId()
   * @returns {Promise<Array<Membership>>}
   */
  async getMembers(): Promise<Array<Membership>> {
    return this.get(
      `${this._apiUrl}/${this._vaultUri}/${this._vaultId}/members`
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
    return this.get(
      `${this._apiUrl}/files`
    );
  }


  /**
   * Get folders for currently authenticated user
   * @uses:
   * - queryParams() - status, vaultId, parentId, limit, nextToken
   * @returns {Promise<Paginated<Folder>>}
   */
  async getFolders(): Promise<Paginated<Folder>> {
    return this.get(
      `${this._apiUrl}/folders`
    );
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
      `${this._apiUrl}/${this._vaultUri}/${this._vaultId}/${this._membershipUri}`
    );
  }

  /**
   * Get file by id
   * @uses:
   * - resourceId()
   * @returns {Promise<File>}
   */
  async getFile(): Promise<File> {
    return this.get(
      `${this._apiUrl}/files/${this._resourceId}`
    );
  }

  /**
   * Get folder by id
   * @uses:
   * - resourceId()
   * @returns {Promise<Folder>}
   */
  async getFolder(): Promise<Folder> {
    return this.get(
      `${this._apiUrl}/folders/${this._resourceId}`
    );
  }

  /**
   * Get membership by id
   * @uses:
   * - resourceId()
   * @returns {Promise<Membership>}
   */
  async getMembership(): Promise<Membership> {
    return this.get(
      `${this._apiUrl}/${this._vaultUri}/${this._membershipUri}/${this._resourceId}`
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
    return this.get(
      `${this._apiUrl}/${this._vaultUri}/${this._resourceId}`
    );
  }

  /**
   * Get transactions by vault id
   * @uses:
   * - vaultId()
   * @returns {Promise<Array<Transaction>>}
   */
  async getTransactions(): Promise<Array<Transaction>> {
    return this.get(
      `${this._apiUrl}/${this._transactionUri}`
    );
  }

  /**
   * Get user api keys
   * @returns {Promise<Paginated<ApiKey>>}
   */
  async getApiKeys(): Promise<Paginated<ApiKey>> {
    return this.get(
      `${this._apiUrl}/${this._apiKeyUri}`
    );
  }

  async getPaymentPlans(): Promise<PaymentPlan[]> {
    return this.get(`${this._apiUrl}/${this._paymentUri}`);
  }

  /**
   * Generate new api key
   * @uses:
   * - resourceId()
   * @returns {Promise<ApiKey>}
   */
  async generateApiKey(): Promise<ApiKey> {
    return this.post(
      `${this._apiUrl}/${this._apiKeyUri}`
    );
  }


  /**
   * Revoke an existing api key
   * @uses:
   * - resourceId()
   * @returns {Promise<ApiKey>}
   */
  async revokeApiKey(): Promise<ApiKey> {
    return this.delete(
      `${this._apiUrl}/${this._apiKeyUri}/${this._resourceId}`
    );
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
        ...(!this._publicRoute ? (await this._auth.getAuthorizationHeader()) : {})
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
        logger.debug(error);
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
   * - autoExecute()
   * @returns {Promise<File>}
   */
  async updateFile(): Promise<File> {
    if (!this._resourceId) {
      throw new BadRequest(
        "Missing resource id input. Use ApiClient#resourceId() to add it"
      );
    }
    this.data({
      name: this._name,
      parentId: this._parentId,
      status: this._status,
      autoExecute: this._autoExecute
    });
    return this.patch(`${this._apiUrl}/${this._fileUri}/${this._resourceId}`);
  }

  /**
   *
   * @requires:
   * - resourceId()
   * @uses:
   * - autoExecute()
   * @returns {Promise<void>}
   */
  async deleteFile(): Promise<void> {
    if (!this._resourceId) {
      throw new BadRequest(
        "Missing resource id input. Use ApiClient#resourceId() to add it"
      );
    }
    this.data({ autoExecute: this._autoExecute });
    return this.delete(`${this._apiUrl}/${this._fileUri}/${this._resourceId}`);
  }

  /**
   *
   * @requires:
   * - vaultId()
   * - name()
   * @uses:
   * - autoExecute()
   * - parentId()
   * @returns {Promise<Folder>}
   */
  async createFolder(): Promise<Folder> {
    if (!this._vaultId) {
      throw new BadRequest(
        "Missing vault id input. Use ApiClient#vaultId() to add it"
      );
    }
    if (!this._name) {
      throw new BadRequest(
        "Missing name input. Use ApiClient#name() to add it"
      );
    }

    this.data({
      vaultId: this._vaultId,
      parentId: this._parentId,
      name: this._name,
      autoExecute: this._autoExecute
    });

    return this.post(`${this._apiUrl}/${this._folderUri}`);
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
        "Missing address input. Use ApiClient#address() to add it"
      );
    }

    this.data({
      address: this._address
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
        "Missing address input. Use ApiClient#address() to add it"
      );
    }

    if (!this._signature) {
      throw new BadRequest(
        "Missing signature input. Use ApiClient#signature() to add it"
      );
    }

    this.data({
      address: this._address,
      signature: this._signature
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
        "Missing authProvider input. Use ApiClient#authProvider() to add it"
      );
    }

    if (!this._grantType) {
      throw new BadRequest(
        "Missing grantType input. Use ApiClient#grantType() to add it"
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
   * - autoExecute()
   * @returns {Promise<Folder>}
   */
  async updateFolder(): Promise<Folder> {
    if (!this._resourceId) {
      throw new BadRequest(
        "Missing resource id input. Use ApiClient#resourceId() to add it"
      );
    }
    this.data({
      name: this._name,
      parentId: this._parentId,
      status: this._status,
      autoExecute: this._autoExecute
    });

    return this.patch(`${this._apiUrl}/${this._folderUri}/${this._resourceId}`);
  }

  /**
   *
   * @requires:
   * - resourceId()
   * @uses:
   * - autoExecute()
   * @returns {Promise<void>}
   */
  async deleteFolder(): Promise<void> {
    if (!this._resourceId) {
      throw new BadRequest(
        "Missing resource id input. Use ApiClient#resourceId() to add it"
      );
    }
    this.data({ autoExecute: this._autoExecute });
    return this.delete(`${this._apiUrl}/${this._folderUri}/${this._resourceId}`);
  }

  /**
   *
   * @requires:
   * - name()
   * @uses:
   * - description()
   * - public()
   * - keys()
   * - autoExecute()
   * @returns {Promise<Vault>}
   */
  async createVault(): Promise<Vault> {
    if (!this._name) {
      throw new BadRequest(
        "Missing name input. Use ApiClient#name() to add it"
      );
    }

    this.data({
      name: this._name,
      description: this._description,
      public: this._public,
      keys: this._keys,
      autoExecute: this._autoExecute
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
  * - autoExecute()
  * @returns {Promise<Vault>}
  */
  async updateVault(): Promise<Vault> {
    if (!this._resourceId) {
      throw new BadRequest(
        "Missing resource id input. Use ApiClient#resourceId() to add it"
      );
    }
    this.data({
      name: this._name,
      description: this._description,
      status: this._status,
      autoExecute: this._autoExecute
    });
    return this.patch(`${this._apiUrl}/${this._vaultUri}/${this._resourceId}`);
  }

  /**
  *
  * @requires:
  * - resourceId()
  * @uses:
  * - autoExecute()
  * @returns {Promise<void>}
  */
  async deleteVault(): Promise<void> {
    if (!this._resourceId) {
      throw new BadRequest(
        "Missing resource id input. Use ApiClient#resourceId() to add it"
      );
    }
    this.data({ autoExecute: this._autoExecute });
    return this.delete(`${this._apiUrl}/${this._vaultUri}/${this._resourceId}`);
  }

  async getTrash(): Promise<Folder> {
    const data = this.get(`${this._apiUrl}/${this._trashUri}`);
    return new Folder(data);
  }

  async emptyTrash(): Promise<Folder> {
    const data = this.delete(`${this._apiUrl}/${this._trashUri}`);
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
   * - contextPath()
   * - autoExecute()
   * @returns {Promise<Membership>}
   */
  async createMembership(): Promise<Membership> {
    if (!this._vaultId) {
      throw new BadRequest(
        "Missing address input. Use ApiClient#vaultId() to add it"
      );
    }
    if (!this._address) {
      throw new BadRequest(
        "Missing address input. Use ApiClient#address() to add it"
      );
    }
    if (!this._role) {
      throw new BadRequest(
        "Missing role input. Use ApiClient#role() to add it"
      );
    }

    this.data({
      address: this._address,
      role: this._role,
      expiresAt: this._expiresAt,
      name: this._name,
      keys: this._keys,
      encPrivateKey: this._encPrivateKey,
      allowedStorage: this._allowedStorage,
      contextPath: this._contextPath,
      autoExecute: this._autoExecute
    });

    return this.post(`${this._apiUrl}/${this._vaultUri}/${this._vaultId}/${this._membershipUri}`);
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
  * - autoExecute()
  * @returns {Promise<Membership>}
  */
  async updateMembership(): Promise<Membership> {
    if (!this._resourceId) {
      throw new BadRequest(
        "Missing resource id input. Use ApiClient#resourceId() to add it"
      );
    }
    this.data({
      role: this._role,
      expiresAt: this._expiresAt,
      status: this._status,
      keys: this._keys,
      autoExecute: this._autoExecute
    });
    return this.patch(`${this._apiUrl}/${this._vaultUri}/${this._membershipUri}/${this._resourceId}`);
  }

  /**
   *
   * @requires:
   * - id()
   * - digest()
   * - signature()
   * @returns {Promise<any>}
   */
  async postTransaction(): Promise<any> {
    if (!this._resourceId) {
      throw new BadRequest(
        "Missing resource id input. Use ApiClient#resourceId() to add it"
      );
    }

    if (!this._digest) {
      throw new BadRequest(
        "Missing digest input. Use ApiClient#digest() to add it"
      );
    }

    if (!this._signature) {
      throw new BadRequest(
        "Missing signature input. Use ApiClient#signature() to add it"
      );
    }
    return this.post(`${this._apiUrl}/${this._transactionUri}`);
  }

  /**
   *
   * @requires:
   * - resourceId()
   * @uses:
   * - responseType()
   * - public()
   * - progressHook()
   * - cancelHook()
   * - numberOfChunks()
   */
  async downloadFile() {
    if (!this._resourceId) {
      throw new BadRequest(
        "Missing resource id to download. Use ApiClient#resourceId() to add it"
      );
    }

    const config = {
      method: "get",
      signal: this._cancelHook ? this._cancelHook.signal : null,
    } as RequestInit;

    if (!this._public) {
      config.headers = (await this._auth.getAuthorizationHeader()) as any
    }

    const url = `${this._apiUrl}/files/${this._resourceId}/data`;

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

  async createPaymentSession(): Promise<PaymentSession> {
    const data = await this.put(`${this._apiUrl}/${this._paymentUri}`);
    return new PaymentSession(data);
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function retry<T>(
  fn: () => Promise<T>,
  retries: number = 5,
  delayMs: number = 1000
): Promise<T> {
  let attempt = 0;

  while (attempt < retries) {
    try {
      return await fn();
    } catch (error) {
      if (retryableErrors.some((type) => error instanceof type)) {
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
