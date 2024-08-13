import { AxiosInstance, AxiosRequestConfig } from "axios";
import { v4 as uuidv4 } from "uuid";
import { Membership, MembershipKeys } from "../types/membership";
import { Transaction } from "../types/transaction";
import { Paginated } from "../types/paginated";
import { Vault } from "../types/vault";
import { Auth } from "../auth";
import { Unauthorized } from "../errors/unauthorized";
import { retryableErrors, throwError } from "../errors/error-factory";
import { BadRequest } from "../errors/bad-request";
import { NotFound } from "../errors/not-found";
import { User, UserPublicInfo } from "../types/user";
import { File, Folder } from "../types";
import fetch from "cross-fetch";
import { Storage } from "../types/storage";
import { Logger } from "../logger";
import FormData from "form-data";
import { Buffer } from "buffer";
import { httpClient } from "./http";
import { FileLike } from "../types/file";
import { ApiKey } from "../types/api-key";

const GATEWAY_HEADER_PREFIX = "x-amz-meta-";

export class ApiClient {
  private _apiUrl: string;
  private _cdnUrl: string;

  // API endpoints
  private _meUri: string = "me";
  private _vaultUri: string = "vaults";
  private _fileUri: string = "files";
  private _folderUri: string = "folders";
  private _membershipUri: string = "memberships";
  private _transactionUri: string = "transactions";
  private _userUri: string = "users";
  private _apiKeyUri: string = "api-keys";
  private _storageUri: string = "storage";

  // path params
  private _resourceId: string;

  // request body
  private _name: string
  private _status: string
  private _vaultId: string;
  private _parentId: string;

  // vault specific
  private _public: boolean
  private _description: string

  // member specific
  private _address: string;
  private _role: string;
  private _expiresAt: number;

  // file specific
  private _file: FileLike;
  private _numberOfChunks: number;

  // user specific
  private _picture: string;
  private _termsAccepted: boolean;
  private _trashExpiration: number;

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
  private _totalBytes: number;
  private _uploadedBytes: number;

  constructor() {
    this._httpClient = httpClient;
  }

