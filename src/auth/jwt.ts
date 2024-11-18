import { Unauthorized } from "../errors/unauthorized";
import { DEFAULT_ENV, Env } from "../types/env";
import { isServer } from "../util/platform";

const STORAGE_PATH_PREFIX = "tusky";

const EXPIRATION_BUFFER = 5 * 60; // 5 minutes

class JWTClient {
  private env: Env;

  private accessToken: string;
  private idToken: string;
  private refreshToken: string;

  refreshInProgress: boolean;

  private address: string;

  private STORAGE_PATH_ACCESS_TOKEN: string;
  private STORAGE_PATH_ID_TOKEN: string;
  private STORAGE_PATH_REFRESH_TOKEN: string;
  private STORAGE_PATH_ADDRESS: string;
  private STORAGE_PATH_REFRESH_IN_PROGRESS: string;

  private storage: Storage;

  constructor(config?: { storage?: Storage, env?: Env }) {
    this.storage = config?.storage || defaultStorage();
    this.env = config?.env || DEFAULT_ENV;
    this.STORAGE_PATH_ACCESS_TOKEN = `${STORAGE_PATH_PREFIX}_${this.env}_access_token`;
    this.STORAGE_PATH_ID_TOKEN = `${STORAGE_PATH_PREFIX}_${this.env}_id_token`;
    this.STORAGE_PATH_REFRESH_TOKEN = `${STORAGE_PATH_PREFIX}_${this.env}_refresh_token`;
    this.STORAGE_PATH_ADDRESS = `${STORAGE_PATH_PREFIX}_${this.env}_address`;
    this.STORAGE_PATH_REFRESH_IN_PROGRESS = `${STORAGE_PATH_PREFIX}_${this.env}_refresh_in_progress`;
    this.refreshInProgress = false;
  }

  isTokenExpiringSoon(token: string, bufferTime: number = EXPIRATION_BUFFER): boolean {
    if (!token) {
      throw new Unauthorized("Invalid session. Please log in again.");
    }
    const decoded = decode(token) as any;
    const currentTime = Math.floor(Date.now() / 1000);
    // check if the token will expire within the next `bufferTime` seconds
    const tokenExpiringSoon = currentTime >= (decoded.exp - bufferTime);
    return tokenExpiringSoon;
  };

  getRefreshInProgress() {
    this.refreshInProgress = this.storage.getItem(this.STORAGE_PATH_REFRESH_IN_PROGRESS) === "true" ? true : false;
    return this.refreshInProgress;
  }

  setRefreshInProgress(refreshInProgress: boolean) {
    this.refreshInProgress = refreshInProgress;
    this.storage.setItem(this.STORAGE_PATH_REFRESH_IN_PROGRESS, refreshInProgress ? "true" : "false");
  }

  getAccessToken() {
    this.accessToken = this.storage.getItem(this.STORAGE_PATH_ACCESS_TOKEN);
    return this.accessToken;
  }

  getRefreshToken() {
    this.refreshToken = this.storage.getItem(this.STORAGE_PATH_REFRESH_TOKEN);
    return this.refreshToken;
  }

  getIdToken() {
    this.idToken = this.storage.getItem(this.STORAGE_PATH_ID_TOKEN);
    return this.idToken;
  }

  setAccessToken(accessToken: string) {
    this.accessToken = accessToken;
    this.storage.setItem(this.STORAGE_PATH_ACCESS_TOKEN, this.accessToken);
  }

  setRefreshToken(refreshToken: string) {
    this.refreshToken = refreshToken;
    this.storage.setItem(this.STORAGE_PATH_REFRESH_TOKEN, this.refreshToken);
  }

  setIdToken(idToken: string) {
    this.idToken = idToken;
    this.storage.setItem(this.STORAGE_PATH_ID_TOKEN, this.idToken);
  }

  setAddress(address: string) {
    this.address = address;
    this.storage.setItem(this.STORAGE_PATH_ADDRESS, address);
  }

  getAddress() {
    if (!this.address) {
      this.address = this.storage.getItem(this.STORAGE_PATH_ADDRESS);
    }
    return this.address;
  }

  getUserId() {
    const idToken = this.getIdToken();
    return idToken ? decode(idToken).sub : "";
  }

  clearTokens() {
    this.storage.removeItem(this.STORAGE_PATH_ACCESS_TOKEN);
    this.storage.removeItem(this.STORAGE_PATH_ID_TOKEN);
    this.storage.removeItem(this.STORAGE_PATH_REFRESH_TOKEN);
    this.storage.removeItem(this.STORAGE_PATH_ADDRESS);
  }
}

// function to decode a JWT
const decode = (token: string): any => {
  // split the JWT into its parts (header, payload, signature)
  const base64Url = token.split('.')[1];
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');

  // decode the base64 encoded payload
  const jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
  }).join(''));

  return JSON.parse(jsonPayload);
};

class MemoryStorage {
  private storage: { [key: string]: string } = {};

  setItem(key: string, value: string): void {
    this.storage[key] = value;
  }

  getItem(key: string): string | null {
    return this.storage.hasOwnProperty(key) ? this.storage[key] : null;
  }

  removeItem(key: string): void {
    delete this.storage[key];
  }

  clear(): void {
    this.storage = {};
  }

  get length(): number {
    return Object.keys(this.storage).length;
  }

  key(index: number): string | null {
    const keys = Object.keys(this.storage);
    return keys[index] || null;
  }
}

export const defaultStorage = () => isServer() ? new MemoryStorage() : globalThis.sessionStorage;

export {
  JWTClient,
  decode
}