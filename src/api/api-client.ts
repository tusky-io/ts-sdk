import axios, { AxiosInstance, AxiosRequestConfig } from "axios";
import { v4 as uuidv4 } from "uuid";
import { Contract, ContractInput, Tag, Tags } from "../types/contract";
import { Membership, MembershipKeys } from "../types/membership";
import { Transaction } from "../types/transaction";
import { nextToken, isPaginated, Paginated } from "../types/paginated";
import { Vault } from "../types/vault";
import { Auth } from "@akord/akord-auth";
import { Unauthorized } from "../errors/unauthorized";
import { retryableErrors, throwError } from "../errors/error-factory";
import { BadRequest } from "../errors/bad-request";
import { NotFound } from "../errors/not-found";
import { User, UserPublicInfo } from "../types/user";
import { FileVersion, StorageType } from "../types";
import fetch from "cross-fetch";
import { jsonToBase64 } from "@akord/crypto";
import { ZipLog } from "../types/zip";
import { Storage } from "../types/storage";
import { Logger } from "../logger";
import FormData from "form-data";
import { Buffer } from "buffer";
import { httpClient } from "./http";


const CONTENT_RANGE_HEADER = "Content-Range";
const CONTENT_LOCATION_HEADER = "Content-Location";
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
  private _parentId: string;

  // request body
  private _tags: Tags;
  private _state: any; // vault/node/membership json state
  private _overrideState: boolean // if true, the state will be overwritten instead of being merged
  private _input: ContractInput;
  private _metadata: any;
  private _numberOfChunks: number;

  // axios
  private _data: AxiosRequestConfig["data"];
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
  private _storage: StorageType;

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
    clone._tags = this._tags;
    clone._state = this._state;
    clone._input = this._input;
    clone._metadata = this._metadata;
    clone._numberOfChunks = this._numberOfChunks;
    clone._data = this._data;
    clone._queryParams = this._queryParams;
    clone._progressId = this._progressId;
    clone._progressHook = this._progressHook;
    clone._cancelHook = this._cancelHook;
    clone._isPublic = this._isPublic;
    clone._totalBytes = this._totalBytes;
    clone._uploadedBytes = this._uploadedBytes;
    clone._storage = this._storage;
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

  public(isPublic: boolean): ApiClient {
    this._isPublic = isPublic;
    return this;
  }

  cloud(cloud: boolean): ApiClient {
    this.queryParams({ cloud: cloud });
    return this;
  }

  storage(storage: StorageType): ApiClient {
    this._storage = storage;
    return this;
  }

  vaultId(vaultId: string): ApiClient {
    this._vaultId = vaultId;
    return this;
  }

  parentId(parentId: string): ApiClient {
    this._parentId = parentId;
    return this;
  }

  data(data: any): ApiClient {
    this._data = data;
    return this;
  }

  metadata(metadata: any): ApiClient {
    this._metadata = metadata;
    if (metadata?.cloud) {
      this.cloud(metadata.cloud);
    }
    return this;
  }

  state(state: any, override?: boolean): ApiClient {
    this._state = state;
    this._overrideState = override;
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

  tags(tags: Tags): ApiClient {
    this._tags = tags;
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

  input(input: ContractInput): ApiClient {
    this._input = input;
    return this;
  }

  numberOfChunks(numberOfChunks: number): ApiClient {
    this._numberOfChunks = numberOfChunks;
    return this;
  }

  /**
   * Initialize a vault smart contract
   * @uses:
   * - tags()
   * - state()
   * @returns {Promise<string>}
   */
  async contract(): Promise<string> {
    this.data({ tags: this._tags, state: this._state });
    const response = await this.post(`${this._apiurl}/${this._vaultUri}`);
    return response.id;
  }

  /**
   * Get current vault contract state
   * @requires:
   * - vaultId()
   * @returns {Promise<Contract>}
   */
  async getContract(): Promise<Contract> {
    if (!this._vaultId) {
      throw new BadRequest(
        "Missing vault id to get contract state. Use ApiClient#vaultId() to add it"
      );
    }
    return await this.public(true).get(
      `${this._gatewayurl}/${this._contractUri}/${this._vaultId}`
    );
  }

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
   * - data()
   */
  async updateUser(): Promise<any> {
    return await this.fetch("put", `${this._apiurl}/${this._userUri}`);
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
   * Get nodes by vault id and type
   * @uses:
   * - vaultId()
   * - queryParams() - type, parentId, limit, nextToken, tags, filter
   * @returns {Promise<Paginated<T>>}
   */
  async getNodesByVaultId<T>(): Promise<Paginated<T>> {
    return await this.public(true).get(
      `${this._apiurl}/${this._vaultUri}/${this._vaultId}/${this._nodeUri}`
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
   * Get node by id and type
   * @uses:
   * - resourceId()
   * - queryParams() - type
   * @returns {Promise<T>}
   */
  async getNode<T>(): Promise<T> {
    return await this.public(true).get(
      `${this._apiurl}/${this._nodeUri}/${this._resourceId}`
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
   * @returns {Promise<Paginated<FileVersion>>}
   */
  async getFiles(): Promise<Paginated<FileVersion>> {
    return await this.get(`${this._uploadsurl}/${this._fileUri}`);
  }

  /**
   * Get zip upload logs for currently authenticated user
   * @uses:
   * - queryParams() - limit, nextToken
   * @returns {Promise<Paginated<ZipLog>>}
   */
  async getZipLogs(): Promise<Paginated<ZipLog>> {
    return await this.get(`${this._apiurl}/${this._zipsUri}`);
  }

  async getTransactionTags(): Promise<Tags> {
    try {
      const config = {
        method: "head",
        url: `${this._apiurl}/files/${this._resourceId}`,
      };
      Logger.log(`Request ${config.method}: ` + config.url);
      const response = await this._httpClient(config);
      return Object.keys(response.headers)
        .filter((header) => header.startsWith(GATEWAY_HEADER_PREFIX))
        .map((header) => {
          return new Tag(
            header.replace(GATEWAY_HEADER_PREFIX, ""),
            response.headers[header]
          );
        });
    } catch (error) {
      throwError(error.response?.status, error.response?.data?.msg, error);
    }
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
    if (this._data) {
      config.data = this._data;
    }
    Logger.log(`Request ${config.method}: ` + config.url);

    return await retry(async () => {
      try {
        const response = await this._httpClient(config);
        if (isPaginated(response)) {
          return { items: response.data, nextToken: nextToken(response) };
        }
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
   * - input()
   * - tags()
   * @uses:
   * - metadata()
   * @returns {Promise<{ id: string, object: T }>}
   */
  async transaction<T>(): Promise<{ id: string; object: T }> {
    if (!this._vaultId) {
      throw new BadRequest(
        "Missing vault id to post transaction. Use ApiClient#vaultId() to add it"
      );
    }
    if (!this._input) {
      throw new BadRequest(
        "Missing input to post transaction. Use ApiClient#input() to add it"
      );
    }
    if (!this._tags) {
      throw new BadRequest(
        "Missing tags to post transaction. Use ApiClient#tags() to add it"
      );
    }

    this.data({
      input: this._input,
      tags: this._tags,
      metadata: this._metadata,
      state: this._state,
      overrideState: this._overrideState
    });
    const { id, object } = await this.post(
      `${this._apiurl}/${this._vaultUri}/${this._vaultId}/${this._transactionUri}`
    );
    return { id, object };
  }

  /**
   * Schedules transaction posting
   * @requires:
   * - resourceId()
   * @uses:
   * - tags()
   * - public()
   * - numberOfChunks()
   */
  async asyncTransaction() {
    if (!this._resourceId) {
      throw new BadRequest(
        "Missing resource id to schedule transaction posting. Use ApiClient#resourceId() to add it"
      );
    }

    this.data({
      resourceUrl: this._resourceId,
      tags: this._tags,
      async: true,
      numberOfChunks: this._numberOfChunks,
    });
    await this.post(`${this._apiurl}/${this._transactionUri}/${this._fileUri}`);
  }

  /**
   *
   * @requires:
   * - data()
   * @uses:
   * - resourceId()
   * - tags()
   * - storage()
   * - public()
   * - progressHook()
   * - cancelHook()
   * @returns {Promise<string[]>}
   */
  async uploadFile(): Promise<{
    resourceUri: string[];
    resourceLocation: string;
    resourceSize: number;
  }> {
    const auth = await Auth.getAuthorization();
    if (!auth) {
      throw new Unauthorized("Authentication is required to use Akord API");
    }
    if (!this._data) {
      throw new BadRequest(
        "Missing data to upload. Use ApiClient#data() to add it"
      );
    }

    const me = this;
    const headers = {
      Authorization: auth,
      Tags: jsonToBase64(this._tags),
      "Storage-Class": this._storage?.replace(":", ""),
      "Content-Type": "application/octet-stream",
    } as Record<string, string>;

    if (this._numberOfChunks > 1) {
      headers[CONTENT_RANGE_HEADER] = `bytes ${this._uploadedBytes}-${this._uploadedBytes + (this._data as ArrayBuffer).byteLength
        }/${this._totalBytes}`;
    }
    if (this._resourceId) {
      headers[CONTENT_LOCATION_HEADER] = this._resourceId;
    }

    this._progressId = uuidv4();

    const config = {
      method: "post",
      url: `${this._uploadsurl}/files`,
      data: this._data,
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

    return await retry(async () => {
      try {
        const response = await this._httpClient(config);
        console.log(response.data)
        return {
          resourceUri: response.data.resourceUri,
          resourceLocation:
            response.headers[CONTENT_LOCATION_HEADER.toLocaleLowerCase()],
          resourceSize: this._data.byteLength,
        };
      } catch (error) {
        throwError(error.response?.status, error.response?.data?.msg, error);
      }
    });
  }

  async getUploadState(): Promise<{ resourceUri: string[] }> {
    if (!this._resourceId) {
      throw new BadRequest(
        "Missing resource id to download. Use ApiClient#resourceId() to add it"
      );
    }
    const data = await this.get(
      `${this._apiurl}/files/uploader/${this._resourceId}`
    );
    return {
      resourceUri: data.resourceUri,
    };
  }

  /**
   *
   * @requires:
   * - resourceId()
   */
  async downloadState() {
    if (!this._resourceId) {
      throw new BadRequest(
        "Missing resource id to download. Use ApiClient#resourceId() to add it"
      );
    }
    return await this.get(`${this._apiurl}/states/${this._resourceId}`);
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

    const url = `${this._apiurl}/files/${this._resourceId}`;

    Logger.log(`Request ${config.method}: ` + url);

    try {
      const response = await fetch(url, config);
      return { resourceUrl: this._resourceId, response: response };
    } catch (error) {
      throwError(error.response?.status, error.response?.data?.msg, error);
    }
  }

  /**
   *
   * @requires:
   * - data()
   * @uses:
   * - progressHook()
   * - cancelHook()
   * @returns {Promise<string[]>}
   */
  async uploadZip(): Promise<{ sourceId: string; multipartToken?: string }> {
    const auth = await Auth.getAuthorization();
    if (!auth) {
      throw new Unauthorized("Authentication is required to use Akord API");
    }
    const me = this;
    let headers;
    headers = {
      Authorization: auth,
      "Content-Type": "multipart/form-data",
    } as Record<string, string>;

    let form;
    const buffer = this._data ? Buffer.from(this._data) : Buffer.alloc(0);
    const blob = new Blob([buffer], { type: "application/octet-stream" });

    try {
      form = new FormData();
      form.append("file", blob, "file");
    } catch (e) {
      form = new FormData();
      form.append("file", buffer, {
        filename: "file",
        contentType: "application/octet-stream",
      });
      headers = { ...headers, ...form.getHeaders() };
    }

    const config = {
      method: "post",
      url: `${this._uploadsurl}/${this._zipsUri}?${new URLSearchParams(
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
      throwError(error.response?.status, error.response?.data?.msg, error);
    }
  }

  async getStorageBalance(): Promise<Storage> {
    const data = await this.get(`${this._apiurl}/storage-balance`);
    return new Storage(data);
  }

  async postPayments(): Promise<any> {
    const data = await this.post(`${this._apiurl}/payments`);
    return data;
  }

  async confirmPayment(paymentId: string): Promise<any> {
    const data = await this.post(
      `${this._apiurl}/payments/${paymentId}/confirm`
    );
    return data;
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
