import { AxiosInstance, AxiosRequestConfig } from "axios";
import { v4 as uuidv4 } from "uuid";
import { Membership, MembershipKeys } from "../types/membership";
import { Transaction, TxPayload } from "../types/transaction";
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
import { actions, objects } from "../constants";

const GATEWAY_HEADER_PREFIX = "x-amz-meta-";

export class ApiClient {
  private _gatewayurl: string;
  private _apiurl: string;
  private _uploadsurl: string;

  // API endpoints
  private _fileUri: string = "files";
  private _contractUri: string = "contracts";
  private _transactionUri: string = "transactions";
  private _vaultUri: string = "vaults";
  private _nodeUri: string = "nodes";
  private _membershipUri: string = "memberships";
  private _userUri: string = "users";
  private _zipsUri: string = "zips";

  // path params
  private _resourceId: string;
  private _vaultId: string;

  // request body
  private _action: actions
  private _timestamp: string
  private _owner: string
  // private _public: boolean
  private _signature: string
  private _digest: string
  private _autoExecute: boolean
  private _name: string
  // private _vaultId: string
  private _parentId: string
  private _membershipId: string
  private _objectId: string
  private _type: objects
  private _userAgent: string
  private _groupId: string
  private _file: FileLike;
  private _payload: TxPayload;
  private _numberOfChunks: number;

  // axios
  private _httpClient: AxiosInstance;

  private _queryParams: any = {};
  private _progressId: string;
  private _progressHook: (
    percentageProgress: number,
    bytesProgress?: number,
    id?: string
  ) => void;
  private _cancelHook: AbortController;

  // auxiliar
  private _isPublic: boolean;
  private _totalBytes: number;
  private _uploadedBytes: number;

  constructor() {
    this._httpClient = httpClient;
  }

  clone(): ApiClient {
    const clone = new ApiClient();
    clone._gatewayurl = this._gatewayurl;
    clone._apiurl = this._apiurl;
    clone._uploadsurl = this._uploadsurl;
    clone._resourceId = this._resourceId;
    clone._vaultId = this._vaultId;
    clone._numberOfChunks = this._numberOfChunks;
    clone._file = this._file;
    clone._action = this._action;
    clone._timestamp = this._timestamp;
    clone._owner = this._owner;
    // clone._public = this._public;
    clone._signature = this._signature;
    clone._digest = this._digest;
    clone._name = this._name;
    clone._membershipId = this._membershipId;
    clone._autoExecute = this._autoExecute;
    clone._payload = this._payload;
    // private _vaultId: string
    clone._parentId = this._parentId;
    clone._objectId = this._objectId;
    clone._type = this._type;
    clone._userAgent = this._userAgent;
    clone._groupId = this._groupId;
    clone._queryParams = this._queryParams;
    clone._progressId = this._progressId;
    clone._progressHook = this._progressHook;
    clone._cancelHook = this._cancelHook;
    clone._isPublic = this._isPublic;
    clone._totalBytes = this._totalBytes;
    clone._uploadedBytes = this._uploadedBytes;
    return clone;
  }

  env(config: {
    apiurl: string;
    gatewayurl: string;
    uploadsurl: string;
  }): ApiClient {
    this._apiurl = config.apiurl;
    this._gatewayurl = config.gatewayurl;
    this._uploadsurl = config.uploadsurl;
    return this;
  }

  resourceId(resourceId: string): ApiClient {
    this._resourceId = resourceId;
    return this;
  }

  membershipId(membershipId: string): ApiClient {
    this._membershipId = membershipId;
    return this;
  }

  public(isPublic: boolean): ApiClient {
    this._isPublic = isPublic;
    return this;
  }

  vaultId(vaultId: string): ApiClient {
    this._vaultId = vaultId;
    return this;
  }

  action(action: actions): ApiClient {
    this._action = action;
    return this;
  }

  timestamp(timestamp: string): ApiClient {
    this._timestamp = timestamp;
    return this;
  }

  owner(owner: string): ApiClient {
    this._owner = owner;
    return this;
  }

  objectId(objectId: string): ApiClient {
    this._objectId = objectId;
    return this;
  }

