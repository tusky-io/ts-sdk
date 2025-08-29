import { Api } from "./api/api";
import { Env } from "./types/env";
import { Encrypter } from "./crypto/encrypter";
import { Logger, LogLevel } from "./logger";
import { AuthType, OAuthConfig, WalletConfig } from "./types/auth";
import { Auth } from "./auth";
import { X25519KeyPair } from "./crypto";
import { Storage } from "./util/storage";
import { Sodium } from "./crypto/libsodium";

export interface TuskyConfig {
  env?: Env;
  encrypter?: EncrypterConfig;
  logger?: LoggerConfig;
  wallet?: WalletConfig; // Wallet-based auth
  oauth?: OAuthConfig; // OAuth
  apiKey?: string; // Api key auth
  clientName?: string; // name of the client consuming the API
  storage?: Storage;
}

export interface ClientConfig {
  env?: Env;
  encrypter?: Encrypter;
  logger?: Logger;
  auth?: Auth;
  logLevel?: LogLevel;
  logToFile?: boolean;
  cache?: boolean;
  api?: Api;
  storage?: Storage;
  apiKey?: string;
  clientName?: string; // name of the client consuming the API
  authType?: AuthType;
}

export interface LoggerConfig {
  logLevel?: LogLevel; // ex: debug
  logToFile?: boolean;
  logger?: Logger;
}

export interface EncrypterConfig {
  password?: string; // password to decrypt user's encryption key
  keystore?: boolean; // indicate whether should import the key from the keystore
  keypair?: X25519KeyPair; // encryption key pair
  sodium?: Sodium;
}

export interface ApiConfig {
  api?: Api;
  env?: Env;
  clientName?: string;
  auth?: Auth;
}

export interface PubSubConfig {
  env?: Env;
}
