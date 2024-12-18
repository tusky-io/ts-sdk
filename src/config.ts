import { Api } from "./api/api";
import { Env } from "./types/env";
import { Encrypter } from "./crypto/encrypter";
import { Logger, LogLevel } from "./logger";
import {
  AuthTokenProvider,
  AuthType,
  OAuthConfig,
  WalletConfig,
} from "./types/auth";
import { Auth } from "./auth";

export interface TuskyConfig {
  env?: Env;
  encrypter?: EncrypterConfig;
  logger?: LoggerConfig;
  wallet?: WalletConfig;
  oauth?: OAuthConfig;
  apiKey?: string;
  authTokenProvider?: AuthTokenProvider;
  clientName?: string; // name of the client consuming the API
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
  authTokenProvider?: AuthTokenProvider;
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
  encrypter?: Encrypter;
  password?: string; // password to decrypt user's encryption key
  keystore?: boolean; // indicate whether should import the key from the keystore
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