  type(type: objects): ApiClient {
    this._type = type;
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

  payload(payload: TxPayload): ApiClient {
    this._payload = payload;
    return this;
  }

  name(name: string): ApiClient {
    this._name = name;
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

  // /**
  //  * Get current vault contract state
  //  * @requires:
  //  * - vaultId()
  //  * @returns {Promise<Contract>}
  //  */
  // async getContract(): Promise<Contract> {
  //   if (!this._vaultId) {
  //     throw new BadRequest(
  //       "Missing vault id to get contract state. Use ApiClient#vaultId() to add it"
  //     );
  //   }
  //   return await this.public(true).get(
  //     `${this._gatewayurl}/${this._contractUri}/${this._vaultId}`
  //   );
  // }

  /**
   *
   * @uses:
   * - queryParams() - email
   * @returns {Promise<Boolean>}
   */
  async existsUser(): Promise<Boolean> {
    try {
      await this.get(`${this._apiurl}/${this._userUri}`);
    } catch (e) {
      if (!(e instanceof NotFound)) {
        throw e;
      }
      return false;
    }
    return true;
  }

  /**
   * Fetch currently authenticated user
   * @returns {Promise<User>}
   */
  async getUser(): Promise<User> {
    return await this.get(`${this._apiurl}/${this._userUri}`);
  }

  /**
   *
   * @uses:
   * - queryParams() - email
   * @returns {Promise<UserPublicInfo>}
   */
  async getUserPublicData(): Promise<UserPublicInfo> {
    return await this.get(`${this._apiurl}/${this._userUri}`);
  }

  /**
   *
   * @uses:
   * - vaultId()
   */
  async deleteVault(): Promise<void> {
    await this.delete(`${this._apiurl}/${this._vaultUri}/${this._vaultId}`);
  }

  /**
   *
   * @uses:
   * - vaultId()
   * @returns {Promise<Array<Membership>>}
   */
  async getMembers(): Promise<Array<Membership>> {
    return await this.get(
      `${this._apiurl}/${this._vaultUri}/${this._vaultId}/members`
    );
  }

  /**
   * Get memberships for currently authenticated user
   * @uses:
   * - queryParams() - limit, nextToken
   * @returns {Promise<Paginated<Membership>>}
   */
  async getMemberships(): Promise<Paginated<Membership>> {
    return await this.get(`${this._apiurl}/${this._membershipUri}`);
  }

  /**
   * Get vaults for currently authenticated user
   * @uses:
   * - queryParams() - limit, nextToken, tags, filter
   * @returns {Promise<Paginated<Vault>>}
   */
  async getVaults(): Promise<Paginated<Vault>> {
    return await this.get(`${this._apiurl}/${this._vaultUri}`);
  }

  /**
   * Get user membership keys for given vault
   * @uses:
   * - vaultId()
   * @returns {Promise<MembershipKeys>}
   */
  async getMembershipKeys(): Promise<MembershipKeys> {
    return await this.public(true).get(
      `${this._apiurl}/${this._vaultUri}/${this._vaultId}/keys`
    );
  }

  /**
   * Get files by vault id
   * @uses:
   * - vaultId()
   * - queryParams() - type, parentId, limit, nextToken, tags, filter
   * @returns {Promise<Paginated<T>>}
   */
  async getFilesByVaultId<T>(): Promise<Paginated<T>> {
    return await this.public(true).get(
      `${this._apiurl}/${this._vaultUri}/${this._vaultId}/files`
    );
  }


  /**
   * Get folders by vault id
   * @uses:
   * - vaultId()
   * - queryParams() - type, parentId, limit, nextToken, tags, filter
   * @returns {Promise<Paginated<T>>}
   */
  async getFoldersByVaultId<T>(): Promise<Paginated<T>> {
    return await this.public(true).get(
      `${this._apiurl}/${this._vaultUri}/${this._vaultId}/folders`
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
    return await this.get(
      `${this._apiurl}/${this._vaultUri}/${this._vaultId}/${this._membershipUri}`
    );
  }

  /**
   * Get file by id
   * @uses:
   * - resourceId()
   * @returns {Promise<File>}
   */
  async getFile(): Promise<File> {
    return await this.get(
      `${this._apiurl}/files/${this._resourceId}`
    );
  }

  /**
   * Get folder by id
   * @uses:
   * - resourceId()
   * @returns {Promise<Folder>}
   */
  async getFolder(): Promise<Folder> {
    return await this.get(
      `${this._apiurl}/folders/${this._resourceId}`
    );
  }

  /**
   * Get membership by id
   * @uses:
   * - resourceId()
   * @returns {Promise<Membership>}
   */
  async getMembership(): Promise<Membership> {
    return await this.get(
      `${this._apiurl}/${this._membershipUri}/${this._resourceId}`
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
    return await this.public(true).get(
      `${this._apiurl}/${this._vaultUri}/${this._resourceId}`
    );
  }

  /**
   * Get transactions by vault id
   * @uses:
   * - vaultId()
   * @returns {Promise<Array<Transaction>>}
   */
  async getTransactions(): Promise<Array<Transaction>> {
    return await this.get(
      `${this._apiurl}/${this._vaultUri}/${this._vaultId}/${this._transactionUri}`
    );
  }

  /**
   * Get files for currently authenticated user
   * @uses:
   * - queryParams() - limit, nextToken
   * @returns {Promise<Paginated<File>>}
   */
  async getFiles(): Promise<Paginated<File>> {
    return await this.get(`${this._uploadsurl}/${this._fileUri}`);
  }

  async invite(): Promise<{ id: string }> {
    const response = await this.post(
      `${this._apiurl}/${this._vaultUri}/${this._vaultId}/members`
    );
    return response.id;
  }

  async inviteResend(): Promise<{ id: string }> {
    const response = await this.post(
      `${this._apiurl}/${this._vaultUri}/${this._vaultId}/members/${this._resourceId}`
    );
    return response.id;
  }

  async revokeInvite(): Promise<{ id: string }> {
    const response = await this.delete(
      `${this._apiurl}/${this._vaultUri}/${this._vaultId}/members/${this._resourceId}`
    );
    return response.id;
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
    const auth = await Auth.getAuthorization();
    if (!auth && !this._isPublic) {
      throw new Unauthorized("Authentication is required to use Akord API");
    }

    const config = {
      method,
      url: this._queryParams
        ? this.addQueryParams(url, this._queryParams)
        : url,
      headers: {
        Authorization: auth,
        "Content-Type": "application/json",
      },
    } as AxiosRequestConfig;
    // if (this._payload) {
    //   config.data = this._payload;
    // }
    Logger.log(`Request ${config.method}: ` + config.url);

    return await retry(async () => {
      try {
        const response = await this._httpClient(config);
        // if (isPaginated(response)) {
        //   return { items: response.data, nextToken: nextToken(response) };
        // }
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
   * - owner()
   * - vaultId()
   * - objectId()
   * - timestamp()
   * - name()
   * @uses:
   * - autoExecute()
   * - parentId()
   * @returns {Promise<any>}>}
   */
  async createFolder(): Promise<{ folder: Folder, digest: string, bytes: string }> {
    if (!this._vaultId) {
      throw new BadRequest(
        "Missing vault id to post transaction. Use ApiClient#vaultId() to add it"
      );
    }

    const auth = await Auth.getAuthorization();
    if (!auth) {
      throw new Unauthorized("Authentication is required to use Akord API");
    }

    const me = this;
    let headers = {
      Authorization: auth,
      "Content-Type": "multipart/form-data",
    } as Record<string, string>;

    const form = new FormData();

    if (this._timestamp) {
      form.append("timestamp", this._timestamp);
    }

    if (this._objectId) {
      form.append("objectId", this._objectId);
    }

    if (this._vaultId) {
      form.append("vaultId", this._vaultId);
    }

    if (this._name) {
      form.append("name", this._name);
    }

    if (this._autoExecute) {
      form.append("autoExecute", JSON.stringify(true));
    }

    if (this._owner) {
      form.append("owner", this._objectId);
    }

    if (this._parentId) {
      form.append("parentId", this._parentId);
    }

    console.log(form)

    const config = {
      method: "post",
      url: `${this._apiurl}/folders?${new URLSearchParams(
        this._queryParams
      ).toString()}`,
      data: form,
      headers: headers,
      signal: this._cancelHook ? this._cancelHook.signal : null,
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
   * - owner()
   * - membershipId()
   * - objectId()
   * - timestamp()
   * - name()
   * @uses:
   * - autoExecute()
   * - public()
   * @returns {Promise<any>}>}
   */
  async createVault(): Promise<{ vault: Vault, digest: string, bytes: string }> {

    const auth = await Auth.getAuthorization();
    if (!auth) {
      throw new Unauthorized("Authentication is required to use Akord API");
    }

    const me = this;
    let headers = {
      Authorization: auth,
      "Content-Type": "multipart/form-data",
    } as Record<string, string>;

    const form = new FormData();

    if (this._timestamp) {
      form.append("timestamp", this._timestamp);
    }

    if (this._objectId) {
      form.append("objectId", this._objectId);
    }

    if (this._membershipId) {
      form.append("membershipId", this._membershipId);
    }

    if (this._name) {
      form.append("name", this._name);
    }

    if (this._autoExecute) {
      form.append("autoExecute", JSON.stringify(true));
    }

    if (this._owner) {
      form.append("owner", this._owner);
    }

    if (this._isPublic) {
      form.append("public", JSON.stringify(true));
    }

    const config = {
      method: "post",
      url: `${this._apiurl}/vaults?${new URLSearchParams(
        this._queryParams
      ).toString()}`,
      data: form,
      headers: headers,
      signal: this._cancelHook ? this._cancelHook.signal : null,
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
   * - digest()
   * - signature()
   * @returns {Promise<any>}>}
   */
  async postTransaction(): Promise<any> {
    if (!this._digest) {
      throw new BadRequest(
        "Missing digest to post transaction. Use ApiClient#digest() to add it"
      );
    }

    if (!this._signature) {
      throw new BadRequest(
        "Missing signature to post transaction. Use ApiClient#signature() to add it"
      );
    }

    const auth = await Auth.getAuthorization();
    if (!auth) {
      throw new Unauthorized("Authentication is required to use Akord API");
    }

    const me = this;
    let headers = {
      Authorization: auth,
      "Content-Type": "multipart/form-data",
    } as Record<string, string>;

    const form = new FormData();

    form.append("signature", JSON.stringify(this._signature));
    form.append("digest", JSON.stringify(this._digest));

    const config = {
      method: "post",
      url: `${this._apiurl}/transactions?${new URLSearchParams(
        this._queryParams
      ).toString()}`,
      data: form,
      headers: headers,
      signal: this._cancelHook ? this._cancelHook.signal : null,
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
   * - vaultId()
   * - input()
   * - tags()
   * @uses:
   * - metadata()
   * @returns {Promise<{ id: string, object: T }>}
   */
  async transaction<T>(): Promise<T> {
    if (!this._vaultId) {
      throw new BadRequest(
        "Missing vault id to post transaction. Use ApiClient#vaultId() to add it"
      );
    }

    const auth = await Auth.getAuthorization();
    if (!auth) {
      throw new Unauthorized("Authentication is required to use Akord API");
    }

    const me = this;
    let headers = {
      Authorization: auth,
      "Content-Type": "multipart/form-data",
    } as Record<string, string>;

    const form = new FormData();

    console.log(this)

    if (this._signature) {
      form.append("signature", JSON.stringify(this._signature));
    }

    if (this._timestamp) {
      form.append("timestamp", JSON.stringify(this._timestamp));
    }

    if (this._objectId) {
      form.append("timestamp", JSON.stringify(this._objectId));
    }

    if (this._vaultId) {
      form.append("timestamp", JSON.stringify(this._vaultId));
    }

    console.log(form)

    if (this._file) {
      try {
        const buffer = await this._file.arrayBuffer()
        // const blob = new Blob([buffer], { type: 'application/octet-stream' });
        form.append("file", Buffer.from(buffer), { filename: this._file.name });
      } catch (e) {
        form.append("file", this._file, {
          filename: "file",
          contentType: "application/octet-stream",
        });
        headers = { ...headers, ...form.getHeaders() };
      }
    }

    const config = {
      method: "post",
      url: `${this._apiurl}/${this._vaultUri}/${this._vaultId}/${this._transactionUri}?${new URLSearchParams(
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
   * - responseType()
   * - public()
   * - progressHook()
   * - cancelHook()
   * - numberOfChunks()
   */
  async downloadFile() {
    const auth = await Auth.getAuthorization();
    if (!auth && !this._isPublic) {
      throw new Unauthorized("Authentication is required to use Akord API");
    }
    if (!this._resourceId) {
      throw new BadRequest(
        "Missing resource id to download. Use ApiClient#resourceId() to add it"
      );
    }

    const config = {
      method: "get",
      signal: this._cancelHook ? this._cancelHook.signal : null,
    } as RequestInit;

    if (!this._isPublic) {
      config.headers = {
        Authorization: auth,
      };
    }

    const url = `${this._apiurl}/files/${this._resourceId}/data`;

    Logger.log(`Request ${config.method}: ` + url);

    try {
      const response = await fetch(url, config);
      return { resourceUrl: this._resourceId, response: response };
    } catch (error) {
      throwError(error.response?.status, error.response?.data?.msg, error);
    }
  }

  async getStorageBalance(): Promise<Storage> {
    const data = await this.get(`${this._apiurl}/storage-balance`);
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