  clone(): ApiClient {
    const clone = new ApiClient();
    clone._apiUrl = this._apiUrl;
    clone._cdnUrl = this._cdnUrl;
    clone._resourceId = this._resourceId;
    clone._vaultId = this._vaultId;
    clone._numberOfChunks = this._numberOfChunks;
    clone._file = this._file;
    clone._public = this._public;
    clone._signature = this._signature;
    clone._digest = this._digest;
    clone._name = this._name;
    clone._description = this._description;
    clone._address = this._address;
    clone._role = this._role;
    clone._expiresAt = this._expiresAt;
    clone._picture = this._picture;
    clone._trashExpiration = this._trashExpiration;
    clone._termsAccepted = this._termsAccepted;

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

  address(address: string): ApiClient {
    this._address = address;
    return this;
  }

  file(file: any): ApiClient {
    this._file = file;
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
    return this.get(`${this._apiUrl}/${this._meUri}`);
  }

  /**
   * Update currently authenticated user
   * @uses:
   * - name()
   * - picture()
   * - termsAccepted()
   * - trashExpiration()
   * @returns {Promise<User>}
   */
  async updateMe(): Promise<User> {
    if (!this._name && !this._picture && !this._termsAccepted && !this._trashExpiration) {
      throw new BadRequest("Nothing to update.");
    }
    this.data({
      name: this._name,
      picture: this._picture,
      termsAccepted: this._termsAccepted,
      trashExpiration: this._trashExpiration
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
   * - queryParams() - limit, nextToken, tags, filter
   * @returns {Promise<Paginated<Vault>>}
   */
  async getVaults(): Promise<Paginated<Vault>> {
    return this.get(`${this._apiUrl}/${this._vaultUri}`);
  }

  /**
   * Get files for currently authenticated user
   * @uses:
   * - queryParams() - vaultId, parentId, limit, nextToken, tags, filter
   * @returns {Promise<Paginated<File>>}
   */
  async getFiles(): Promise<Paginated<File>> {
    return this.public(true).get(
      `${this._apiUrl}/files`
    );
  }


  /**
   * Get folders for currently authenticated user
   * @uses:
   * - queryParams() - vaultId, parentId, limit, nextToken, tags, filter
   * @returns {Promise<Paginated<Folder>>}
   */
  async getFolders(): Promise<Paginated<Folder>> {
    return this.public(true).get(
      `${this._apiUrl}/folders`
    );
  }

  /**
   * Get memberships by vault id
   * @uses:
   * - vaultId()
   * - queryParams() - limit, nextToken, filter
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
      `${this._apiUrl}/${this._membershipUri}/${this._resourceId}`
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
    return this.public(true).get(
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
        ...(await Auth.getAuthorizationHeader())
      },
    } as AxiosRequestConfig;
    if (this._data) {
      config.data = this._data;
    }
    Logger.log(`Request ${config.method}: ` + config.url);

    return await retry(async () => {
      try {
        const response = await this._httpClient(config);
        return response.data;
      } catch (error) {
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
  * - vaultId()
  * - file()
  * @uses:
  * - parentId()
  * - autoExecute()
  * @returns {Promise<File>}
  */
  async createFile(): Promise<File> {
    if (!this._vaultId) {
      throw new BadRequest(
        "Missing vault id parameter. Use ApiClient#vaultId() to add it"
      );
    }
    if (!this._file) {
      throw new BadRequest(
        "Missing file input. Use ApiClient#file() to add it"
      );
    }

    const me = this;
    let headers = {
      "Content-Type": "multipart/form-data",
      ...(await Auth.getAuthorizationHeader())
    } as Record<string, string>;

    const form = new FormData();

    form.append("vaultId", this._vaultId);
    form.append("parentId", this._parentId);
    form.append("name", this._file.name);

    try {
      const buffer = await this._file.arrayBuffer()
      // const blob = new Blob([buffer], { type: 'application/octet-stream' });
      form.append("file", Buffer.from(buffer), { filename: this._file.name });
    } catch (e) {
      form.append("file", this._file, {
        filename: "file",
        contentType: "application/octet-stream",
      });
    }

    const config = {
      method: "post",
      url: `${this._apiUrl}/files?${new URLSearchParams(
        this._queryParams
      ).toString()}`,
      data: form,
      headers: headers,
      signal: this._cancelHook ? this._cancelHook.signal : null,
      onUploadProgress(progressEvent) {
        if (me._progressHook) {
          let percentageProgress;
          let bytesProgress;
          if (me._totalBytes) {
            bytesProgress = progressEvent.loaded;
            percentageProgress = Math.round(
              (bytesProgress / me._totalBytes) * 100
            );
          } else {
            bytesProgress = progressEvent.loaded;
            percentageProgress = Math.round(
              (bytesProgress / progressEvent.total) * 100
            );
          }
          me._progressHook(percentageProgress, bytesProgress, me._progressId);
        }
      },
    } as AxiosRequestConfig;

    Logger.log(`Request ${config.method}: ` + config.url);

    try {
      const response = await this._httpClient(config);
      return response.data;
    } catch (error) {
      console.log(error)
      throwError(error.response?.status, error.response?.data?.msg, error);
    }
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

  /**
   *
   * @requires:
   * - address()
   * - role()
   * @uses:
   * - expiresAt()
   * - autoExecute()
   * @returns {Promise<Membership>}
   */
  async createMembership(): Promise<Membership> {
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
      autoExecute: this._autoExecute
    });

    return this.post(`${this._apiUrl}/${this._membershipUri}`);
  }

  /**
  *
  * @requires:
  * - resourceId()
  * @uses:
  * - role()
  * - expiresAt()
  * - status()
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
      autoExecute: this._autoExecute
    });
    return this.patch(`${this._apiUrl}/${this._membershipUri}/${this._resourceId}`);
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
      config.headers = (await Auth.getAuthorizationHeader()) as any
    }

    const url = `${this._apiUrl}/files/${this._resourceId}/data`;

    Logger.log(`Request ${config.method}: ` + url);

    try {
      const response = await fetch(url, config);
      return { resourceUrl: this._resourceId, response: response };
    } catch (error) {
      throwError(error.response?.status, error.response?.data?.msg, error);
    }
  }

  async getStorage(): Promise<Storage> {
    const data = await this.get(`${this._apiUrl}/${this._storageUri}`);
    return new Storage(data);
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function retry<T>(
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
        console.log(`Retry attempt ${attempt} failed. Retrying...`);
        if (attempt >= retries) {
          throw error;
        }
        await delay(delayMs);
      } else {
        throw error;
      }
    }
  }
  throw new Error("Retry attempts exceeded");
}
