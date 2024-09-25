import { Env } from "../env";
import { isServer } from "../util/platform";

const STORAGE_PATH_PREFIX = "akord";

class JWTClient {
  private env: Env;

  private accessToken: string;
  private idToken: string;
  private refreshToken: string;

  private address: string;

  private STORAGE_PATH_ACCESS_TOKEN: string;
  private STORAGE_PATH_ID_TOKEN: string;
  private STORAGE_PATH_REFRESH_TOKEN: string;
  private STORAGE_PATH_ADDRESS: string;

  private storage: Storage;

  constructor(config?: { storage?: Storage, env?: Env }) {
    this.storage = config?.storage || DEFAULT_STORAGE;
    this.env = config?.env || "testnet";
    this.STORAGE_PATH_ACCESS_TOKEN = `${STORAGE_PATH_PREFIX}_${this.env}_access_token`;
    this.STORAGE_PATH_ID_TOKEN = `${STORAGE_PATH_PREFIX}_${this.env}_id_token`;
    this.STORAGE_PATH_REFRESH_TOKEN = `${STORAGE_PATH_PREFIX}_${this.env}_refresh_token`;
    this.STORAGE_PATH_ADDRESS = `${STORAGE_PATH_PREFIX}_${this.env}_address`;
  }

  isTokenExpiringSoon(token: string, bufferTime: number = 10): boolean {
    const decoded = decode(token) as any;
    const currentTime = Math.floor(Date.now() / 1000);
    // check if the token will expire within the next `bufferTime` seconds
    const tokenExpiringSoon = currentTime >= (decoded.exp - bufferTime);
    return tokenExpiringSoon;
  };

  getAccessToken() {
    if (!this.accessToken) {
      this.accessToken = this.storage.getItem(this.STORAGE_PATH_ACCESS_TOKEN);
    }
    return this.accessToken;
  }

  getRefreshToken() {
    if (!this.refreshToken) {
      this.refreshToken = this.storage.getItem(this.STORAGE_PATH_REFRESH_TOKEN);
    }
    return this.refreshToken;
  }

  getIdToken() {
    if (!this.idToken) {
      this.idToken = this.storage.getItem(this.STORAGE_PATH_ID_TOKEN);
    }
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

export const DEFAULT_STORAGE = isServer() ? new MemoryStorage() : globalThis.sessionStorage;

export {
  JWTClient,
  decode
}